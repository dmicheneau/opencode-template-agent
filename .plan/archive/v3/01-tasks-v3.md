# Plan v3 — Tâches détaillées

> Deux axes : **Intégration agents** (6 agents) et **TUI interactive** (4 phases).
> Effort : S < 30min | M < 1h | L > 1h

---

## Axe 1 — Intégration agents

### A1 — Créer la catégorie MCP (1 session)

- [x] **A1.1** — Ajouter la catégorie `mcp` dans `manifest.json` (id, label, icon, description)
  - Fichiers : `manifest.json` | Effort : **S**
- [x] **A1.2** — Ajouter l'icône `mcp` → `🔌` dans `CATEGORY_ICONS`
  - Fichiers : `src/display.mjs` | Effort : **S**
- [x] **A1.3** — Fetcher et convertir `mcp-protocol-specialist` depuis upstream
  - Fichiers : `.opencode/agents/mcp/mcp-protocol-specialist.md` (nouveau)
  - Critère : frontmatter OpenCode (mode: subagent, permission: *), mapping WebSearch → webfetch | Effort : **M**
- [x] **A1.4** — Fetcher et convertir `mcp-server-architect`
  - Fichiers : `.opencode/agents/mcp/mcp-server-architect.md` (nouveau) | Effort : **M**
- [x] **A1.5** — Fetcher et convertir `mcp-security-auditor`
  - Fichiers : `.opencode/agents/mcp/mcp-security-auditor.md` (nouveau) | Effort : **M**
- [x] **A1.6** — Ajouter les 3 agents au `manifest.json`
  - Critère : 3 entrées dans `agents[]` avec champs corrects | Effort : **S**
- [x] **A1.7** — Créer le pack `mcp` dans `manifest.json` (4 agents MCP, mcp-developer ajouté en A2)
  - Critère : pack `mcp` dans `packs[]`, référence les 4 agents | Effort : **S**
- [x] **A1.8** — Tests CLI (`node --test tests/cli.test.mjs`) — validation manifest
  - Critère : tous les tests passent | Effort : **S**

### A2 — Agents standards (1 session)

- [x] **A2.1** — Fetcher et convertir `mcp-developer` (275L)
  - Fichiers : `.opencode/agents/mcp/mcp-developer.md` (nouveau)
  - Critère : conversion standard, soft refs conservées | Effort : **M**
- [x] **A2.2** — Convertir `platform-engineer` (287L), catégorie devops — pas de recommandation modèle (D12)
  - Fichiers : `.opencode/agents/devops/platform-engineer.md` (nouveau) | Effort : **M**
- [x] **A2.3** — Ajouter les 2 agents au `manifest.json`
  - Effort : **S**
- [x] **A2.4** — Mettre à jour le pack `mcp` avec `mcp-developer`
  - Critère : pack `mcp` contient les 4 agents MCP | Effort : **S**
- [x] **A2.5** — Tests CLI — tous les tests passent
  - Effort : **S**

### A3 — Agent prd — scope réduit (1 session)

> **D13** : Scope réduit — génération PRD uniquement, sans intégration GitHub.
> Les outils `create_issue`, `update_issue`, `search_issues`, `list_issues` sont supprimés.

- [x] **A3.1** — Fetcher le contenu upstream de `prd` (203L)
  - Fichiers : `.opencode/agents/business/prd.md` (nouveau) | Effort : **S**
- [x] **A3.2** — Mapper les outils Claude Code → OpenCode (PRD only)
  - codebase → Read/Glob/Grep, edit → Edit, fetch → webfetch, findTestFiles → Glob
  - Supprimer : create_issue, update_issue, search_issues, list_issues, githubRepo
  - Critère : tableau de mapping complet, zéro dépendance externe | Effort : **M**
- [x] **A3.3** — Réécrire les instructions de l'agent avec les outils OpenCode
  - Critère : zéro référence aux outils Claude Code, zéro référence GitHub issues | Effort : **L**
- [x] **A3.4** — Ajouter au `manifest.json` (catégorie business)
  - Effort : **S**
- [x] **A3.5** — Tests CLI — tous les tests passent
  - Effort : **S**

### A4 — Validation finale agents (1 session)

- [x] **A4.1** — Vérifier les 56 agents dans `manifest.json` (champs complets) | Effort : **M**
- [x] **A4.2** — Vérifier les 10 catégories correctement définies | Effort : **S**
- [x] **A4.3** — Vérifier les packs (pas de dangling refs) | Effort : **S**
- [x] **A4.4** — Tests Python (`python3 tests/run_tests.py`) — 117 tests | Effort : **S**
- [x] **A4.5** — Tests CLI : adapter assertions si nombre d'agents changé
  - Fichiers : `tests/cli.test.mjs` | Effort : **M**
