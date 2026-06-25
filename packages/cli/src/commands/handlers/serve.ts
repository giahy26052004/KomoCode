import { Context, Effect, Option } from "effect"
import { HttpServer } from "effect/unstable/http"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { Daemon } from "../../services/daemon"
import * as Server from "opencode/server/server"

export default Runtime.handler(
  Commands.commands.serve,
  Effect.fn("cli.serve")(function* (input) {
    return yield* Effect.scoped(
      Effect.gen(function* () {
        const daemon = yield* Daemon.Service
        const pw = yield* daemon.password()
        const address = yield* listen(input.hostname, input.port, pw)
        if (input.register) yield* daemon.register(address)
        console.log(`server listening on ${HttpServer.formatAddress(address)}`)
        return yield* Effect.never
      }),
    )
  }),
)

function listen(hostname: string, port: Option.Option<number>, password: string) {
  if (Option.isSome(port)) return bind(hostname, port.value, password)
  return bind(hostname, 4096, password).pipe(Effect.catch(() => bind(hostname, 0, password)))
}

function bind(hostname: string, port: number, password: string): Effect.Effect<HttpServer.Address, unknown> {
  // Set password in env so the full server's ServerAuth.Config reads it via ConfigProvider.fromEnv()
  process.env["OPENCODE_SERVER_PASSWORD"] = password
  return Effect.tryPromise({
    try: () => Server.listen({ port, hostname }),
    catch: (e) => e as Error,
  }).pipe(
    Effect.map(
      (listener): HttpServer.Address => ({
        _tag: "TcpAddress" as const,
        hostname: listener.hostname,
        port: listener.port,
      }),
    ),
  )
}
