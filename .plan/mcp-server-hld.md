# HLD — Serveur MCP pour opencode-agents

**Version** : 1.0.0  
**Date** : 2026-03-27  
**Statut** : Draft  
**Projet** : opencode-agents v8.2.0+

---

## Table des matières

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Layout](#2-repository-layout)
3. [Package Configuration](#3-package-configuration)
4. [Transport Decision](#4-transport-decision)
5. [Server Initialization](#5-server-initialization)
6. [Tool Definitions](#6-tool-definitions)
7. [Resource Definitions](#7-resource-definitions)
8. [Module Integration](#8-module-integration)
9. [TypeScript Config](#9-typescript-config)
10. [Build Pipeline](#10-build-pipeline)
11. [Client Configuration Examples](#11-client-configuration-examples)
12. [Testing Strategy](#12-testing-strategy)
13. [Migration Path](#13-migration-path)

---

## 1. Architecture Overview

### Positionnement dans l'écosystème

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Claude Desktop  │  │    OpenCode IDE   │  │  Cursor / Zed    │  │
│  │  (mcp config)    │  │  (mcp.json)       │  │  (mcp servers)   │  │
│  └────────┬─────────┘  └────────┬──────────┘  └────────┬─────────┘  │
└───────────┼─────────────────────┼────────────────────────┼───────────┘
            │  stdio (JSON-RPC 2.0)│                        │
            └─────────────────────┴────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    opencode-agents-mcp       │
                    │    (bin/mcp.mjs → dist/)     │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │   McpServer (SDK 1.26)  │  │
                    │  │                        │  │
                    │  │  Tools (7)             │  │
                    │  │  Resources (3)         │  │
                    │  └──────────┬─────────────┘  │
                    │             │                 │
                    │  ┌──────────▼─────────────┐  │
                    │  │    src/ (pure ESM)      │  │
                    │  │                        │  │
                    │  │  registry.mjs          │  │
                    │  │  recommender.mjs       │  │
                    │  │  lock.mjs              │  │
                    │  │  meta.mjs              │  │
                    │  └──────────┬─────────────┘  │
                    │             │                 │
                    │  ┌──────────▼─────────────┐  │
                    │  │    manifest.json        │  │
                    │  │    agents/**/*.md       │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
```

### Flux d'une requête

```
Client IDE ──[spawn npx opencode-agents mcp]──► Process Node.js
    │                                                   │
    │  stdin: { jsonrpc, method: "tools/call", ... }   │
    │ ──────────────────────────────────────────────►  │
    │                                                   │  loadManifest()
    │                                                   │  ──► manifest.json (cache mtime)
    │                                                   │  handler(args)
    │                                                   │  ──► src/registry.mjs
    │  stdout: { jsonrpc, result: { content: [...] } } │
    │ ◄──────────────────────────────────────────────  │
```

### Ce qui change par rapport au plugin OpenCode supprimé

Le plugin OpenCode exposait les agents via l'API propriétaire d'OpenCode. Le serveur MCP expose exactement les mêmes capacités via un protocole standardisé, sans dépendance à un IDE particulier. Tout client MCP-compatible peut maintenant consommer le registre.

---

## 2. Repository Layout

### Structure proposée

```
opencode-template-agent/
├── bin/
│   ├── cli.mjs                    # CLI existant (inchangé)
│   └── mcp.mjs                    # NOUVEAU — point d'entrée MCP (généré par build)
│
├── mcp/                           # NOUVEAU — source TypeScript du serveur MCP
│   ├── server.ts                  # McpServer init + transport + shutdown
│   ├── tools/
│   │   ├── list-agents.ts
│   │   ├── get-agent.ts
│   │   ├── search-agents.ts
│   │   ├── suggest-agents.ts
│   │   ├── list-categories.ts
│   │   ├── list-packs.ts
│   │   └── check-health.ts
│   ├── resources/
│   │   ├── index-resource.ts      # agent://index
│   │   ├── agent-resource.ts      # agent://{slug}
│   │   └── schema-resource.ts     # agent://schema
│   ├── types.ts                   # Types TypeScript partagés (AgentEntry, etc.)
│   └── tsconfig.json              # Config TS spécifique à mcp/
│
├── dist/                          # NOUVEAU — output de compilation (gitignored)
│   └── mcp/
│       ├── server.js
│       ├── tools/
│       └── resources/
│
├── src/                           # Modules ESM existants (inchangés)
│   ├── registry.mjs
│   ├── recommender.mjs
│   ├── lock.mjs
│   └── meta.mjs
│
├── manifest.json
├── package.json                   # Mis à jour (voir section 3)
└── .gitignore                     # Ajouter dist/
```

**Décision** : le code source MCP vit dans `mcp/` (pas dans `src/`) pour isoler TypeScript du code ESM pur existant. La compilation produit `dist/mcp/`. Le binaire `bin/mcp.mjs` est un shim minimal qui appelle `dist/mcp/server.js` — il est versionné dans le repo (pas dans dist).

---

## 3. Package Configuration

### Diff de `package.json`

```jsonc
{
  "name": "opencode-agents",
  "version": "8.2.0",

  // Nouvelles dépendances runtime
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^3.24.0"
  },

  // TypeScript en devDependency uniquement
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  },

  "bin": {
    "opencode-agents": "./bin/cli.mjs",
    // NOUVEAU
    "opencode-agents-mcp": "./bin/mcp.mjs"
  },

  "files": [
    "bin/",
    "src/",
    "dist/",           // NOUVEAU — output de compilation
    "/manifest.json",
    "agents/**/*.md"
  ],

  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "lint": "node --check bin/cli.mjs src/*.mjs src/tui/*.mjs src/permissions/*.mjs",
    "prepublishOnly": "npm run build && npm test",
    // NOUVEAUX
    "build": "tsc -p mcp/tsconfig.json && node scripts/postbuild-mcp.mjs",
    "build:watch": "tsc -p mcp/tsconfig.json --watch",
    "typecheck": "tsc -p mcp/tsconfig.json --noEmit"
  }
}
```

**Notes importantes** :
- `@modelcontextprotocol/sdk` et `zod` sont des dépendances **runtime** (pas dev) : le processus MCP tourne à l'usage, pas seulement au build.
- `dist/` doit être inclus dans `files` pour que `npm publish` l'embarque. Alternativement, on peut générer `bin/mcp.mjs` directement comme fichier non-compilé (pattern shebang inline) — voir section 10.
- `typescript` et `@types/node` restent en devDependencies : la compilation se fait côté développeur/CI, pas chez l'utilisateur final.

---

## 4. Transport Decision

### Choix : stdio exclusivement

Le serveur utilise **`StdioServerTransport`** uniquement. Raisons :

1. **Distribution npm** : le serveur est lancé par l'IDE via `npx` ou l'installation locale. Le processus est éphémère, spawné à la demande. Pas de port réseau à gérer, pas de firewall.
2. **Sécurité** : stdio est isolé au processus parent. Pas d'exposition réseau, pas de CORS, pas de session management complexe.
3. **Simplicité opérationnelle** : un seul processus, un seul client, lifetime géré par l'IDE.
4. **Cohérence** : tous les MCP servers distribués via npm utilisent stdio. C'est le pattern standard pour la distribution locale.

Streamable HTTP serait pertinent si le serveur était hébergé (multi-client, long-lived). Ce n'est pas le cas ici.

### Spawn par les clients

```
IDE ──spawn──► node /path/to/bin/mcp.mjs
                    │
                    ├── stdin  : JSON-RPC requests
                    ├── stdout : JSON-RPC responses  ← SEUL usage de stdout
                    └── stderr : logs (console.error uniquement)
```

**Règle critique** : tout `console.log()` dans le code MCP corrompt le protocole stdio. Seul `console.error()` est autorisé pour les logs.

---

## 5. Server Initialization

### `mcp/server.ts` — structure complète

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { VERSION, NAME } from "../src/meta.mjs";

// Import des handlers (voir section 6 & 7)
import { registerListAgents } from "./tools/list-agents.js";
import { registerGetAgent } from "./tools/get-agent.js";
import { registerSearchAgents } from "./tools/search-agents.js";
import { registerSuggestAgents } from "./tools/suggest-agents.js";
import { registerListCategories } from "./tools/list-categories.js";
import { registerListPacks } from "./tools/list-packs.js";
import { registerCheckHealth } from "./tools/check-health.js";
import { registerIndexResource } from "./resources/index-resource.js";
import { registerAgentResource } from "./resources/agent-resource.js";
import { registerSchemaResource } from "./resources/schema-resource.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: NAME,          // "opencode-agents"
    version: VERSION,    // "8.2.0"
  });

  // Enregistrement des tools
  registerListAgents(server);
  registerGetAgent(server);
  registerSearchAgents(server);
  registerSuggestAgents(server);
  registerListCategories(server);
  registerListPacks(server);
  registerCheckHealth(server);

  // Enregistrement des resources
  registerIndexResource(server);
  registerAgentResource(server);
  registerSchemaResource(server);

  // Transport stdio
  const transport = new StdioServerTransport();

  // Graceful shutdown sur SIGINT / SIGTERM
  const shutdown = async () => {
    console.error("[mcp] shutting down...");
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Uncaught errors → stderr uniquement, ne pas écrire sur stdout
  process.on("uncaughtException", (err) => {
    console.error("[mcp] uncaughtException:", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[mcp] unhandledRejection:", reason);
    process.exit(1);
  });

  await server.connect(transport);
  console.error(`[mcp] ${NAME}@${VERSION} ready (stdio)`);
}

main().catch((err) => {
  console.error("[mcp] fatal:", err);
  process.exit(1);
});
```

### Pattern d'erreur uniforme

Tous les handlers retournent ce format en cas d'erreur métier :

```typescript
return {
  content: [{ type: "text", text: `Error: ${message}` }],
  isError: true,
};
```

Les exceptions non-rattrapées (erreurs système) sont laissées se propager : le SDK MCP les convertit en JSON-RPC error response.

---

## 6. Tool Definitions

### Pattern commun d'un handler

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerXxx(server: McpServer): void {
  server.registerTool(
    "xxx",
    {
      description: "...",
      inputSchema: { param: z.string() },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (args) => {
      try {
        // logique
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );
}
```

---

### Tool 1 : `list_agents`

**Description** : Liste tout ou partie des agents du registre. Supporte un filtre par catégorie ou par pack.

**Zod Schema** :
```typescript
{
  category: z.string().optional()
    .describe("ID de catégorie (ex: 'web', 'devtools', 'security')"),
  pack: z.string().optional()
    .describe("Nom du pack (ex: 'fullstack', 'security-suite')"),
}
```

**Annotations** : `{ readOnlyHint: true, idempotentHint: true }`

**Logique handler** :
```typescript
async ({ category, pack }) => {
  // Priorité : pack > category > tous
  let agents: AgentEntry[];
  if (pack) {
    agents = resolvePackAgents(pack);
    if (agents.length === 0) {
      return { content: [{ type: "text", text: `Pack inconnu : "${pack}"` }], isError: true };
    }
  } else if (category) {
    agents = getCategory(category);
    // [] est valide si la catégorie existe mais est vide
    const knownCategories = getCategoryIds();
    if (!knownCategories.includes(category)) {
      return { content: [{ type: "text", text: `Catégorie inconnue : "${category}"` }], isError: true };
    }
  } else {
    agents = listAll();
  }

  const result = {
    count: agents.length,
    agents: agents.map(a => ({
      name: a.name,
      category: a.category,
      description: a.description,
      tags: a.tags,
      mode: a.mode,
    })),
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
```

**Erreurs** : catégorie inconnue, pack inconnu.

---

### Tool 2 : `get_agent`

**Description** : Récupère tous les détails d'un agent par son nom exact, incluant son contenu Markdown.

**Zod Schema** :
```typescript
{
  name: z.string().describe("Nom exact de l'agent (ex: 'expert-nextjs-developer')"),
}
```

**Annotations** : `{ readOnlyHint: true, idempotentHint: true }`

**Logique handler** :
```typescript
async ({ name }) => {
  const agent = getAgent(name);
  if (!agent) {
    return {
      content: [{ type: "text", text: `Agent introuvable : "${name}"` }],
      isError: true,
    };
  }

  // Lecture du fichier .md depuis agents/
  const manifest = getManifest();
  const mdPath = join(
    fileURLToPath(new URL("../../", import.meta.url)),
    manifest.source_path ?? "agents",
    agent.path + ".md"
  );

  let mdContent = "";
  try {
    mdContent = readFileSync(mdPath, "utf-8");
  } catch {
    // Le fichier .md peut ne pas être présent dans tous les contextes d'install
    mdContent = "(contenu non disponible dans ce contexte)";
  }

  const result = {
    ...agent,
    content: mdContent,
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
```

**Erreurs** : agent introuvable. Lecture du .md en best-effort (pas bloquante).

---

### Tool 3 : `search_agents`

**Description** : Recherche fuzzy dans le registre (nom, description, tags, catégorie).

**Zod Schema** :
```typescript
{
  query: z.string().min(1).describe("Terme de recherche (ex: 'typescript', 'security audit')"),
}
```

**Annotations** : `{ readOnlyHint: true, idempotentHint: true }`

**Logique handler** :
```typescript
async ({ query }) => {
  const agents = searchAgents(query);
  const result = {
    query,
    count: agents.length,
    agents: agents.map(a => ({
      name: a.name,
      category: a.category,
      description: a.description,
      tags: a.tags,
    })),
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
```

**Erreurs** : aucune — `searchAgents("")` retourne `[]` (géré par `z.string().min(1)`).

---

### Tool 4 : `suggest_agents`

**Description** : Recommandations intelligentes basées sur l'analyse du répertoire projet et/ou d'un prompt. Combine stack detection + query analysis + scoring.

**Zod Schema** :
```typescript
{
  directory: z.string().optional()
    .describe("Chemin absolu du répertoire projet à analyser. Omis = pas de détection de stack."),
  prompt: z.string().optional()
    .describe("Description de la tâche ou besoin (ex: 'je veux ajouter des tests E2E à mon app Next.js')"),
}
```

**Annotations** : `{ readOnlyHint: true }` (pas idempotent : scan filesystem)

**Logique handler** :
```typescript
async ({ directory, prompt }) => {
  if (!directory && !prompt) {
    return {
      content: [{ type: "text", text: "Fournir au moins 'directory' ou 'prompt'." }],
      isError: true,
    };
  }

  const manifest = getManifest();

  // Détection de stack (non-throwing)
  const profile = directory ? detectProjectProfile(directory) : null;

  // Analyse du prompt
  const query = prompt ? analyzeQuery(prompt) : null;

  // Agents déjà installés (vide si pas de directory)
  const installed = directory
    ? detectInstalledSet(manifest, directory)
    : new Set<string>();

  const suggestions = scoreAgents({ profile, query, installed, manifest });

  const result = {
    directory: directory ?? null,
    profile: profile ?? null,
    query: query ?? null,
    count: suggestions.length,
    suggestions: suggestions.map(s => ({
      name: s.agent.name,
      category: s.agent.category,
      description: s.agent.description,
      score: Math.round(s.score * 100) / 100,
      reasons: s.reasons,
      sources: s.sources,
    })),
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
```

**Erreurs** : ni `directory` ni `prompt` fournis.  
**Note** : `detectProjectProfile` est non-throwing par design — un répertoire inexistant retourne un profil vide, pas une erreur.

---

### Tool 5 : `list_categories`

**Description** : Liste toutes les catégories du registre avec leurs métadonnées et le nombre d'agents.

**Zod Schema** :
```typescript
{}  // pas de paramètres
```

**Annotations** : `{ readOnlyHint: true, idempotentHint: true }`

**Logique handler** :
```typescript
async () => {
  const manifest = getManifest();
  const categories = Object.entries(manifest.categories).map(([id, meta]) => ({
    id,
    label: meta.label,
    icon: meta.icon,
    description: meta.description,
    agent_count: manifest.agents.filter(a => a.category === id).length,
  }));
  return {
    content: [{ type: "text", text: JSON.stringify({ count: categories.length, categories }, null, 2) }]
  };
}
```

---

### Tool 6 : `list_packs`

**Description** : Liste tous les packs thématiques avec leur contenu.

**Zod Schema** :
```typescript
{
  name: z.string().optional()
    .describe("Nom d'un pack spécifique pour en récupérer le détail"),
}
```

**Annotations** : `{ readOnlyHint: true, idempotentHint: true }`

**Logique handler** :
```typescript
async ({ name }) => {
  const manifest = getManifest();

  if (name) {
    const pack = getPack(name);
    if (!pack) {
      return {
        content: [{ type: "text", text: `Pack inconnu : "${name}"` }],
        isError: true,
      };
    }
    const agents = resolvePackAgents(name);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ name, ...pack, resolved_agents: agents }, null, 2)
      }]
    };
  }

  // Liste tous les packs
  const packs = Object.entries(manifest.packs).map(([id, p]) => ({
    id,
    label: p.label,
    description: p.description,
    agent_count: p.agents.length,
    agents: p.agents,
  }));
  return {
    content: [{ type: "text", text: JSON.stringify({ count: packs.length, packs }, null, 2) }]
  };
}
```

**Erreurs** : pack spécifique introuvable.

---

### Tool 7 : `check_health`

**Description** : Vérifie l'intégrité du lock file pour un répertoire projet. Détecte les agents installés, outdatés, manquants.

**Zod Schema** :
```typescript
{
  directory: z.string()
    .describe("Chemin absolu du répertoire projet à vérifier"),
}
```

**Annotations** : `{ readOnlyHint: true }` (lecture filesystem)

**Logique handler** :
```typescript
async ({ directory }) => {
  const manifest = getManifest();

  // Vérification d'intégrité
  const integrity = verifyLockIntegrity(manifest, directory);

  // États détaillés
  const states = detectAgentStates(manifest, directory);
  const statesSummary = {
    installed: Object.entries(states).filter(([, s]) => s === "installed").map(([n]) => n),
    outdated: Object.entries(states).filter(([, s]) => s === "outdated").map(([n]) => n),
    new: Object.entries(states).filter(([, s]) => s === "new").map(([n]) => n),
    unknown: Object.entries(states).filter(([, s]) => s === "unknown").map(([n]) => n),
  };

  const result = {
    directory,
    integrity: {
      ok_count: integrity.ok.length,
      mismatch: integrity.mismatch,
      missing: integrity.missing,
    },
    states: statesSummary,
    summary: {
      total_manifest: manifest.agents.length,
      installed_count: statesSummary.installed.length,
      outdated_count: statesSummary.outdated.length,
      health: integrity.mismatch.length === 0 && integrity.missing.length === 0 ? "ok" : "degraded",
    },
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
```

**Erreurs** : `directory` invalide ou inaccessible — `detectAgentStates` et `verifyLockIntegrity` sont robustes (retournent des résultats vides si le lock file n'existe pas), donc pas de gestion d'erreur spéciale nécessaire.

---

## 7. Resource Definitions

### Resource 1 : `agent://index`

**URI** : `agent://index`  
**MIME** : `application/json`  
**Description** : Index complet du registre — liste de tous les agents avec leurs métadonnées (sans contenu Markdown).

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getManifest } from "../../src/registry.mjs";

export function registerIndexResource(server: McpServer): void {
  server.registerResource(
    "agent-index",
    "agent://index",
    {
      name: "Agent Registry Index",
      description: "Index complet des 69 agents avec leurs métadonnées",
      mimeType: "application/json",
    },
    async (_uri) => {
      const manifest = getManifest();
      const index = {
        version: manifest.version,
        agent_count: manifest.agent_count,
        categories: Object.keys(manifest.categories),
        agents: manifest.agents.map(a => ({
          name: a.name,
          category: a.category,
          description: a.description,
          tags: a.tags,
          mode: a.mode,
          ecosystem: a.ecosystem,
          intent: a.intent,
        })),
      };
      return {
        contents: [{
          uri: "agent://index",
          mimeType: "application/json",
          text: JSON.stringify(index, null, 2),
        }],
      };
    }
  );
}
```

---

### Resource 2 : `agent://{slug}`

**URI Template** : `agent://{slug}`  
**MIME** : `text/markdown`  
**Description** : Contenu brut du fichier `.md` d'un agent spécifique.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAgent, getManifest } from "../../src/registry.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("../../", import.meta.url)));

export function registerAgentResource(server: McpServer): void {
  server.registerResource(
    "agent-content",
    new ResourceTemplate("agent://{slug}", { list: undefined }),
    {
      name: "Agent Content",
      description: "Contenu Markdown d'un agent par son nom",
      mimeType: "text/markdown",
    },
    async (uri, { slug }) => {
      const agent = getAgent(slug as string);
      if (!agent) {
        throw new Error(`Agent introuvable : "${slug}"`);
      }

      const manifest = getManifest();
      const mdPath = join(ROOT, manifest.source_path ?? "agents", agent.path + ".md");

      let text: string;
      try {
        text = readFileSync(mdPath, "utf-8");
      } catch {
        throw new Error(`Fichier agent inaccessible : "${mdPath}"`);
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text,
        }],
      };
    }
  );
}
```

**Note** : La liste des ressources disponibles (`list: undefined`) n'est pas exposée pour cette template — trop coûteux de lister 69 URIs dynamiquement. Le client doit connaître le nom de l'agent.

---

### Resource 3 : `agent://schema`

**URI** : `agent://schema`  
**MIME** : `application/json`  
**Description** : JSON Schema de la structure d'un `AgentEntry` — utile pour les clients qui veulent valider ou parser les résultats des tools.

```typescript
const AGENT_ENTRY_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "agent://schema",
  title: "AgentEntry",
  description: "Entrée du registre opencode-agents",
  type: "object",
  required: ["name", "category", "path", "mode", "description", "tags"],
  properties: {
    name: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*$" },
    category: { type: "string" },
    path: { type: "string" },
    mode: { type: "string", enum: ["primary", "subagent"] },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sha256: { type: "string" },
    size: { type: "number" },
    ecosystem: { type: "array", items: { type: "string" } },
    intent: { type: "array", items: { type: "string" } },
    related_agents: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};

export function registerSchemaResource(server: McpServer): void {
  server.registerResource(
    "agent-schema",
    "agent://schema",
    {
      name: "Agent Schema",
      description: "JSON Schema de la structure AgentEntry",
      mimeType: "application/json",
    },
    async (_uri) => ({
      contents: [{
        uri: "agent://schema",
        mimeType: "application/json",
        text: JSON.stringify(AGENT_ENTRY_SCHEMA, null, 2),
      }],
    })
  );
}
```

---

## 8. Module Integration

### Le problème : TypeScript + imports `.mjs`

`src/registry.mjs` est du pur ESM JavaScript. `mcp/server.ts` est du TypeScript. Le projet utilise `"type": "module"` dans `package.json`. Deux contraintes s'appliquent :

1. TypeScript doit trouver les types pour les `.mjs` (via JSDoc ou déclarations).
2. Les imports compilés dans `dist/` doivent résoudre correctement les chemins relatifs vers `src/`.

### Solution : `moduleResolution: Node16` + imports avec extension explicite

Avec `"moduleResolution": "node16"` dans `tsconfig.json` :

```typescript
// ✅ Import correct — extension .mjs préservée
import { listAll, getAgent } from "../src/registry.mjs";
import { detectProjectProfile } from "../src/recommender.mjs";
import { detectAgentStates, verifyLockIntegrity } from "../src/lock.mjs";
import { VERSION, NAME } from "../src/meta.mjs";
```

TypeScript avec Node16 module resolution cherche `../src/registry.mjs` → il le trouve et utilise le JSDoc pour les types. L'output compilé dans `dist/mcp/` émet des imports JavaScript qui référencent `../../src/registry.mjs` (chemin relatif ajusté par `outDir`).

**Attention sur les chemins** : avec `outDir: "../dist"` et un source dans `mcp/`, TypeScript émet dans `dist/mcp/`. Les imports relatifs vers `../src/` deviennent `../../src/` dans le dist. C'est correct si le package est installé avec la structure :
```
package/
├── src/
├── dist/mcp/
└── manifest.json
```

### Types TypeScript depuis JSDoc

Les modules `.mjs` exportent des types via JSDoc `@typedef`. TypeScript les consomme nativement en mode `allowJs`. On déclare dans `mcp/types.ts` les types ré-exportés pour l'usage interne :

```typescript
// mcp/types.ts — types réexportés pour usage interne
// Les vrais types viennent du JSDoc dans src/*.mjs via allowJs

export type AgentMode = "primary" | "subagent";

export interface AgentEntry {
  name: string;
  category: string;
  path: string;
  mode: AgentMode;
  description: string;
  tags: string[];
  sha256?: string;
  size?: number;
  ecosystem?: string[];
  intent?: string[];
  related_agents?: string[];
}

export interface CategoryMeta {
  label: string;
  icon: string;
  description: string;
}

export interface PackDef {
  label: string;
  description: string;
  agents: string[];
}

export interface Manifest {
  version: string;
  repo: string;
  branch: string;
  base_path: string;
  source_path?: string;
  agent_count: number;
  categories: Record<string, CategoryMeta>;
  agents: AgentEntry[];
  packs: Record<string, PackDef>;
}
```

---

## 9. TypeScript Config

### `mcp/tsconfig.json`

```jsonc
{
  "compilerOptions": {
    // Target Node 20+ — support natif ESM, top-level await
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    
    // Output
    "outDir": "../dist",
    "rootDir": "..",          // Root = projet entier, pas juste mcp/
    "declaration": false,      // Pas de .d.ts nécessaires pour un binaire
    "declarationMap": false,
    "sourceMap": true,         // Pour debugging en production
    
    // Interop JS/TS
    "allowJs": true,           // Indispensable pour consommer src/*.mjs avec types JSDoc
    "checkJs": false,          // Ne pas type-checker src/*.mjs (trop verbeux)
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Rigueur
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    
    // Node types
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": [
    "**/*.ts"                  // Compile uniquement mcp/**/*.ts
  ],
  "exclude": [
    "../node_modules",
    "../dist",
    "../tests"
  ]
}
```

**Points critiques** :
- `"module": "Node16"` : active les imports ESM stricts. Les `.mjs` sont résolus comme des modules ES.
- `"rootDir": ".."` : nécessaire pour que les imports vers `../src/` soient dans le périmètre de compilation. Sans ça, TypeScript refuse les imports hors du `rootDir`.
- `"allowJs": true` + `"checkJs": false` : lit les `.mjs` pour en extraire les types JSDoc, sans les type-checker.

---

## 10. Build Pipeline

### Vue d'ensemble

```
mcp/**/*.ts
    │
    ▼ tsc -p mcp/tsconfig.json
    │
dist/mcp/
    ├── server.js
    ├── tools/*.js
    └── resources/*.js
    │
    ▼ scripts/postbuild-mcp.mjs
    │   ├── Injecte shebang dans dist/mcp/server.js
    │   └── chmod +x dist/mcp/server.js
    │
bin/mcp.mjs  (versionné, shim statique)
```

### `bin/mcp.mjs` — shim versionné

```javascript
#!/usr/bin/env node
// Shim — délègue à la version compilée
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = join(__dirname, "../dist/mcp/server.js");

// Dynamic import pour garder ce fichier léger et toujours à jour
await import(distEntry);
```

**Alternative** : pointer directement `"opencode-agents-mcp": "./dist/mcp/server.js"` dans `bin`. Dans ce cas, `scripts/postbuild-mcp.mjs` doit injecter le shebang et le chmod. C'est plus propre mais nécessite le build avant toute utilisation (pas de `npx` sans build préalable). Le shim est préférable pour la DX.

### `scripts/postbuild-mcp.mjs`

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPath = join(__dirname, "../dist/mcp/server.js");

const content = readFileSync(entryPath, "utf-8");
if (!content.startsWith("#!/usr/bin/env node")) {
  writeFileSync(entryPath, `#!/usr/bin/env node\n${content}`);
}

// chmod +x
chmodSync(entryPath, 0o755);

console.error("[postbuild] dist/mcp/server.js ready");
```

### npm scripts finaux

```jsonc
"scripts": {
  "build": "tsc -p mcp/tsconfig.json && node scripts/postbuild-mcp.mjs",
  "build:watch": "tsc -p mcp/tsconfig.json --watch",
  "typecheck": "tsc -p mcp/tsconfig.json --noEmit",
  "prepublishOnly": "npm run build && npm test"
}
```

### `.gitignore` — ajouts

```
dist/
*.tsbuildinfo
```

### Flux CI/CD

```
git push
  │
  ▼ CI (GitHub Actions)
  ├── npm ci
  ├── npm run typecheck        # Vérification types sans émettre
  ├── npm run build            # Compilation complète
  ├── npm test                 # Tests unitaires existants
  └── node dist/mcp/server.js  # Smoke test : démarre + répond à initialize
```

---

## 11. Client Configuration Examples

### Claude Desktop

Fichier : `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "npx",
      "args": ["-y", "opencode-agents-mcp"],
      "env": {}
    }
  }
}
```

Avec installation locale (après `npm install -g opencode-agents`) :
```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "opencode-agents-mcp"
    }
  }
}
```

---

### OpenCode (`mcp.json` ou `.opencode/mcp.json`)

```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "npx",
      "args": ["opencode-agents-mcp"],
      "type": "stdio"
    }
  }
}
```

Ou avec le chemin local du repo pour le développement :
```json
{
  "mcpServers": {
    "opencode-agents-dev": {
      "command": "node",
      "args": ["./dist/mcp/server.js"],
      "type": "stdio"
    }
  }
}
```

---

### Cursor

Fichier : `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "npx",
      "args": ["-y", "opencode-agents-mcp"],
      "env": {}
    }
  }
}
```

---

### Zed

Fichier : `~/.config/zed/settings.json`

```json
{
  "context_servers": {
    "opencode-agents": {
      "command": {
        "path": "npx",
        "args": ["-y", "opencode-agents-mcp"],
        "env": {}
      }
    }
  }
}
```

---

## 12. Testing Strategy

### Niveaux de test

#### Unit tests — handlers isolés

Tester chaque handler indépendamment, sans passer par le transport MCP. Les handlers sont des fonctions pures exportées.

```typescript
// tests/mcp/tools/list-agents.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Importer directement le handler (pas via McpServer)
describe("list_agents handler", () => {
  it("retourne tous les agents sans filtre", async () => {
    const result = await listAgentsHandler({});
    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.count, 69);
    assert.ok(Array.isArray(data.agents));
  });

  it("filtre par catégorie valide", async () => {
    const result = await listAgentsHandler({ category: "web" });
    const data = JSON.parse(result.content[0].text);
    assert.ok(data.agents.every((a: any) => a.category === "web"));
  });

  it("retourne isError pour catégorie inconnue", async () => {
    const result = await listAgentsHandler({ category: "inexistant" });
    assert.strictEqual(result.isError, true);
  });
});
```

#### Integration tests — MCP Inspector

Le MCP SDK fournit `@modelcontextprotocol/inspector`. Lancer le serveur en mode test et vérifier le protocole complet :

```bash
# Démarrer l'inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js

# L'inspector expose une UI web à http://localhost:5173
# Tester manuellement : tools/list, tools/call, resources/read
```

#### Smoke test automatisé

```javascript
// tests/mcp/smoke.test.mjs
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

// Envoyer initialize + tools/list via stdin, vérifier la réponse stdout
const proc = spawn("node", ["dist/mcp/server.js"]);
const initRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0.0.1" },
  },
}) + "\n";

