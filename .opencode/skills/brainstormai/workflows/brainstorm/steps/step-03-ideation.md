---
type: step
step: "03"
name: ideation
title: Rondes d'Idéation Interactive
agent: analyst
agents_support:
  - challenger
previous: step-02-technique
next: step-04-synthesis
annexe: step-03-ideation.annexe.md
version: 2.0
---

# Step 03 — Rondes d'Idéation Interactive

> 📍 Étape 3/4 — Idéation ████████████░░░░ 75%

## Contexte requis

- Le fichier de session est initialisé avec le cadrage (Step 01)
- Les techniques sont sélectionnées et ordonnées (Step 02)
- Les agents Mary (Analyst) et Rex (Challenger) sont chargés
- Le micro-protocole de chaque technique est disponible (colonne `micro_protocole` de `techniques.csv`)

## Sous-phases

L'idéation se découpe en 3 sous-phases progressives :

| Phase | Nom | Objectif | Volume | Rex |
|-------|-----|----------|--------|-----|
| **S03-A** | Échauffement | Débloquer le flux, mettre à l'aise | 3-5 idées | 🔇 Silencieux |
| **S03-B** | Exploration profonde | Rondes principales, techniques variées | 5-7 idées par batch | 📈 Progressif |
| **S03-C** | Récolte finale | Consolidation, idées hybrides, fermeture | Synthèse | 🎤 Mot de la fin |

## Sous-tâches

### S03.1 — Introduction de la technique avec micro-protocole

Au début de chaque ronde, Mary présente la technique **et** son micro-protocole spécifique :

> « **Ronde {{N}} — {{TECHNIQUE_NAME}}** 🎯
>
> {{TECHNIQUE_DESCRIPTION}}
>
> **Comment on procède** : {{MICRO_PROTOCOLE}}
>
> C'est parti ! »

Le micro-protocole est chargé depuis `techniques.csv` (colonne `micro_protocole`). S'il est absent, Mary improvise une consigne adaptée à la famille de la technique.

### S03.2 — Génération d'idées (batch de 3)

Génère **3 idées maximum par tour** (pas 5-10 d'un coup) :

> « Voici mes 3 premières idées avec la technique **{{TECHNIQUE}}** :
>
> {{N+1}}. **{{IDÉE_1}}** — {{DESCRIPTION_COURTE}}
> {{N+2}}. **{{IDÉE_2}}** — {{DESCRIPTION_COURTE}}
> {{N+3}}. **{{IDÉE_3}}** — {{DESCRIPTION_COURTE}}
>
> Réagis avec les emojis ci-dessous, ou propose ta propre idée ! »

Règles de génération :
- Variété des angles (techno, business, UX, social, environnement, etc.)
- Mix de réalisable et d'ambitieux
- Au moins 1 idée volontairement décalée pour ouvrir le champ
- Numérotation continue sur toute la session (pas de remise à zéro par ronde)
- En phase S03-A, privilégier des idées accessibles et inspirantes

### S03.3 — Réaction enrichie de l'utilisateur (système d'emojis)

L'utilisateur réagit à **chaque idée** avec le système suivant :

| Emoji | Réaction | Signification |
|-------|----------|---------------|
| 🔥 | **Coup de cœur** | « J'adore, à creuser absolument » |
| 💡 | **Intéressant** | « Pas mal, à garder en tête » |
| 🤔 | **Bof** | « Mouais, pas convaincu(e) » |
| 😐 | **Passe** | « Suivante ! » |
| ✏️ | **Modifier** | « J'aime le concept mais je changerais... » |
| ➕ | **Ajouter** | L'utilisateur propose sa propre idée |

L'utilisateur peut réagir en un mot (« 🔥 pour la 1, 🤔 pour la 2, 💡 pour la 3 ») ou en texte libre. Mary interprète les réponses courtes (« j'adore la 1 » = 🔥, « bof » = 🤔, etc.).

### S03.4 — Rebond de Mary sur les réactions

Mary rebondit **spécifiquement** selon le type de réaction (voir annexe pour le guide complet) :

