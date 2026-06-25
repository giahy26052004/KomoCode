import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import { Commands } from "../../../commands"
import { Runtime } from "../../../../framework/runtime"
import { getQuota } from "../../../../services/komocode-gateway"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.komocode.commands.debug.commands.quota, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service
    const stored = yield* cred.list(KOMOCODE_ID)
    if (stored.length === 0 || stored[0]?.value.type !== "key") {
      process.stdout.write("Not logged in. Run: opencode komocode login\n")
      return
    }

    const apiKey = stored[0].value.key
    const quota = yield* Effect.tryPromise({
      try: () => getQuota(apiKey),
      catch: (e) => new Error(String(e)),
    })

    if (quota.used !== undefined && quota.limit !== undefined) {
      process.stdout.write(`Used:  ${quota.used}\n`)
      process.stdout.write(`Limit: ${quota.limit}\n`)
    } else {
      process.stdout.write(JSON.stringify(quota, null, 2) + "\n")
    }
    if (quota.resetAt) process.stdout.write(`Reset: ${quota.resetAt}\n`)
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
