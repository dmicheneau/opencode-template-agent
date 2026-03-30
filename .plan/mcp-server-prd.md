---
title: MCP Server — opencode-agents
status: Draft
version: 0.1.0
date: 2026-03-27
author: dmicheneau
---

# MCP Server — opencode-agents

## 1. Vue d'ensemble

`opencode-agents-mcp` expose le registry de 69 agents IA via le Model Context Protocol, permettant à tout LLM compatible MCP d'interroger, rechercher et obtenir des recommandations d'agents sans passer par le CLI.

**Problème :** le plugin OpenCode natif a été supprimé. Les LLMs ne peuvent plus accéder au registry de façon programmatique — ils sont aveugles au catalogue, aux catégories et aux packs thématiques.

**Pourquoi maintenant :** le SDK MCP TypeScript v1.x est stable, le transport stdio est universellement supporté (Claude Desktop, Cursor, VS Code Copilot, Zed, OpenCode, JetBrains, Cline, Continue, Gemini CLI, Amazon Q), et toute l'infrastructure de query (`registry.mjs`, `recommender.mjs`, `lock.mjs`) est déjà prête et testée.

---

## 2. Objectifs et non-objectifs

### Objectifs

| # | Objectif | Critère de succès |
|---|----------|-------------------|
| O-1 | Exposer 100% du registry via MCP Tools et Resources | Les 7 tools couvrent toutes les fonctions publiques de `registry.mjs`, `recommender.mjs` et `lock.mjs` |
| O-2 | Démarrage ultra-rapide | Cold start < 500ms mesuré sur Node 20, MacOS/Linux |
| O-3 | Compatibilité universelle stdio | Testé et validé sur ≥ 3 clients MCP distincts (Claude Desktop, Cursor, OpenCode) |
| O-4 | Zéro crash sur entrée invalide | 0 exception non catchée sur la suite de tests MCP Inspector avec inputs malformés |
| O-5 | Distribution sans friction | `npx opencode-agents-mcp` fonctionne sans installation préalable |

### Non-objectifs (v1)

- **Installation / désinstallation d'agents** — opérations write sur le filesystem du projet (hors périmètre, risque sécurité)
- **Transport HTTP/SSE** — stdio suffit pour tous les clients cibles
- **Authentification** — le registry est public, pas de credentials à gérer
- **Composition d'agents** — orchestration multi-agents hors scope
- **Registry distant** — uniquement le `manifest.json` embarqué dans le package
- **Notifications push MCP** — pas de subscriptions proactives

---

## 3. User Stories

### US-01 — LLM recommandant des agents pour un projet React/TypeScript

> En tant qu'assistant LLM configuré avec le MCP server, je veux analyser le projet ouvert et recevoir une liste d'agents recommandés avec leurs scores et raisons, afin de suggérer automatiquement les bons agents sans que le développeur ait à connaître le catalogue.

**Critères d'acceptation :**
- Le tool `recommend_agents` accepte un `directory` (chemin projet) et un `prompt` optionnel
- Il retourne ≤ 10 suggestions triées par score décroissant (0–1)
- Chaque suggestion inclut `name`, `score`, `reasons[]` et `sources[]`
- Latence < 2s incluant la détection de stack sur le filesystem

### US-02 — Développeur configurant son client MCP une seule fois

> En tant que développeur, je veux ajouter une entrée dans la config de mon client MCP (Claude Desktop, Cursor, etc.) et ne plus jamais avoir à la retoucher, afin que le serveur soit toujours disponible sans maintenance.

**Critères d'acceptation :**
- La commande de démarrage est `npx opencode-agents-mcp` ou `node ./bin/mcp.mjs` — aucun argument obligatoire
- Le serveur fonctionne sans fichier de config externe
- La config JSON tient en < 5 lignes par client

### US-03 — LLM auditant les agents outdated d'un projet

> En tant qu'assistant LLM, je veux vérifier l'état de tous les agents installés dans le projet courant, afin d'identifier lesquels sont obsolètes et recommander une mise à jour.

