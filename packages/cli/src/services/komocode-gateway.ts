// Typed client for the KomoCode gateway.
// All endpoint shapes live here so changes to the gateway need only touch this file.

export function gatewayURL(): string {
  return (process.env["KOMOCODE_API_URL"] ?? "http://18.136.89.75:18000").replace(/\/$/, "")
}

export interface MeResponse {
  email?: string
  name?: string
  plan?: string
  token_prefix?: string
  quota?: QuotaResponse
}

export interface QuotaResponse {
  used?: number
  limit?: number
  resetAt?: string
}

export interface HealthResponse {
  status: string
  db?: string
  version?: string
}

export interface VerifyResponse {
  valid: boolean
  email?: string
  plan?: string
}

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

// Gateway has no /auth/verify — use GET /v1/me to validate the key.
export async function verifyKey(key: string): Promise<VerifyResponse> {
  const res = await fetch(`${gatewayURL()}/v1/me`, { headers: authHeaders(key) })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Authentication failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as MeResponse
  return { valid: true, email: data.email, plan: data.plan }
}

export async function getMe(key: string): Promise<MeResponse> {
  const res = await fetch(`${gatewayURL()}/v1/me`, { headers: authHeaders(key) })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Failed to fetch user (${res.status}): ${text}`)
  }
  return res.json() as Promise<MeResponse>
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${gatewayURL()}/health`)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Gateway unreachable (${res.status}): ${text}`)
  }
  return res.json() as Promise<HealthResponse>
}

// Gateway does not expose a dedicated /quota endpoint.
// Returns empty quota — callers should degrade gracefully.
export async function getQuota(_key: string): Promise<QuotaResponse> {
  return {}
}

export function maskKey(key: string): string {
  if (key.length <= 9) return "komo_****"
  return "komo_****" + key.slice(-4)
}
