# Tâches v4 — Pipeline de synchronisation continue

> Détail des tâches pour le plan v4. Chaque tâche est traçable par son identifiant.

## Axe 1 — Stabilisation & CI (priorité haute)

### S1 — Vérification et push

- [x] S1.1 Vérification visuelle du TUI (10 onglets, scrolling, packs, recherche)
- [x] S1.2 Push sur GitHub (branche main)
- [x] S1.3 Validation des 4 jobs CI (test, test-cli, lint, validate-agents)
- [x] S1.4 Correction des erreurs CI éventuelles
- [x] S1.5 Vérifier que le workflow sync-agents.yml est syntaxiquement valide (actionlint)

## Axe 2 — Pipeline d'alimentation continue (priorité haute)

### S2 — Workflow de synchronisation automatique

- [x] S2.1 Revue et finalisation du workflow `.github/workflows/sync-agents.yml`
  - SHA pins vérifiés (checkout v6.0.2, setup-python v6.2.0 via Dependabot)
  - Permissions contents:write + pull-requests:write au job-level ✅
  - 3 MAJOR fixes appliqués : GITHUB_TOKEN scopé, ${{ }} injection removed, defaults.run.shell
  - 6 MINOR fixes : fetch-depth:1, label fallback, args quoting, concurrency repo-scoped
- [x] S2.2 Créer `scripts/update-manifest.py` (321 lignes, stdlib only)
  - Lit manifest sync (.opencode/agents/manifest.json) + root (manifest.json)
  - Fusionne avec préservation totale des champs manuels (tags, description, packs)
  - Nouveaux agents marqués `[NEEDS_REVIEW]`, source `aitmpl`
  - Détection agents obsolètes (source aitmpl absents du sync)
  - CLI complet : --root-manifest, --sync-manifest, --dry-run, -v, --metadata-output
  - Écritures atomiques (tempfile + os.replace)
  - Exit codes : 0=success, 1=error, 2=sync manifest not found
- [x] S2.3 Tests pour `update-manifest.py` — **37 tests** dans `tests/test_update_manifest.py`
  - TestCategoryMap (5) : direct, remap, unknown, completeness, logging
  - TestJsonIO (8) : load/save, atomic, unicode, dirs creation
  - TestMergeManifests (13) : empty, new, preserve, remap, sort, count, stale detection
  - TestUpdateManifest (8) : basic, exit codes, dry-run, idempotent, preserves metadata
  - TestCLI (3) : dry-run, no-metadata, missing sync
- [x] S2.4 Test local du workflow (simulation bout en bout réussie)
- [x] S2.5 Premier run du workflow sur GitHub (workflow_dispatch manuel) — dry-run ✅ 25s
- [x] S2.6 Cron déjà actif (hebdomadaire lundi 06h UTC) — vérifié, READMEs mis à jour
- [x] S2.7 Notification PM : --reviewer ajouté au gh pr create dans sync-agents.yml
- [x] S2.8 Revue sécurité du workflow intégrée dans S2.1 (injection-safe, token scoping, fork detection)

### S3 — Gestion des permissions et curation

- [ ] S3.1 Définir le processus de curation pour les nouveaux agents
  - Critères d'acceptation (C1-C6 du plan)
  - Template de revue dans la PR
  - Labels GitHub (needs-curation, auto-sync, reviewed)
- [ ] S3.2 Créer un mapping de permissions par défaut par catégorie
  - Agents `languages/` : read+write+edit, bash deny, task allow
  - Agents `devops/` : read+write+edit+bash, task allow
  - etc.
- [ ] S3.3 Documenter les critères de curation dans CONTRIBUTING.md ou README

## Axe 3 — Expansion du catalogue (priorité moyenne)

### S4 — Vague 1 d'expansion (→ 70 agents) ✅

