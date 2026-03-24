import type { Plugin } from "@opencode-ai/plugin"
import {
  search_agents,
  list_agents,
  get_agent,
  check_health,
  suggest_agents,
} from "./tools.ts"

export const agentRegistry: Plugin = async (_input) => {
  return {
    tool: {
      search_agents,
      list_agents,
      get_agent,
      check_health,
      suggest_agents,
    },
  }
}