- [x] **A4.6** — Mettre à jour `README.md` (56 agents, 10 catégories, pack mcp) | Effort : **M**
- [x] **A4.7** — Mettre à jour `README.en.md` | Effort : **M**

---

## Axe 2 — TUI Interactive

### TUI-1 — MVP readline/promises (~250L, 1 session)

> **D10** : Option B — `node:readline/promises`. Raw mode reporté V4 si besoin validé.

- [x] **TUI-1.1** — Créer `src/tui/prompt.mjs` (~150L) : menus numérotés, sélection par numéro/nom, confirmation y/n avec `readline/promises`
  - Tests : assert menus rendus, sélection valide/invalide | Effort : **L**
- [x] **TUI-1.2** — Créer `src/tui/search.mjs` (~60L) : recherche interactive via `rl.question()`, filtrage en temps réel
  - Tests : assert filtrage résultats | Effort : **M**
- [x] **TUI-1.3** — Intégrer dans `bin/cli.mjs` — commande `tui`/`browse`, auto-détection TTY (R5)
  - Effort : **S**
- [x] **TUI-1.4** — Tests unitaires TUI-1 (~80L)
  - Effort : **M**

### TUI-2 — Navigation (~500L, 1-2 sessions)

- [x] **TUI-2.1** — Créer `src/tui/screens.mjs` (~350L) : MainMenuScreen, CategoryScreen, PacksScreen
  - Chaque écran expose handleInput(event) + render() | Effort : **L**
- [x] **TUI-2.2** — Créer `src/tui/app.mjs` (~250L) : AppState (screen stack, selected, cursor, scroll), transitions, nav Esc
  - Effort : **L**
- [x] **TUI-2.3** — Intégrer navigation : Main → Catégorie → retour, Main → Packs → retour
  - Effort : **M**
- [x] **TUI-2.4** — Tests unitaires TUI-2 (~100L) : transitions d'état, navigation stack
  - Effort : **M**

### TUI-3 — Recherche + Confirmation (~350L, 1 session)

- [x] **TUI-3.1** — Créer `src/tui/components.mjs` (~400L) : SearchInput (live filtering), ConfirmDialog (toggle --force, confirm/cancel)
  - Effort : **L**
- [x] **TUI-3.2** — Recherche depuis n'importe quel écran (touche `/`), résultats live par keystroke
  - Effort : **M**
- [x] **TUI-3.3** — Écran confirmation avant install : Enter → confirmation → install
  - Effort : **M**
- [x] **TUI-3.4** — Tests unitaires TUI-3 (~80L) : search filtering, confirm flow
  - Effort : **M**

### TUI-4 — Polish (~200L, 1 session)

- [x] **TUI-4.1** — Box drawing Unicode (─│┌┐└┘), indicateurs scroll (↑↓), barre d'aide
  - Effort : **M**
- [x] **TUI-4.2** — Gestion resize terminal (`process.stdout.on('resize')` → re-render)
  - Effort : **S**
- [x] **TUI-4.3** — Edge cases : terminal < 40×10 → erreur, NO_COLOR (sans couleurs), TERM=dumb (fallback CLI)
  - Effort : **M**
- [x] **TUI-4.4** — Tests snapshot (~70L) : capturer frames, comparer contre snapshots
  - Effort : **M**
- [x] **TUI-4.5** — Documentation TUI dans `README.md` : section usage interactif
  - Effort : **M**

---

## Non intégré

> **D14** : `github-actions-expert` analysé mais non retenu — quasi-redondant avec `ci-cd-engineer` existant.
> Cherry-picker la checklist de sécurité workflow et les clarifying questions dans `ci-cd-engineer` si pertinent.

---

## Maintenance

- [x] **M1** — Mettre à jour `PROGRESS.md` après chaque session avec notes | Effort : **S** (récurrent)

---

### A5 — Réorganisation des catégories ✅

- [x] A5.1 Revue product-manager de la proposition de taxonomie
- [x] A5.2 Restructuration manifest.json (10 catégories, réordonnancement)
- [x] A5.3 Déplacement fichiers agents (api→data-api, database→data-api, team→web)
- [x] A5.4 Mise à jour display.mjs, sync-agents.py
- [x] A5.5 Mise à jour README.md + README.en.md
- [x] A5.6 Correction prd.md (frontmatter manquant)
- [x] A5.7 Correction tests (11 edits), 358/358 passent
