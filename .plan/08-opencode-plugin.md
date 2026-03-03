# S8 — OpenCode Plugin (Agent Registry Discovery)

**Version:** 1.1
**Created:** 2026-02-27
**Updated:** 2026-03-03
**Status:** Implemented — v1 shipped (local + global)
**Scope:** Plugin OpenCode intégré au registre d'agents

---

## Overview

Plugin OpenCode natif qui expose le registre d'agents (69 agents, 10 catégories, 15 packs) directement dans les sessions OpenCode via des tools MCP. L'objectif : permettre au LLM de découvrir, rechercher et diagnostiquer les agents sans quitter la session.

**Scope v1 : Discovery only** — lecture seule, aucune mutation. Les phases suivantes (install, permissions, sync) sont planifiées mais hors scope.

**Décision clé : Plugin vs MCP Server** — Le plugin est préféré car il a accès à `PluginInput.directory` et `PluginInput.project`, essentiels pour `check_health` (localiser les fichiers agents). Un MCP server devrait découvrir ces chemins hors-bande.

## Architecture

### Distribution

Le plugin est distribué comme un package npm via GitHub specifier :

```
"plugin": ["github:dmicheneau/opencode-template-agent"]
```

**Deux modes d'installation :**

- **Global** (tous les projets) : `~/.config/opencode/opencode.json`
  ```json
  { "plugin": ["github:dmicheneau/opencode-template-agent"] }
  ```

- **Per-project** : `.opencode/opencode.json`
  ```json
  { "plugin": ["github:dmicheneau/opencode-template-agent"] }
  ```

Plus d'auto-discovery locale via `.opencode/plugins/` — le plugin vit au niveau du package.

### Structure de fichiers

```
plugin/
├── index.ts       # entry point (exports agentRegistry: Plugin)
├── tools.ts       # 4 tool definitions with sanitized error messages
└── types.d.ts     # ambient type declarations for src/*.mjs
```

Ancienne structure (supprimée) :
```
.opencode/
├── plugins/agent-registry.ts    ← remplacé par plugin/index.ts
├── lib/tools.ts                 ← remplacé par plugin/tools.ts
└── lib/types.d.ts               ← remplacé par plugin/types.d.ts
```

### package.json (champs clés)

```json
{
  "main": "./plugin/index.ts",
  "exports": {
    ".": "./plugin/index.ts"
  },
  "files": ["bin/", "src/", "manifest.json", "plugin/"],
  "peerDependencies": {
    "@opencode-ai/plugin": ">=1.1.0"
  }
}
```

Le `main` et `exports` pointent vers `plugin/index.ts` pour qu'OpenCode résolve le plugin quand il installe le package GitHub. `files` inclut `plugin/` pour la distribution. `peerDependencies` déclare la compatibilité avec le runtime OpenCode.

### .npmignore

Exclut les fichiers internes (`.plan/`, `tests/`, `.opencode/`, `agents/`, etc.) de la distribution. Seuls `bin/`, `src/`, `manifest.json` et `plugin/` sont distribués.

### Décision : pas de bridge pattern

La revue a identifié le bridge (`lib/bridge.ts` qui ré-exporte depuis `../../src/*.mjs`) comme une sur-abstraction pour 4 tools read-only :
- Bun importe `.mjs` depuis `.ts` nativement — pas besoin de couche interop
- `loadManifest()` résout ses chemins via `import.meta.url` relatif à `src/registry.mjs` — l'import depuis `plugin/` ne change rien
- Un fichier `.d.ts` donne la même sécurité de types sans indirection runtime

**Si v2 (mutations) nécessite une abstraction plus épaisse, on l'ajoutera à ce moment-là.**

### Imports directs dans plugin/tools.ts

```typescript
// Chemins relatifs depuis plugin/ vers src/
import { searchAgents, getAgent, getCategory, getCategoryIds, getPack, resolvePackAgents, getManifest } from "../src/registry.mjs"
import { detectAgentStates, verifyLockIntegrity } from "../src/lock.mjs"
```

### Entry point (plugin/index.ts)

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import {
  search_agents,
  list_agents,
  get_agent,
  check_health,
} from "./tools.ts"

export const agentRegistry: Plugin = async (_input) => {
  return {
    tool: {
      search_agents,
      list_agents,
      get_agent,
      check_health,
    },
  }
}
```

## Tools (v1 — 4 tools discovery)

### Décision : 4 tools, pas 6

La revue a identifié un overlap entre `list_categories`/`list_packs` et `list_agents`. Un LLM sélectionne mieux parmi moins de tools. `list_agents` absorbe les deux :
- Sans filtre → listing groupé par catégorie (avec métadonnées)
- Avec `category` → agents de la catégorie (avec header descriptif)
- Avec `pack` → agents du pack (avec description du pack)

### T1 — `search_agents`

| | |
|---|---|
| **Description** | Search the agent registry by name, description, category, or tag. Returns matching agents with category and description. |
| **Wraps** | `searchAgents(query)` |
| **Args** | `query: string` — matches against name, description, category, tags |

**Exemple :**
```
> search_agents({ query: "react" })

