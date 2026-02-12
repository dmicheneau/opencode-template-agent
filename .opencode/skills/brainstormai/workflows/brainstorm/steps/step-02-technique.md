---
type: step
step: "02"
name: technique
title: Sélection des Techniques
version: 2.0
agent: analyst
previous: step-01-setup
next: step-03-ideation
annexe: step-02-technique.annexe.md
---

# Step 02 — Sélection des Techniques

> 📍 Étape 2/4 — Techniques ████████░░░░░░░░ 50%

## Contexte requis

- Le fichier de session est initialisé (Step 01 complété)
- Le sujet, le domaine et l'approche sont définis dans le YAML frontmatter
- Le fichier `data/techniques.csv` est accessible (42 techniques, 10 familles)

## Sous-tâches

| ID | Sous-tâche | Validation |
|----|-----------|------------|
| S02.1 | Rappel du cadrage et de l'approche choisie | Résumé affiché, utilisateur confirme |
| S02.2 | Sélection des techniques (selon approche) | Au moins 1 technique sélectionnée |
| S02.3 | Aperçu/preview de chaque technique sélectionnée | Micro-protocole affiché pour chacune |
| S02.4 | Estimation de durée totale | Durée calculée et affichée |
| S02.5 | Confirmation de la séquence finale | Utilisateur valide l'ordre et la sélection |
| S02.6 | Préparation de la première ronde (transition vers S03) | Récap enregistré, transition prête |

## Instructions pour l'agent (Mary)

### S02.1 — Rappel du cadrage

> « Rappel express de ce qu'on a posé ensemble :
> - **Sujet** : {{TOPIC}} | **Domaine** : {{DOMAIN}} | **Approche** : {{APPROACH}}
>
> Ça te va toujours ? Si tu veux changer d'approche, dis-le maintenant ! »

### S02.2 — Sélection des techniques (selon approche)

#### Approche [1] Guidé — Progression naturelle

Sélectionne automatiquement 3-5 techniques par profondeur croissante :

1. **Début** : 🟢 facile, famille `collaborative` (ex : Brainstorming Classique)
2. **Montée** : 🟡 moyen, famille `créative`/`structurée` (ex : SCAMPER)
3. **Profondeur** : 🟡/🔴, famille exploratoire (ex : Analogie Forcée, Biomimicry)
4. **Surprise** (opt.) : famille `sauvage`/`quantique` pour casser les patterns
5. **Fermeture** (opt.) : famille `introspective` pour ancrer les idées

> « Voilà le parcours que je te propose :
> 1. 🟢 **{{TECHNIQUE_1}}** (~{{DURÉE_1}} min) — pour débloquer le flux
> 2. 🟡 **{{TECHNIQUE_2}}** (~{{DURÉE_2}} min) — pour structurer
> 3. 🔴 **{{TECHNIQUE_3}}** (~{{DURÉE_3}} min) — pour explorer
>
> Tu veux qu'on y aille comme ça, ou tu préfères ajuster ? »

→ Annexe S02.A1 : arbre de décision par domaine/difficulté.

#### Approche [2] Choisir — Navigation par catégories

**Jamais les 42 techniques d'un coup.** Procéder en 2 étapes :

**Étape 1** — Afficher les 10 familles :

| # | Famille | Nb | Style |
|---|---------|---:|-------|
| 1 | 🤝 Collaborative | 5 | Génération libre en groupe |
| 2 | 🎨 Créative | 5 | Associations et détournements |
| 3 | 🔍 Profonde | 4 | Analyse et décomposition |
| 4 | 🏗️ Structurée | 4 | Cadres et matrices |
| 5 | 🎭 Théâtrale | 4 | Jeux de rôle et mise en scène |
| 6 | 🌪️ Sauvage | 4 | Inversion et provocation |
| 7 | 🧘 Introspective | 4 | Réflexion intérieure |
| 8 | 🌿 Biomimétique | 4 | Inspiration de la nature |
| 9 | ⚛️ Quantique | 4 | Paradoxes et superpositions |
| 10 | 🌍 Culturelle | 4 | Perspectives interculturelles |

> « Choisis 1 à 3 familles qui t'attirent ! »

**Étape 2** — Afficher les techniques des familles choisies :

| # | Technique | En bref | Durée | Difficulté |
|---|-----------|---------|-------|------------|
| 1 | {{NOM}} | {{DESCRIPTION}} | {{DURÉE}} min | 🟢/🟡/🔴 |

> « Tu peux en choisir entre 1 et 5. Donne-moi les numéros ! »

→ Annexe S02.A2 : protocole détaillé de navigation par catégories.

#### Approche [3] IA recommande — Analyse et suggestion

Recommande 3-5 techniques avec justification :

| # | Technique | Famille | Pourquoi | Difficulté |
|---|-----------|---------|----------|------------|
| 1 | {{TECHNIQUE}} | {{FAMILLE}} | {{JUSTIFICATION}} | 🟢/🟡/🔴 |

