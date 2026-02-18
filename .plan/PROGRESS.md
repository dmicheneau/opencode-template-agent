# Progression du projet opencode-template-agent

> Fichier de suivi global — mis à jour à chaque session

## Résumé

| Métrique | Valeur |
|----------|--------|
| Agents | 70 installés (cible v4 atteinte ✅) |
| Tests | 250 JS + 177 Python = 427 tests |
| Packs | 15 (9 originaux + 6 nouveaux) |
| Commits | ~25 + 15 + session 8 commits |
| Version du plan | v4 (en cours) — v3 terminé, archivé |

## Historique des versions

### v1 (archivée dans .plan/archive/v1/)
- Plan initial, 7 fichiers
- Architecture de base du CLI et du manifest

### v2 (archivée dans .plan/archive/v2/)
- 6 fichiers : plan, tâches, décisions, revues produit/technique, retex T4.0
- Réalisations :
  - P1 ✅ : Extraction de sync_common.py (23 exports, -426 lignes dans sync-agents.py)
  - P2 ✅ : Hardening rate-limit (Retry-After HTTP-date, caps, guards)
  - P3 ✅ : Décision D9 — fichiers compagnons (Option E: copy + safety guards)
  - T4.0 ❌ : Prototype conversion skills — annulé (sera repris plus tard)
  - Revue de code P1+P2 ✅ : 9 corrections appliquées (C1, C2, M1, M2/S1, m1, m2, m4, S2, S3)

### v3 (terminé — archivé dans .plan/archive/v3/)
- 2 workstreams : intégration de 6 agents + TUI
- **Cible atteinte : 56 agents, 10 catégories, 9 packs**

### v4 (en cours — .plan/00-plan-v4.md)
- 4 axes : stabilisation CI, pipeline de sync continue, expansion catalogue, TUI polish
- Pipeline GitHub Actions pour détection automatique de nouveaux agents
- Cible : 70 agents ✅, sync automatisé hebdomadaire, TUI sans glitches

## Suivi v3

| # | Tâche | Statut | Session | Notes |
|---|-------|--------|---------|-------|
| A1 | Créer catégorie mcp/ + 3 agents simples | ✅ Terminé | S4 | mcp-protocol-specialist, mcp-server-architect, mcp-security-auditor |
| A2 | Convertir mcp-developer + platform-engineer | ✅ Terminé | S4 | Standard complexity |
| A3 | Convertir prd (remapping outils) | ✅ Terminé | S4 | Scope réduit — PRD only (D13) |
| A4 | Mettre à jour manifest + packs + tests | ✅ Terminé | S4-S5 | 56 agents, 10 catégories, 9 packs |
| TUI-1 | TUI MVP (readline/promises) | ✅ Terminé | S4 | 6 modules dans src/tui/ |
| TUI-2 | Navigation (écrans + state machine) | ✅ Terminé | S4 | state.mjs + screen.mjs |
| TUI-3 | Recherche + confirmation | ✅ Terminé | S4 | input.mjs + renderer.mjs |
| TUI-4 | Polish + tests TUI | ✅ Terminé | S5 | Tests CLI passent |

**Légende** : ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Annulé | ⏸️ En pause

## Suivi v4

| # | Tâche | Statut | Session | Notes |
|---|-------|--------|---------|-------|
| S1 | Stabilisation & push CI | ✅ Terminé | 6 | CI verte, TUI 10 tabs OK, prd.md fix |
| S2 | Workflow sync-agents.yml | ✅ Terminé | 7,10 | S2.1-S2.8 ✅, cron weekly actif, reviewer auto |
| S3 | Curation & permissions | ⬜ À faire | — | Critères C1-C6, labels |
| S4 | Expansion vague 1 (→70) | ✅ Terminé | 8 | 14 agents acceptés, 72 rejetés, 6 packs ajoutés |
| S5 | TUI polish & corrections | ✅ Terminé | 9 | 3 bugs + 2 features, 418 tests verts |
| S6 | Redesign visuel TUI | ✅ Terminé | 11 | Colored tabs, catColors, bgRow highlight, 427 tests |

**Légende** : ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Annulé | ⏸️ En pause

## Décisions actives

