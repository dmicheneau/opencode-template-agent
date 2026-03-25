/// <reference path="./types.d.ts" />

import { tool } from "@opencode-ai/plugin/tool";
import {
  searchAgents,
  getAgent,
  getCategory,
  getCategoryIds,
  getPack,
  resolvePackAgents,
  getManifest,
} from "../src/registry.mjs";
import {
  detectAgentStates,
  verifyLockIntegrity,
} from "../src/lock.mjs";

// ─── helpers ────────────────────────────────────────────────────────────────

export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/[A-Za-z]:\\(?:[^\\]+\\)+/g, "…\\")   // Windows (case-insensitive drive)
    .replace(/\\\\(?:[^\\]+\\)+/g, "…\\")            // UNC paths
    .replace(/\/(?:[^\/]+\/){2,}/g, "…/");            // Unix (any chars in segments)
}

// ─── search_agents ──────────────────────────────────────────────────────────

export const search_agents = tool({
  description:
    "Search the agent registry by name, description, category, or tag. Returns matching agents with category and description. Use when looking for agents matching a specific skill, technology, or keyword.",
  args: {
    query: tool.schema.string().describe(
      "Search query — matches against agent name, description, category, and tags",
    ),
  },
  async execute(args, ctx) {
    try {
      const results = searchAgents(args.query);

      if (results.length === 0) {
        return `No agents found matching "${args.query}". Try a broader term (e.g. "react" instead of "react-specialist") or check available categories with list_agents.`;
      }

      const lines = results.map((a) => {
        const tags = a.tags.length > 0 ? `\n  tags: ${a.tags.join(", ")}` : "";
        return `• ${a.name} (${a.category}) — ${a.description}${tags}`;
      });

      return `Found ${results.length} agent(s) matching "${args.query}":\n\n${lines.join("\n\n")}`;
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});

// ─── list_agents ────────────────────────────────────────────────────────────

export const list_agents = tool({
  description:
    "List agents in the registry. Without filters, shows all agents grouped by category with counts. Use category or pack filter for detailed view. Cannot use both filters at once.",
  args: {
    category: tool.schema
      .string()
      .optional()
      .describe("Filter by category ID (e.g. 'web', 'ai', 'devtools')"),
    pack: tool.schema
      .string()
      .optional()
      .describe("Filter by pack name (e.g. 'frontend', 'backend', 'startup')"),
  },
  async execute(args, ctx) {
    try {
      // ── Both filters: error
      if (args.category && args.pack) {
        return "Cannot filter by both category and pack. Use one at a time.";
      }

      // ── Category filter
      if (args.category) {
        const agents = getCategory(args.category);

        if (agents.length === 0) {
          const available = getCategoryIds();
          return `Category "${args.category}" not found. Available categories:\n${available.map((c) => `  • ${c}`).join("\n")}`;
        }

        const manifest = getManifest();
        const meta = manifest.categories[args.category];
        const header = `${meta?.icon ?? "📁"} ${meta?.label ?? args.category} — ${agents.length} agents`;
        const desc = meta?.description ? `\n${meta.description}\n` : "";
        const list = agents
          .map((a) => `• ${a.name} — ${a.description}`)
          .join("\n");

        return `${header}${desc}\n${list}`;
      }

      // ── Pack filter
      if (args.pack) {
        const packDef = getPack(args.pack);

        if (!packDef) {
          const manifest = getManifest();
          const available = Object.entries(manifest.packs)
            .map(([id, p]) => `  • ${id} — ${p.label}`)
            .join("\n");
          return `Pack "${args.pack}" not found. Available packs:\n${available}`;
        }

        const agents = resolvePackAgents(args.pack);
        const header = `📦 Pack: ${packDef.label} — ${agents.length} agents`;
        const desc = packDef.description ? `\n${packDef.description}\n` : "";
        const list = agents
          .map((a) => `• ${a.name} — ${a.description}`)
          .join("\n");

        return `${header}${desc}\n${list}`;
      }

      // ── No filter: compact overview
      const manifest = getManifest();
      const grouped = new Map<string, typeof manifest.agents>();
      for (const agent of manifest.agents) {
        const bucket = grouped.get(agent.category) ?? [];
        bucket.push(agent);
        grouped.set(agent.category, bucket);
      }

      const sections: string[] = [];
      for (const [catId, agents] of grouped) {
        const meta = manifest.categories[catId];
        const icon = meta?.icon ?? "📁";
        const label = meta?.label ?? catId;
        const desc = meta?.description ? ` — ${meta.description}` : "";
        const names = agents.map((a) => a.name).join(", ");
        sections.push(`${icon} ${label} (${agents.length})${desc}\n  ${names}`);
      }

      return `📦 Agent Registry — ${manifest.agents.length} agents across ${grouped.size} categories\n\n${sections.join("\n\n")}`;
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});

// ─── get_agent ──────────────────────────────────────────────────────────────

export const get_agent = tool({
  description:
    "Get complete details about a specific agent: description, tags, category, installation mode, and current install status. Suggests alternatives for typos.",
  args: {
    name: tool.schema.string().describe(
      "Exact agent name (e.g. 'typescript-pro', 'debugger', 'react-specialist')",
    ),
  },
  async execute(args, ctx) {
    try {
      const agent = getAgent(args.name);

      if (!agent) {
        const suggestions = searchAgents(args.name).slice(0, 3);
        if (suggestions.length > 0) {
          const list = suggestions
            .map((a) => `  • ${a.name} — ${a.description}`)
            .join("\n");
          return `Agent "${args.name}" not found. Did you mean:\n${list}`;
        }
        return `Agent "${args.name}" not found and no similar agents in the registry.`;
      }

      const manifest = getManifest();
      // NOTE: detectAgentStates scans ALL agents on disk (readFileSync + sha256 each).
      // No single-agent API exists in lock.mjs yet. Acceptable for v1.
      const states = detectAgentStates(manifest, ctx.directory);
      const state = states.get(agent.name) ?? "unknown";

      const statusLabels: Record<string, string> = {
        installed: "✓ installed",
        outdated: "⚠ outdated",
        new: "✗ not installed",
        unknown: "? unknown",
      };

      const catMeta = manifest.categories[agent.category];
      const catDisplay = catMeta
        ? `${agent.category} (${catMeta.icon} ${catMeta.label})`
        : agent.category;

      const packs = Object.entries(manifest.packs)
        .filter(([, p]) => p.agents.includes(agent.name))
        .map(([id]) => id);
      const packsLine =
        packs.length > 0 ? packs.join(", ") : "none";

      const tags =
        agent.tags.length > 0 ? agent.tags.join(", ") : "none";

      return [
        agent.name,
        "",
        `Category:    ${catDisplay}`,
        `Mode:        ${agent.mode}`,
        `Status:      ${statusLabels[state]}`,
        `Description: ${agent.description}`,
        `Tags:        ${tags}`,
        "",
        `Included in packs: ${packsLine}`,
      ].join("\n");
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});

// ─── check_health ───────────────────────────────────────────────────────────

export const check_health = tool({
  description:
    "Health check on agent installation. Reports installed, outdated, missing, and unknown agents. Verifies file integrity against lock file. May take a moment with many agents installed.",
  args: {},
  async execute(args, ctx) {
    try {
      const manifest = getManifest();
      const states = detectAgentStates(manifest, ctx.directory);

      let installed = 0;
      let outdated = 0;
      let notInstalled = 0;
      let unknown = 0;
      const outdatedNames: string[] = [];
      const unknownNames: string[] = [];

      for (const [name, state] of states) {
        switch (state) {
          case "installed":
            installed++;
            break;
          case "outdated":
            outdated++;
            outdatedNames.push(name);
            break;
          case "new":
            notInstalled++;
            break;
          case "unknown":
            unknown++;
            unknownNames.push(name);
            break;
        }
      }

      const integrity = verifyLockIntegrity(manifest, ctx.directory);

      const lines: string[] = [
        "Agent Health Report",
        "",
        "Summary:",
        `  ✓ ${installed} installed (hashes match)`,
        `  ⚠ ${outdated} outdated (content modified since install)`,
        `  ✗ ${notInstalled} not installed`,
        `  ? ${unknown} unknown (on disk but not tracked)`,
      ];

      if (outdatedNames.length > 0) {
        lines.push("", "Outdated agents:");
        for (const n of outdatedNames) lines.push(`  • ${n}`);
      }

      if (unknownNames.length > 0) {
        lines.push("", "Unknown agents:");
        for (const n of unknownNames) lines.push(`  • ${n}`);
      }

      lines.push(
        "",
        `Integrity: ✓ ${integrity.ok.length} OK · ⚠ ${integrity.mismatch.length} mismatched · ✗ ${integrity.missing.length} missing from disk`,
      );

      return lines.join("\n");
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});

// ─── suggest_agents ─────────────────────────────────────────────────────────

import {
  detectProjectProfile,
  analyzeQuery,
  scoreAgents,
} from "../src/recommender.mjs";
import { detectInstalledSet } from "../src/lock.mjs";

export const suggest_agents = tool({
  description:
    "Suggest the most relevant agents for the current project and/or user intent. Scans the project stack (languages, frameworks, tooling) and optionally analyzes a query to rank agents by relevance. Returns up to 10 agents with scores and reasons. Use when the user asks which agents to install, or when no suitable agent is obviously known.",
  args: {
    query: tool.schema
      .string()
      .optional()
      .describe(
        "Optional user intent or task description (e.g. 'I need to write tests for my React app'). Improves relevance when provided.",
      ),
  },
  async execute(args, ctx) {
    try {
      const manifest = getManifest();
      const profile = detectProjectProfile(ctx.directory);
      const query = args.query ? analyzeQuery(args.query) : null;
      const installed = detectInstalledSet(manifest, ctx.directory);

      const suggestions = scoreAgents({ profile, query, installed, manifest });

      if (suggestions.length === 0) {
        return "No agent suggestions found for this project. Try providing a query describing what you want to do, or use list_agents to browse the full registry.";
      }

      const stackDesc =
        profile.languages.length > 0
          ? `Detected stack: ${[...profile.languages, ...profile.frameworks].join(", ")}`
          : "No stack detected (prompt-only mode)";

      const lines = suggestions.map((s, i) => {
        const pct = Math.round(s.score * 100);
        const badge = s.sources.includes("stack")
          ? "[stack]"
          : s.sources.includes("intent")
            ? "[intent]"
            : "[general]";
        const reason =
          s.reasons.length > 0 ? `\n  → ${s.reasons.slice(0, 2).join("; ")}` : "";
        return `${i + 1}. ${s.agent.name} — score ${pct}% ${badge}\n  ${s.agent.description}${reason}`;
      });

      return `${stackDesc}\n\nSuggested agents (${suggestions.length}):\n\n${lines.join("\n\n")}`;
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});
