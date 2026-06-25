import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import { Commands } from "../../../commands"
import { Runtime } from "../../../../framework/runtime"
import { maskKey } from "../../../../services/komocode-gateway"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.komocode.commands.debug.commands.auth, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service
    const stored = yield* cred.list(KOMOCODE_ID)

    if (stored.length === 0) {
      process.stdout.write("Status: not authenticated\n")
      process.stdout.write("Run: komocode komocode login\n")
      return
    }

    const c = stored[0]!
    process.stdout.write("Status: authenticated\n")
    process.stdout.write(`Label:  ${c.label}\n`)
    if (c.value.type === "key") {
      process.stdout.write(`Key:    ${maskKey(c.value.key)}\n`)
    }
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