Found 3 agents matching "react":

• react-specialist (web) — React 19+ modern hooks, Server Components, Actions, TypeScript
  tags: react, hooks, server-components, typescript, frontend

• nextjs-developer (web) — Next.js 15+ App Router, Server Components, Partial Pre-Rendering
  tags: nextjs, react, server-components, app-router, typescript

• angular-architect (web) — Enterprise Angular applications, RxJS, signals, module architecture
  tags: angular, rxjs, signals, enterprise, typescript
```

**Cas d'erreur :**
```
No agents found matching "blockchain". Try broader terms like a technology name or domain.
```

### T2 — `list_agents`

| | |
|---|---|
| **Description** | List agents in the registry. Without filters, shows all agents grouped by category with counts. Use category or pack filter for detailed view. Cannot use both filters at once. |
| **Wraps** | `getManifest()` / `getCategory()` / `resolvePackAgents()` |
| **Args** | `category?: string`, `pack?: string` (mutually exclusive) |

**Exemple sans filtre (format compact) :**
```
📦 Agent Registry — 69 agents across 10 categories

💻 Languages (11) — Language-specific experts
  typescript-pro, python-pro, java-architect, golang-pro, rust-pro, rails-expert...

🤖 AI & ML (10) — AI systems, ML pipelines, data science
  ai-engineer, data-scientist, data-engineer, data-analyst, ml-engineer...

[...10 catégories]

Use search_agents to find specific agents, or list_agents with a category/pack filter for details.
```

**Exemple avec filtre catégorie :**
```
🌐 Web & Mobile — 8 agents
Frontend, mobile, and UI design specialists

• accessibility — WCAG compliance, ARIA patterns, screen reader optimization
• angular-architect — Enterprise Angular, RxJS, signals, module architecture
• mobile-developer — Cross-platform mobile apps, React Native, Flutter
[...]
```

**Exemple avec filtre pack :**
```
📦 Pack: Frontend Stack — 6 agents
Everything you need for modern frontend development

• react-specialist — React 19+ modern hooks, Server Components, Actions
• nextjs-developer — Next.js 15+ App Router, Server Components
• typescript-pro — Advanced TypeScript type system, generics
[...]
```

**Cas d'erreur :**
```
Cannot filter by both category and pack. Use one at a time.
```
```
Category "frontend" not found. Available: languages, ai, web, data-api, devops, devtools, security, mcp, business, docs
```

### T3 — `get_agent`

| | |
|---|---|
| **Description** | Get complete details about a specific agent: description, tags, category, mode, install status. Suggests alternatives for typos. |
| **Wraps** | `getAgent()` + `detectAgentStates()` |
| **Args** | `name: string` — exact agent name |

**Exemple :**
```
typescript-pro

Category:    languages (💻 Languages)
Mode:        subagent
Status:      ✓ installed
Description: Advanced TypeScript type system, generics, and full-stack type safety
Tags:        typescript, types, generics, full-stack, node, react

Included in packs: backend, fullstack, startup
```

**Cas typo :**
```
Agent "typscript-pro" not found.

Did you mean?
• typescript-pro
• python-pro
```

### T4 — `check_health`

| | |
|---|---|
| **Description** | Health check on agent installation. Reports installed, outdated, missing, and unknown agents. Verifies file integrity against lock file. May take a moment with many agents installed. |
| **Wraps** | `detectAgentStates()` + `verifyLockIntegrity()` |
| **Args** | *(aucun)* |

**Exemple :**
```
Agent Health Report

Summary:
  ✓ 45 installed (hashes match)
  ⚠ 3 outdated (content modified since install)
  ✗ 18 not installed
  ? 3 unknown (on disk but not tracked)

Outdated agents:
  • debugger
  • react-specialist
  • typescript-pro

Unknown agents:
  • my-custom-agent
  • experiment-helper

Integrity: ✓ 45 OK · ⚠ 3 mismatched · ✗ 0 missing from disk
```

## Error Handling

### sanitizeError()

Toutes les `execute()` utilisent `sanitizeError()` au lieu d'exposer directement `err.message`. Cette fonction strip les chemins absolus des messages d'erreur pour éviter de leaker la structure du filesystem :

```typescript
function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/[A-Z]:\\(?:[\w .-]+\\)+/g, "…\\")      // Windows paths
    .replace(/\/(?:[\w.-]+\/){2,}/g, "…/");            // Unix paths (2+ segments)
}
```

**Pattern dans chaque tool :**
```typescript
async execute(args, ctx) {
  try {
    // logique
  } catch (err) {
    return `Error: ${sanitizeError(err)}`
  }
}
```

**Cas couverts :**
- `manifest.json` manquant ou corrompu → "Error: Could not load agent manifest..."
- `detectAgentStates` échoue (fichiers inaccessibles) → dégradation gracieuse, retourne ce qu'il a pu lire
- Args invalides (category + pack simultanés) → message d'erreur clair, pas de throw

## Performance

- `loadManifest()` est caché avec invalidation par mtime — pas de relecture inutile
- `check_health` fait du readFileSync × N agents — documenté dans la description du tool
- `clearManifestCache()` sera appelé après chaque mutation en v2
- Les formats compacts (noms seuls, comma-separated) limitent la taille des outputs pour list_agents sans filtre

## Testing

### Stratégie : node:test, même pattern que le projet

```
tests/
└── plugin/
    ├── tools.test.ts        ← tests unitaires des execute()
    └── types.test.ts        ← smoke test imports TS→ESM
