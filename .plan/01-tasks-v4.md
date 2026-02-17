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

- [ ] S2.1 Revue et finalisation du workflow `.github/workflows/sync-agents.yml`
  - Vérifier les SHA pins des actions
  - Vérifier les permissions (contents: write, pull-requests: write)
  - Tester le workflow en mode dry-run manuellement
- [ ] S2.2 Créer `scripts/update-manifest.py` — pont entre le manifest sync et le manifest.json projet
  - Lire le manifest généré par sync-agents.py
  - Fusionner avec le manifest.json principal (préserver tags, descriptions, packs manuels)
  - Ajouter les nouveaux agents avec marqueur `[NEEDS_REVIEW]`
  - Ne jamais écraser les champs manuels (tags, packs, descriptions enrichies)
- [ ] S2.3 Ajouter des tests pour `update-manifest.py`
  - Test de fusion sans conflit
  - Test de détection de nouveaux agents
  - Test de préservation des champs manuels
  - Test de marqueur `[NEEDS_REVIEW]`
- [ ] S2.4 Tester le workflow complet en local (act ou simulation)
- [ ] S2.5 Premier run du workflow sur GitHub (workflow_dispatch manuel)
- [ ] S2.6 Activer le cron (hebdomadaire lundi 06h UTC)
- [ ] S2.7 Documenter le processus de revue des PRs de sync dans le README
- [ ] S2.8 Revue sécurité du workflow (token scope, UNKNOWN_PERMISSIONS, path traversal)

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

### S4 — Vague 1 d'expansion (→ ~70 agents)

- [ ] S4.1 Identifier et valider les 14 agents candidats de la vague 1
  - swift-specialist, dart-flutter-developer, scala-pro
  - vue-developer, angular-architect, svelte-developer
  - mongodb-specialist, mysql-pro
  - gcp-specialist, azure-specialist
  - electron-developer
  - technical-pm, solutions-architect
  - accessibility-specialist
- [ ] S4.2 Assigner les catégories pour chaque nouvel agent
- [ ] S4.3 Exécuter le sync pour les agents validés
- [ ] S4.4 Mettre à jour manifest.json, packs, README
- [ ] S4.5 Créer un pack `mobile` (mobile-developer, dart-flutter-developer, ui-designer, typescript-pro, test-automator)
- [ ] S4.6 Vérifier tous les tests (cible : 400+ tests)

## Décisions à trancher

- [ ] D16 Fréquence du cron sync (hebdo lundi 06h UTC vs quotidien)
- [ ] D17 Scope du sync automatique (core seul vs core+extended)
- [ ] D18 Auto-merge pour mises à jour d'agents existants ?
- [ ] D19 Seuil pour créer de nouvelles catégories (>15 agents ?)
- [ ] D20 Architecture update-manifest.py (patch incrémental vs rebuild complet)

## Séquencement

| Phase | Tâches | Pré-requis | Sessions |
|-------|--------|------------|----------|
| 1. Stabilisation | S1.1-S1.5 | — | 1 |
| 2. Pipeline sync | S2.1-S2.8, S3.1-S3.3 | S1 terminé | 2-3 |
| 3. Expansion | S4.1-S4.6 | S2 terminé | 1-2 |