**Critères d'acceptation :**
- `check_agent_states` retourne un objet `Record<name, 'installed'|'outdated'|'new'|'unknown'>` pour tous les agents du manifest
- `verify_integrity` retourne `{ ok[], mismatch[], missing[] }` en vérifiant les hashes SHA-256
- Les deux tools acceptent un `directory` optionnel (défaut : `process.cwd()`)
- Erreur MCP propre si le directory n'existe pas

### US-04 — LLM explorant le catalogue par catégorie

> En tant qu'assistant LLM, je veux lister les 10 catégories disponibles puis filtrer les agents d'une catégorie spécifique, afin de présenter une navigation structurée à l'utilisateur.

**Critères d'acceptation :**
- `list_agents` sans paramètre retourne les 69 agents
- `list_agents` avec `category` retourne uniquement les agents de cette catégorie
- La Resource `opencode-agents://categories` expose l'index complet des catégories avec labels et descriptions
- Réponse < 200ms

### US-05 — LLM obtenant le contenu complet d'un agent avant utilisation

> En tant qu'assistant LLM, je veux récupérer le fichier markdown complet d'un agent par son nom, afin d'en lire les instructions complètes avant de le recommander ou de l'utiliser directement.

**Critères d'acceptation :**
- `get_agent` retourne les métadonnées de l'agent (name, category, description, tags, mode)
- La Resource `opencode-agents://agents/{name}` retourne le contenu markdown brut du fichier agent
- Erreur MCP `NOT_FOUND` si l'agent n'existe pas dans le manifest
- Le contenu markdown est retourné avec mime-type `text/markdown`

---

## 4. Exigences fonctionnelles

**FR-001** — Le serveur MCP DOIT utiliser exclusivement le transport stdio (`StdioServerTransport` du SDK MCP). Aucun autre transport en v1.

**FR-002** — Le serveur DOIT exposer exactement 7 MCP Tools : `search_agents`, `get_agent`, `list_agents`, `list_packs`, `recommend_agents`, `check_agent_states`, `verify_integrity`.

**FR-003** — Le serveur DOIT exposer exactement 4 MCP Resources : `opencode-agents://manifest`, `opencode-agents://categories`, `opencode-agents://agents/{name}`, `opencode-agents://packs`.

**FR-004** — Tous les inputs de tools DOIVENT être validés avec Zod avant traitement. Une validation échouée retourne une `McpError` avec code `INVALID_PARAMS` et un message descriptif.

**FR-005** — Aucun tool ne DOIT exécuter de commande système (pas de `exec`, `spawn`, `execFile`). La lecture FS est limitée au `directory` passé en argument pour `recommend_agents`, `check_agent_states` et `verify_integrity`.

**FR-006** — Le cold start (processus prêt à accepter des connexions) DOIT être < 500ms sur une machine standard (Node 20, SSD).

**FR-007** — Toutes les erreurs DOIVENT être retournées comme `McpError` avec les codes standard MCP : `NOT_FOUND` (agent/catégorie inconnu), `INVALID_PARAMS` (schema Zod invalide), `INTERNAL_ERROR` (erreur inattendue).

**FR-008** — Le serveur NE DOIT PAS crasher sur n'importe quel input invalide. Chaque handler tool est wrappé dans un try/catch qui produit une `McpError` INTERNAL_ERROR en dernier recours.

**FR-009** — Le manifest est chargé une seule fois au démarrage et mis en cache avec invalidation par mtime (comportement existant de `loadManifest()`). Pas de rechargement à chaque appel tool.

**FR-010** — Le serveur DOIT lire et exposer sa version depuis `package.json` (champ `version`) dans les métadonnées du serveur MCP (`name`, `version`).

---

## 5. Exigences non-fonctionnelles

