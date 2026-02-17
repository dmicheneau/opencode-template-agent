# Plan V3 — Agents MCP + TUI Interactive ✅

> Version : 3.0 | Date : 2026-02-17 | **Statut : TERMINÉ**
> Consolide deux axes : intégration de 6 nouveaux agents + développement TUI
> Ancien plan archivé dans `.plan/archive/v2/`

## Contexte actuel

- **56 agents, 10 catégories, 9 packs** (cible atteinte)
- CLI non-interactive (list/search/install) + TUI interactif
- Zero npm deps, Node.js 20+ ESM only
- Scripts Python sync (stdlib only)
- ~25 commits, 241 JS + 117 Python = 358 tests

## Axe 1 — Intégration agents (6 nouveaux)

3 agents demandés existent déjà (golang-pro, scrum-master, technical-writer). 6 à créer :

| Agent | Catégorie | Lignes | Complexité | Notes |
|-------|-----------|--------|------------|-------|
| `mcp-protocol-specialist` | mcp (NEW) | 37 | Simple | WebSearch → webfetch |
| `mcp-server-architect` | mcp | 74 | Simple | Outils standard |
| `mcp-security-auditor` | mcp | 70 | Simple | Coexiste avec security-auditor général |
| `mcp-developer` | mcp | 275 | Standard | Refs souples vers autres agents |
| `platform-engineer` | devops | 287 | Standard | Pas de recommandation modèle (D12) — modèle choisi au niveau session |
| `prd` | business | 203 | Standard | Scope réduit — génération PRD uniquement, sans intégration GitHub (D13) |

Nouvelle catégorie `mcp` avec 4 agents. Total : **56 agents, 10 catégories** ✅ (cible atteinte).

> **Non intégré** : `github-actions-expert` analysé mais non retenu — redondant avec `ci-cd-engineer` (D14).

### Tâches d'intégration (ordonnées) — ✅ TOUTES TERMINÉES

| # | Tâche | Dépend | Statut |
|---|-------|--------|--------|
| A1 | Créer catégorie `mcp/` — manifest.json + icônes display | — | ✅ |
| A2 | Convertir 3 agents MCP simples (parallel) | A1 | ✅ |
| A3 | Convertir mcp-developer + platform-engineer | A1 | ✅ |
| A4 | Convertir prd — scope réduit, PRD only (D13) | A1 | ✅ |
| A5 | Mettre à jour manifest.json + packs (nouveau pack `mcp`) | A2-A4 | ✅ |
| A6 | Valider tous les tests CLI avec manifest mis à jour | A5 | ✅ |

## Axe 2 — TUI Interactive

Transformer le CLI en TUI interactive tout en **préservant le CLI existant** (non-breaking).

### Architecture

- 6 modules dans `src/tui/` (~1 000 lignes total)
- Zero nouvelles dépendances
- `node:readline/promises` pour l'interaction utilisateur (D10)
- Détection TTY automatique

### Phases TUI

**TUI-1 : MVP** (~250L, 1 session)
- `prompt.mjs` — menus numérotés, sélection par numéro/nom, confirmation y/n avec `readline/promises` (~150L)
- `search.mjs` — recherche interactive via `rl.question()`, filtrage en temps réel (~60L)
- Commande `tui`/`browse` dans cli.mjs, auto-detect TTY
- Gestion propre des sorties (SIGINT, exceptions)
- Raw mode reporté en V4 si le besoin est validé (D10)

**TUI-2 : Navigation** (~500L, 1-2 sessions)
- `screens.mjs` — menu principal, détail catégorie, vue packs (~350L)
- `app.mjs` — machine à états, pile d'écrans (~250L)
- Drill-down catégories avec flèches
- Vue packs avec listes d'agents dépliables

**TUI-3 : Recherche + Confirmation** (~350L, 1 session)
- `components.mjs` — input recherche, dialogue confirmation (~400L)
- Filtrage live (keystroke par keystroke)
- Écran de confirmation install avec résumé agent
- Toggle `--force` depuis l'écran de confirmation

**TUI-4 : Polish** (~200L, 1 session)
- Box drawing, indicateurs scroll, barre d'aide
- Gestion resize terminal
- Edge cases (petits terminaux, NO_COLOR, TERM=dumb)
- Tests snapshot des frames rendus

### Stratégie de tests TUI (~350 lignes)

- Tests unitaires par module (mock stdin/stdout)
- Parser keypress : injection octets bruts → assert events
- Composants : assert tableaux de chaînes rendus
- Machine à états : injection events → assert transitions

## Séquencement

Les deux axes sont **indépendants** et peuvent s'entrelacer :

| Phase | Tâche | Sessions | Dépend |
|-------|-------|----------|--------|
| **A1** | Catégorie mcp/ + 3 agents simples | 1 | — |
| **A2** | mcp-developer + platform-engineer | 1 | A1 |
| **TUI-1** | MVP (readline/promises) | 1 | — |
| **A3** | prd (remapping complexe) | 1 | A1 |
| **A4** | Manifest, packs, tests | 1 | A1-A3 |
| **TUI-2** | Navigation (screens + state machine) | 1-2 | TUI-1 |
| **TUI-3** | Recherche + confirmation | 1 | TUI-2 |
| **TUI-4** | Polish + tests | 1 | TUI-3 |

**Total estimé : 7-9 sessions**

## Contraintes

- Zero npm deps — **obligatoire**
- Python stdlib only pour les scripts
- Node.js 20+ ESM only
- Agents permission-based (jamais `tools:` deprecated)
- Documentation en français (+ version EN)

## Risques

| # | Risque | Sévérité | Mitigation |
|---|--------|----------|------------|
| R1 | Remapping prd (outils Claude Code sans équivalent direct) | 🟡 | Scope réduit (D13) — PRD only, pas d'intégration GitHub |
| R2 | Choix modèle platform-engineer (opus demandé, sonnet par défaut) | ✅ Résolu | D12 — pas de recommandation modèle |
| R3 | TUI raw mode — compatibilité terminals (Windows Terminal, iTerm) | ✅ Résolu | D10 — readline/promises, raw mode reporté V4 |
| R4 | Scope creep TUI → maintenir le cap sur 4 phases | 🟡 | Pas de features hors scope sans nouveau plan |

## Critères de succès

- [x] 56 agents, 10 catégories
- [x] TUI auto-lancé via `npx github:dmicheneau/opencode-template-agent` (détection TTY)
- [x] CLI existant préservé (non-breaking)
- [x] TUI : parcourir catégories → sélectionner agents → installer (flux E2E)
- [x] Tous les tests passent (Python + CLI + TUI)
- [x] Nouveau pack `mcp` disponible

## Post-plan — Notes de maintenance

- **D15** : Categories reorganized from 12→10 (api+database→data-api, team dissolved→web+devtools)
