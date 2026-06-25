import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import { Commands } from "../../commands"
import { Runtime } from "../../../framework/runtime"
import { getMe, maskKey } from "../../../services/komocode-gateway"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.komocode.commands.whoami, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service
    const stored = yield* cred.list(KOMOCODE_ID)
    if (stored.length === 0 || stored[0]?.value.type !== "key") {
      process.stdout.write("Not logged in. Run: opencode komocode login\n")
      return
    }

    const apiKey = stored[0].value.key
    const info = yield* Effect.tryPromise({
      try: () => getMe(apiKey),
      catch: (e) => new Error(String(e)),
    })

    process.stdout.write(`Email: ${info.email ?? "unknown"}\n`)
    if (info.plan) process.stdout.write(`Plan:  ${info.plan}\n`)
    process.stdout.write(`Key:   ${maskKey(apiKey)}\n`)

    if (info.quota) {
      const q = info.quota
      if (q.used !== undefined && q.limit !== undefined)
        process.stdout.write(`Quota: ${q.used} / ${q.limit}\n`)
      if (q.resetAt) process.stdout.write(`Reset: ${q.resetAt}\n`)
    }
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
