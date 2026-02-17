# Plan v3 — Tâches détaillées

> Deux axes : **Intégration agents** (6 agents) et **TUI interactive** (4 phases).
> Effort : S < 30min | M < 1h | L > 1h

---

## Axe 1 — Intégration agents

### A1 — Créer la catégorie MCP (1 session)

- [ ] **A1.1** — Ajouter la catégorie `mcp` dans `manifest.json` (id, label, icon, description)
  - Fichiers : `manifest.json` | Effort : **S**
- [ ] **A1.2** — Ajouter l'icône `mcp` → `🔌` dans `CATEGORY_ICONS`
  - Fichiers : `src/display.mjs` | Effort : **S**
- [ ] **A1.3** — Fetcher et convertir `mcp-protocol-specialist` depuis upstream
  - Fichiers : `.opencode/agents/mcp/mcp-protocol-specialist.md` (nouveau)
  - Critère : frontmatter OpenCode (mode: subagent, permission: *), mapping WebSearch → webfetch | Effort : **M**
- [ ] **A1.4** — Fetcher et convertir `mcp-server-architect`
  - Fichiers : `.opencode/agents/mcp/mcp-server-architect.md` (nouveau) | Effort : **M**
- [ ] **A1.5** — Fetcher et convertir `mcp-security-auditor`
  - Fichiers : `.opencode/agents/mcp/mcp-security-auditor.md` (nouveau) | Effort : **M**
- [ ] **A1.6** — Ajouter les 3 agents au `manifest.json`
  - Critère : 3 entrées dans `agents[]` avec champs corrects | Effort : **S**
- [ ] **A1.7** — Créer le pack `mcp` dans `manifest.json` (4 agents MCP, mcp-developer ajouté en A2)
  - Critère : pack `mcp` dans `packs[]`, référence les 4 agents | Effort : **S**
- [ ] **A1.8** — Tests CLI (`node --test tests/cli.test.mjs`) — validation manifest
  - Critère : tous les tests passent | Effort : **S**

### A2 — Agents standards (1 session)

- [ ] **A2.1** — Fetcher et convertir `mcp-developer` (275L)
  - Fichiers : `.opencode/agents/mcp/mcp-developer.md` (nouveau)
  - Critère : conversion standard, soft refs conservées | Effort : **M**
- [ ] **A2.2** — Décision D12 : modèle pour `platform-engineer` (opus vs sonnet)
  - Fichiers : `PROGRESS.md` | Critère : décision documentée | Effort : **S**
- [ ] **A2.3** — Fetcher et convertir `platform-engineer` (287L), catégorie devops
  - Fichiers : `.opencode/agents/devops/platform-engineer.md` (nouveau) | Effort : **M**
- [ ] **A2.4** — Ajouter les 2 agents au `manifest.json`
  - Effort : **S**
- [ ] **A2.5** — Mettre à jour le pack `mcp` avec `mcp-developer`
  - Critère : pack `mcp` contient les 4 agents MCP | Effort : **S**
- [ ] **A2.6** — Tests CLI — tous les tests passent
  - Effort : **S**

### A3 — Agent complexe prd (1 session)

- [ ] **A3.1** — Fetcher le contenu upstream de `prd` (203L)
  - Fichiers : `.opencode/agents/business/prd.md` (nouveau) | Effort : **S**
- [ ] **A3.2** — Mapper les outils Claude Code → OpenCode
  - codebase → Read/Glob/Grep, edit → Edit, fetch → webfetch, findTestFiles → Glob
  - create_issue/update_issue/etc. → `Bash(gh issue ...)`, githubRepo → `Bash(gh repo ...)`
  - Critère : tableau de mapping complet | Effort : **M**
- [ ] **A3.3** — Réécrire les instructions de l'agent avec les outils OpenCode
  - Critère : zéro référence aux outils Claude Code | Effort : **L**
- [ ] **A3.4** — Ajouter au `manifest.json` (catégorie business)
  - Effort : **S**
- [ ] **A3.5** — Tests CLI — tous les tests passent
  - Effort : **S**

### A4 — Validation finale agents (1 session)

- [ ] **A4.1** — Vérifier les 55 agents dans `manifest.json` (champs complets) | Effort : **M**
- [ ] **A4.2** — Vérifier les 12 catégories correctement définies | Effort : **S**
- [ ] **A4.3** — Vérifier les packs (pas de dangling refs) | Effort : **S**
- [ ] **A4.4** — Tests Python (`python3 tests/run_tests.py`) — 117 tests | Effort : **S**
- [ ] **A4.5** — Tests CLI : adapter assertions si nombre d'agents changé
  - Fichiers : `tests/cli.test.mjs` | Effort : **M**
