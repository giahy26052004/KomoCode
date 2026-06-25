import { Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import { extend } from "@opentui/solid"
import type { JSX } from "@opentui/solid"
import type { RGBA } from "@opentui/core"
import { SpinnerRenderable } from "opentui-spinner"

// @opentui/solid/components (used by opentui-spinner/solid) gets a separate bun chunk,
// creating a different componentCatalogue from the reconciler in @opentui/solid index.
// Import extend from the main entry so spinner registers in the reconciler's catalogue.
extend({ spinner: SpinnerRenderable })

export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function Spinner(props: { children?: JSX.Element; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.textMuted
  return (
    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={color()}>⋯ {props.children}</text>}>
      <box flexDirection="row" gap={1}>
        <spinner frames={SPINNER_FRAMES} interval={80} color={color()} />
        <Show when={props.children}>
          <text fg={color()}>{props.children}</text>
        </Show>
      </box>
    </Show>
  )
}
