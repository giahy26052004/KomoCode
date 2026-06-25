import { Credential } from "@opencode-ai/core/credential"
import { IntegrationSchema } from "@opencode-ai/core/integration/schema"
import { Effect } from "effect"
import * as readline from "node:readline/promises"
import { Commands } from "../../commands"
import { Runtime } from "../../../framework/runtime"
import { gatewayURL, maskKey, verifyKey } from "../../../services/komocode-gateway"

const KOMOCODE_ID = IntegrationSchema.ID.make("komocode")

export default Runtime.handler(Commands.commands.komocode.commands.login, () =>
  Effect.gen(function* () {
    const cred = yield* Credential.Service

    // Prompt for API key
    const apiKey = yield* Effect.tryPromise(async () => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      process.stdout.write(`Gateway: ${gatewayURL()}\n`)
      try {
        return (await rl.question("KomoCode API key (komo_...): ")).trim()
      } finally {
        rl.close()
      }
    })

    if (!apiKey) {
      process.stdout.write("Aborted.\n")
      return
    }

    if (!apiKey.startsWith("komo_")) {
      process.stdout.write("Invalid key format. KomoCode API keys start with komo_\n")
      return
    }

    // Verify with gateway
    process.stdout.write("Verifying...\n")
    let info: { email?: string; plan?: string }
    try {
      info = yield* Effect.tryPromise(() => verifyKey(apiKey))
    } catch {
      process.stdout.write("Verification failed. Check your API key and gateway URL.\n")
      return
    }

    // Save credential (replaces any existing komocode credential)
    yield* cred.create({
      integrationID: KOMOCODE_ID,
      value: new Credential.Key({ type: "key", key: apiKey }),
      label: info.email ?? "komocode",
    })

    process.stdout.write(`Logged in as ${info.email ?? "unknown"}\n`)
    if (info.plan) process.stdout.write(`Plan: ${info.plan}\n`)
    process.stdout.write(`Key: ${maskKey(apiKey)}\n`)
  }).pipe(Effect.provide(Credential.defaultLayer)),
)
