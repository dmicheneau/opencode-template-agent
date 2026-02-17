# Progression du projet opencode-template-agent

> Fichier de suivi global — mis à jour à chaque session

## Résumé

| Métrique | Valeur |
|----------|--------|
| Agents | 49 installés \| 6 en attente d'intégration \| 55 cible |
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
- Estimé 9-11 sessions

## Suivi v3

| # | Tâche | Statut | Session | Notes |
|---|-------|--------|---------|-------|
| A1 | Créer catégorie mcp/ + 3 agents simples | ⬜ À faire | - | mcp-protocol-specialist, mcp-server-architect, mcp-security-auditor |
| A2 | Convertir mcp-developer + platform-engineer | ⬜ À faire | - | Standard complexity |
| A3 | Convertir prd (remapping outils) | ⬜ À faire | - | Complex — Claude Code tools → gh CLI |
| A4 | Mettre à jour manifest + packs + tests | ⬜ À faire | - | Dépend de A1-A3 |
| TUI-1 | TUI MVP (terminal + input + liste) | ⬜ À faire | - | ~800 lignes, 6 modules |
| TUI-2 | Navigation (écrans + state machine) | ⬜ À faire | - | Dépend de TUI-1 |
| TUI-3 | Recherche + confirmation | ⬜ À faire | - | Dépend de TUI-2 |
| TUI-4 | Polish + tests TUI | ⬜ À faire | - | Dépend de TUI-3 |

**Légende** : ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Annulé | ⏸️ En pause

## Décisions actives

- **D1-D8** : Voir .plan/archive/v2/02-decisions-v2.md
- **D9** ✅ : Fichiers compagnons — Option E (copy + warning header + 5MB cap + anti-symlink)
- **D10** : Nouveau — TUI zero-dependency (ANSI raw mode)
- **D11** : Nouveau — Catégorie mcp/ pour les 4 agents MCP

## Notes de session

### Session courante (2026-02-17)
- Annulation T4.0 (prototype skills)
- Archivage plan v2 dans .plan/archive/v2/
- Analyse des 9 agents demandés → 6 nouveaux, 3 déjà présents
- Analyse TUI complète → architecture 6 modules, ~1650L
- Création plan v3 et fichier de progression