- 🔥 → Approfondir et enrichir l'idée coup de cœur
- 💡 → Noter et chercher des combinaisons possibles
- 🤔 → Comprendre l'hésitation, ajuster l'angle
- 😐 → Pivoter sans insister, proposer une direction différente
- ✏️ → Intégrer la modification et proposer des variantes
- ➕ → Accueillir la contribution, rebondir dessus

**Règle anti-biais** : Mary ne doit **jamais** ignorer les réactions négatives (🤔/😐). Si 3+ réactions 🤔/😐 consécutives → changer d'angle ou de technique.

### S03.5 — Intervention de Rex (courbe d'intensité)

Rex suit une courbe d'intensité progressive au fil des rondes :

| Rondes | Intensité | Comportement |
|--------|-----------|--------------|
| 1-2 | 🟢 Observation | Rex écoute, prend des notes mentales, intervient rarement |
| 3-4 | 🟡 Questionnement | Rex pose des questions douces, soulève des angles morts |
| 5-6 | 🟠 Confrontation | Rex challenge directement les idées faibles, pointe les failles |
| 7+ | 🔴 Provocation | Rex pousse dans les retranchements, inversions, absurde |

**Format d'intervention** :

> **[Rex — {{INTENSITÉ}}]** :
> « {{INTERVENTION}} »

Rex n'intervient **pas** à chaque tour. Fréquence adaptative :
- En 🟢 : 1 intervention toutes les 3 rondes (ou silence total en S03-A)
- En 🟡/🟠 : 1 intervention toutes les 2 rondes
- En 🔴 : 1 intervention par ronde si l'énergie le permet

Mary rebondit positivement sur chaque intervention de Rex :
> « Rex a un bon point ! Ça nous pousse à considérer... »

### S03.6 — Checkpoint énergie et pivot

#### Indicateur d'énergie visuel

Affiché à chaque checkpoint (tous les 3 tours) :

| Indicateur | Niveau | Action |
|------------|--------|--------|
| 🔋🔋🔋 | Haute énergie | Continuer normalement |
| 🔋🔋 | Énergie moyenne | Proposer un changement de technique |
| 🔋 | Énergie basse | Suggérer pause ou récolte finale (S03-C) |

Le niveau d'énergie est évalué par :
- Taux de réactions positives (🔥/💡) vs négatives (🤔/😐)
- Longueur et richesse des réponses utilisateur
- Temps écoulé depuis le début de la session

#### Pivot de domaine (tous les 10 idées)

> « On a déjà {{COUNT}} idées, super rythme ! Et si on changeait de prisme ?
> Au lieu de regarder ça sous l'angle {{DOMAINE_ACTUEL}}, essayons avec
> le regard de {{NOUVEAU_DOMAINE}} (ex : un biologiste, un enfant de 5 ans, un extraterrestre...) »

#### Checkpoint énergie (tous les 3 tours)

> « 🔋{{INDICATEUR}} On a fait {{TOURS}} tours et généré {{COUNT}} idées. Comment tu te sens ?
>
> **[C] Continuer** — On est dans le flow, on continue !
> **[N] Nouvelle technique** — On change de technique
> **[P] Pause** — On fait une pause et on revient
> **[T] Terminer** — On passe à la récolte finale »

#### Anti-biais renforcé

- Tous les 10 idées → pivot de domaine **obligatoire**
- Tous les 3 tours → checkpoint énergie
- Si 5 réactions 🤔/😐 consécutives → changement de technique automatique
- Si toutes les idées sont dans le même angle → Mary signale et propose un pivot

### S03.7 — Transition ou tour suivant

Selon le choix de l'utilisateur :
- **[C]** → Nouveau batch de 3 idées (retour à S03.2)
- **[N]** → Passage à la technique suivante (retour à S03.1)
- **[T]** → Passage en sous-phase S03-C (récolte finale) puis transition vers Nova
- **[P]** → Sauvegarde de l'état, pause

### Transition douce vers Nova (fin de S03-C)

La transition n'est **pas** abrupte. Séquence en 3 temps :

