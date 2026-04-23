---
name: agent-team-workflow
description: >
  Patterns pour orchestrer des équipes d'agents sans perdre le fil du workflow.
  Couvre la persistance d'état, le handoff structuré, la configuration OpenCode et la récupération.
license: MIT
compatibility: opencode
metadata:
  category: orchestration
  version: "1.0"
  handwritten: true
---

## Pourquoi le fil se perd

Dans un workflow multi-agents, chaque `Task` ouvre un nouveau contexte. Si tu ne fournis pas explicitement le contexte global à chaque dispatch, le sous-agent ne sait pas où il se situe dans la séquence — il répond à sa tâche locale sans vision d'ensemble. Résultat : incohérence de style, doublons, ou résultats qui ne s'enchaînent pas.

Trois causes principales :

1. **Dispatch trop court** — "Génère les tests" sans donner l'architecture ni le code produit par les étapes précédentes
2. **Pas de state file** — l'orchestrateur ne persiste aucun état entre les appels, et si la session est interrompue, tout est perdu
3. **Mauvais `mode`** — un agent `subagent` utilisé en `primary` ou l'inverse perturbe les permissions et le routage

---

## Pattern 1 — Le state file

**Crée un fichier `.workflow-state.md` au début de chaque workflow.** L'orchestrateur le met à jour après chaque étape. Si le contexte se perd ou que la session redémarre, l'agent peut le relire et reprendre exactement là où il en était.

### Format recommandé

```markdown
# Workflow : <titre>
> Démarré : <date>
> Statut : IN-PROGRESS | DONE | BLOCKED

## Objectif
<description en 2-3 phrases de ce qu'on veut obtenir>

## Contexte global
- Stack : <technologies>
- Contraintes : <contraintes clés>
- Repo : <chemin ou URL>

## Séquence

| Étape | Agent          | Statut      | Livrable                              |
|-------|----------------|-------------|---------------------------------------|
| 1     | postgres-pro   | ✅ DONE     | `db/migrations/add_notif_prefs.sql`   |
| 2     | api-developer  | 🔄 IN-PROGRESS | Endpoints CRUD `/users/{id}/prefs`  |
| 3     | frontend-dev   | ⏳ PENDING  | Page préférences notifications        |
| 4     | test-automator | ⏳ PENDING  | Tests e2e stack complète              |

## Outputs par étape

### Étape 1 — postgres-pro ✅
- Fichier créé : `db/migrations/20260223_add_notification_preferences.sql`
- Schéma : table `notification_preferences` (FK users.id, JSON channels, unique constraint)
- Notes : migration additive, backward-compatible

### Étape 2 — api-developer 🔄
- En cours...

## Décisions prises
- 2026-02-23 : Additive migration only — pas de breaking change
- 2026-02-23 : JSON column pour les channels (flexibilité future)

## Problèmes actifs
- Aucun pour l'instant
```

### Mise à jour dans l'orchestrateur

```
AVANT chaque Task dispatch → noter l'étape comme IN-PROGRESS dans .workflow-state.md
APRÈS chaque Task retour   → capturer l'output, noter DONE, ajouter les décisions
SI Task échoue             → noter BLOCKED + raison, décider halt ou skip
```

---

## Pattern 2 — Le handoff structuré

Chaque appel `Task` doit contenir un **bloc de contexte standardisé** en tête, peu importe la brièveté de la tâche elle-même.

### Template de dispatch

```
## Task → <nom-agent>

### Contexte global
Projet : <description 1 ligne>
Stack : <technologies principales>
State file : .workflow-state.md (étape <N> sur <total>)

### Ce qui a déjà été fait
- Étape 1 (<agent>) : <résumé du livrable + chemin fichier>
- Étape 2 (<agent>) : <résumé du livrable + chemin fichier>

### Ta mission (étape <N>)
<description précise du livrable attendu>

### Contraintes
- <contrainte 1>
- <contrainte 2>

### Output attendu
<format exact du retour : fichier créé, struct JSON, résumé, etc.>

### Ce qui vient après toi
Étape <N+1> (<agent>) utilisera ton output pour <raison>.
Sois précis sur <X> car le prochain agent en dépend.
```

