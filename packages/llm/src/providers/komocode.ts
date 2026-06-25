import { ProviderID, type ModelID } from "../schema"
import * as OpenAICompatibleChat from "../protocols/openai-compatible-chat"
import { AuthOptions } from "../route/auth-options"
import type { RouteDefaultsInput } from "../route/client"
import type { ProviderAuthOption } from "../route/auth-options"

export const id = ProviderID.make("komocode")

const DEFAULT_BASE_URL = "http://localhost:3000"

export type Config = RouteDefaultsInput &
  ProviderAuthOption<"optional"> & {
    readonly baseURL?: string
  }

export const configure = (input: Config = {}) => {
  const { baseURL, apiKey: _apiKey, auth: _auth, ...rest } = input
  const gatewayURL = baseURL ?? process.env["KOMOCODE_API_URL"] ?? DEFAULT_BASE_URL
  const route = OpenAICompatibleChat.route.with({
    ...rest,
    provider: "komocode",
    endpoint: { baseURL: gatewayURL + "/v1" },
    auth: AuthOptions.bearer(input, "KOMOCODE_API_KEY"),
  })
  return {
    id,
    model: (modelID: string | ModelID) => route.model({ id: modelID, provider: id }),
    configure,
  }
}

export const provider = configure()
export const model = provider.model
