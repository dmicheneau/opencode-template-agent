---
type: step
step: 3
name: users
title: Segments et Personas
agent: pm
agents_support: [challenger]
previous: step-02-vision
next: step-04-features
version: 2.0
annexe: step-03-users.annexe.md
---

# Step 03 — Segments et Personas

> 📍 Étape 3/7 — Utilisateurs ██████░░░░░░░░░░ 43%

## Contexte requis

- Fichier PRD en cours (étapes 1-2 complétées : init + vision)
- Session brainstorm (shortlist d'idées, thèmes, domaine)
- Vision et objectifs stratégiques validés (Step 02)
- Agent principal : **John** (PM)
- Agent support : **Rex** (Challenger) — intervient à P03.5

## Sous-tâches

| ID | Sous-tâche | Validation |
|----|-----------|------------|
| P03.1 | Rappel de la vision et du scope | Résumé affiché, utilisateur confirme |
| P03.2 | Identification des segments utilisateurs (2-4) | Au moins 2 segments identifiés |
| P03.3 | Construction interactive des personas | Au moins 2 personas avec profil complet |
| P03.4 | Validation des personas avec scénarios d'usage | Scénarios réalistes confirmés |
| P03.5 | Rex — Challenge des personas | Personas confrontées, ajustements intégrés |
| P03.6 | Mapping préliminaire personas → besoins | Besoins prioritaires identifiés par persona |
| P03.7 | Validation de la section Utilisateurs du PRD | Section complète, utilisateur valide |

## Instructions pour l'agent (John)

### P03.1 — Rappel de la vision et du scope

> **[John]** « Avant de plonger dans les utilisateurs, rappel express :
> - **Projet** : {{PROJET}} | **Type** : {{TYPE}} | **Scope** : {{SCOPE}}
> - **Vision** : {{VISION}}
> - **Objectifs clés** : {{OBJ_1}}, {{OBJ_2}}, {{OBJ_3}}
>
> On va maintenant identifier qui sont les personnes qui vont utiliser ça. Prêt ? »

### P03.2 — Identification des segments utilisateurs

Identifier **2 à 4 segments utilisateurs** à partir de la vision, des idées du brainstorm et du domaine.

> **[John]** « D'après ta vision et les idées du brainstorm, je vois {{N}} segments d'utilisateurs potentiels :
>
> | # | Segment | Description | Taille estimée | Priorité |
> |---|---------|-------------|----------------|----------|
> | 1 | {{NOM}} | {{DESCRIPTION}} | {{TAILLE}} | Primaire |
> | 2 | {{NOM}} | {{DESCRIPTION}} | {{TAILLE}} | Secondaire |
>
> Tu te reconnais dans ces segments ? Il en manque un ? Ou un de ceux-là est hors cible ? »

→ Annexe P03.A1 : procédure détaillée d'identification des segments.

**Checkpoint P03.2** : ✅ Au moins 2 segments identifiés et validés.

### P03.3 — Construction interactive des personas

**Pas de template froid.** Chaque persona est construite en dialogue :

**Étape 1 — Esquisse initiale** : John propose une ébauche basée sur les données du brainstorm.

> **[John]** « Pour le segment **{{SEGMENT}}**, je te propose de construire cette persona :
>
> **{{PRÉNOM}}** — {{ÂGE}} ans, {{PROFIL_COURT}}
> - Contexte : {{SITUATION}}
> - Frustration principale : {{FRUSTRATION}}
>
> Ça te parle ? Tu connais quelqu'un comme ça ? Ajuste ce qui ne colle pas. »

**Étape 2 — Enrichissement collaboratif** : L'utilisateur réagit, John ajuste et complète.

> **[John]** « OK, avec tes ajustements, voilà **{{PRÉNOM}}** en version enrichie :
>
> - 😤 **Frustrations** : {{F1}}, {{F2}}, {{F3}}
> - 🎯 **Objectifs** : {{O1}}, {{O2}}, {{O3}}
> - 💬 **Citation** : "{{CITATION}}"
> - ✅ **Critères de succès** : {{CRITERES}}
>
> On va maintenant imaginer sa journée type... »

**Étape 3 — Journée type** : Narrative de 3-4 phrases décrivant un jour typique.

> **[John]** « 📅 **Journée type de {{PRÉNOM}}** :
> {{NARRATIF_JOURNEE_TYPE}} »

**Étape 4 — Parcours émotionnel** : De la frustration à la fidélité.

> **[John]** « Et voici son parcours émotionnel avec ton produit :
> 😤 **Frustration** : {{FRUSTRATION_INITIALE}}
> → 💡 **Découverte** : {{MOMENT_DECOUVERTE}}
> → 😊 **Valeur** : {{VALEUR_PERCUE}}
> → 🎉 **Fidélité** : {{RAISON_FIDELITE}} »

Répéter P03.3 pour chaque persona (minimum 2, maximum 5).

→ Annexe P03.A2 : template enrichi et flux de dialogue détaillé.

### P03.4 — Validation avec scénarios d'usage

Pour chaque persona, créer un scénario concret d'utilisation :

> **[John]** « Vérifions que ces personas tiennent la route. Voilà un scénario pour **{{PRÉNOM}}** :
>
> *{{PRÉNOM}} est dans {{CONTEXTE}}. Elle/il a besoin de {{BESOIN}}. Avec ton produit, elle/il fait {{ACTION}} et obtient {{RÉSULTAT}}.*
>
> Ce scénario te semble réaliste ? Tu le vivrais toi-même ou tu connais quelqu'un dans ce cas ? »

### P03.5 — Rex — Challenge des personas

Rex intervient pour questionner la solidité des personas.

> **[Rex]** « 🟡 OK, pause. J'ai trois questions sur tes personas :
>
> 1. **{{PERSONA_1}}** — Est-ce que cette persona représente vraiment ton marché cible, ou c'est le client idéal que tu rêves d'avoir ?
> 2. **Segment manquant** — Tu n'as pas oublié un segment critique ? Les {{SEGMENT_ABSENT}} par exemple ?
> 3. **{{PERSONA_2}}** — Cette persona n'est-elle pas trop idéalisée ? Dans la vraie vie, {{OBJECTION_CONCRETE}}.
>
> Pas besoin de tout changer, mais réfléchis-y deux secondes. »

Intensité Rex : 🟡 Questionnement (soft à ce stade du PRD).

→ Annexe P03.A3 : questions type et protocole de challenge.

### P03.6 — Mapping préliminaire personas → besoins

**Important** : On mappe les personas aux **besoins**, pas aux features. Les features viendront à l'étape 4.

> **[John]** « Maintenant, relions chaque persona à ses besoins prioritaires :
>
> | Persona | Besoin | Priorité | Source |
> |---------|--------|----------|--------|
> | {{PERSONA_1}} | {{BESOIN_1}} | Critique | Brainstorm idée #{{N}} |
> | {{PERSONA_1}} | {{BESOIN_2}} | Important | Vision objectif #{{N}} |
> | {{PERSONA_2}} | {{BESOIN_3}} | Critique | Brainstorm idée #{{N}} |
>
> Tu valides ces priorités ? Un besoin oublié ? »

→ Annexe P03.A4 : matrice besoins et critères de priorité.

**Checkpoint P03.6** : ✅ Chaque persona a au moins 2 besoins identifiés.

### P03.7 — Validation de la section Utilisateurs

> **[John]** « Récap complet de la section Utilisateurs :
>
> - **{{N}} segments** identifiés ({{NOMS_SEGMENTS}})
> - **{{N}} personas** construites :
>   - 🏆 **Persona primaire** : {{PRÉNOM_PRIMAIRE}} — {{PROFIL_COURT}}
>   - {{PRÉNOM_SECONDAIRE}} — {{PROFIL_COURT}}
> - **{{N}} besoins** mappés avec priorités
> - Rex a challengé : {{RÉSUMÉ_CHALLENGE}}
>
> Tout est bon pour toi ? »

**Checkpoint P03.7** : ✅ Section validée par l'utilisateur.

## Protocole d'interaction

- Construis chaque persona en dialogue, pas en remplissant un formulaire
- Encourage l'utilisateur à penser à des personnes réelles qu'il connaît
- Distingue clairement persona primaire vs secondaire
- Ne propose jamais de mapper aux features à cette étape — reste sur les besoins
- Intègre les retours de Rex sans forcer de changements

## Points de validation

| Checkpoint | Condition | Obligatoire |
|-----------|-----------|-------------|
| Après P03.2 | Au moins 2 segments identifiés | ✅ Oui |
| Après P03.3 | Au moins 2 personas avec profil complet | ✅ Oui |
| Après P03.5 | Rex a posé ses questions | ✅ Oui |
| Après P03.6 | Besoins mappés par persona | ✅ Oui |
| Après P03.7 | Section validée | ✅ Oui |

## Portes qualité

| Niveau | Critères |
|--------|----------|
| 🥉 Minimum | 2 segments, 2 personas avec profil de base (âge/profil/frustrations/objectifs) |
| 🥈 Standard | 3+ personas, scénarios d'usage validés, besoins mappés, Rex consulté |
| 🥇 Excellence | + journée type, parcours émotionnel, persona primaire identifiée, cas limites couverts |

## Anti-patterns

- ❌ Personas génériques sans détails concrets — « Marc, 35 ans, manager » ne suffit pas
- ❌ Mapper personas → features à cette étape — les features viennent en P04
- ❌ Créer trop de personas (>5) — diffusion de l'attention, perte de focus
- ❌ Ignorer les segments « edge case » — les utilisateurs atypiques révèlent des besoins cachés
- ❌ Ne pas distinguer persona primaire vs secondaire — tout ne peut pas être priorité 1

## Menu de navigation

- **[C] Continuer** — Passer à l'étape 4 (Features & User Stories)
- **[R] Retour** — Revenir à l'étape 2 (Vision)
- **[E] Éditer** — Modifier un segment ou une persona
- **[A] Ajouter** — Ajouter un segment ou une persona
- **[S] Sauvegarder & quitter** — Sauvegarder et quitter
- **[?] Aide** — Explication des concepts (segment, persona, besoin)

## Format de sortie

Ajouter au fichier PRD la section :
- `## 3. Segments utilisateurs & Personas`
  - Sous-sections par segment avec personas détaillées
  - Tableau de mapping personas → besoins
  - Persona primaire clairement identifiée
- Mettre à jour `etape_courante: 3` dans le frontmatter du PRD
