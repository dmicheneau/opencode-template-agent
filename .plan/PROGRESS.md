# Progression du projet opencode-template-agent

> Fichier de suivi global — mis à jour à chaque session

## Résumé

| Métrique | Valeur |
|----------|--------|
| Agents | 56 installés \| 0 en attente \| 56 cible ✅ |
| Tests | 241 JS + 117 Python = 358 tests |
| Commits | ~25 + 13 session commits |
| Version du plan | v3 (terminé) |

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

### v3 (terminé — .plan/00-plan-v3.md)
- 2 workstreams : intégration de 6 agents + TUI
- **Cible atteinte : 56 agents, 10 catégories, 9 packs**

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

## Décisions actives

- **D1-D8** : Voir .plan/archive/v2/02-decisions-v2.md
- **D9** ✅ : Fichiers compagnons — Option E (copy + warning header + 5MB cap + anti-symlink)
- **D10** ✅ : TUI Readline MVP (pas raw mode — reporté V4)
- **D11** ✅ : Catégorie mcp/ pour 4 agents MCP
- **D12** ✅ : Pas de recommandation modèle pour platform-engineer
- **D13** ✅ : Agent prd sans fonctionnalités GitHub (PRD only)
- **D14** ✅ : github-actions-expert non intégré (redondant avec ci-cd-engineer)
- **D15** ✅ : Réorganisation catégories — fusion api+database→data-api, dissolution team→web+devtools, labels clairs, ordre par workflow développeur

## Notes de session

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

## Session v3.1 — Réorganisation des catégories ✅

### Commit
- `a53883b` refactor: reorganize categories from 12 to 10 for clearer TUI navigation

### Changements
- Fusion `api` (2) + `database` (3) → `data-api` (5) "Data & API"
- Dissolution `team` (5) → agents redistribués dans `web` (6) et `devtools` (6)
- Renommage labels : DevTools (un mot), Languages (complet), Data & API
- Réordonnancement tabs par workflow dev : Languages→AI→Web→Data&API→DevOps→DevTools→Security→MCP→Business→Docs
- Correction frontmatter manquant dans prd.md
- 11 corrections de tests, 358/358 passent (241 JS + 117 Python)

### Décision
- **D15** : Réorganisation catégories — fusion api+database→data-api, dissolution team→web+devtools, labels clairs, ordre par workflow développeur