**NFR-001 — Performance :**
- Cold start : < 500ms (p95, Node 20, Linux/macOS)
- Réponse tools registry (`search_agents`, `get_agent`, `list_agents`, `list_packs`) : < 200ms (p95)
- Réponse `recommend_agents` avec détection de stack : < 2s (p95, projet ~500 fichiers)
- Réponse `check_agent_states` / `verify_integrity` : < 1s (p95, 69 agents)

**NFR-002 — Compatibilité clients :**
- Validé sur : Claude Desktop, Cursor, OpenCode (obligatoires pour v1)
- Compatible par design avec : VS Code Copilot, Zed, JetBrains, Cline, Continue, Gemini CLI, Amazon Q (stdio standard)
- Windows : stdio basique testé, encoding CRLF non garanti en v1 (voir question ouverte Q-04)

**NFR-003 — Fiabilité :**
- 0 exception non-catchée sur la suite MCP Inspector
- Pas d'état global mutable entre les appels (stateless handlers)
- `recommend_agents` avec un `directory` inaccessible retourne une réponse vide (pas une erreur)

**NFR-004 — Sécurité :**
- Aucune exécution de commande système
- Lecture filesystem restreinte au `directory` fourni par le client
- Validation des noms d'agents via `SAFE_NAME_RE` (`/^[a-z0-9][a-z0-9._-]*$/i`) avant tout accès disque
- Les paths de fichiers agents sont construits uniquement à partir du manifest validé (protection traversal déjà dans `validateManifest`)

**NFR-005 — Dépendances :**
- Runtime : uniquement `@modelcontextprotocol/sdk ^1.26.0` et `zod ^3.x`
- Zéro autre dépendance npm runtime
- Node 20+, ESM pur (`"type": "module"`)

