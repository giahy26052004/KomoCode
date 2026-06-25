import { run } from "@opencode-ai/tui"
import { TuiConfig } from "@opencode-ai/tui/config"
import { getComponentCatalogue } from "@opentui/solid"
import { Effect } from "effect"
import { Global } from "@opencode-ai/core/global"
import { readFileSync, appendFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

declare const OPENCODE_CLI_NAME: string | undefined

const isKomocodeMode =
  typeof OPENCODE_CLI_NAME !== "undefined" && OPENCODE_CLI_NAME === "komocode"

const DEBUG_LOG = join(
  process.env["TEMP"] ?? process.env["TMP"] ?? homedir(),
  "komocode-debug.log",
)

function dlog(...args: unknown[]) {
  try {
    const line = `[${new Date().toISOString()}] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}\n`
    appendFileSync(DEBUG_LOG, line, "utf-8")
  } catch {}
}

export function getAuthJsonPath(): string {
  if (process.platform === "win32") {
    return join(process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming"), "opencode", "auth.json")
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "opencode", "auth.json")
  }
  return join(process.env["XDG_DATA_HOME"] ?? join(homedir(), ".local", "share"), "opencode", "auth.json")
}

export function readKomocodeKey(): string | undefined {
  try {
    const raw = readFileSync(getAuthJsonPath(), "utf-8")
    const auth = JSON.parse(raw) as Record<string, unknown>
    const entry = auth["komocode"] as { key?: string } | undefined
    return typeof entry?.key === "string" ? entry.key : undefined
  } catch {
    return undefined
  }
}

function buildKomocodeProvidersResponse(key: string | undefined) {
  if (!key) return { providers: [], default: {} }

  const gatewayURL = (process.env["KOMOCODE_API_URL"] ?? "http://18.136.89.75:18000").replace(/\/$/, "")

  const makeModel = (id: string, name: string) => ({
    id,
    providerID: "komocode",
    name,
    family: "komocode",
    api: { id, url: `${gatewayURL}/v1`, npm: "@ai-sdk/openai-compatible" },
    status: "active",
    headers: {},
    options: {},
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 200000, output: 8192 },
    capabilities: {
      temperature: true,
      reasoning: false,
      attachment: false,
      toolcall: true,
      interleaved: false,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
    },
    release_date: "2025-01-01",
    variants: {},
  })

  return {
    providers: [
      {
        id: "komocode",
        name: "KomoCode",
        source: "api",
        env: ["KOMOCODE_API_KEY"],
        key,
        options: {},
        models: {
          "komocode-pro": makeModel("komocode-pro", "KomoCode Pro"),
          "komocode-fast": makeModel("komocode-fast", "KomoCode Fast"),
          "komocode-code": makeModel("komocode-code", "KomoCode Code"),
        },
      },
    ],
    default: { komocode: "komocode-pro" },
  }
}

export function runTui(transport: { url: string; headers: RequestInit["headers"] }) {
  dlog("runTui v4 start — isKomocodeMode:", isKomocodeMode, "authPath:", getAuthJsonPath())
  const config = TuiConfig.resolve({}, { terminalSuspend: false })

  // Lazy: defer opencode/plugin/tui/runtime import until start() so that opentui-spinner/solid
  // side effects (componentCatalogue.extend) run first, before ensureRuntimePluginSupport() in runtime.ts.
  let innerDispose: (() => Promise<void>) | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pluginHost: { start(input: any): Promise<void>; dispose(): Promise<void> } = {
    start: async (input) => {
      const { createLegacyTuiPluginHost } = await import("opencode/plugin/tui/runtime")
      const host = createLegacyTuiPluginHost()
      innerDispose = host.dispose.bind(host)
      return host.start(input)
    },
    dispose: async () => {
      if (innerDispose) return innerDispose()
    },
  }

  const cat = getComponentCatalogue()
  dlog("DIAG catalogue keys:", Object.keys(cat).join(","))
  dlog("DIAG spinner registered:", "spinner" in cat)

  return run({
    ...transport,
    args: {},
    config,
    fetch: gracefulFetch,
    pluginHost,
  }).pipe(
    Effect.tap(() => Effect.sync(() => dlog("runTui DONE"))),
    Effect.tapError((e) => Effect.sync(() => dlog("runTui ERROR:", String(e)))),
    Effect.provide(Global.defaultLayer),
  )
}

const legacyDefaults: Record<string, unknown> = {
  "/config/providers": { providers: [], default: {} },
  "/provider": { all: [], default: {}, connected: [] },
  "/agent": [],
  "/config": {},
}

const gracefulFetch = Object.assign(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    // Robust URL + method extraction that never throws
    const rawUrl: string = input instanceof Request ? input.url : (input instanceof URL ? input.href : String(input))
    const rawMethod: string = (init?.method ?? (input instanceof Request ? input.method : "")) || "GET"

    // Unconditional: log every request going through gracefulFetch
    if (isKomocodeMode) {
      dlog("GF", { m: rawMethod, u: rawUrl.slice(0, 120) })
    }

    const response = await fetch(input, init)

    // Log all non-2xx responses with body
    if (isKomocodeMode && !response.ok) {
      const cloned = response.clone()
      cloned.text().then((body) => dlog("GF_ERR", { m: rawMethod, s: response.status, u: rawUrl.slice(0, 120), b: body.slice(0, 400) })).catch(() => {})
    }

    // Log response body for POST /session/:id/message to debug multi-turn issue
    if (isKomocodeMode && rawMethod === "POST" && /\/session\/[^/]+\/message$/.test(rawUrl)) {
      const cloned = response.clone()
      cloned.text().then((body) => dlog("MSG_RESP", { s: response.status, b: body.slice(0, 1000) })).catch(() => {})
    }

    const pathname = new URL(input instanceof Request ? input.url : input).pathname

    // Filter provider list to only KomoCode — hides all external providers from model picker
    if (isKomocodeMode && pathname === "/provider" && response.ok) {
      const json = await response.json().catch(() => null) as any
      if (json) {
        return Response.json({
          all: (json.all ?? []).filter((p: any) => p.id === "komocode"),
          default: json.default ?? {},
          connected: (json.connected ?? []).filter((p: any) => p.id === "komocode"),
        })
      }
    }

    if (response.status !== 404) return response

    if (pathname === "/config/providers" && isKomocodeMode) {
      const key = readKomocodeKey()
      const result = buildKomocodeProvidersResponse(key)
      dlog("/config/providers — key:", key ? key.slice(0, 12) + "***" : "NONE", "— providers:", result.providers.length)
      return Response.json(result)
    }

    if (pathname === "/agent" && isKomocodeMode) {
      dlog("/agent — returning synthetic default agent (build)")
      return Response.json([
        {
          name: "build",
          description: "KomoCode coding assistant",
          mode: "primary",
          permission: [],
          options: {},
        },
      ])
    }

    const fallback = legacyDefaults[pathname]
    if (fallback === undefined) return response
    return Response.json(fallback)
  },
  { preconnect: fetch.preconnect },
)
