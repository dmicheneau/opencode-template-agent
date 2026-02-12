---
name: sequential-thinking
description: Outil de réflexion dynamique et itérative pour résoudre des problèmes complexes étape par étape avec révision et branches alternatives
license: MIT
compatibility: opencode
metadata:
  mcp-server: sequentialthinking
  version: "1.0"
  category: problem-solving
---

## Ce que je fais

Je fournis un processus de réflexion structuré et dynamique qui permet de :
- Décomposer des problèmes complexes en étapes gérables
- Réviser et affiner la pensée au fur et à mesure que la compréhension s'approfondit
- Explorer des branches alternatives de raisonnement
- Ajuster dynamiquement le nombre total d'étapes de réflexion
- Générer et vérifier des hypothèses de solution

## Quand m'utiliser

Utilise-moi dans les situations suivantes :
- **Problèmes complexes multi-étapes** : Quand un problème nécessite plusieurs étapes distinctes pour être résolu
- **Planification avec révision** : Pour la conception et la planification qui nécessitent des ajustements en cours de route
- **Analyse nécessitant correction** : Quand l'analyse pourrait nécessiter un changement de cap
- **Scope flou** : Lorsque la portée complète du problème n'est pas claire au départ
- **Maintien du contexte** : Pour les tâches qui doivent maintenir le contexte sur plusieurs étapes
- **Filtrage d'informations** : Situations où les informations non pertinentes doivent être filtrées

## Comment m'utiliser

### Paramètres principaux

Le tool `sequential_thinking` accepte les paramètres suivants :

**Obligatoires :**
- `thought` (string) : L'étape de réflexion actuelle
- `nextThoughtNeeded` (boolean) : Si une autre étape de réflexion est nécessaire
- `thoughtNumber` (integer) : Numéro de la pensée actuelle
- `totalThoughts` (integer) : Estimation du nombre total de pensées nécessaires (peut être ajusté)

**Optionnels :**
- `isRevision` (boolean) : Indique si cette pensée révise une réflexion précédente
- `revisesThought` (integer) : Quel numéro de pensée est reconsidéré
- `branchFromThought` (integer) : Point de branchement pour explorer une alternative
- `branchId` (string) : Identifiant de la branche actuelle
- `needsMoreThoughts` (boolean) : Si plus de pensées sont nécessaires que prévu initialement

### Workflow recommandé

1. **Estimation initiale** : Commence avec une estimation du nombre d'étapes nécessaires
2. **Réflexion itérative** : Progresse étape par étape en documentant chaque raisonnement
3. **Révision flexible** : N'hésite pas à réviser des pensées précédentes si de nouvelles informations apparaissent
4. **Ajustement dynamique** : Augmente ou diminue `totalThoughts` selon l'évolution de la compréhension
5. **Branches alternatives** : Utilise `branchFromThought` pour explorer différentes approches
6. **Hypothèses** : Génère des hypothèses de solution et vérifie-les systématiquement
7. **Convergence** : Continue jusqu'à obtenir une solution satisfaisante, puis marque `nextThoughtNeeded` à `false`

### Exemple d'utilisation

```
Pensée 1/5: Analysons d'abord les requirements du système...
→ nextThoughtNeeded: true

Pensée 2/5: En regardant les requirements, je réalise qu'il manque des informations sur la scalabilité...
→ totalThoughts ajusté à 7
→ nextThoughtNeeded: true

Pensée 3/7: Révision de la pensée 1 - je dois intégrer les contraintes de performance...
→ isRevision: true, revisesThought: 1
→ nextThoughtNeeded: true

Pensée 4/7: Explorons une branche alternative pour l'architecture...
→ branchFromThought: 3, branchId: "architecture-alt"
→ nextThoughtNeeded: true

...

Pensée 7/7: Solution finale validée avec toutes les contraintes.
→ nextThoughtNeeded: false
```

## Capacités du serveur MCP

Ce skill s'appuie sur le serveur MCP `sequentialthinking` qui est déjà configuré dans votre `opencode.json` :

```json
{
  "sequentialthinking": {
    "type": "local",
    "command": ["docker", "run", "--rm", "-i", "mcp/sequentialthinking"],
    "enabled": true
  }
}
```

Le serveur fournit le tool `sequential_thinking` qui gère automatiquement :
- La structuration des étapes de réflexion
- Le suivi de l'historique des pensées
- La gestion des révisions et branches
- La validation de la cohérence du processus

## Bonnes pratiques

1. **Sois explicite** : Documente clairement chaque étape de raisonnement
2. **Révise sans hésitation** : Si une pensée précédente était incorrecte, révise-la
3. **Ajuste dynamiquement** : Change `totalThoughts` si tu réalises que plus ou moins d'étapes sont nécessaires
4. **Filtre le bruit** : Ignore les informations non pertinentes à l'étape actuelle
5. **Vérifie les hypothèses** : Génère des hypothèses et valide-les systématiquement
6. **Termine proprement** : Ne marque `nextThoughtNeeded` à `false` que quand tu as une solution satisfaisante

## Désactivation du logging

Pour désactiver le logging des pensées, configure la variable d'environnement `DISABLE_THOUGHT_LOGGING` à `true` dans ton `opencode.json`.

## Références

- Serveur MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
- Configuration OpenCode: `.opencode/opencode.json`