- **D1-D8** : Voir .plan/archive/v2/02-decisions-v2.md
- **D9** ✅ : Fichiers compagnons — Option E (copy + warning header + 5MB cap + anti-symlink)
- **D10** ✅ : TUI Readline MVP (pas raw mode — reporté V4)
- **D11** ✅ : Catégorie mcp/ pour 4 agents MCP
- **D12** ✅ : Pas de recommandation modèle pour platform-engineer
- **D13** ✅ : Agent prd sans fonctionnalités GitHub (PRD only)
- **D14** ✅ : github-actions-expert non intégré (redondant avec ci-cd-engineer)
- **D15** ✅ : Réorganisation catégories — fusion api+database→data-api, dissolution team→web+devtools, labels clairs, ordre par workflow développeur
- **D16** ✅ : Fréquence du cron sync — hebdomadaire lundi 6h UTC (suffisant pour le rythme upstream)
- **D17** ✅ : Scope du sync automatique — core seul en cron, extended en dispatch manuel
- **D18** ✅ : Pas d'auto-merge — toute PR sync requiert review manuelle via --reviewer
- **D19** ✅ : Agents supprimés upstream signalés en PR mais non auto-supprimés (décision manuelle)
- **D20** ✅ : Architecture update-manifest.py — patch incrémental (préserve curated, ajoute nouveaux, détecte stale)

## Notes de session

### Session 11 (2026-02-18)
- S6 ✅ : Redesign visuel TUI — style Finder/Hacker-News
  - Colored tabs par catégorie (TAB_COLORS, 14 couleurs distinctes)
  - Catégories colorées dans la liste agents (CAT_COLORS, 12 couleurs)
  - Barre de surbrillance pleine largeur fond bleu marine (bgRow, bgRowBold)
  - Code review : 8 findings corrigés (H1, M3, L1-L3, M1, M2)
  - H1 : Fix collision packs/mobile (tous deux cyan → mobile=orange)
  - M3 : Fix highlight bar gaps aux bordures
  - L1 : Suppression dead export `highlight`
  - L2 : Suppression dead import `bgRowBold` dans renderer
  - L3 : Extraction helper `nameStyle()` (3 occurrences dédupliquées)
  - M1 : Commentaire invariant ASCII-only pour padEndAscii
  - M2 : 9 nouveaux tests (bgRow×3, catColor×3, tabColor×3)
- Tests : 250 JS + 177 Python = **427 tests**
- Commit `76461d1` pushé sur main

### Session 10 (2026-02-18)
- S2.5 ✅ : Cron déjà actif (lundi 6h UTC) — READMEs mis à jour, "(à activer)" retiré
- S2.6 ✅ : PR automatique déjà implémentée (branche sync/, labels, description détaillée)
- S2.7 ✅ : Ajout `--reviewer ${{ github.repository_owner }}` au gh pr create
- Dry-run dispatch réussi (0 new, 0 modified — core à jour avec upstream)
- D16 ✅ : Weekly Monday 6am UTC (rythme upstream modéré)
- D17 ✅ : Core en cron, extended en dispatch manuel
- D18 ✅ : Pas d'auto-merge, review manuelle obligatoire
- D19 ✅ : Pas d'auto-suppression, signalement en PR
- **S2 complété** — pipeline sync entièrement opérationnel

### Session 9 (2026-02-18)
- S5 ✅ : TUI polish & corrections — 6/6 tâches complétées, 418 tests verts
  - S5.1 : Fix `--help` example (`database` → `data-api`) — CLI bugfix
  - S5.2 : Fix display glitches (`screen.mjs` flush sans clear-to-end) — TUI bugfix
  - S5.3 : Enhance highlight line (inverse trop subtil → fond coloré) — TUI feature
  - S5.4 : Fix packs tab Space action (Space sur Packs ne fait rien) — TUI bugfix
  - S5.5 : Show already-installed agents indicator dans la liste — TUI feature
  - S5.6 : Vérifier tests après corrections
- Plan v4 mis à jour → v4.1 (ajout Axe 4 TUI polish, CS11-CS12, séquencement)
- Fichiers .plan/ mis à jour (00-plan-v4.md, 01-tasks-v4.md, PROGRESS.md)

