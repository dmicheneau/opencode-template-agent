## Description

Décrivez les changements apportés par cette PR. Expliquez le **pourquoi** et le **comment**.

Fixes # (numéro d'issue si applicable)

## Type de changement

- [ ] 🐛 Correction de bug
- [ ] 🤖 Ajout d'un nouvel agent (synchronisé)
- [ ] ✨ Ajout d'un agent custom (non synchronisé)
- [ ] 📝 Amélioration d'un agent existant (prompt, permissions)
- [ ] 🔧 Modification du script de synchronisation
- [ ] 📖 Documentation
- [ ] ♻️ Refactoring (pas de changement fonctionnel)
- [ ] 🧪 Tests

## Checklist

- [ ] Le frontmatter YAML des agents est valide (description, mode, permission)
- [ ] Le champ `permission:` est utilisé (pas `tools:`)
- [ ] Le nommage est en `kebab-case`
- [ ] Le mode est correct (`primary` à la racine, `subagent` dans un sous-répertoire)
- [ ] Les tests passent : `python3 tests/run_tests.py`
- [ ] La synchronisation fonctionne (si applicable) : `python3 scripts/sync-agents.py --force`
- [ ] Pas de secrets ou tokens commités
- [ ] La documentation est à jour (si nécessaire)

## Agents modifiés

Listez les agents ajoutés, modifiés ou supprimés :

- 

## Captures d'écran / Logs

Si applicable, ajoutez des captures d'écran ou des extraits de logs.
