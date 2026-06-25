#!/usr/bin/env bun

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import { Commands } from "./commands/commands"
import { Runtime } from "./framework/runtime"
import { Daemon } from "./services/daemon"

const Handlers = Runtime.handlers(Commands, {
  $: () => import("./commands/handlers/default"),
  debug: {
    agents: () => import("./commands/handlers/debug/agents"),
  },
  komocode: {
    login: () => import("./commands/handlers/komocode/login"),
    logout: () => import("./commands/handlers/komocode/logout"),
    whoami: () => import("./commands/handlers/komocode/whoami"),
    debug: {
      auth: () => import("./commands/handlers/komocode/debug/auth"),
      gateway: () => import("./commands/handlers/komocode/debug/gateway"),
      quota: () => import("./commands/handlers/komocode/debug/quota"),
    },
  },
  migrate: () => import("./commands/handlers/migrate"),
  service: {
    start: () => import("./commands/handlers/service/start"),
    restart: () => import("./commands/handlers/service/restart"),
    status: () => import("./commands/handlers/service/status"),
    stop: () => import("./commands/handlers/service/stop"),
    password: () => import("./commands/handlers/service/password"),
  },
  serve: () => import("./commands/handlers/serve"),
})

Runtime.run(Commands, Handlers, { version: "local" }).pipe(
  Effect.provide(Daemon.defaultLayer),
  Effect.provide(NodeServices.layer),
  Effect.scoped,
  NodeRuntime.runMain,
)