proc.stdin.write(initRequest);
// ... collecter stdout, parser JSON, vérifier serverInfo
```

### Ce qu'on doit couvrir

| Test | Type | Priorité |
|------|------|----------|
| `list_agents` — sans filtre, category filter, pack filter, catégorie inconnue | Unit | P0 |
| `get_agent` — agent valide, agent inexistant | Unit | P0 |
| `search_agents` — terme trouvé, terme absent | Unit | P0 |
| `suggest_agents` — avec directory, avec prompt, avec les deux, sans les deux | Unit | P1 |
| `list_categories` — toujours 10 catégories | Unit | P1 |
| `list_packs` — liste complète, pack spécifique, pack inexistant | Unit | P1 |
| `check_health` — directory sans lock file, avec lock file | Unit | P1 |
| Resources `agent://index`, `agent://schema` | Unit | P1 |
| Resource `agent://{slug}` — slug valide, slug invalide | Unit | P1 |
| Protocole MCP complet (initialize → tools/list → tools/call) | Smoke | P0 |
| Startup propre sans output sur stdout | Smoke | P0 |

---

## 13. Migration Path

### Contexte

Le plugin OpenCode (`src/opencode-plugin.mjs` ou équivalent) a été supprimé. Il exposait les agents via l'API propriétaire d'OpenCode. Les utilisateurs qui dépendaient de cette intégration doivent migrer vers le serveur MCP.

