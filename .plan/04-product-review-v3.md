# Revue Produit — Plan V3

**Date** : 2026-02-17 | **Verdict** : APPROVE WITH CHANGES

## Points forts

- Catégorie MCP bien positionnée — différenciation réelle dans l'écosystème
- Les deux axes (agents/TUI) sont indépendants et interleaveables
- Agents triés par complexité croissante (3 simples → 2 standard → 1 complexe)
- CLI existant préservé (non-breaking)
- Architecture TUI modulaire (6 modules)

## Recommandations

### R1 [CRITIQUE] — TUI-1 readline au lieu de raw mode pour le MVP
Utiliser `node:readline/promises` (built-in) pour le MVP (~250L au lieu de 800L). Le raw mode crée un risque de compatibilité terminal massif. Déplacer le raw mode en V4 après validation du concept readline.

### R2 [CRITIQUE] — Estimations TUI trop optimistes
Total réaliste : 8-11 sessions pour le TUI seul (vs 5-7 estimé). Plan V3 complet : 12-15 sessions.

### R3 [MAJEUR] — Différer ou documenter `prd`
Les outils GitHub (create_issue, etc.) mappés vers `gh` CLI présupposent `gh` installé et authentifié. Documenter la dépendance explicitement ou reporter au V4.

### R4 [MAJEUR] — Stratégie de version + CHANGELOG absente
Ajouter CHANGELOG.md, workflow de release, stratégie semver.

### R5 [MAJEUR] — Auto-lancement TUI sur TTY
`npx opencode-agents` sans commande devrait auto-lancer le TUI en mode interactif (5 lignes, 10x découvrabilité).

### R6 [MINEUR] — Sort du workstream Skills non résolu
Ajouter une ligne explicite : "Skills sync reporté au V4."

### R7 [MINEUR] — Valider complémentarité pack MCP
Vérifier que les 4 agents MCP sont complémentaires et non redondants avant de créer le pack.

### R8 [MINEUR] — platform-engineer dans pack devops
Ajouter platform-engineer au pack devops existant.

### R9 [MINEUR] — Section "What's New" README
Ajouter une section nouveautés pour chaque version.

## Questions ouvertes

1. Base d'utilisateurs actuelle ? (npm downloads, GitHub stars)
2. Modèle pour platform-engineer (opus vs sonnet) ?
3. Veille sur les releases OpenCode pour compatibilité outils ?
4. Migration vers `npx opencode-agents` (npm public) ?
5. Validation fonctionnelle du contenu des agents ?
6. Coût de maintenance TUI zero-dep à long terme ?
