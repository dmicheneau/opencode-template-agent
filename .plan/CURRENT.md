# État actuel du projet — opencode-template-agent

> Dernière mise à jour : 2026-02-20
> Progression globale : 140/191 tâches (73%)

## Prochaine action prioritaire

**S7 — Séparation agents produit / agents de développement**
- Plan : `.plan/07-agent-separation.md` (v2.1, reviewé 2×)
- Estimation : ~3h
- Status : prêt à exécuter
- Bloquant pour : S2 enrichissement

## Scopes actifs

| Scope | Status | Fichier | Priorité |
|-------|--------|---------|----------|
| **S7 — Agent Separation** | Plan prêt, 0/6 | `07-agent-separation.md` | 🔴 Bloquant |
| **S2 — Agent Enrichment** | D1 infra done, D2-D5 pending (0/36) | `s2-template.md`, `s2-quality-rubric.md` | 🟡 Bloqué par S7 |
| **V6.0 — S3 Backlog** | 7 tâches backloguées + 3 release tasks | `01-tasks-v6.md` (section S3) | 🟢 Low priority |

## Scopes terminés (archivés)

| Scope | Release | Archivé dans |
|-------|---------|-------------|
| V6.1 (Uninstall + CLI flags) | Shipped | `archive/v6/` |
| V7.0 (Permissions S4) | Shipped, 805 tests | `archive/v6/` |
| S2 D1 (Infrastructure) | Done, 866 tests | Tâches cochées dans `01-tasks-v6.md` |
| S2 Archetypes design | Applied to 70 agents | `archive/v6/s2-archetypes.md` |
| S2 Colors WCAG | Fix shipped | `archive/v6/s2-colors.md` |
| v1-v5 | Legacy | `archive/v1/` à `archive/v5/`, `archive/legacy/` |

## Fichiers de référence (actifs)

| Fichier | Rôle |
|---------|------|
| `00-plan-v6.md` | Master plan — axes S1-S6, roadmap releases |
| `01-tasks-v6.md` | Task list complète avec checkboxes |
| `02-progress-v6.md` | Tracker de progression + decision log |
| `s2-template.md` | Template universel pour l'enrichissement des agents |
| `s2-quality-rubric.md` | Grille de notation qualité (8 dimensions, seuil 3.5) |

## Comment utiliser ce répertoire

1. **Nouvelle session** → lire `CURRENT.md` en premier
2. **Comprendre le scope** → lire le fichier plan du scope actif
3. **Détails des tâches** → `01-tasks-v6.md` pour les checkboxes
4. **Historique des décisions** → `02-progress-v6.md` section Decision Log
5. **Specs de design** → `s2-template.md` et `s2-quality-rubric.md`
