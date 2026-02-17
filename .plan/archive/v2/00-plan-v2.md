# Plan V2 — Skills Sync + CI Automatisée

> Version : 2.1 | Date : 2026-02-13
> Mis à jour suite aux revues produit (03) et technique (04)
> Ancien plan archivé dans `.plan/archive/v1/`

## Vision

Étendre le registre d'agents OpenCode pour intégrer les **686 skills** du repo
`davila7/claude-code-templates` (aitmpl.com) en tant que **skills OpenCode**
(`.opencode/skills/`), et mettre en place une **CI automatisée** qui scanne
périodiquement les sources pour détecter et intégrer les nouveaux composants.

## Contexte

### Acquis (Plan V1)
- ✅ 49 agents OpenCode (43 synced + 6 custom) dans `.opencode/agents/`
- ✅ Script de sync Python (`sync-agents.py`, 1590L, stdlib only)
- ✅ CLI npm zero-deps (`npx github:dmicheneau/opencode-template-agent`)
- ✅ CI GitHub Actions (4 jobs, SHA-pinned)
- ✅ 176 tests verts (59 CLI + 117 Python)
- ✅ 4 skills hand-written fonctionnels (`brainstormai`, `browser-mcp`, `memory`, `sequential-thinking`)

### Nouvelles données
- **686 skills** disponibles sur aitmpl.com, répartis en 18 catégories
- Les skills sont des **répertoires** (SKILL.md + fichiers optionnels) vs agents qui sont des fichiers `.md` uniques
- Source : `cli-tool/components/skills/{category}/{skill-name}/SKILL.md`
- URL brute : `https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/skills/{category}/{skill-name}/SKILL.md`

## Décision architecturale clé

**Skills → OpenCode Skills** (pas agents).

| Critère | Skills ✅ | Agents ❌ |
|---------|----------|----------|
| Fit sémantique | "Comment faire X" = injection d'instructions | "Tu es X" = définition de persona |
| Modèle de chargement | On-demand via `skill` tool | Toujours listés dans le contexte |
| Impact à l'échelle | Seuls les skills chargés consomment du contexte | 686 agents bloateraient la liste (43→729) |
| Distance de format | SKILL.md → SKILL.md (réécriture minimale) | SKILL.md → Agent .md (réécriture complète) |
| Support multi-fichiers | ✅ Répertoires avec fichiers compagnons | ❌ Un seul .md par agent |

## Phases (réordonnées suite aux revues R2)

| Phase | Contenu | Priorité | Sessions |
|-------|---------|----------|----------|
| **Phase 4 LITE** | Pré-requis (`sync_common.py`) + `sync-skills.py` + 10-15 skills curés manuellement | 🔴 Haute | 3-4 |
| **Phase 4b** | Smoke test : valider 5 skills en sessions OpenCode réelles | 🟡 Moyenne | 0.5 |
| **Phase 6** | CLI : commandes `install --skill`, catalogue skills | 🔴 Haute | 2-3 |
| **Phase 5** | CI automatisée `sync.yml` (agents + skills, cron hebdo, PR auto) | 🟡 Moyenne | 3-4 |
| **Phase 7** | Tier 2 extended (~120 skills on-demand) + scoring automatique basé sur données d'usage | 🟡 Moyenne | 2-3 |

**Changements vs plan initial** :
- ⚡ **Phase 6 ↔ Phase 5 inversées** (R2) — valeur utilisateur avant infra opérationnelle
- ⚡ **Phase 4 allégée** — hand-pick 10-15 skills au lieu de scoring 5-facteurs (R1)
- ⚡ **Phase 4b ajoutée** — smoke test avant scaling (R8)
- ⚡ **Scoring reporté à Phase 7** — basé sur données réelles, pas gut-feel (R1)

**Total estimé : ~11-15 sessions** (vs ~14-18 initial)

## Métriques de succès

- [ ] ≥10 skills core installés et fonctionnels dans `.opencode/skills/`
- [ ] Smoke test validé : 5 skills testés en sessions OpenCode réelles
- [ ] CLI supportant l'installation de skills (`install --skill`)
- [ ] CI sync hebdomadaire créant des PR automatiques
- [ ] 0 régression sur les 49 agents existants
- [ ] Tests de validation pour chaque skill synced
- [ ] `sync_common.py` extrait — 0 duplication de code HTTP/cache/parse

## Pré-requis bloquants identifiés par la revue technique

| # | Action | Effort | Bloque |
|---|--------|--------|--------|
| **P1** | Extraire `scripts/sync_common.py` (~430 lignes réutilisables) | 1-2 sessions | T4.1 |
| **P2** | Ajouter fallback 429 sans Retry-After dans `_http_request()` | 30 min | T4.1 |
| **P3** | Décider du traitement des fichiers `scripts/` (copier, renommer `.txt`, ou exclure) | 15 min | T4.1 |

## Risques critiques à surveiller

| # | Risque | Sévérité | Mitigation |
|---|--------|----------|------------|
| C1 | Duplication code sync-agents/sync-skills | 🔴 | P1 : extraire `sync_common.py` |
| C2 | CLI `installer.mjs` incompatible download répertoires | 🔴 | Refactoring structurel en Phase 6 |
| C3 | Rate limiting sous-estimé (2000+ vs 936 appels) | 🔴 | P2 + délai inter-fichier + API blobs |
| C4 | Fichiers `scripts/` exécutables = surface d'attaque | 🔴 | P3 + cap 5MB + guard anti-symlink |
