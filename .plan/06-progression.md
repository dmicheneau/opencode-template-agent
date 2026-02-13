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

## Session 4 (suite) — Sprint 2 : Qualité & Distribution ✅

**Date** : 2026-02-12
**Statut** : Terminé
**Agents délégués** : `test-automator` (tests), `documentation-engineer` (CONTRIBUTING, README.en), `python-pro` (install.sh)

### Backlog Sprint 2
| # | Action | Livrables | Effort | Statut |
|---|--------|-----------|--------|--------|
| S2.1 | Suite de tests unitaires complète | `tests/test_agents.py` (515L), `tests/test_sync_script.py` (448L), `tests/run_tests.py` (116L) | 2h | ✅ |
| S2.2 | Guide de contribution + templates GitHub | `CONTRIBUTING.md` (174L), `.github/ISSUE_TEMPLATE/{bug_report,agent_request,improvement}.md`, `.github/PULL_REQUEST_TEMPLATE.md` | 1h | ✅ |
| S2.3 | Script d'installation intelligent | `install.sh` (924L) — détection config, merge/symlink, `--dry-run`, `--uninstall`, shellcheck-clean | 2h | ✅ |
| S2.4 | Documentation anglaise | `README.en.md` (412L) — version autonome, lien croisé FR↔EN dans `README.md` (411L) | 1h | ✅ |

### Métriques post-Sprint 2
- **Tests** : 70 / 70 ✅ (20 validation agents + 44 fonctions pures sync + 6 edge cases)
- **Couverture fichiers** : `sync-agents.py` (toutes les fonctions pures testées), agents validés
- **Documentation** : FR + EN, CONTRIBUTING, 3 issue templates, PR template
- **Installation** : script shellcheck-clean avec 5 modes (install, uninstall, dry-run, merge, force)
- **Commits** : 3 (commit Sprint 2 à venir)
- **Fichiers ajoutés** : 9 nouveaux fichiers
- **Score estimé** : ~9/10 (vs ~8.5 post-Sprint 1)

---

## Session 5 — Phase 1.5a : Extension Tier 2 ✅

**Date** : 2026-02-13
**Statut** : Terminé
**Agents délégués** : `python-pro` (implémentation), `test-automator` (tests), `documentation-engineer` (docs)

### Backlog Phase 1.5a
| # | Action | Livrables | Effort | Statut |
|---|--------|-----------|--------|--------|
| P1.5.1 | Curation de 90 agents Tier 2 | Selection parmi 413 agents source, 27 catégories | 1h | ✅ |
| P1.5.2 | EXTENDED_AGENTS dict + --tier flag | `sync-agents.py` (+180L, 1332L total) | 2h | ✅ |
| P1.5.3 | 13 nouveaux mappings catégories | 27 mappings total (était 14) + 2 nouvelles catégories OpenCode (specialist/, mcp/) | 30min | ✅ |
| P1.5.4 | Tests Phase 1.5 | 10 nouveaux tests (80 total, tous verts) | 1h | ✅ |
| P1.5.5 | Documentation mise à jour | README FR/EN, .plan/00, .plan/01 | 1h | ✅ |

### Métriques post-Phase 1.5a
- **Agents curés** : 133 (43 core + 90 extended) sur 413 disponibles (32% de couverture)
- **Catégories OpenCode** : 13 (était 11, +specialist/, +mcp/)
- **Catégories mappées** : 27 source → 13 OpenCode
- **Tests** : 80 / 80 ✅ (20 validation agents + 50 sync fonctions + 10 tier 2)
- **Script sync** : 1332 lignes (était 1152)
- **CLI** : nouveau flag `--tier core|extended|all`, backward-compatible avec `--all`
- **Commits** : 5 (Sprint 2 + Phase 1.5)

---

## Session 5 (suite) — Phase 1.5b + Phase 2 partielles ✅

**Date** : 2026-02-13
**Statut** : Terminé
**Agents délégués** : `python-pro` (unknown profile + sync incrémentale + CI/CD), `documentation-engineer` (episode-orchestrator)

### Backlog
| # | Action | Livrables | Effort | Statut |
|---|--------|-----------|--------|--------|
| P1.5b.1 | Profil permissions `unknown` (read-only) | `UNKNOWN_PERMISSIONS` dict, détection curated/uncurated dans sync loop | 1h | ✅ |
| P2.1 | Sync incrémentale (ETags/If-Modified-Since) | `_cached_get()`, `.sync-cache.json`, `--incremental` flag | 2h | ✅ |
| P2.2 | CI/CD GitHub Actions | `.github/workflows/ci.yml` — 3 jobs parallèles (test, lint, validate-agents) | 1h | ✅ |
| P2.3 | Amélioration episode-orchestrator | Table de 42 subagents, invocation clarifiée, catégories à jour | 30min | ✅ |