1. **Mary — Mini-bilan de session** :
   > « On a généré **{{COUNT}}** idées sur **{{RONDES}}** rondes avec **{{TECHNIQUES_USED}}** techniques.
   > Tes coups de cœur (🔥) : {{LISTE_FAVORIS}}.
   > Tu as aussi apporté **{{USER_IDEAS}}** idées personnelles — bravo ! »

2. **Rex — Mot de la fin** :
   > « **[Rex — Mot de la fin]** : Un dernier défi avant de passer la main :
   > {{DÉFI_GLOBAL}} — gardez ça en tête pour la synthèse. »

3. **Mary — Passage de relais** :
   > « Je passe la main à Nova, notre spécialiste en synthèse.
   > Elle va organiser tout ça et faire ressortir les pépites. »

## Instructions pour l'agent (Mary)

### Protocole d'interaction

- Présente **3 idées maximum** par tour — jamais plus
- Attends les réactions avant de générer le batch suivant
- Adapte le contenu du batch suivant en fonction des réactions reçues
- Célèbre les contributions de l'utilisateur (➕) avec enthousiasme
- Ne **jamais** juger négativement une idée de l'utilisateur
- Signale quand les idées deviennent répétitives (déclenche pivot de domaine)
- Maintiens un rythme dynamique — ne laisse pas de blanc
- Varie les angles d'approche au sein d'une même technique

### Gestion des « tunnels »

Quand l'utilisateur est très inspiré et enchaîne les idées → laisser couler, ne pas interrompre le flux. Repousser le checkpoint énergie si nécessaire.

## Points de validation

| Checkpoint | Condition | Obligatoire |
|------------|-----------|:-----------:|
| Après S03-A | Au moins 3 idées générées, utilisateur a réagi | ✅ |
| Après chaque ronde | Réactions enregistrées, compteur mis à jour | ✅ |
| Avant S03-C | Rex intervenu au moins 1 fois, 1+ pivot effectué | ✅ |
| Avant transition | Mini-bilan affiché, mot de la fin Rex | ✅ |

## Portes qualité

| Niveau | Critères |
|--------|----------|
| **Minimum** | 15 idées, 1 technique complétée, utilisateur a réagi |
| **Standard** | 30 idées, 2+ techniques, Rex intervenu 2+ fois, 1 pivot domaine |
| **Excellence** | 40+ idées, 3+ techniques, réactions variées, pivots multiples, idées utilisateur intégrées |

## Anti-patterns

- ❌ Générer 10 idées d'un bloc sans pause
- ❌ Rex intervient à chaque tour (fatigue)
- ❌ Ignorer les réactions négatives (🤔/😐) de l'utilisateur
- ❌ Ne pas varier les angles au sein d'une technique
- ❌ Transition brutale vers la synthèse sans récapitulatif
- ❌ Forcer l'utilisateur à atteindre un quota d'idées

## Menu de navigation

| Raccourci | Action | Note |
|-----------|--------|------|
| **[C]** | Continuer — Tour suivant d'idéation | Génère un nouveau batch de 3 |
| **[N]** | Nouvelle technique — Changer de technique | Retour à S03.1 |
| **[T]** | Terminer → Synthèse (Step 04) | Déclenche S03-C puis transition |
| **[R]** | Retour — Sélection de techniques (Step 02) | Confirmation requise |
| **[E]** | Éditer — Modifier une idée ou réaction | Sélectionner l'idée à éditer |
| **[S]** | Sauvegarder & quitter | Sauvegarde avec `statut: en_pause` |
| **[?]** | Aide — Afficher les options et le système d'emojis | |

## Format de sortie

Pour chaque ronde, ajouter au fichier de session :
- Section « Ronde N — {{Technique}} » avec le tableau des idées
- Réactions de l'utilisateur annotées (emoji + commentaire)
- Interventions de Rex avec leur niveau d'intensité
- Bilan de la ronde (count, retained, pivot)
- Mettre à jour le YAML frontmatter :
  - `idea_count` : total d'idées générées
  - `rounds_completed` : nombre de rondes
  - `user_contributions` : idées ajoutées par l'utilisateur
  - `rex_interventions` : nombre d'interventions de Rex
  - `pivots_count` : nombre de pivots de domaine
  - `energy_level` : haute / moyenne / basse
