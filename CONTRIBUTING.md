# Contribuer à OpenCode Agent Template

Bienvenue et merci de vouloir contribuer ! Ce projet est un registre curé de **44 agents IA** pour [OpenCode](https://opencode.ai), synchronisés depuis [aitmpl.com](https://www.aitmpl.com/agents). Toute contribution — correction de bug, nouvel agent ou amélioration — est la bienvenue.

## Comment contribuer

Il y a trois façons principales de contribuer :

### 1. Signaler un bug

Vous avez trouvé un problème ? [Ouvrez une issue](../../issues/new?template=bug_report.md) en utilisant le template **Bug Report**. Décrivez le problème, les étapes pour le reproduire et le comportement attendu.

### 2. Proposer un nouvel agent

Vous souhaitez ajouter un agent au registre ? [Créez une demande](../../issues/new?template=agent_request.md) avec le template **Demande d'agent**, ou suivez directement le guide ci-dessous pour ouvrir une PR.

### 3. Améliorer un agent existant

Vous pouvez modifier le prompt d'un agent, ajuster ses permissions, ou améliorer le script de synchronisation `scripts/sync-agents.py`. Consultez le [README](README.md) pour comprendre l'architecture du projet.

---

## Ajouter un agent synchronisé

Pour ajouter un agent provenant de la source [aitmpl.com](https://www.aitmpl.com/agents), suivez ces étapes :

### Étape 1 — Vérifier la source

Confirmez que l'agent existe dans le registre source sur [aitmpl.com/agents](https://www.aitmpl.com/agents). Notez son nom exact et sa catégorie.

### Étape 2 — Ajouter au dictionnaire `CURATED_AGENTS`

Ouvrez `scripts/sync-agents.py` et ajoutez une entrée dans le dictionnaire `CURATED_AGENTS` :

```python
CURATED_AGENTS: Dict[str, str] = {
    # ...agents existants...
    "nom-de-lagent": "catégorie-source/nom-de-lagent",
}
```

### Étape 3 — Vérifier le mapping de catégorie

Assurez-vous que la catégorie source est présente dans `CATEGORY_MAPPING`. Si la catégorie n'existe pas encore, ajoutez le mapping vers le sous-répertoire OpenCode approprié :

```python
CATEGORY_MAPPING: Dict[str, str] = {
    # ...mappings existants...
    "nouvelle-catégorie": "sous-répertoire",
}
```

### Étape 4 — Lancer la synchronisation

```bash
python3 scripts/sync-agents.py --force
```

### Étape 5 — Vérifier le résultat

Inspectez le fichier généré dans `.opencode/agents/<catégorie>/` :

- Le frontmatter YAML est valide (description, mode, permission)
- Le header `<!-- Synced from aitmpl.com -->` est présent
- Le contenu du prompt est correctement converti

### Étape 6 — Lancer les tests

```bash
python3 tests/run_tests.py
```

### Étape 7 — Ouvrir une PR

Créez une branche, commitez vos changements et ouvrez une Pull Request en suivant le [template de PR](.github/PULL_REQUEST_TEMPLATE.md).

---

## Créer un agent custom (non synchronisé)

Vous pouvez créer un agent personnalisé qui ne sera pas écrasé par la synchronisation.

### Étape 1 — Créer le fichier

Créez un fichier `.md` dans le sous-répertoire approprié de `.opencode/agents/` :

```bash
# Exemple : agent custom dans la catégorie languages
touch .opencode/agents/languages/zig-pro.md
```

### Étape 2 — Respecter le format frontmatter

Le fichier doit commencer par un frontmatter YAML valide :

```yaml
---
description: "Expert Zig, systèmes haute performance"
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
  task:
    "*": allow
---

Tu es un expert en Zig...
```

### Étape 3 — Ne PAS ajouter le header de synchronisation

Les agents custom ne doivent **pas** contenir le commentaire `<!-- Synced from aitmpl.com -->`. Ce header est réservé aux agents synchronisés et sert au script `--clean` pour identifier les fichiers à supprimer lors d'un nettoyage.

### Étape 4 — Lancer les tests

```bash
python3 tests/run_tests.py
```

---

## Conventions

### Nommage des fichiers

- Utiliser le format **`kebab-case`** pour tous les fichiers d'agents (ex. `typescript-pro.md`, `code-reviewer.md`)

### Mode des agents

- **`primary`** pour les agents à la racine de `.opencode/agents/` (navigables avec `Tab`)
- **`subagent`** pour les agents dans les sous-répertoires (invocables via `@catégorie/nom`)

### Permissions

- Utiliser **`permission:`** uniquement dans le frontmatter
- Ne **jamais** utiliser le champ `tools:` (déprécié par OpenCode)
- Se référer aux [profils de permissions](README.md#système-de-permissions) dans le README

### Langue

- Documentation et commentaires en **français**
- Les prompts d'agents restent en anglais (conformément à la source)

### Script de synchronisation

- **Python stdlib uniquement** — aucune dépendance externe (pas de pip)
- Compatible Python 3.8+

---

## Checklist avant de soumettre une PR

Avant d'ouvrir votre Pull Request, vérifiez les points suivants :

- [ ] Le fichier d'agent est au format **`kebab-case.md`**
- [ ] Le frontmatter YAML est valide (description, mode, permission)
- [ ] Le champ `permission:` est utilisé (pas `tools:`)
- [ ] Le mode est correct (`primary` à la racine, `subagent` dans un sous-répertoire)
- [ ] Les tests passent : `python3 tests/run_tests.py`
- [ ] La synchronisation fonctionne : `python3 scripts/sync-agents.py --force` (si agent synchronisé)
- [ ] Le `manifest.json` est à jour (généré automatiquement par le script)
- [ ] Pas de secrets ou tokens dans les fichiers commités

---

## Code de conduite

Ce projet adhère au [Contributor Covenant](CODE_OF_CONDUCT.md). En participant, vous vous engagez à respecter ses termes. Tout comportement inacceptable peut être signalé via les [issues du projet](https://github.com/dmicheneau/opencode-template-agent/issues).

---

Merci pour votre contribution !
