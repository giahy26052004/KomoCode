import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import { Commands } from "../../commands"
import { Runtime } from "../../../framework/runtime"
import { clearKomocodeKey, readKomocodeKey } from "../../../services/komocode-auth"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.logout, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service
    const stored = yield* cred.list(KOMOCODE_ID)
    const hadAuthJsonKey = readKomocodeKey() !== undefined

    if (stored.length === 0 && !hadAuthJsonKey) {
      process.stdout.write("Not logged in.\n")
      return
    }
    for (const c of stored) {
      yield* cred.remove(c.id)
    }
    // Also clear auth.json so the TUI (gracefulFetch) doesn't think you're still logged in.
    clearKomocodeKey()
    process.stdout.write("Logged out of KomoCode.\n")
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
