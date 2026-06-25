import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import { Commands } from "../../commands"
import { Runtime } from "../../../framework/runtime"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.komocode.commands.logout, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service
    const stored = yield* cred.list(KOMOCODE_ID)
    if (stored.length === 0) {
      process.stdout.write("Not logged in.\n")
      return
    }
    for (const c of stored) {
      yield* cred.remove(c.id)
    }
    process.stdout.write("Logged out of KomoCode.\n")
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