### Pour les utilisateurs finaux

**Avant** (plugin OpenCode) :
```
opencode-agents install —> agents dans .opencode/agents/
OpenCode détectait automatiquement via plugin
```

**Après** (serveur MCP) :
1. Installer/mettre à jour le package : `npm install -g opencode-agents`
2. Configurer le serveur MCP dans l'IDE (voir section 11)
3. Le serveur MCP expose les mêmes capacités + recommandations intelligentes

La CLI `opencode-agents` reste inchangée pour l'installation des agents. Le MCP server est un **point d'accès supplémentaire**, pas un remplacement de la CLI.

### Breaking changes

| Composant | Avant | Après |
|-----------|-------|-------|
| Plugin OpenCode | Intégration propriétaire | Supprimé |
| Accès registre depuis IDE | Via plugin | Via serveur MCP (section 11) |
| `bin` dans package.json | `opencode-agents` uniquement | + `opencode-agents-mcp` |
| Dependencies runtime | Zéro | `@modelcontextprotocol/sdk`, `zod` |
| `files` npm | bin/, src/, manifest.json, agents/ | + dist/ |

### Compatibilité ascendante

- La CLI `opencode-agents` est **100% inchangée**.
- Les agents installés dans `.opencode/agents/` restent fonctionnels.
- Le lock file `.manifest-lock.json` est identique.
- L'ajout de `dependencies` augmente la taille du package installé : SDK MCP ~200KB, Zod ~60KB. Acceptable pour un outil dev.

### Semver

Ce changement constitue un bump **minor** (nouvelle fonctionnalité, pas de breaking change sur l'API publique existante) : `8.2.0` → `8.3.0`.

---

## Annexe : Décisions d'architecture résumées

| Décision | Choix retenu | Rejeté | Raison |
|----------|--------------|--------|--------|
| Transport | stdio | HTTP/SSE | Distribution npm locale, pas d'exposition réseau |
| API SDK | `McpServer` (high-level) | `Server` (low-level) | Moins de boilerplate, abstractions solides |
| Source TS | `mcp/` séparé | Dans `src/` | Isoler TS des modules ESM purs existants |
| Module resolution | Node16 | Bundler / NodeNext | Cohérence avec `"type": "module"` du projet |
| Types `.mjs` | JSDoc + `allowJs` | Fichiers `.d.ts` générés | Évite de dupliquer les types, source of truth = src/ |
| Binaire | Shim `bin/mcp.mjs` | `bin` → `dist/` directement | Évite de versionner dist/, meilleure DX |
| Build script | `postbuild-mcp.mjs` custom | Rollup/esbuild | Zero dep supplémentaire pour le build |