Scoring interne : adéquation domaine (40%), diversité familles (25%), progression difficulté (20%), facteur surprise (15%).

> « Ça te parle ? Tu peux ajouter, retirer ou remplacer n'importe laquelle ! »

→ Annexe S02.A3 : algorithme de scoring détaillé.

#### Approche [4] Aléatoire — Le hasard décide

Tire 3-5 techniques avec contraintes : max 2 par famille, ≥1 technique 🟡/🔴, ≥1 non-standard.

> « Le hasard a parlé ! Si une technique ne t'inspire pas, dis "relance X" ! »

→ Annexe S02.A4 : règles complètes de tirage aléatoire.

### S02.3 — Aperçu des techniques sélectionnées

Pour chaque technique, affiche un micro-protocole en 1 ligne :

| # | Technique | Comment ça fonctionne |
|---|-----------|----------------------|
| 1 | {{NOM}} | {{MICRO_PROTOCOLE}} |

Si l'utilisateur ne connaît pas une technique :

> « Tu veux que je te fasse un mini-essai de **{{TECHNIQUE}}** avec ton sujet ? »

### S02.4 — Estimation de durée totale

> « ⏱️ **Durée estimée : {{TOTAL}} min** ({{N}} techniques × ~{{MOY}} min)
>
> | Technique | Durée |
> |-----------|-------|
> | {{TECHNIQUE_1}} | ~{{DURÉE_1}} min |
> | {{TECHNIQUE_2}} | ~{{DURÉE_2}} min |
> | **Total** | **~{{TOTAL}} min** |
>
> Ça te paraît jouable ? »

### S02.5 — Confirmation de la séquence finale

> « Récap final de ta séquence :
> 1. 🟢 **{{TECHNIQUE_1}}** ({{FAMILLE}}) — {{MICRO_PROTOCOLE}}
> 2. 🟡 **{{TECHNIQUE_2}}** ({{FAMILLE}}) — {{MICRO_PROTOCOLE}}
> 3. 🔴 **{{TECHNIQUE_3}}** ({{FAMILLE}}) — {{MICRO_PROTOCOLE}}
> ⏱️ Durée totale : ~{{TOTAL}} min »

#### 🐾 Observation de Rex (optionnelle)

Si redondance ou déséquilibre détecté :

> **[Rex]** « Intéressant choix. Attention, **{{TECHNIQUE_A}}** risque de générer des idées similaires à **{{TECHNIQUE_B}}** — les deux sont des techniques de {{TYPE_COMMUN}}. Tu veux en remplacer une ? »

> « On valide ? [C] Continuer / [E] Éditer / [R] Retour »

**Checkpoint S02.5** : ✅ Séquence confirmée par l'utilisateur.

### S02.6 — Transition vers S03

> « C'est parti ! On attaque la première ronde avec **{{TECHNIQUE_1}}**.
> Je t'explique le principe et on démarre ! 🚀 »

## Protocole d'interaction

- Présente les techniques de manière enthousiaste mais structurée
- Explique brièvement chaque technique si l'utilisateur ne la connaît pas
- Propose une mini-démo sur le sujet réel pour les techniques inconnues
- Laisse l'utilisateur ajuster, ajouter ou retirer des techniques à tout moment
- Confirme la sélection finale avant de passer à l'idéation

## Points de validation

| Checkpoint | Condition | Obligatoire |
|-----------|-----------|-------------|
| Après S02.2 | Au moins 1 technique sélectionnée | ✅ Oui |
| Après S02.5 | Séquence confirmée par l'utilisateur | ✅ Oui |

## Portes qualité

| Niveau | Critères |
|--------|----------|
| 🥉 Minimum | 1 technique sélectionnée et validée |
| 🥈 Standard | 2-3 techniques, familles variées, ordre défini |
| 🥇 Excellence | 3-5 techniques, 3+ familles, durée estimée, micro-protocoles présentés |

## Anti-patterns

- ❌ Afficher les 42 techniques d'un coup — surcharge cognitive
- ❌ Ne pas expliquer une technique avant de la sélectionner
- ❌ Sélectionner plus de 5 techniques — fatigue créative
- ❌ Choisir uniquement des techniques 🟢 faciles — pas de challenge
- ❌ Ne pas estimer la durée totale avant de confirmer

## Menu de navigation

- **[C] Continuer** — Lancer l'idéation (Step 03)
- **[R] Retour** — Revenir au cadrage (Step 01)
- **[E] Éditer** — Modifier la sélection ou l'ordre
- **[S] Sauvegarder & quitter** — Sauvegarder et quitter
- **[?] Aide** — Explication des approches et familles

## Format de sortie

Ajouter au fichier de session :
- Section « Techniques sélectionnées » avec liste, ordre et micro-protocoles
- Section « Durée estimée » avec détail par technique
- Mettre à jour le YAML frontmatter : `techniques_used: [liste]`
