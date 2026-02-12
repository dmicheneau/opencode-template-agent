---
type: workflow
name: create-prd
title: Workflow de Création du PRD
version: 2.0
agents:
  primary: pm
  support:
    - challenger
    - synthesizer
steps:
  - step-01-init
  - step-02-vision
  - step-03-users
  - step-04-features
  - step-05-requirements
  - step-06-metrics
  - step-07-complete
output: templates/prd-template.md
sessions_dir: .plan/sessions
---

# Workflow — Création du PRD

## Description

Ce workflow transforme les résultats d'une session de brainstorming en un **Product Requirements Document (PRD)** structuré et actionnable. Il guide l'utilisateur à travers 7 étapes interactives, de l'analyse des idées à la production du document final.

## Prérequis

- Une session de brainstorming complétée (fichier dans `.plan/sessions/`)
- Ou un ensemble d'idées à structurer en PRD

## Agents impliqués

| Agent | Rôle | Étapes |
|-------|------|--------|
| **John** (PM) | Agent principal — rédige et structure le PRD | Toutes (1-7) |
| **Nova** (Synthesizer) | Support — regroupe les idées en features | Étape 4 |
| **Rex** (Challenger) | Revieweur — identifie les lacunes et risques | Toutes (1-7) |

## Barre de progression

```
Étape 1 ██░░░░░░░░░░░░ 14%  │ Initialisation
Étape 2 ████░░░░░░░░░░ 28%  │ Vision & Objectifs
Étape 3 ██████░░░░░░░░ 42%  │ Segments utilisateurs
Étape 4 ████████░░░░░░ 57%  │ Fonctionnalités
Étape 5 ██████████░░░░ 71%  │ Exigences
Étape 6 ████████████░░ 85%  │ Métriques
Étape 7 ██████████████ 100% │ Finalisation
```

## Enchaînement des étapes

```
[Étape 1: Init] → [Étape 2: Vision] → [Étape 3: Users] → [Étape 4: Features]
                                                                    ↓
[Étape 7: Complete] ← [Étape 6: Metrics] ← [Étape 5: Requirements]
```

### Étape 1 — Initialisation
- **Fichier** : `steps/step-01-init.md`
- **Agent** : John
- **Actions** : Charger brainstorm, classifier projet, choisir scope (MVP/Growth/Vision)
- **Sortie** : Fichier PRD initialisé avec frontmatter

### Étape 2 — Vision & Objectifs
- **Fichier** : `steps/step-02-vision.md`
- **Agents** : John + Rex (micro-challenge)
- **Actions** : Énoncé de vision, 3-5 objectifs stratégiques, différenciateur clé
- **Sortie** : Sections vision et objectifs ajoutées au PRD

### Étape 3 — Segments utilisateurs
- **Fichier** : `steps/step-03-users.md`
- **Agents** : John + Rex (validation personas)
- **Actions** : 2-4 segments, mini-personas, mapping personas → features
- **Sortie** : Section personas ajoutée au PRD

### Étape 4 — Fonctionnalités & User Stories
- **Fichier** : `steps/step-04-features.md`
- **Agents** : John + Nova + Rex (challenge priorisation)
- **Actions** : Idées → features, user stories, priorisation MoSCoW
- **Sortie** : Section features ajoutée au PRD

### Étape 5 — Exigences
- **Fichier** : `steps/step-05-requirements.md`
- **Agents** : John + Rex (revue critique complète)
- **Actions** : Reqs fonctionnels et non-fonctionnels, revue Challenger
- **Sortie** : Sections exigences ajoutées au PRD

### Étape 6 — Métriques
- **Fichier** : `steps/step-06-metrics.md`
- **Agents** : John + Rex (réalisme des KPIs)
- **Actions** : KPIs, critères SMART, jalons
- **Sortie** : Section métriques ajoutée au PRD

### Étape 7 — Finalisation
- **Fichier** : `steps/step-07-complete.md`
- **Agents** : John + Rex (revue finale)
- **Actions** : Risques, roadmap post-MVP, compilation, checklist, export
- **Sortie** : PRD final sauvegardé

## Persistence

- **Fichier PRD** : `.plan/sessions/prd-<session-id>.md`
- **Template** : `templates/prd-template.md`
- Le frontmatter YAML suit l'avancement (`etape_courante`, `statut`)
- L'utilisateur peut quitter et reprendre à n'importe quelle étape

## Protocole de reprise de session

### Détection automatique
Au lancement du workflow, vérifier s'il existe un PRD en cours dans `.plan/sessions/` :

1. **Scanner** `.plan/sessions/prd-*.md` avec `statut: en_cours` ou `statut: en_pause`
2. **Si trouvé** → proposer la reprise :
   ```
   📋 PRD en cours détecté : « {{nom_projet}} »
   Dernière étape complétée : Étape {{N}} — {{nom_étape}}
   Progression : {{barre_de_progression}}

   [R] Reprendre cette session
   [N] Nouvelle session (l'ancienne sera archivée)
   ```
3. **Si reprise** → charger le frontmatter, positionner à `etape_courante + 1`, afficher le récapitulatif
4. **Si nouvelle** → renommer l'ancien fichier avec suffixe `-archived` et démarrer normalement

### Sauvegarde en cours de session
À tout moment, `[S]` sauvegarde l'état complet :
- Frontmatter mis à jour (`etape_courante`, `statut: en_pause`, `date_pause`)
- Contenu partiel de l'étape en cours préservé
- Message de confirmation avec instructions de reprise

## Navigation

À chaque étape, l'utilisateur dispose de :
- **[C]** Continuer vers l'étape suivante
- **[R]** Retourner à l'étape précédente
- **[E]** Éditer l'étape courante
- **[S]** Sauvegarder et quitter (reprise possible)
- **[?]** Aide contextuelle

## Règles

1. Ne jamais sauter une étape — chaque section du PRD dépend des précédentes
2. Toujours valider avec l'utilisateur avant de passer à l'étape suivante
3. Rex intervient à **chaque étape** pour garantir la qualité (intensité variable)
4. Le fichier PRD est mis à jour incrémentalement (append-only par section)
5. Conserver le lien avec la session brainstorm source dans le frontmatter
6. Utiliser le tutoiement dans toutes les interactions avec l'utilisateur
7. Afficher la barre de progression à chaque transition d'étape
