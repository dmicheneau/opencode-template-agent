---
name: memory
description: Système de mémoire persistante basé sur un graphe de connaissances pour mémoriser des informations sur l'utilisateur entre les sessions
license: MIT
compatibility: opencode
metadata:
  mcp-server: memory
  version: "1.0"
  category: knowledge-management
---

## Ce que je fais

Je fournis un système de mémoire persistante utilisant un graphe de connaissances local qui permet de :
- Mémoriser des informations sur l'utilisateur entre les sessions de chat
- Structurer les connaissances sous forme d'entités et de relations
- Stocker des observations atomiques sur chaque entité
- Rechercher et récupérer des informations contextuelles
- Maintenir un historique complet des connaissances acquises

## Concepts clés

### Entités
Les entités sont les nœuds principaux du graphe. Chaque entité possède :
- **name** : Un nom unique (identifiant)
- **entityType** : Un type (ex: "person", "organization", "event", "preference", "goal")
- **observations** : Une liste d'observations (faits atomiques)

Exemple :
```json
{
  "name": "David_Micheneau",
  "entityType": "person",
  "observations": [
    "Développeur solo sur le projet communion",
    "Parle français",
    "Utilise React et TypeScript"
  ]
}
```

### Relations
Les relations définissent les connexions dirigées entre entités. Elles sont toujours en voix active.

Exemple :
```json
{
  "from": "David_Micheneau",
  "to": "communion",
  "relationType": "développe"
}
```

### Observations
Les observations sont des faits discrets sur une entité. Elles doivent être :
- Stockées sous forme de chaînes de caractères
- Attachées à des entités spécifiques
- Atomiques (un seul fait par observation)
- Indépendantes (peuvent être ajoutées/supprimées individuellement)

## Quand m'utiliser

Utilise-moi dans les situations suivantes :
- **Personnalisation des conversations** : Pour mémoriser les préférences et le contexte de l'utilisateur
- **Suivi de projets** : Pour maintenir l'état et l'historique d'un projet au fil du temps
- **Gestion de relations** : Pour mapper les relations entre personnes, organisations et événements
- **Accumulation de connaissances** : Pour construire progressivement une base de connaissances
- **Continuité inter-sessions** : Quand tu as besoin de te souvenir d'informations entre différentes sessions
- **Contexte personnel** : Pour adapter les réponses au contexte spécifique de l'utilisateur

## Comment m'utiliser

### Outils disponibles

Le serveur MCP `memory` fournit les outils suivants :

#### 1. **create_entities**
Crée de nouvelles entités dans le graphe de connaissances.

```javascript
create_entities({
  entities: [
    {
      name: "David_Micheneau",
      entityType: "person",
      observations: ["Développeur solo", "Parle français"]
    }
  ]
})
```

#### 2. **create_relations**
Crée des relations entre entités existantes.

```javascript
create_relations({
  relations: [
    {
      from: "David_Micheneau",
      to: "communion",
      relationType: "développe"
    }
  ]
})
```

#### 3. **add_observations**
Ajoute de nouvelles observations à des entités existantes.

```javascript
add_observations({
  observations: [
    {
      entityName: "David_Micheneau",
      contents: ["Utilise le workflow BMAD", "Préfère les approches itératives"]
    }
  ]
})
```

#### 4. **read_graph**
Lit l'intégralité du graphe de connaissances (aucun paramètre requis).

```javascript
read_graph()
```

#### 5. **search_nodes**
Recherche des nœuds en fonction d'une requête.

```javascript
search_nodes({
  query: "communion"
})
```

#### 6. **open_nodes**
Récupère des nœuds spécifiques par leur nom.

```javascript
open_nodes({
  names: ["David_Micheneau", "communion"]
})
```

#### 7. **delete_entities**
Supprime des entités et leurs relations (cascade).

```javascript
delete_entities({
  entityNames: ["old_entity"]
})
```

#### 8. **delete_observations**
Supprime des observations spécifiques d'une entité.

```javascript
delete_observations({
  deletions: [
    {
      entityName: "David_Micheneau",
      observations: ["observation obsolète"]
    }
  ]
})
```

#### 9. **delete_relations**
Supprime des relations spécifiques du graphe.

```javascript
delete_relations({
  relations: [
    {
      from: "entity1",
      to: "entity2",
      relationType: "old_relation"
    }
  ]
})
```

### Workflow recommandé

#### Au début de chaque interaction :

