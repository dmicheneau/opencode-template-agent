# 📈 Journal de progression

> Suivi chronologique de toutes les actions réalisées sur le projet.
> Mis à jour après chaque sprint ou session de travail.

---

## Session 1 — Phase 0 : Fondation

**Date** : 2026-02-11
**Durée** : ~4h

### Actions réalisées
| # | Action | Résultat |
|---|--------|---------|
| 1 | Fetch et analyse de aitmpl.com/agents | SPA JS, données dans `components.json` (>5MB), 399 agents dans 27 catégories |
| 2 | Analyse du format OpenCode | Documentation officielle + DeepWiki. Format `permission:` (pas `tools:`), nested agents |
| 3 | Échantillonnage de ~15 agents source | Compréhension du format Claude Code (frontmatter YAML + markdown body) |
| 4 | Curation de 43 agents sur 399 | Critères : pertinence dev, qualité prompt, couverture langages, complémentarité |
| 5 | Création de `sync-agents.py` v1 | Python stdlib, fetch GitHub API, conversion Claude Code → OpenCode |
| 6 | Première synchronisation | 43 agents écrits à plat dans `.opencode/agents/` |
| 7 | README.md v1 | Documentation en français |

### Erreurs découvertes dans v1
- `tools:` est **déprécié** → doit utiliser `permission:` uniquement
- Les nested agents existent → sous-répertoires par catégorie
- Le mapping permissions était plat → doit être intelligent (4 profils)

---

## Session 2 — Phase 0 : Correction majeure (v2)

**Date** : 2026-02-11
**Durée** : ~3h

### Actions réalisées
| # | Action | Résultat |
|---|--------|---------|
| 1 | Réécriture complète de `sync-agents.py` v2 | 1059 lignes, `permission:` only, `CATEGORY_MAPPING`, `build_permissions()` intelligent, flags `--clean`/`--force` |
| 2 | Nettoyage + re-sync | `--clean --force` → 43 anciens plats supprimés, 43 nouveaux en sous-répertoires |
| 3 | README.md v2 | Nouvelle architecture documentée |
| 4 | Création de `.plan/` | 4 fichiers : synthèse, architecture, roadmap, ADRs |
| 5 | Discussion stratégie 3 niveaux | Core 43 / Extended ~150 / All 399. Validé par l'utilisateur |

---

## Session 3 — Plans + Revues + Sprint 0

**Date** : 2026-02-12
**Durée** : ~2h

### Plans créés/mis à jour
| Fichier | Action |
|---------|--------|
| `.plan/04-agent-tiers.md` | ✅ Créé — Stratégie 3 niveaux détaillée |
| `.plan/02-roadmap.md` | ✅ Mis à jour — Phase 1.5 Extension Tier 2 ajoutée |
| `.plan/03-decisions.md` | ✅ Mis à jour — ADR-006 Stratégie 3 niveaux |
| `.plan/05-reviews.md` | ✅ Créé — Consolidation des 4 revues agents |

### Revues par agents spécialisés (4 en parallèle)
| Agent | Score | Findings |
|-------|-------|----------|
| code-reviewer | 7.5/10 | 1 critique, 5 majeurs, 6 mineurs |
| security-auditor | 5.5/10 risque | 1 critique (CVSS 7.5), 3 élevés, 4 moyens |
| product-manager | 5.9/10 | 5 P0 bloqueurs, 5 P1, 5 P2 |
| documentation-engineer | 7.2/10 | 2 critiques, 5 majeurs, 6 mineurs |

### Commits
| Hash | Message |
|------|---------|
| `8e939ba` | `feat: initial commit — 43 curated OpenCode agents + sync script + plan` |

### Sprint 0 — Corrections urgentes ✅
| # | Fix | Statut | Détail |
|---|-----|--------|--------|
| S0.1 | `.gitignore` racine | ✅ | `.env`, `__pycache__/`, `*.pyc`, `.DS_Store`, éditeurs |
| S0.2 | `bash: "ask"` dans `opencode.json` | ✅ | Remplacé `"allow"` → `"ask"` (H-03) |
| S0.3 | Validation path traversal | ✅ | 2 checks : `discover_all_agents()` + `sync_agent()` (C-01) |
| S0.4 | Fix regex `Specifically:.` | ✅ | Déplacé nettoyage avant "ensure period", 27 agents régénérés, 0 artefacts |
| S0.5 | `episode-orchestrator.md` → `permission:` only | ✅ | Retiré `tools:`, ajouté profil complet, refs `@category/name` |
| S0.6 | Nettoyage `opencode.json` | ✅ | Retiré memoai, semgrep, playwright, vitest (configs personnelles) |

**Commit** : `fix: sprint 0 — security + quality fixes from agent reviews`

---

## Session 4 — Sprint 1 : Stabilisation ✅

**Date** : 2026-02-12
**Statut** : Terminé
**Agents délégués** : `python-pro` (code), `documentation-engineer` (docs)

### Backlog Sprint 1
| # | Action | Source | Effort | Statut |
|---|--------|--------|--------|--------|
| S1.1 | Supprimé `architect-reviewer` fantôme de `CURATED_AGENTS` | docs M2 | 5 min | ✅ |
| S1.2 | Ajouté retry (3×, backoff) + rate-limit + taille max 1Mo à `_raw_get()` | code C1 | 30 min | ✅ |
| S1.3 | DRY `build_permissions()` — appelé 1 seule fois, passé via paramètre | code M2 | 15 min | ✅ |
| S1.4 | `SafeRedirectHandler` bloque les redirections cross-origin (token protégé) | security H-02 | 30 min | ✅ |
| S1.5 | Permissions web agents corrigées (nextjs, react : write:allow, edit:ask) | product P1.4 | 15 min | ✅ |
| S1.6 | Paramètre `source_path` inutilisé supprimé de `build_opencode_agent()` | code M5 | 5 min | ✅ |
| S1.7 | Chiffres unifiés : 44 agents (43 sync + 1 custom) dans README + plans | docs M1 | 15 min | ✅ |
| S1.8 | 5 profils de permissions alignés entre README, architecture et synthèse | docs M3 | 15 min | ✅ |
| S1.9 | Version Python unifiée sur 3.8+ (script, ADR-005, README) | docs M4 | 5 min | ✅ |
| S1.10 | Taille téléchargements limitée à 1 Mo (intégré dans S1.2) | security L-01 | — | ✅ |

### Métriques post-Sprint 1
- **Agents synced** : 43 / 43 curés, 0 échec, 0 fantôme ✅
- **Agents total** : 44 (43 sync + 1 custom)
- **Agents avec artefact `Specifically:.`** : 0 / 43 ✅
- **Web agents avec permissions correctes** : 2/2 ✅ (write:allow, edit:ask)
- **Commits** : 3
- **Issues critiques restantes** : 0
- **Issues majeures restantes** : 0
- **Score moyen estimé** : ~8.5/10 (vs 6.5/10 pré-S0)

---

## Légende

| Symbole | Signification |
|---------|--------------|
| ✅ | Terminé |
| 🔄 | En cours |
| ⬜ | À faire |
| ❌ | Abandonné / bloqué |
| 🔴 | Critique |
| 🟡 | Majeur |
| 🟢 | Mineur |
