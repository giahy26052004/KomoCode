// Reads/writes the KomoCode key entry in opencode's auth.json.
// This is the single source of truth shared by:
//   - the interactive TUI login dialog (packages/tui/src/component/dialog-komocode-login.tsx)
//   - the `komocode login` / `komocode logout` CLI commands
//   - Auth.Service (server-side, packages/opencode/src/auth), which gates whether the
//     "komocode" provider gets merged into the session's provider list
// Must use the same path Auth.Service uses (Global.Path.data, from xdg-basedir) — that
// package has no Windows-specific branch, so it resolves to ~/.local/share/opencode even
// on Windows. A hand-rolled %APPDATA% path here would silently point at a different file.
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { Global } from "@opencode-ai/core/global"

export function getAuthJsonPath(): string {
  return join(Global.Path.data, "auth.json")
}

function readAuthJson(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(getAuthJsonPath(), "utf-8")) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function readKomocodeKey(): string | undefined {
  const entry = readAuthJson()["komocode"] as { key?: string } | undefined
  return typeof entry?.key === "string" ? entry.key : undefined
}

export function writeKomocodeKey(key: string): void {
  const authPath = getAuthJsonPath()
  try {
    mkdirSync(dirname(authPath), { recursive: true })
  } catch {}
  const auth = readAuthJson()
  auth["komocode"] = { key, type: "api" }
  writeFileSync(authPath, JSON.stringify(auth, null, 2), { mode: 0o600 })
}

export function clearKomocodeKey(): void {
  const authPath = getAuthJsonPath()
  const auth = readAuthJson()
  if (!("komocode" in auth)) return
  delete auth["komocode"]
  writeFileSync(authPath, JSON.stringify(auth, null, 2), { mode: 0o600 })
}
