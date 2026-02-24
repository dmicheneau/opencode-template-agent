# Contribuer à OpenCode Agent Template

Ce projet est un registre curé de **67 agents IA** pour [OpenCode](https://opencode.ai). Tous les agents sont manuellement évalués et maintenus — il n'y a pas de synchronisation automatique. Les scripts de sync existent encore comme outils de découverte, rien de plus.

## Comment contribuer

### Signaler un bug

[Ouvrez une issue](../../issues/new?template=bug_report.md) avec le template **Bug Report**. Décrivez le problème, les étapes pour le reproduire et le comportement attendu.

### Améliorer un agent existant

Modifiez le prompt, ajustez les permissions, ou corrigez un problème. Consultez le [README](README.md) pour l'architecture du projet.

### Proposer un nouvel agent

[Créez une demande](../../issues/new?template=agent_request.md) avec le template **Demande d'agent**, ou ouvrez directement une PR en suivant le guide ci-dessous.

---

## Ajouter un agent

### 1 — Découverte

Deux sources d'inspiration :

- **Upstream** : `python3 scripts/sync-agents.py --list --tier=extended` pour voir ce qui existe sur [aitmpl.com](https://www.aitmpl.com/agents)
- **Observation** : vous identifiez un gap dans les 67 agents existants

### 2 — Évaluation

L'agent doit satisfaire les critères de curation (voir [Processus de curation](#processus-de-curation) plus bas). La question clé : est-ce qu'il comble un manque réel que les agents existants ne couvrent pas ?

### 3 — Rédaction

Créez un fichier `.md` dans le sous-répertoire approprié de `.opencode/agents/` :

```bash
# Exemple
touch .opencode/agents/languages/zig-pro.md
```

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
```

Structurez le prompt selon le template du projet :

1. **Workflow** — les étapes que l'agent suit quand il est invoqué
2. **Décisions** — les critères de jugement et les arbitrages
3. **Quality Gate** — les vérifications avant de considérer le travail terminé
4. **Anti-patterns** — ce que l'agent ne doit jamais faire
5. **Collaboration** — comment l'agent interagit avec les autres agents/outils

> **Optionnel** : si l'agent existe sur upstream, vous pouvez générer un squelette avec `gh workflow run "Sync Agents" -f dry_run=true`, puis le réécrire manuellement. Le squelette upstream est rarement utilisable tel quel (qualité 3-4/10 vs 8-9/10 attendu).

### 4 — Tests

```bash
python3 tests/run_tests.py
```

### 5 — PR

Créez une branche, commitez et ouvrez une Pull Request en suivant le [template de PR](.github/PULL_REQUEST_TEMPLATE.md).

---

## Processus de curation

Chaque agent est évalué selon six critères avant intégration.

### Critères C1–C6

- **C1 — Non-redondant (obligatoire)** : ne duplique pas un agent existant
- **C2 — Permissions claires (obligatoire)** : toutes les `permission:` sont explicites et justifiées
- **C3 — Prompt substantiel (recommandé)** : le prompt système fait ≥50 lignes
- **C4 — Catégorie existante (recommandé)** : correspond à une des 10 catégories (`languages`, `devtools`, `web`, `data-api`, `ai`, `security`, `devops`, `mcp`, `docs`, `business`)
- **C5 — Valeur utilisateur (recommandé)** : apporte une valeur tangible et différenciée
- **C6 — Source stable (recommandé)** : le prompt est bien conçu et maintenable dans la durée

**Scoring** : C1+C2 (obligatoires) + ≥2 recommandés (≥4/6 total).

### Exclusion (veto)

Un agent est refusé s'il :

- Utilise des tools indisponibles dans OpenCode
- Dépend d'un service propriétaire de niche
- Contient des exemples non transposables depuis Claude Code

---

## Conventions

### Nommage

Format **`kebab-case`** pour tous les fichiers d'agents (ex. `typescript-pro.md`, `code-reviewer.md`).

### Mode

- **`primary`** pour les agents à la racine de `.opencode/agents/` (navigables avec `Tab`)
- **`subagent`** pour les agents dans les sous-répertoires (invocables via `@catégorie/nom`)

### Permissions

- Utiliser **`permission:`** uniquement dans le frontmatter
- Ne **jamais** utiliser le champ `tools:` (déprécié par OpenCode)
- Suivre le mapping ci-dessous

| Catégorie | `read` | `write` | `edit` | `bash` | `task` | `mcp` |
|-----------|--------|---------|--------|--------|--------|-------|
| `languages` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `devtools` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| `web` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `data-api` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| `ai` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `security` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| `devops` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| `mcp` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| `docs` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `business` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

> ⚠️ = autorisé avec restrictions de chemin/commande explicites.

### Langue

- Documentation et commentaires en **français**
- Prompts d'agents en **anglais**

### Script de synchronisation

- **Python stdlib uniquement** — aucune dépendance externe
- Compatible Python 3.10+

---

## Checklist PR

- [ ] Fichier au format **`kebab-case.md`**
- [ ] Frontmatter YAML valide (description, mode, permission)
- [ ] `permission:` utilisé (pas `tools:`)
- [ ] Mode correct (`primary` racine, `subagent` sous-répertoire)
- [ ] Tests passent : `python3 tests/run_tests.py`
- [ ] Pas de secrets ou tokens commités
- [ ] Critères C1+C2 satisfaits + ≥2 recommandés
- [ ] Permissions conformes au mapping de la catégorie
- [ ] Aucun critère d'exclusion déclenché

---

## Code de conduite

Ce projet adhère au [Contributor Covenant](CODE_OF_CONDUCT.md). En participant, vous vous engagez à respecter ses termes. Tout comportement inacceptable peut être signalé via les [issues du projet](https://github.com/dmicheneau/opencode-template-agent/issues).