### Métriques post-Phase 2 partielle
- **Script sync** : 1590 lignes (était 1332)
- **Features ajoutées** : profil unknown, sync incrémentale (ETag/304), cache JSON, CI/CD
- **CLI flags** : `--tier`, `--incremental`, `--force`, `--clean` (supprime aussi le cache)
- **CI/CD** : 3 jobs parallèles × Python 3.8/3.10/3.12 matrix
- **Episode orchestrator** : 42 subagents référencés (était 13)
- **Tests** : 80 / 80 ✅
- **Commits** : 6 (Phase 1.5b + Phase 2)

---

## Session 6 — Revue Produit v2 ✅

**Date** : 2026-02-13
**Statut** : Terminé
**Agent** : product-manager

### Actions réalisées
| # | Action | Résultat |
|---|--------|---------|
| 1 | Revue complète de tous les fichiers du projet | 44 agents, 3666 lignes de code (sync + tests + install), 6 commits analysés |
| 2 | Rédaction de la revue produit v2 | Ajoutée à `.plan/05-reviews.md` — 200+ lignes |
| 3 | Scoring actualisé sur 6 dimensions | Score produit : 8.2/10 (↑ +2.3 vs 5.9 en v1) |
| 4 | Identification du bloqueur critique unique | ❌ Pas de fichier `LICENSE` — bloqueur juridique |
| 5 | Mise à jour `02-roadmap.md` | Profil unknown ✅, tests automatisés ✅ (étaient marqués non-faits) |
| 6 | Plan d'action v1.0 | 2 P0, 4 P1, 4 P2, 3 items à couper de Phase 3 |

### Métriques post-revue v2
- **Score produit** : 8.2/10 (code: 9.0, security: 7.5, product: 8.2, docs: 8.5)
- **Items v1 résolus** : 26/28 (93%)
- **Bloqueurs v1.0** : 1 (LICENSE file)
- **Score projeté après LICENSE + rename + GIF** : 9.2/10

### Sprint de corrections (Session 6b)

**Date** : 2026-02-13
**Statut** : ✅ Complété
**Agents délégués** : `@languages/python-pro`, `@devtools/test-automator`

| # | Action | Source | Effort | Statut |
|---|--------|--------|--------|--------|
| C2 | `task: deny` dans UNKNOWN_PERMISSIONS | Security audit | 5 min | ✅ |
| C4 | `mcp media specialist` dans AGENT_SUBDIRS | Code review | 5 min | ✅ |
| C5 | 3 agents fantômes supprimés (cli-developer, frontend-developer, sql-pro) | Code review | 5 min | ✅ |
| M1-sec | Permissions git granulaires (git * → git status/diff/log/add:allow, commit:ask) | Security audit | 10 min | ✅ |
| LICENSE | Fichier MIT LICENSE créé — **bloqueur v1.0 levé** 🔓 | Product review | 2 min | ✅ |
| M4-sec | GitHub Actions pinnées aux SHA immutables (checkout@v4.3.1, setup-python@v5.6.0) | Security audit | 10 min | ✅ |
| M6-sec | `permissions: contents: read` ajouté au CI | Security audit | 2 min | ✅ |
| C1 | Helper HTTP commun `_http_request()` extrait (~150 lignes DRY) | Code review | 30 min | ✅ |
| M4-log | Logging unifié (print/stderr → logger.*) | Code review | 15 min | ✅ |
| M6+M12 | Compteurs hardcodés → dynamiques (tests + install.sh) | Code review | 10 min | ✅ |
| Tests | 37 nouveaux tests pour 5 fonctions critiques | Test audit | 30 min | ✅ |

**Métriques** :
- Tests : 80 → **117** (+37, 5 nouvelles classes)
- Couverture fonctions critiques : 0% → 100% (build_opencode_agent, _yaml_serialize_permission, sync_agent, sync_cache, clean_synced_agents)
- Score sécurité : 4.0/10 risque → estimé **2.5/10** (3 fixes sécu)
- Score produit : 8.2/10 → estimé **9.0/10** (LICENSE + qualité)
- Commit : `e9cabff` — fix: sprint corrections — address review findings from session 5

---

### Phase 2 — Agents custom (Session 6c)

**Date** : 2026-02-13
**Statut** : ✅ Complété
**Agents délégués** : `@kubernetes-specialist` (×4), `@database-architect` (×1)

| # | Action | Effort | Statut |
|---|--------|--------|--------|
| 1 | Créer `devops/docker-specialist.md` — multi-stage builds, sécurité, Compose, BuildKit | 15 min | ✅ |
| 2 | Créer `devops/ci-cd-engineer.md` — GitHub Actions, GitLab CI, déploiement | 15 min | ✅ |
| 3 | Créer `devops/linux-admin.md` — systemd, réseau, hardening, scripting | 15 min | ✅ |
| 4 | Créer `database/redis-specialist.md` — structures, clustering, caching | 15 min | ✅ |
| 5 | Créer `devops/aws-specialist.md` — services core, Well-Architected, coûts | 15 min | ✅ |
| 6 | Agents Finder custom (finder-backend, finder-frontend, episode-pipeline) | — | ⏭️ Reporté |