**NFR-006 — Maintenabilité :**
- Le serveur MCP est un thin wrapper sur les modules existants — aucune logique métier dupliquée
- Modifications de `registry.mjs`, `recommender.mjs`, `lock.mjs` NE doivent pas nécessiter de changements dans le serveur MCP (sauf signature d'API cassante)

---

## 6. Définitions des Tools

| Nom | Description | Inputs (Zod) | Output | Priorité |
|-----|-------------|--------------|--------|----------|
| `search_agents` | Recherche textuelle dans le registry (name, description, tags, category) | `{ query: z.string().min(1).max(200) }` | `AgentEntry[]` — liste des agents matchant la recherche | P0 |
| `get_agent` | Récupère les métadonnées complètes d'un agent par son nom exact | `{ name: z.string().min(1).max(100) }` | `AgentEntry` ou erreur `NOT_FOUND` | P0 |
| `list_agents` | Liste tous les agents, avec filtre optionnel par catégorie | `{ category: z.string().optional() }` | `AgentEntry[]` — tous les agents ou ceux de la catégorie | P0 |
| `list_packs` | Liste les 15 packs thématiques avec leurs agents membres | `{}` (aucun input) | `Record<packName, PackDef & { agents: AgentEntry[] }>` | P0 |
| `recommend_agents` | Recommandation intelligente basée sur la stack détectée et/ou un prompt utilisateur. Retourne ≤ 10 suggestions scorées. | `{ directory: z.string().optional(), prompt: z.string().max(2000).optional() }` — au moins un des deux requis | `Suggestion[]` triées par score desc, chacune `{ agent, score, reasons, sources }` | P0 |
| `check_agent_states` | Retourne l'état de chaque agent du manifest dans un projet (`new` / `installed` / `outdated` / `unknown`) | `{ directory: z.string().optional() }` | `Record<name, AgentState>` | P1 |
| `verify_integrity` | Vérifie que les fichiers agents installés correspondent aux hashes du lock file | `{ directory: z.string().optional() }` | `{ ok: string[], mismatch: string[], missing: string[] }` | P1 |

**Notes d'implémentation :**
- `recommend_agents` : si `directory` est absent, utilise uniquement le `prompt` (mode prompt-only, weights `{ stack: 0, intent: 1.0, tools: 0 }`). Si `directory` est présent mais `prompt` absent, utilise uniquement la stack détectée.
- `list_agents` : si `category` est fournie mais inconnue, retourne un tableau vide (pas une erreur).
- Tous les tools retournent les données sérialisées en JSON dans le champ `content` de la réponse MCP de type `text`.

---

## 7. Définitions des Resources

| URI | Type | Description | Mime-type |
|-----|------|-------------|-----------|
| `opencode-agents://manifest` | Static | Manifest JSON complet — version, repo, agent_count, catégories, agents, packs | `application/json` |
| `opencode-agents://categories` | Static | Index des 10 catégories avec `label`, `icon`, `description` et liste des agents membres | `application/json` |
| `opencode-agents://agents/{name}` | Dynamic (template) | Contenu markdown brut du fichier agent. `{name}` doit passer la validation `SAFE_NAME_RE`. Erreur `NOT_FOUND` si l'agent est inconnu. | `text/markdown` |
| `opencode-agents://packs` | Static | Index des 15 packs thématiques avec `label`, `description`, `agents[]` | `application/json` |

**Notes d'implémentation :**
- `opencode-agents://agents/{name}` lit le fichier `.md` depuis le répertoire `agents/` du package installé (pas depuis le projet de l'utilisateur). Le chemin est résolu via `agent.path` dans le manifest.
- Les Resources statiques sont servies depuis le manifest en mémoire — pas de lecture disque à chaque appel.
- Le URI template `opencode-agents://agents/{name}` doit être déclaré avec `server.resource()` et une `ResourceTemplate`.

---

## 8. Distribution et intégration

### Décision : Option A — bin supplémentaire dans le package existant

**Choix : Option A**, ajout d'un second `bin` entry `opencode-agents-mcp` dans `package.json`.

**Justification :**
- Un seul `npm install -g opencode-agents` installe à la fois le CLI et le MCP server
- Pas de désynchronisation de version entre registry et serveur MCP — ils partagent le même `manifest.json` et les mêmes modules
- Overhead de maintenance minimal : pas de second `package.json`, `CHANGELOG`, pipeline de release
- `npx opencode-agents-mcp` fonctionne immédiatement sans installation globale

**Option B écartée** : un package séparé aurait un semver indépendant qui divergerait inévitablement du registry. Les bugs de compatibilité cross-package sont plus coûteux que le léger avantage de séparation.

### Entrée bin à ajouter dans `package.json`

```json
{
  "bin": {
    "opencode-agents": "./bin/cli.mjs",
    "opencode-agents-mcp": "./bin/mcp.mjs"
  }
}
```

### Configurations clients

#### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "npx",
      "args": ["-y", "opencode-agents-mcp"]
    }
  }
}
```

#### OpenCode (`.opencode/config.json` ou config globale)

```json
{
  "mcp": {
    "servers": {
      "opencode-agents": {
        "command": "npx",
        "args": ["-y", "opencode-agents-mcp"]
      }
    }
  }
}
```

#### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "opencode-agents": {
      "command": "npx",
      "args": ["-y", "opencode-agents-mcp"],
      "env": {
        "OPENCODE_AGENTS_LOG_LEVEL": "warn"
      }
    }
  }
}
```

#### Installation globale (alternative à npx)

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

## 9. Configuration

Le serveur est **zero-config** — aucun fichier de configuration requis. Tout est contrôlable via variables d'environnement.

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `OPENCODE_AGENTS_LOG_LEVEL` | `warn` | Niveau de log : `debug`, `info`, `warn`, `error`, `silent`. Les logs vont sur `stderr` (ne pollue pas stdio MCP). |
| `OPENCODE_AGENTS_MAX_RESULTS` | `10` | Nombre maximum de résultats retournés par `search_agents` et `recommend_agents`. Plage valide : 1–50. |

**Principe :** les valeurs par défaut sont conçues pour un usage silencieux en production. `LOG_LEVEL=debug` est réservé au développement du serveur MCP lui-même.

