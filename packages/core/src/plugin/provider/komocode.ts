import { Effect } from "effect"
import { Catalog } from "../../catalog"
import { Integration } from "../../integration"
import { ModelV2 } from "../../model"
import { PluginV2 } from "../../plugin"
import { ProviderV2 } from "../../provider"

export const KomocodePlugin = PluginV2.define({
  id: PluginV2.ID.make("komocode"),
  effect: Effect.gen(function* () {
    const catalog = yield* Catalog.Service
    const integrations = yield* Integration.Service
    const transform = yield* catalog.transform()
    const integrationTransform = yield* integrations.transform()

    const gatewayURL = (process.env["KOMOCODE_API_URL"] ?? "http://localhost:8080").replace(/\/$/, "")
    const baseURL = `${gatewayURL}/v1`

    yield* integrationTransform((editor) => {
      editor.update(Integration.ID.make("komocode"), (integration) => {
        integration.name = "KomoCode"
      })
      editor.method.update({
        integrationID: Integration.ID.make("komocode"),
        method: { type: "key" },
      })
    })

    yield* transform((catalog) => {
      const providerID = ProviderV2.ID.make("komocode")

      catalog.provider.update(providerID, (provider) => {
        provider.name = "KomoCode"
        provider.api = {
          type: "aisdk",
          package: "@ai-sdk/openai-compatible",
          url: baseURL,
        }
      })

      const models = [
        { id: "komocode-pro", name: "KomoCode Pro" },
        { id: "komocode-fast", name: "KomoCode Fast" },
        { id: "komocode-code", name: "KomoCode Code" },
      ]

      for (const { id, name } of models) {
        const modelID = ModelV2.ID.make(id)
        catalog.model.update(providerID, modelID, (model) => {
          model.name = name
          model.api = {
            id: modelID,
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: baseURL,
          }
          model.capabilities = {
            tools: true,
            input: ["text"],
            output: ["text"],
          }
          model.limit = {
            context: 200_000,
            output: 8192,
          }
        })
      }
    })

    return {}
  }),
})
