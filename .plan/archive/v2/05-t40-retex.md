# T4.0 — Retour d'experience : conversion manuelle de 3 skills

## Resume

3 archetypes upstream convertis manuellement avec succes :
- **Simple** : `clean-code` (1 fichier) — trivial
- **Standard** : `task-execution-engine` (4 fichiers, 3 dirs) — quelques minutes
- **Complexe** : `mcp-builder` (10 fichiers, 3 dirs, 172K) — quelques minutes de plus

7 skills total visibles par OpenCode apres conversion. Aucun blocage rencontre.

## Observations cles

**O1 — Frontmatter variable.** Certains skills upstream ont `allowed-tools`, `version`,
`priority` ; d'autres non. Le script doit etre tolerant et ne pas planter sur des champs inconnus.

**O2 — Path rewriting parfois absent.** `~/.claude/` → `.opencode/` trouve dans `clean-code`
mais absent dans les deux autres. Une passe systematique est safe (remplace seulement si trouve).

**O3 — Warning headers par extension.** Le systeme D9 fonctionne bien :
- `.py`, `.sh`, `.js` → `# ⚠️ ...`
- `.xml`, `.html` → `<!-- ⚠️ ... -->`
- `.md`, `.txt`, `.json` → pas de header

**O4 — Structure de repertoire preservee.** Les chemins relatifs entre SKILL.md et companions
fonctionnent automatiquement si on copie l'arborescence upstream telle quelle.

**O5 — Decouverte automatique.** OpenCode scanne `.opencode/skills/*/SKILL.md` — aucune
registration manuelle necessaire.

**O6 — Contenu non-anglais preserve.** Le chinois dans `workflow-guide.md` est copie tel quel.
Pas de traduction, pas de modification du contenu.

**O7 — Tous les types de companions valides.** `LICENSE.txt`, `requirements.txt` sont des
companions legitimes — ne pas les filtrer.

**O8 — Taille negligeable.** Le skill le plus complexe (172K, 10 fichiers) est tres loin du
cap 5MB. Pas de risque de depassement en pratique.

## Regles de conversion confirmees (checklist sync-skills.py)

- [ ] Frontmatter : garder `name` + `description`, ajouter `metadata.category`, supprimer le reste
- [ ] `name` doit correspondre exactement au nom du repertoire
- [ ] Sync header insere apres le frontmatter
- [ ] Warning header par extension sur les companions non-markdown/non-text
- [ ] Path rewriting systematique (`~/.claude/` → `.opencode/`)
- [ ] Copie recursive de la structure upstream

## Risques identifies

1. **Frontmatter malformes** — certains skills upstream pourraient avoir du YAML invalide.
   Le script doit gerer l'erreur proprement (skip + log).
2. **Symlinks** — rejetes par D9. Le script doit detecter et ignorer.
3. **Fichiers binaires** — si presents dans `scripts/`, un warning header texte les corromprait.
   Detecter via heuristique (null bytes) et copier sans modification.

## Prochaine etape

Construire `sync-skills.py` base sur `sync-agents.py` + `sync_common.py` en implementant
les regles ci-dessus.