```

**Runner :** `bun test tests/plugin/` (le TS nécessite Bun, pas node --test directement)

**Pattern :** temp dirs réels, pas de mocking externe. ToolContext stub minimal :

```typescript
function makeCtx(directory: string) {
  return {
    sessionID: "test", messageID: "test", agent: "test",
    directory, worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {}, ask: async () => {},
  }
}
```

**Ce qu'on teste :**
- Chaque tool retourne une string valide (pas de throw non catché)
- search_agents avec résultats / sans résultats
- list_agents sans filtre / avec category / avec pack / avec les deux (erreur)
- get_agent existant / inexistant (suggestions) / avec typo
- check_health sur dir vide / avec agents installés / avec agents corrompus
- Error boundary : manifest manquant, permissions insuffisantes

**Ce qu'on ne teste PAS :**
- Le host OpenCode chargeant le plugin (responsabilité d'OpenCode)
- La logique interne de registry.mjs / lock.mjs (déjà couverte par tests existants)
- Le réseau (aucun appel réseau en v1)

**Script package.json :**
```json
"test:plugin": "bun test tests/plugin/",
"test:all": "npm test && bun test tests/plugin/"
```

## Risks & Mitigations

| Risk | Sévérité | Mitigation |
|------|----------|------------|
| TS/ESM interop (Bun import .mjs) | Medium | Smoke test dans types.test.ts, détecté au CI |
| loadManifest() __dirname | Low | Utilise import.meta.url, pas __dirname — fonctionne depuis n'importe quel importeur |
| cwd ≠ project root | Medium | Toujours passer ctx.directory, jamais process.cwd() |
| @opencode-ai/plugin version | Medium | peerDependencies `>=1.1.0`, devDependencies pinnée à 1.2.5 |
| check_health perf (69 readFileSync) | Low | Documenté dans la description du tool — async en v2 |
| Manifest cache stale | Low | mtime invalidation pour v1, clearManifestCache() en v2 |
| LLM n'utilise pas les tools spontanément | Low | Descriptions optimisées — si insuffisant, ajouter system prompt injection via experimental.chat.system.transform en v1.1 |
| GitHub specifier resolution | Low | Testé avec `github:dmicheneau/opencode-template-agent`, Bun résout correctement |

## Phases futures

| Phase | Scope | Dépend de |
|-------|-------|-----------|
| **v1** (ce plan) | Discovery — 4 tools read-only | — |
| **v1.1** | System prompt injection si LLM sous-utilise les tools | Feedback v1 |
| **v2** | Mutations — install_agent, install_pack, update_agents, uninstall_agent + permission.ask hook | v1 stable |
| **v3** | Permissions — set_permissions, get_permissions, presets via plugin | v2 stable |
| **v4** | Registry sync — sync_registry, diff_registry, agents custom | v3 stable |

## Tâches d'implémentation

- [x] T1: Vérifier version @opencode-ai/plugin (`bun pm ls`)
- [x] T2: Configurer peerDependencies `>=1.1.0`, devDependencies pinnée à 1.2.5
- [x] T3: Créer `plugin/types.d.ts` — déclarations de types pour src/*.mjs
- [x] T4: Créer `plugin/tools.ts` — 4 tools avec formatting inline, error boundaries et `sanitizeError()`
- [x] T5: Créer `plugin/index.ts` — entry point (named export `agentRegistry: Plugin`)
- [x] T6: Configurer package.json — `main`, `exports`, `files` incluent `plugin/`
- [x] T7: Configurer distribution GitHub specifier dans opencode.json
- [x] T8: Supprimer `.opencode/plugins/` et `.opencode/lib/` (ancienne structure locale)
- [x] T9: Créer `.npmignore` — exclure fichiers internes de la distribution
- [x] T10: Créer `tests/plugin/tools.test.ts`
- [x] T11: Créer `tests/plugin/types.test.ts` — smoke test imports
- [x] T12: Ajouter scripts test:plugin et test:all dans package.json
- [x] T13: Test d'intégration — charger le plugin dans OpenCode et vérifier que les 4 tools apparaissent
- [x] T14: Vérifier que npm test existant passe toujours (non-régression)
