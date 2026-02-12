---
name: brainstormai
description: "Méthode de brainstorming structuré et génération de PRD — 4 agents IA, 42 techniques créatives, sessions persistantes"
---

# BrainStormAI

Méthode de brainstorming structuré pilotée par 4 agents IA spécialisés.

## Commandes

- `/brainstorm` — Lance ou reprend une session de brainstorming

## Agents

| Agent | Rôle | Fichier |
|-------|------|---------|
| Mary | Facilitatrice brainstorm | @agents/analyst.agent.md |
| John | Créateur PRD | @agents/pm.agent.md |
| Rex | Avocat du diable | @agents/challenger.agent.md |
| Nova | Synthétiseuse | @agents/synthesizer.agent.md |

## Workflows

### Brainstorming (4 étapes)

Workflow interactif guidé par Mary avec 42 techniques créatives.

1. **Setup** — Cadrage du sujet et objectifs
2. **Technique** — Sélection de la technique de brainstorming
3. **Idéation** — Génération d'idées (3 batchs + challenge Rex)
4. **Synthèse** — Consolidation et transition vers PRD

Fichier : @workflows/brainstorm/workflow.md

### Création PRD (7 étapes)

Workflow guidé par John pour transformer les idées en PRD structuré.

1. **Init** — Initialisation du PRD
2. **Vision** — Vision produit, objectifs, différenciateur
3. **Users** — Personas et parcours utilisateurs
4. **Features** — Fonctionnalités et priorisation
5. **Requirements** — Exigences techniques et non-fonctionnelles
6. **Metrics** — KPIs et métriques de succès
7. **Complete** — Finalisation et export

Fichier : @workflows/create-prd/workflow.md

## Données

- **42 techniques créatives** réparties en 10 catégories : @workflows/brainstorm/data/techniques.csv

## Sessions

Les sessions sont persistées localement dans `.plan/sessions/` à la racine du projet.
Chaque session génère un fichier Markdown avec frontmatter YAML pour la reprise.

## Convention

- Langue : français (accentué)
- Tutoiement
- Menus interactifs : `[C] Continuer` `[R] Recommencer` `[E] Éditer` `[S] Sauvegarder` `[?] Aide`