---

## 10. Métriques de succès

### Adoption

- ≥ 3 clients MCP distincts configurés et validés par des tests d'intégration documentés
- Instructions de config publiées dans le README pour chaque client supporté
- `npx opencode-agents-mcp` fonctionne en < 5s (incluant le download npm si absent du cache)

### Techniques

| Métrique | Cible | Méthode de mesure |
|----------|-------|-------------------|
| Cold start p95 | < 500ms | `time node ./bin/mcp.mjs` × 10 runs |
| Latence tools registry p95 | < 200ms | MCP Inspector, 100 appels consécutifs |
| Latence `recommend_agents` p95 | < 2s | MCP Inspector, directory réel ~500 fichiers |
| Error rate sur inputs invalides | 0% crash | Suite fuzzing MCP Inspector |
| Taille du bundle (node_modules ajoutés) | < 5MB | `du -sh node_modules` delta |

### Critère de "done"

- [ ] 0 crash sur la suite complète MCP Inspector (inputs valides + invalides + edge cases)
- [ ] Compatibilité validée manuellement sur Claude Desktop, Cursor et OpenCode
- [ ] Tous les 7 tools et 4 resources répondent correctement aux scénarios des User Stories
- [ ] `npm test` passe sans régression sur les tests existants

---

## 11. Hors périmètre

Ce qui est explicitement **exclu de la v1** :

- **Write operations** : installation, désinstallation, mise à jour d'agents depuis le MCP. Le serveur est read-only.
- **Transport HTTP/SSE** : stdio couvre 100% des clients cibles. HTTP sera envisagé en v2 si la demande émerge.
- **Authentification** : le registry est public. Pas de token, pas d'OAuth.
- **Registry distant** : uniquement le `manifest.json` embarqué dans le package. Pas de fetch HTTP vers GitHub ou un CDN.
- **Notifications push MCP** (`notifications/resources/updated`, etc.) : pas de watch sur le manifest.
- **Agent composition** : orchestration, chaining, ou exécution d'agents hors scope.
- **Interface interactive** : pas de TUI, pas de prompts interactifs dans le MCP server.
- **Support Windows garanti** : testé best-effort. Encoding CRLF et chemins Windows non validés en v1.

---

## 12. Questions ouvertes

| # | Question | Owner | Date cible |
|---|----------|-------|------------|
| Q-01 | **Option A vs B confirmée ?** La décision est prise (Option A) mais doit être validée avant le premier commit pour éviter de restructurer le repo en cours de route. | dmicheneau | Avant premier commit |
| Q-02 | **`get_agent` + contenu markdown : Tool ou Resource uniquement ?** Actuellement `get_agent` (Tool) retourne les métadonnées et `opencode-agents://agents/{name}` (Resource) retourne le markdown. Faut-il un tool `get_agent_content` qui combine les deux pour les clients qui ne supportent pas les Resources ? | dmicheneau | Sprint 1 |
| Q-03 | **Stratégie de versioning serveur vs registry.** Le serveur est dans le même package (version `8.x.x`). Si on publie une correction du MCP server sans toucher le registry, on bump le patch. Acceptable ? Ou faut-il un champ `mcp_version` séparé dans les métadonnées du serveur ? | dmicheneau | Avant publication npm |
| Q-04 | **Support Windows stdio.** Le transport stdio MCP peut avoir des comportements différents sur Windows (CRLF, UTF-8 BOM, handles). Tester sur Windows en v1 ou documenter comme "unsupported" et attendre les retours utilisateurs ? | dmicheneau | Fin Sprint 1 |
| Q-05 | **Faut-il exposer `recommend_agents` sans aucun des deux paramètres ?** Actuellement, au moins `directory` ou `prompt` est requis. Un appel sans paramètre pourrait retourner une sélection éditoriale des agents les mieux notés / les plus populaires — utile comme "discovery" pour un LLM qui ne sait pas par où commencer. | dmicheneau | Sprint 1 |
