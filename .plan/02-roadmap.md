# 🗺️ Roadmap

## Phase 0 — Fondation ✅ (Fait)

- [x] Analyser les 399 agents de aitmpl.com
- [x] Analyser le format OpenCode (agents, permissions, config)
- [x] Découvrir le format `permission:` moderne (vs `tools:` déprécié)
- [x] Découvrir les nested agents (subdirectories)
- [x] Créer le script de synchronisation `sync-agents.py`
- [x] Curer 43 agents pertinents (4 primary + 40 subagents)
- [x] Organiser en 11 catégories de sous-répertoires
- [x] Générer tous les fichiers agents au format OpenCode
- [x] Rédiger le README.md complet
- [x] Créer le plan de projet (.plan/)
- [x] Documenter la stratégie 3 niveaux (04-agent-tiers.md)

## Phase 1 — Stabilisation ✅ (Fait)

- [x] **Tests de validation** : 70 tests (20 agents + 44 fonctions pures + 6 edge cases), tous verts
- [x] **Tests d'invocation** : validé via tests + usage réel en session
- [x] **Ajuster les permissions** : fix web agents (write:allow), migration permission: only, bash:ask
- [x] **Nettoyer les system prompts** : fix artefact `Specifically:.` dans 27 agents
- [x] **Ajouter un .gitignore** approprié
- [x] **Premier commit + push** : 3 commits (initial + sprint 0 + sprint 1)
- [x] **Valider `OPENCODE_CONFIG_DIR`** : install.sh avec --dry-run, détection config existante
- [x] **Revues par agents spécialisés** :
  - [x] Revue code (code-reviewer) — 7.5/10
  - [x] Audit sécurité (security-auditor) — 5.5/10 risque → fixes appliqués
  - [x] Revue produit (product-manager) — 5.9/10 → améliorations Sprint 1-2
  - [x] Revue documentation (documentation-engineer) — 7.2/10 → fixes appliqués

## Phase 1.5 — Extension Tier 2 ✅ (Fait — Phase 1.5a)

> Voir [04-agent-tiers.md](04-agent-tiers.md) pour le détail de la stratégie 3 niveaux.

- [x] **Curation Tier 2** : 90 agents sélectionnés parmi 413 (27 catégories source)
- [x] **Ajouter `EXTENDED_AGENTS`** : 90 agents dans le script sync (1332 lignes total)
- [x] **Ajouter flag `--tier`** : core (43) | extended (133) | all (413+)
- [x] **Mapper les nouvelles catégories** : 13 nouveaux mappings (27 total), +specialist/, +mcp/
- [x] **Profil de permissions `unknown`** : read-only par défaut pour agents non curés (Phase 1.5b) ✅
- [x] **Warning sur `--all`** : log warning ⚠️ quand --all/--tier=all utilisé
- [x] **Tests** : 10 nouveaux tests Tier 2 (80 total, tous verts)
- [x] **Documentation** : README FR/EN, .plan/ mis à jour avec tiers

## Phase 2 — Enrichissement ✅ (Fait — agents Finder reportés)

- [x] **Ajouter des agents manquants** :
  - `docker-specialist` ✅ (multi-stage builds, sécurité, Compose, BuildKit)
  - `ci-cd-engineer` ✅ (GitHub Actions, GitLab CI, déploiement)
  - `linux-admin` ✅ (systemd, réseau, hardening, scripting)
  - `redis-specialist` ✅ (structures, clustering, caching)
  - `aws-specialist` ✅ (services core, Well-Architected, coûts)
- [ ] ~~**Créer des agents personnalisés** spécifiques au projet~~ — ⏭️ Reporté (pas nécessaire pour l'instant) :
  - ~~`finder-backend` — expert du projet Finder~~
  - ~~`finder-frontend` — expert UI du projet Finder~~
  - ~~`episode-pipeline` — spécialiste du pipeline épisodique~~
- [x] **Améliorer episode-orchestrator** : 42 subagents référencés, invocation via Task(subagent_type=...)
- [x] **Ajouter des tests automatisés** :
  - Validation YAML frontmatter de chaque agent ✅ (`test_agents.py`)
  - Vérification des champs requis (description, mode, permission) ✅ (`test_agents.py`)
  - Lint des system prompts ✅ (artefacts, longueur min — `test_agents.py`)
- [x] **Script de mise à jour incrémentale** : ETags/If-Modified-Since, cache JSON, --incremental flag

## Phase 3 — Distribution (Long terme)

- [ ] **Plugin OpenCode natif** :
  - Créer un plugin npm `opencode-agent-registry`
  - Chargement d'agents depuis une URL HTTP directe
  - Cache local avec TTL configurable
  - Commande `opencode agent install @registry/typescript-pro`
- [ ] **API REST** :
  - Endpoint `/api/agents` → liste JSON de tous les agents
  - Endpoint `/api/agents/{category}/{name}` → contenu markdown
  - Hébergé sur Cloudflare Workers ou Vercel Edge
  - Permet le chargement dynamique sans cloner le repo
- [ ] **Interface web** :
  - Catalogue navigable des agents
  - Aperçu du system prompt
  - Bouton "Installer dans OpenCode"
  - Stats d'utilisation
- [ ] **Contribution communautaire** :
  - Template de PR pour ajouter un agent
  - CI/CD de validation automatique
  - Publication automatique après merge
- [ ] **Versionning des agents** :
  - Tags Git pour les releases
  - Changelog par agent
  - Possibilité de pin une version spécifique

## Phase 4 — Écosystème (Vision)

- [ ] **Multi-source** : supporter d'autres registres que aitmpl.com
- [ ] **Agent marketplace** : plateforme de partage d'agents OpenCode
- [ ] **Agent composer** : outil pour créer des agents visuellement
- [ ] **Agent analytics** : métriques d'utilisation et d'efficacité
- [ ] **Agent chains** : orchestration déclarative de chaînes de sous-agents