### Session 8 (2026-02-17)
- S4 ✅ : Expansion vague 1 — catalogue étendu de 56 à 70 agents
  - Sync --tier extended : 86 agents candidats téléchargés et ajoutés au manifest
  - Triage PM : 14 ACCEPT / 72 REJECT (taux sélection 16.3%)
  - 14 agents curatés : swift-expert, data-engineer, data-analyst, mlops-engineer,
    vue-expert, angular-architect, accessibility, sre-engineer, microservices-architect,
    qa-expert, diagram-architect, security-engineer, ux-researcher, business-analyst
  - Catégories corrigées pour les 14 retenus (la plupart étaient en devtools)
  - 72 agents rejetés supprimés du manifest + 214 fichiers .md nettoyés
  - 6 nouveaux packs : data-stack, ml-to-production, frontend-complete,
    ship-it-safely, product-discovery, architecture-docs
  - READMEs FR/EN mis à jour (70 agents, 15 packs, 418 tests)
  - Distribution finale : languages(11) ai(9) web(9) devops(10) devtools(8)
    business(6) data-api(5) docs(4) security(4) mcp(4)
- Tests : 241 JS + 177 Python = **418 tests**

### Session 7 (2026-02-17)
- S2.1 ✅ : Revue workflow sync-agents.yml — 3 MAJOR + 6 MINOR identifiés et corrigés
  - GITHUB_TOKEN scopé au step-level uniquement (pas job-level)
  - ${{ }} injection patterns éliminés de tous les run: blocks
  - defaults.run.shell: bash ajouté
  - fetch-depth: 0 → 1 (optimisation)
  - Label fallback ajouté pour les repos neufs
- S2.2 ✅ : Créé scripts/update-manifest.py (321 lignes, stdlib only)
  - Fusion manifest sync/root avec préservation des champs manuels
  - Détection d'agents obsolètes (source aitmpl absents du sync)
  - Écritures atomiques, CLI complet, exit codes structurés
- S2.3 ✅ : 37 tests dans tests/test_update_manifest.py (5 classes)
- S2.4 ✅ : Simulation locale bout en bout réussie
- S2.8 ✅ : Intégré dans S2.1 (injection-safe, token scoping)
- D20 ✅ : Architecture update-manifest.py = patch incrémental
- Workflow réduit de 703 → 614 lignes (extraction code inline step 6)
- Tests : 241 JS + 160 Python = **401 tests** (vs 364 précédemment)

### Session 5 — Réorganisation des catégories ✅

#### Commit
- `a53883b` refactor: reorganize categories from 12 to 10 for clearer TUI navigation

#### Changements
- Fusion `api` (2) + `database` (3) → `data-api` (5) "Data & API"
- Dissolution `team` (5) → agents redistribués dans `web` (6) et `devtools` (6)
- Renommage labels : DevTools (un mot), Languages (complet), Data & API
- Réordonnancement tabs par workflow dev : Languages→AI→Web→Data&API→DevOps→DevTools→Security→MCP→Business→Docs
- Correction frontmatter manquant dans prd.md
- 11 corrections de tests, 358/358 passent (241 JS + 117 Python)

#### Décision
- **D15** : Réorganisation catégories — fusion api+database→data-api, dissolution team→web+devtools, labels clairs, ordre par workflow développeur

### Session 4 (2026-02-17)
- Ajout agent `screenshot-ui-analyzer` (catégorie team, commit 34aa791) — hors plan v3
- Compteurs mis à jour : 49 → 50 agents, cible 55 → 56

### Session 3 (2026-02-17)
- Décisions D10-D14 tranchées
- github-actions-expert analysé → redondant, non intégré
- TUI: readline MVP validé (~250L), raw mode reporté V4
- prd: scope réduit (pas de GitHub features)

### Session 2 (2026-02-17)
- Revue technique Plan V3 complète → `.plan/05-technical-review-v3.md`
  - 8 dimensions analysées, verdict APPROVE WITH CHANGES
  - 2 risques majeurs : T1 (SIGTSTP crash recovery), T2 (ratio tests TUI 21% vs 64%)
  - 1 risque haut : R1 (remapping prd)
  - 6 risques moyens, 3 risques bas
  - Recommandations : 2 obligatoires, 7 recommandées, 4 actions agents

### Session 1 (2026-02-17)
- Annulation T4.0 (prototype skills)
- Archivage plan v2 dans .plan/archive/v2/
- Analyse des 9 agents demandés → 6 nouveaux, 3 déjà présents
- Analyse TUI complète → architecture 6 modules, ~1650L
- Création plan v3 et fichier de progression
