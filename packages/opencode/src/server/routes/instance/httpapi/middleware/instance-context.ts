import { appendFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import { InstanceStore } from "@/project/instance-store"
import { Effect, Layer } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { WorkspaceRouteContext } from "./workspace-routing"

const _komo_logPath = join(process.env["TEMP"] ?? process.env["TMP"] ?? homedir(), "komocode-debug.log")
const _komo_dlog = (msg: string) => {
  try {
    appendFileSync(_komo_logPath, `[${new Date().toISOString()}] ICM:${msg}\n`, "utf-8")
  } catch {}
}

export class InstanceContextMiddleware extends HttpApiMiddleware.Service<
  InstanceContextMiddleware,
  {
    requires: WorkspaceRouteContext
  }
>()("@opencode/ExperimentalHttpApiInstanceContext") {}

function decode(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

function provideInstanceContext<E>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E>,
  store: InstanceStore.Interface,
): Effect.Effect<HttpServerResponse.HttpServerResponse, E, WorkspaceRouteContext> {
  return Effect.gen(function* () {
    const route = yield* WorkspaceRouteContext
    const dir = decode(route.directory)
    yield* Effect.sync(() => _komo_dlog(`load dir=${dir}`))
    const ctx = yield* store.load({ directory: dir }).pipe(
      Effect.tapError((e) => Effect.sync(() => _komo_dlog(`load FAIL ${String(e)}`))),
    )
    yield* Effect.sync(() => _komo_dlog(`load OK dir=${dir}`))
    return yield* effect.pipe(
      Effect.provideService(InstanceRef, ctx),
      Effect.provideService(WorkspaceRef, route.workspaceID),
    )
  })
}

export const instanceContextLayer = Layer.effect(
  InstanceContextMiddleware,
  Effect.gen(function* () {
    const store = yield* InstanceStore.Service
    return InstanceContextMiddleware.of((effect) => provideInstanceContext(effect, store))
  }),
)
