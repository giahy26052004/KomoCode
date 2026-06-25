import { createSignal, Show } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useSync } from "../context/sync"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"

interface Props {
  onClose?: () => void
}

function getAuthJsonPath(): string {
  if (process.platform === "win32") {
    const appdata = process.env["APPDATA"]
    if (appdata) return appdata + "\\opencode\\auth.json"
    return require("os").homedir() + "\\AppData\\Roaming\\opencode\\auth.json"
  }
  if (process.platform === "darwin") {
    return require("os").homedir() + "/Library/Application Support/opencode/auth.json"
  }
  const xdg = process.env["XDG_DATA_HOME"]
  return (xdg ?? require("os").homedir() + "/.local/share") + "/opencode/auth.json"
}

function saveKeyToAuthJson(key: string): void {
  // Write key to auth.json so readKomocodeKey() in gracefulFetch picks it up on next bootstrap.
  const { readFileSync, writeFileSync, mkdirSync } = require("fs") as typeof import("fs")
  const authPath = getAuthJsonPath()
  const dir = authPath.substring(0, Math.max(authPath.lastIndexOf("/"), authPath.lastIndexOf("\\")))
  try { mkdirSync(dir, { recursive: true }) } catch {}
  let existing: Record<string, unknown> = {}
  try { existing = JSON.parse(readFileSync(authPath, "utf-8")) } catch {}
  existing["komocode"] = { key, type: "api" }
  writeFileSync(authPath, JSON.stringify(existing, null, 2), { mode: 0o600 })
}

export function DialogKomocodeLogin(props: Props) {
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const [validating, setValidating] = createSignal(false)
  const [error, setError] = createSignal("")

  return (
    <DialogPrompt
      title="KomoCode API key"
      placeholder="komo_..."
      description={() => (
        <>
          <Show when={validating()}>
            <text fg="#888888">Validating...</text>
          </Show>
          <Show when={error()}>
            <text fg="#ff4444">{error()}</text>
          </Show>
        </>
      )}
      onConfirm={async (value) => {
        if (validating()) return
        const key = value.trim()
        if (!key) return
        if (!key.startsWith("komo_")) {
          setError("API keys must start with komo_")
          return
        }

        setValidating(true)
        setError("")

        const gatewayURL = (process.env["KOMOCODE_API_URL"] ?? "http://localhost:8080").replace(/\/$/, "")

        try {
          const res = await fetch(`${gatewayURL}/v1/me`, {
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          })
          if (!res.ok) {
            setError(`Verification failed (${res.status})`)
            setValidating(false)
            return
          }
        } catch {
          setError("Cannot reach gateway. Check KOMOCODE_API_URL.")
          setValidating(false)
          return
        }

        // Persist key to auth.json so gracefulFetch sees it on next bootstrap
        try {
          saveKeyToAuthJson(key)
        } catch (e) {
          setError("Failed to save credential: " + String(e))
          setValidating(false)
          return
        }

        // Register key with server credential store so session.prompt can use it.
        // Must happen before bootstrap so the catalog sees the credential.
        try {
          await sdk.client.integration.connect.key(
            { integrationID: "komocode", key },
            { throwOnError: true },
          )
        } catch (e) {
          setError("Failed to register credential with server: " + String(e))
          setValidating(false)
          return
        }

        // Do NOT call sdk.client.auth.set or instance.dispose — both are handled server-side
        // and calling instance.dispose triggers server.instance.disposed which causes a fatal
        // re-bootstrap that races with the manual bootstrap below.
        await sync.bootstrap()
        dialog.clear()
      }}
      onCancel={() => {
        props.onClose?.()
        dialog.clear()
      }}
    />
  )
}