Ce dernier paragraphe "Ce qui vient après toi" est souvent omis — c'est pourtant ce qui évite les micro-décisions arbitraires qui brisent la cohérence downstream.

---

## Pattern 3 — Configuration OpenCode

### `opencode.json` pour équipes d'agents

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-opus-4-5",
  "agents": {
    "episode-orchestrator": {
      "model": "anthropic/claude-opus-4-5"
    }
  }
}
```

L'orchestrateur doit tourner sur le modèle le plus capable — c'est lui qui maintient la cohérence globale. Les sous-agents peuvent utiliser des modèles plus légers si la tâche est bien bornée.

### Permissions : les règles critiques

| Situation | Réglage |
|-----------|---------|
| Orchestrateur qui dispatche des Tasks | `task: "*": allow` — obligatoire |
| Sous-agent qui ne doit pas lancer d'autres agents | `task: deny` ou omettre |
| Orchestrateur qui ne code pas lui-même | `write: deny`, `edit: deny` |
| Sous-agent builder | `write: allow`, `edit: allow`, bash patterns |

Un orchestrateur qui a `write: allow` commence souvent à implémenter lui-même au lieu de déléguer — c'est là que le workflow se perd.

### Modes

- `primary` — lancé directement par l'utilisateur, gère la conversation
- `subagent` — invoqué via `Task` par un autre agent, ne voit pas la conversation principale
- `all` — visible dans tous les contextes (réservé aux agents transversaux)

**Règle** : l'orchestrateur est `primary`. Tous les spécialistes sont `subagent`. Ne mélange jamais les deux dans le même fichier.

---

## Pattern 4 — Récupération quand le fil est perdu

Si la session s'interrompt ou que le contexte est trop réduit pour continuer :

```
# Prompt de reprise à donner à l'orchestrateur

Reprends le workflow documenté dans .workflow-state.md.
Lis le fichier, identifie la première étape non complétée (statut PENDING ou IN-PROGRESS sans output),
et reprends à partir de là sans réexécuter les étapes DONE.
```

Si le state file n'existe pas (workflow démarré sans pattern 1) :

```
# Prompt de reconstruction

Voici ce qui a été fait :
- <décris ce que tu sais>

Crée d'abord un .workflow-state.md qui reconstruit l'état actuel,
puis continue le workflow depuis l'étape suivante.
```

---

## Checklist avant de lancer une team

- [ ] L'orchestrateur est `mode: primary` avec `task: "*": allow`
- [ ] Les sous-agents sont tous `mode: subagent`
- [ ] Le state file `.workflow-state.md` sera créé en étape 0
- [ ] Chaque dispatch inclut le bloc de contexte global + "ce qui vient après toi"
- [ ] Les dépendances entre étapes sont explicites (étape N dépend du livrable de N-1)
- [ ] Les étapes parallèles sont identifiées (pas de séquentiel inutile)
- [ ] Un critère d'arrêt est défini pour les étapes critiques (sécurité, données)

---

## Exemple complet — Feature full-stack

```
Étape 0 : orchestrateur crée .workflow-state.md
Étape 1 : [postgres-pro]   schéma DB → .workflow-state.md mis à jour
Étape 2 : [api-developer]  endpoints  → contexte = output étape 1 + état global
Étape 3a : [frontend-dev]  UI         → parallèle possible avec 3b
Étape 3b : [test-automator] tests API  → parallèle avec 3a (données = contrat API étape 2)
Étape 4 : [code-reviewer]  audit      → input = tous les outputs précédents
Étape 5 : orchestrateur consolide + rapport final
```

À chaque étape, le sous-agent reçoit :
1. La description du projet (1-2 lignes)
2. Le chemin du state file + le résumé de ce qui est déjà fait
3. Sa mission précise avec le livrable attendu
4. Ce que l'étape suivante consommera de son output

Avec ces 4 éléments, un sous-agent ne peut pas "perdre le fil" — il n'en a jamais besoin, il a tout dans son contexte.
