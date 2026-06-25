import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, onMount, Show } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { useTheme } from "../context/theme"

function _dlog(label: string) {
  try {
    const p = (process.env["TEMP"] ?? process.env["TMP"] ?? require("os").homedir()) + "/komocode-debug.log"
    require("fs").appendFileSync(p, `[${new Date().toISOString()}] ${label}\n`)
  } catch {}
}

let once = false
const placeholder = {
  normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"],
  shell: ["ls -la", "git status", "pwd"],
}

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const theme = useTheme()
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  let sent = false

  onMount(() => {
    _dlog("HOME-MOUNTED")
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} flexDirection="column" alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexShrink={0}>
          <Logo />
        </box>
        <box height={1} flexShrink={0} />
        <box width="100%" maxWidth={promptMaxWidth()} zIndex={1000} paddingTop={1} flexShrink={0}>
          <Prompt ref={bind} right={<pluginRuntime.Slot name="home_prompt_right" />} placeholders={placeholder} />
        </box>
        <pluginRuntime.Slot name="home_bottom" />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <pluginRuntime.Slot name="home_footer" mode="single_winner" />
        <Show when={local.model.current()}>
          {(m) => (
            <box paddingLeft={2} paddingRight={2} height={1} flexDirection="row" gap={1}>
              <text fg={theme.theme.textMuted}>{local.model.parsed().provider}</text>
              <text fg={theme.theme.textMuted}>/</text>
              <text fg={theme.theme.text}>{local.model.parsed().model}</text>
            </box>
          )}
        </Show>
      </box>
    </HomeSessionDestinationProvider>
  )
}
