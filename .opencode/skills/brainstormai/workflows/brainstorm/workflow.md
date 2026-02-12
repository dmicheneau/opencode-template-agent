---
type: workflow
name: brainstorm
title: Workflow de Brainstorming Interactif
version: 2.0
agents:
  primary: analyst
  support:
    - challenger
    - synthesizer
steps:
  - step-01-setup
  - step-02-technique
  - step-03-ideation
  - step-04-synthesis
output: templates/session-output.md
sessions_dir: .plan/sessions
---

# Workflow de Brainstorming Interactif

## Vue d'ensemble

Ce workflow guide une session de brainstorming interactive en 4 étapes, de l'idée brute
à une shortlist priorisée d'idées. Il mobilise 3 agents spécialisés et produit un fichier
de session Markdown persistant.

## Agents mobilisés

| Agent | Rôle | Étapes |
|-------|------|--------|
| **Mary** (Analyst) | Facilitatrice principale | Étapes 01, 02, 03, (04 support) |
| **Rex** (Challenger) | Avocat du diable | Étape 03 (interventions calibrées) |
| **Nova** (Synthesizer) | Consolidatrice | Étape 04 (lead) |

## Barre de progression

```
Étape 1 ███░░░░░░░░░ 25%  │ Cadrage
Étape 2 ██████░░░░░░ 50%  │ Technique
Étape 3 █████████░░░ 75%  │ Idéation
Étape 4 ████████████ 100% │ Synthèse
```

## Enchaînement des étapes

```
[Étape 01: Cadrage]
    │
    │ Sujet défini, approche choisie
    ▼
[Étape 02: Technique]
    │
    │ Techniques sélectionnées
    ▼
[Étape 03: Idéation]  ◄── Boucle (rondes multiples)
    │                      Rex intervient tous les 2-3 tours
    │ 30+ idées générées
    ▼
[Étape 04: Synthèse]
    │
    │ Shortlist validée
    ▼
[Décision] ──► Créer PRD (workflow create-prd)
           ──► Continuer brainstorm (retour Étape 03)
           ──► Sauvegarder & quitter
```

## Persistence

### Fichier de session
- **Emplacement** : `.plan/sessions/brainstorm-{{DATE}}-{{ID}}.md`
- **Format** : Markdown avec YAML frontmatter
- **Template** : `templates/session-output.md`
- **Mode** : Append-only (on ajoute, on ne supprime jamais)

### États de session
- `en_cours` — Session en cours
- `en_pause` — Session mise en pause par l'utilisateur
- `complétée` — Session terminée (synthèse validée)
- `annulée` — Session annulée

## Protocole de reprise de session

### Détection automatique
Au lancement du workflow, vérifier s'il existe une session en cours dans `.plan/sessions/` :

1. **Scanner** `.plan/sessions/brainstorm-*.md` avec `statut: en_cours` ou `statut: en_pause`
2. **Si trouvé** → proposer la reprise :
   ```
   🧠 Session en cours détectée : « {{TOPIC}} »
   Dernière étape complétée : Étape {{N}} — {{nom_étape}}
   Idées générées : {{idea_count}} │ Rondes : {{rounds_completed}}
   Progression : {{barre_de_progression}}

   [R] Reprendre cette session
   [N] Nouvelle session (l'ancienne sera archivée)
   ```
3. **Si reprise** → charger le frontmatter, positionner à `etape_courante`, afficher le récapitulatif contextuel
4. **Si nouvelle** → renommer l'ancien fichier avec suffixe `-archived` et démarrer normalement

### Sauvegarde en cours de session
À tout moment, `[S]` sauvegarde l'état complet :
- Frontmatter mis à jour (`etape_courante`, `statut: en_pause`, `date_pause`)
- Idées et rondes en cours préservées
- Message de confirmation avec instructions de reprise

## Règles globales

1. **Tour par tour** — Chaque interaction attend la réponse de l'utilisateur
2. **Pas de jugement** — En phase d'idéation, toutes les idées sont acceptées
3. **Énergie** — Checkpoint tous les 3 tours d'idéation
4. **Anti-biais** — Pivot de domaine tous les 10 idées
5. **Persistance** — Chaque contribution est sauvegardée immédiatement
6. **Navigation** — Menu disponible à tout moment : [C]ontinuer [R]etour [E]diter [S]auvegarder [?]Aide
7. **Progression** — Afficher la barre de progression à chaque transition d'étape
8. **Tutoiement** — Toujours tutoyer l'utilisateur

## Données de référence

- **Techniques** : `data/techniques.csv` — 42 techniques en 10 catégories
- **Template** : `templates/session-output.md` — Structure du fichier de sortie

## Transition vers le PRD

Si l'utilisateur choisit « Créer le PRD » en Étape 04 :
1. Sauvegarder le fichier de session avec `statut: complétée`
2. Passer le chemin du fichier de session au workflow `create-prd`
3. Le workflow PRD lit la session et démarre avec l'Étape 01 (Init)