**Métriques** :
- Agents custom : 1 → **6** (+5 agents, 4 devops + 1 database)
- Tests : 117/117 ✅ (pas de régression)
- Commit : `60536a0` — feat: phase 2 — add 5 custom agents
- **Phase 2 complétée** ✅

---

## Session 7 — Phase 3 : CLI npm `npx opencode-agents` ✅

**Date** : 2026-02-12  
**Objectif** : Créer un CLI npm zero-dependency pour installer les agents à la carte

### Réalisations

| # | Tâche | Tests | État |
|---|-------|-------|------|
| 1 | Architecture CLI ESM (bin/cli.mjs, src/{registry,installer,display}.mjs) | 30 tests | ✅ |
| 2 | Manifest enrichi (49 agents, 12 catégories, 8 packs, tags) | — | ✅ |
| 3 | Commandes : install, list, search avec options --category, --pack, --all | 30 tests | ✅ |
| 4 | ANSI display avec NO_COLOR support | 2 tests | ✅ |
| 5 | Download sécurisé (HTTPS only, User-Agent, error handling) | — | ✅ |
| 6 | Documentation : CODE_OF_CONDUCT.md, README polish | — | ✅ |

**Métriques** :
- CLI : 4 fichiers, ~800 lignes, zero npm dependencies
- Tests CLI : 30/30 ✅
- Tests Python : 117/117 ✅ (pas de régression)
- Commits : `6245015` (CLI), `3632c83` (roadmap), `8047b41` (docs)
- **Phase 3 (CLI) complétée** ✅

---

## Session 8 — Sprint corrections CLI (double revue sécurité) ✅

**Date** : 2026-02-13  
**Objectif** : Corriger les findings de la double revue code-reviewer (7.4/10) + security-auditor (7/10 risque)

### Corrections appliquées

| # | Finding | Sévérité | Correction | Tests |
|---|---------|----------|------------|-------|
| C1 | Path traversal dans installer | 🔴 Critique | `resolve()` + `startsWith(safeBase + sep)` guard | 3 tests |
| C2 | Redirections HTTP illimitées | 🔴 Critique | Max 5 redirects + domain allowlist | 2 tests |
| C3 | Pas de limite taille réponse | 🔴 Critique | Cap 1MB avec destruction requête | 1 test |
| M1 | `NO_COLOR` non respecté | 🟡 Majeur | Support `NO_COLOR` env + `TERM=dumb` | 2 tests |
| M2 | User-Agent hardcodé `1.0.0` | 🟡 Majeur | Version dynamique depuis package.json | 1 test |
| M3 | Imports/exports inutilisés | 🟡 Majeur | Supprimé `red`, `boldRed`, 17 exports | — |
| M4 | Pas de validation manifest | 🟡 Majeur | `validateManifest()` avec regex + checks | 5 tests |
| M5 | Tests sécurité manquants | 🟡 Majeur | +17 tests sécurité et I/O | 17 tests |
| M6 | package.json incomplet | 🟡 Majeur | author, homepage, bugs, prepublishOnly | 1 test |

**Métriques** :
- Score code-reviewer estimé : 7.4 → **9+/10**
- Score security-auditor estimé : 7/10 risque → **3/10 risque**
- Tests CLI : 30 → **47** (+17 sécurité/I/O)
- Tests totaux : **164/164** ✅ (47 CLI + 117 Python)
- Commit : `1052113` — fix: security hardening
- **Sprint corrections complété** ✅

---

## Session 9 — Multi-pack, README rewrite, CI Node.js ✅

**Date** : 2026-02-13  
**Objectif** : Améliorer le CLI (multi-pack), réécrire les README, compléter la CI

### Réalisations

| # | Tâche | Tests | État |
|---|-------|-------|------|
| 1 | Multi-pack/multi-category install (`--pack backend,devops`) | +8 tests | ✅ |
| 2 | Support virgules + espaces pour multi-value flags | — | ✅ |
| 3 | Gardes : flags vides, exclusivité mutuelle --all/--pack/--category | +4 tests | ✅ |
| 4 | Helpers DRY : `deduplicateAgents()`, `formatLabel()` | — | ✅ |
| 5 | Revue de code (6/10 → 9+/10) — 9 findings corrigés | — | ✅ |
| 6 | Réécriture README FR + EN (536 → 174 lignes, user-focused) | — | ✅ |
| 7 | CI : ajout job test-cli (Node 18/20/22) | — | ✅ |
| 8 | Repo passé en public | — | ✅ |
| 9 | Tag v1.1.0 | — | ✅ |

**Métriques** :
- Tests CLI : 47 → **59** (+12 : multi-pack, edge-cases, exclusivité)
- Tests totaux : **176/176** ✅ (59 CLI + 117 Python)
- README : **-67%** de lignes (536 → 174)
- CI : **4 jobs** (test Python, test-cli Node, lint, validate-agents)
- Commits : 3 (feat multi-pack, docs README, ci test-cli)
- Tags : v1.0.0, **v1.1.0**
