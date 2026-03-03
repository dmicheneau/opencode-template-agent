# État actuel du projet — opencode-template-agent

> Dernière mise à jour : 2026-02-23
> Progression globale : 191/191 tâches (100%)

## Prochaine action prioritaire

**Remaining items (non-blocking):**
- `V6.0-R3` — Final full test run (JS + Python)
- `S1.11` — Visual TUI testing (manual flicker verification)
- `S8` — OpenCode Plugin plan ready for approval → see `08-opencode-plugin.md`

## Scopes actifs

| Scope | Status | Fichier | Priorité |
|-------|--------|---------|----------|
| **V6.0 — Release Tasks** | R1 ✅ R2 ✅, only R3 (final test run) remains | `01-tasks-v6.md` (section V6.0 Release) | 🟢 Low priority |
| **S8 — OpenCode Plugin** | 🟡 Draft | `08-opencode-plugin.md` | High |

## Scopes terminés (archivés)

| Scope | Release | Archivé dans |
|-------|---------|-------------|
| S7 Agent Separation | Done, 6/6, 874 tests | `07-agent-separation.md` |
| V6.1 (Uninstall + CLI flags) | Shipped | `archive/v6/` |
| V7.0 (Permissions S4) | Shipped, 805 tests | `archive/v6/` |
| Code Review (scripts+tests+skills+shell) | COMPLETE — 20 files, 96 issues fixed | `02-progress-v6.md` |
| S2 Agent Enrichment | COMPLETE — 70/70 agents enriched (avg 4.80) | `02-progress-v6.md` |
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
| `08-opencode-plugin.md` | Plan plugin OpenCode — discovery tools v1 |

## Comment utiliser ce répertoire

1. **Nouvelle session** → lire `CURRENT.md` en premier
2. **Comprendre le scope** → lire le fichier plan du scope actif
3. **Détails des tâches** → `01-tasks-v6.md` pour les checkboxes
4. **Historique des décisions** → `02-progress-v6.md` section Decision Log
5. **Specs de design** → `s2-template.md` et `s2-quality-rubric.md`
