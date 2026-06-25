import { Effect } from "effect"
import { Commands } from "../../../commands"
import { Runtime } from "../../../../framework/runtime"
import { gatewayURL, getHealth } from "../../../../services/komocode-gateway"

export default Runtime.handler(Commands.commands.komocode.commands.debug.commands.gateway, () =>
  Effect.gen(function* () {
    const url = gatewayURL()
    process.stdout.write(`Gateway: ${url}\n`)
    process.stdout.write("Checking /health...\n")
    const health = yield* Effect.tryPromise({
      try: () => getHealth(),
      catch: (e) => new Error(String(e)),
    })
    process.stdout.write(`Status:  ${health.status}\n`)
    if (health.version) process.stdout.write(`Version: ${health.version}\n`)
  }),
)
