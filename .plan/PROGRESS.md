# Progression du projet opencode-template-agent

> Fichier de suivi global — mis à jour à chaque session

## Résumé

| Métrique | Valeur |
|----------|--------|
| Agents | 50 installés \| 6 en attente d'intégration \| 56 cible |
| Tests | 117 Python \| 59 CLI |
| Commits | ~20 |
| Version du plan | v3 |

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

### v3 (en cours — .plan/00-plan-v3.md)
- 2 workstreams : intégration de 6 agents + TUI
- Estimé 7-9 sessions

## Suivi v3

| # | Tâche | Statut | Session | Notes |
|---|-------|--------|---------|-------|
| A1 | Créer catégorie mcp/ + 3 agents simples | ⬜ À faire | - | mcp-protocol-specialist, mcp-server-architect, mcp-security-auditor |
| A2 | Convertir mcp-developer + platform-engineer | ⬜ À faire | - | Standard complexity |
| A3 | Convertir prd (remapping outils) | ⬜ À faire | - | Complex — Claude Code tools → gh CLI |
| A4 | Mettre à jour manifest + packs + tests | ⬜ À faire | - | Dépend de A1-A3 |
| TUI-1 | TUI MVP (readline/promises) | ⬜ À faire | - | ~250 lignes, 3 modules |
| TUI-2 | Navigation (écrans + state machine) | ⬜ À faire | - | Dépend de TUI-1 |
| TUI-3 | Recherche + confirmation | ⬜ À faire | - | Dépend de TUI-2 |
| TUI-4 | Polish + tests TUI | ⬜ À faire | - | Dépend de TUI-3 |

**Légende** : ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Annulé | ⏸️ En pause

## Décisions actives

- **D1-D8** : Voir .plan/archive/v2/02-decisions-v2.md
- **D9** ✅ : Fichiers compagnons — Option E (copy + warning header + 5MB cap + anti-symlink)
- **D10** ✅ : TUI Readline MVP (pas raw mode — reporté V4)
- **D11** ✅ : Catégorie mcp/ pour 4 agents MCP
- **D12** ✅ : Pas de recommandation modèle pour platform-engineer
- **D13** ✅ : Agent prd sans fonctionnalités GitHub (PRD only)
- **D14** ✅ : github-actions-expert non intégré (redondant avec ci-cd-engineer)

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