1. **Identification de l'utilisateur** : Assure-toi de savoir avec qui tu parles (par défaut : `default_user`)
2. **Récupération de la mémoire** : Commence par dire "Je me souviens..." et récupère les informations pertinentes avec `search_nodes()` ou `read_graph()`
3. **Contextualisation** : Utilise les informations récupérées pour adapter tes réponses

#### Pendant l'interaction :

4. **Attention aux nouvelles informations** : Sois attentif aux nouvelles informations dans ces catégories :
   - **Identité** (âge, localisation, métier, formation, etc.)
   - **Comportements** (intérêts, habitudes, etc.)
   - **Préférences** (style de communication, langue préférée, etc.)
   - **Objectifs** (buts, aspirations, cibles, etc.)
   - **Relations** (relations personnelles et professionnelles)

#### En fin d'interaction :

5. **Mise à jour de la mémoire** : Si de nouvelles informations ont été collectées :
   - Crée des entités pour les organisations, personnes et événements récurrents avec `create_entities()`
   - Connecte-les aux entités existantes avec `create_relations()`
   - Stocke les faits à leur sujet comme observations avec `add_observations()`

### Exemple d'utilisation complète

```
// Début de session
search_nodes({ query: "David" })
// → Récupère : David_Micheneau (person) développe communion (project)

// Conversation...
// David mentionne qu'il utilise maintenant Zustand pour le state management

// Mise à jour de la mémoire
add_observations({
  observations: [
    {
      entityName: "communion",
      contents: ["Utilise Zustand pour le state management"]
    }
  ]
})

// David mentionne qu'il travaille avec un designer nommé Sophie

// Création nouvelle entité et relation
create_entities({
  entities: [
    {
      name: "Sophie",
      entityType: "person",
      observations: ["Designer", "Collabore sur le projet communion"]
    }
  ]
})

create_relations({
  relations: [
    {
      from: "David_Micheneau",
      to: "Sophie",
      relationType: "collabore_avec"
    },
    {
      from: "Sophie",
      to: "communion",
      relationType: "design"
    }
  ]
})
```

## Capacités du serveur MCP

Ce skill s'appuie sur le serveur MCP `memory` qui est déjà configuré dans votre `opencode.json` :

```json
{
  "memory": {
    "type": "local",
    "command": ["docker", "run", "-i", "-v", "claude-memory:/app/dist", "--rm", "mcp/memory"],
    "enabled": true
  }
}
```

Le serveur stocke les données dans un fichier JSONL persistant monté via un volume Docker (`claude-memory:/app/dist`).

### Configuration personnalisée

Tu peux personnaliser le chemin du fichier de stockage avec la variable d'environnement :
- `MEMORY_FILE_PATH` : Chemin vers le fichier de stockage JSONL (par défaut: `memory.jsonl`)

## Bonnes pratiques

1. **Identités claires** : Utilise des noms d'entités clairs et uniques (ex: "David_Micheneau" plutôt que "David")
2. **Types cohérents** : Utilise des types d'entités cohérents (person, organization, project, event, preference, goal, etc.)
3. **Observations atomiques** : Une observation = un fait. Ne mélange pas plusieurs faits dans une observation
4. **Relations en voix active** : "David développe communion" plutôt que "communion est développé par David"
5. **Mise à jour régulière** : Mets à jour la mémoire systématiquement quand de nouvelles informations apparaissent
6. **Récupération au début** : Toujours commencer une session en récupérant la mémoire pertinente
7. **Nettoyage périodique** : Supprime les observations obsolètes ou incorrectes
8. **Relations bidirectionnelles** : Si nécessaire, crée les relations dans les deux sens (ex: A->B et B->A avec des types différents)

## Catégories d'informations à mémoriser

### Identité de base
- Nom, âge, genre, localisation
- Profession, niveau d'éducation
- Langues parlées

### Comportements et intérêts
- Hobbies et centres d'intérêt
- Habitudes de travail
- Méthodologies préférées

### Préférences
- Style de communication
- Langue préférée
- Outils et technologies favoris

### Objectifs et aspirations
- Objectifs professionnels
- Projets en cours
- Cibles à atteindre

### Relations
- Collègues et collaborateurs
- Relations professionnelles
- Partenaires de projets
- Relations hiérarchiques (jusqu'à 3 degrés de séparation)

## Références

- Serveur MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- Configuration OpenCode: `.opencode/opencode.json`
- Format de stockage: JSONL (JSON Lines)
- Volume Docker: `claude-memory:/app/dist`