- [x] S4.1 Sync --tier extended (86 agents candidats téléchargés)
- [x] S4.2 Triage Product Manager : 14 ACCEPT / 72 REJECT (taux 16.3%)
  - ACCEPT : swift-expert, data-engineer, data-analyst, mlops-engineer, vue-expert,
    angular-architect, accessibility, sre-engineer, microservices-architect, qa-expert,
    diagram-architect, security-engineer, ux-researcher, business-analyst
- [x] S4.3 Nettoyage manifest : supprimé 72 rejetés, corrigé 14 retenus (catégories, paths, descriptions, tags)
- [x] S4.4 Nettoyage fichiers .md : supprimé 214 fichiers, déplacé 3, vérifié 70 OK
- [x] S4.5 Ajout 6 nouveaux packs : data-stack, ml-to-production, frontend-complete, ship-it-safely, product-discovery, architecture-docs
- [x] S4.6 Mise à jour READMEs FR/EN (compteurs 70 agents, 15 packs, 418 tests)
- [x] S4.7 Vérification des tests (cible : 418 tests)

## Décisions à trancher

- [x] D16 Fréquence du cron sync → **hebdomadaire lundi 06h UTC** (Option B)
- [x] D17 Scope du sync automatique → **core seul** (cron), extended via workflow_dispatch
- [x] D18 Auto-merge → **Non, review manuelle systématique** (Option A, période rodage)
- [x] D19 Agents supprimés upstream → **flaggés en PR, pas auto-supprimés**
- [x] D20 Architecture update-manifest.py — patch incrémental (préserve curated, ajoute nouveaux, détecte stale)

## Axe 4 — Polish TUI (priorité haute)

### S5 — Corrections et améliorations TUI

- [x] S5.1 Fix `--help` : exemple `--category languages,database` → `--category languages,data-api`
- [x] S5.2 Fix display glitches : `CLEAR_TO_END` dans flush() + `highlight` (inverse+bold)
- [x] S5.3 Améliorer surbrillance curseur : `highlight` = inverse+bold (7;1) adapté tous thèmes
- [x] S5.4 Fix onglet Packs : Space → drill-in (même action que Enter)
- [x] S5.5 Agents installés : `detectInstalled()` + indicateur ✔ vert dim + refresh post-install
- [x] S5.6 Vérification : 418/418 tests ✅ + code review (2 HIGH, 2 MEDIUM corrigés)

### S6 — Redesign visuel TUI (style Finder)

- [x] S6.1 Colored tabs par catégorie (TAB_COLORS, 14 couleurs ANSI distinctes)
- [x] S6.2 Catégories colorées dans la liste agents (CAT_COLORS, 12 couleurs)
- [x] S6.3 Barre de surbrillance pleine largeur fond bleu (bgRow, bgRowBold via reApplyBg)
- [x] S6.4 Code review findings corrigés (8/8)
  - H1 : Fix collision couleur packs/mobile (cyan → orange pour mobile)
  - M3 : Fix highlight bar gap aux bordures dans bdr()
  - L1 : Suppression dead export `highlight`
  - L2 : Suppression dead import `bgRowBold` dans renderer
  - L3 : Extraction helper `nameStyle()` (3 occurrences → 1 helper)
  - M1 : Commentaire invariant ASCII-only pour padEndAscii
  - M2 : 9 nouveaux tests (bgRow, catColor, tabColor + régression H1)
- [x] S6.5 Vérification : 427/427 tests ✅

## Séquencement

| Phase | Tâches | Pré-requis | Sessions |
|-------|--------|------------|----------|
| 1. Stabilisation | S1.1-S1.5 | — | 1 |
| 2. Pipeline sync | S2.1-S2.8, S3.1-S3.3 | S1 terminé | 2-3 |
| 3. Expansion | S4.1-S4.6 | S2 terminé | 1-2 |
| 4. TUI polish | S5.1-S5.6 | S4 terminé | 1 |
| 5. TUI redesign | S6.1-S6.5 | S5 terminé | 1 |