- [ ] **A4.6** — Mettre à jour `README.md` (55 agents, 12 catégories, pack mcp) | Effort : **M**
- [ ] **A4.7** — Mettre à jour `README.en.md` | Effort : **M**

---

## Axe 2 — TUI Interactive

### TUI-1 — MVP (~800L, 2 sessions)

- [ ] **TUI-1.1** — Créer `src/tui/terminal.mjs` (~200L) : enterRawMode, alternate screen, moveTo, clearScreen, getSize, cleanup
  - Tests : mock process.stdout, assert escape sequences | Effort : **L**
- [ ] **TUI-1.2** — Créer `src/tui/input.mjs` (~150L) : parseKeypress (arrows, Enter, Escape, Space, Ctrl+C, Backspace, chars)
  - Tests : injection bytes bruts → assert parsed events | Effort : **M**
- [ ] **TUI-1.3** — Créer `src/tui/renderer.mjs` (~300L) : renderScrollableList, renderStatusBar, renderHeader, viewport + scroll
  - Tests : assert string arrays rendus | Effort : **L**
- [ ] **TUI-1.4** — Point d'entrée TUI : commande `tui`/`browse` dans `bin/cli.mjs` (~15L), auto-détection TTY
  - Effort : **S**
- [ ] **TUI-1.5** — Intégration end-to-end : TUI → liste → sélection Space → install Enter, gestion SIGINT
  - Effort : **L**
- [ ] **TUI-1.6** — Callback de progression dans `src/installer.mjs` (~20L) — capturer statut sans console.log
  - Effort : **S**
- [ ] **TUI-1.7** — Tests unitaires TUI-1 (~100L) : terminal, input, renderer
  - Effort : **M**

### TUI-2 — Navigation (~500L, 1-2 sessions)

- [ ] **TUI-2.1** — Créer `src/tui/screens.mjs` (~350L) : MainMenuScreen, CategoryScreen, PacksScreen
  - Chaque écran expose handleInput(event) + render() | Effort : **L**
- [ ] **TUI-2.2** — Créer `src/tui/app.mjs` (~250L) : AppState (screen stack, selected, cursor, scroll), transitions, nav Esc
  - Effort : **L**
- [ ] **TUI-2.3** — Intégrer navigation : Main → Catégorie → retour, Main → Packs → retour
  - Effort : **M**
- [ ] **TUI-2.4** — Tests unitaires TUI-2 (~100L) : transitions d'état, navigation stack
  - Effort : **M**

### TUI-3 — Recherche + Confirmation (~350L, 1 session)

- [ ] **TUI-3.1** — Créer `src/tui/components.mjs` (~400L) : SearchInput (live filtering), ConfirmDialog (toggle --force, confirm/cancel)
  - Effort : **L**
- [ ] **TUI-3.2** — Recherche depuis n'importe quel écran (touche `/`), résultats live par keystroke
  - Effort : **M**
- [ ] **TUI-3.3** — Écran confirmation avant install : Enter → confirmation → install
  - Effort : **M**
- [ ] **TUI-3.4** — Tests unitaires TUI-3 (~80L) : search filtering, confirm flow
  - Effort : **M**

### TUI-4 — Polish (~200L, 1 session)

- [ ] **TUI-4.1** — Box drawing Unicode (─│┌┐└┘), indicateurs scroll (↑↓), barre d'aide
  - Effort : **M**
- [ ] **TUI-4.2** — Gestion resize terminal (`process.stdout.on('resize')` → re-render)
  - Effort : **S**
- [ ] **TUI-4.3** — Edge cases : terminal < 40×10 → erreur, NO_COLOR (sans couleurs), TERM=dumb (fallback CLI)
  - Effort : **M**
- [ ] **TUI-4.4** — Tests snapshot (~70L) : capturer frames, comparer contre snapshots
  - Effort : **M**
- [ ] **TUI-4.5** — Documentation TUI dans `README.md` : section usage interactif
  - Effort : **M**

---

## Maintenance

- [ ] **M1** — Mettre à jour `PROGRESS.md` après chaque session avec notes | Effort : **S** (récurrent)
