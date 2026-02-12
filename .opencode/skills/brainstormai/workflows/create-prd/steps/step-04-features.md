---
type: step
step: "04"
name: features
title: Fonctionnalités et Priorisation
version: 2.0
agent: pm
agents_support:
  - challenger
  - synthesizer
previous: step-03-users
next: step-05-requirements
annexe: step-04-features.annexe.md
---

# Step 04 — Fonctionnalités et Priorisation

> 📍 Étape 4/7 — Fonctionnalités ████████░░░░░░░░ 57%

## Sous-phases

| Sous-phase | Contenu | Agents |
|---|---|---|
| P04-A | Transformation idées → fonctionnalités + user stories | John + Nova |
| P04-B | Priorisation MoSCoW + récapitulatif | John + Rex |

## Contexte requis

- Fichier PRD en cours (étapes 1-3 complétées)
- Session brainstorm (shortlist d'idées validée en S04)
- Personas et besoins définis à l'étape 3
- **John** (PM) orchestre · **Nova** (Synthesizer) regroupe · **Rex** (Challenger) challenge

## Sous-tâches

| # | Sous-tâche | Phase | Agent |
|---|---|---|---|
| P04.1 | Rappel shortlist brainstorm + personas + besoins | P04-A | John |
| P04.2 | Transformation idées → fonctionnalités (par thème) | P04-A | John + Nova |
| P04.3 | Écriture des user stories interactives | P04-A | John + utilisateur |
| P04.4 | Rex — Challenge des fonctionnalités | P04-A | Rex |
| P04.5 | Priorisation MoSCoW flexible | P04-B | John + utilisateur |
| P04.6 | Estimation effort relative (T-shirt sizing) | P04-B | John + utilisateur |
| P04.7 | Mapping fonctionnalités → personas → besoins | P04-B | Nova |
| P04.8 | Tableau récapitulatif et validation | P04-B | John |

## Instructions pour l'agent (John)

### P04.1 — Rappel shortlist + personas + besoins

John rappelle le contexte consolidé : scope, shortlist (N idées + scores), personas (noms + frustrations clés). Demande confirmation avant de continuer.

> « Voici ce qu'on a construit. {{N}} idées retenues, scope {{SCOPE}},
> personas {{PERSONA_1}} et {{PERSONA_2}}. On est bons pour transformer ? »

### P04.2 — Transformation idées → fonctionnalités

John et Nova transforment la shortlist en fonctionnalités structurées. Détails → annexe P04.2.

**Règles** : 1 idée = 0-3 fonctionnalités · 1 fonctionnalité peut combiner plusieurs idées · ID : F-001, F-002... · groupées par thème.

> **[Nova]** « J'ai identifié {{N}} thèmes. Premier batch : »
>
> **Thème : {{NOM}}**
> - **F-001** : {{NOM}} — {{DESCRIPTION}} ← Idées #3, #7
> - **F-002** : {{NOM}} — {{DESCRIPTION}} ← Idée #5
> - **F-003** : {{NOM}} — {{DESCRIPTION}} ← Idée #12

Présenter **max 3 fonctionnalités à la fois**, attendre la réaction, continuer par batch.

**🔒 Checkpoint P04.2** : toutes les idées shortlistées sont couvertes ou explicitement écartées.

### P04.3 — User stories interactives

John propose 1-3 stories par fonctionnalité au format standard. Détails + exemples → annexe P04.3.

> « En tant que **{{PERSONA}}**, je veux **{{ACTION}}** pour **{{BÉNÉFICE}}**. »
> Critères d'acceptation : 3-5 par story, conditions testables.

Processus : 3 stories à la fois → l'utilisateur valide/ajuste/reformule → batch suivant.

### P04.4 — Rex — Challenge des fonctionnalités

Rex intervient avec 3-5 challenges ciblés (détails → annexe §6) :

> **[Rex]** « F-{{ID}} — cette fonctionnalité existe déjà chez {{CONCURRENT}}.
> Qu'est-ce qui rend la tienne différente ? »
>
> « F-{{ID}} — quel besoin de tes personas ça couvre exactement ? »

Rex ne peut pas supprimer de fonctionnalité — il questionne, l'utilisateur décide.

**🔒 Checkpoint P04.4** : challenges traités (réponses ou ajustements faits).

### P04.5 — Priorisation MoSCoW flexible

Priorisation **sans proportions rigides** — limites absolues par scope :

| Priorité | Définition | Limite par scope |
|---|---|---|
| **Must Have** | Sans ça, le produit ne fonctionne pas | MVP: max 5 · Growth: max 10 · Vision: max 15 |
| **Should Have** | Très important, mais on peut lancer sans | Pas de limite stricte |
| **Could Have** | Serait bien, si on a le temps | Pas de limite stricte |
| **Won't Have** | Pas maintenant, peut-être plus tard | Au moins 1 obligatoire |

John propose → l'utilisateur ajuste → John recalcule les compteurs.

**Rex intervient si déséquilibre** (triggers détaillés → annexe P04.5) :

> **[Rex]** « Tu as {{N}} Must-Have. C'est un MVP ou une fusée ? 🚀
> Must-Have = "sans ça, le produit ne fonctionne pas". Vraiment ? »

### P04.6 — T-shirt sizing

Estimation relative de l'effort (détails + calibration → annexe P04.6) :

| XS | S | M | L | XL |
|---|---|---|---|---|
| Quelques heures | 1-2 jours | 3-5 jours | 1-2 semaines | 2+ semaines |

Calibration : choisir une fonctionnalité « référence M », comparer les autres.

> **[Rex]** « Tu as mis S pour F-{{ID}}, mais ça inclut {{COMPLEXITÉ}}.
> Tu es sûr(e) que c'est un S ? Ça ressemble plus à un M... »

### P04.7 — Mapping fonctionnalités → personas → besoins

Nova construit la matrice de traçabilité et détecte les anomalies :

| Fonctionnalité | Idée(s) source | Persona(s) | Besoin(s) |
|---|---|---|---|
| F-001 | #3, #7 | {{PERSONA_1}} | {{BESOIN}} |
| F-002 | #5 | {{PERSONA_2}} | {{BESOIN}} |

Anomalies détectées (détails → annexe P04.7) :
- ⚠️ Fonctionnalité orpheline (pas de persona) → flag
- ⚠️ Persona sous-servi(e) (aucune fonctionnalité Must/Should) → flag
- ⚠️ Besoin P03 non couvert par aucune fonctionnalité → flag

### P04.8 — Tableau récapitulatif et validation

| ID | Fonctionnalité | Priorité | Effort | Persona(s) | Dépendances | Stories |
|---|---|---|---|---|---|---|
| F-001 | {{NOM}} | Must | M | {{PERSONA}} | — | 2 |
| F-002 | {{NOM}} | Should | S | {{PERSONA}} | F-001 | 1 |

> **Résumé** : {{N_MUST}} Must · {{N_SHOULD}} Should · {{N_COULD}} Could · {{N_WONT}} Won't
>
> « Tout est bon pour toi ? On passe aux exigences ? »

**🔒 Checkpoint P04.8** : tableau récapitulatif validé par l'utilisateur.

## Protocole d'interaction

- Batch de 3 fonctionnalités/stories à la fois — jamais tout d'un coup
- John orchestre, Nova regroupe, Rex challenge — chacun son rôle
- L'utilisateur a le dernier mot — John propose, l'utilisateur dispose
- Traçabilité maintenue : chaque fonctionnalité → idée + persona + besoin
- Fonctionnalité ajoutée hors brainstorm → acceptée, notée « source : ajout direct »

## Points de validation

| Checkpoint | Après | Critère |
|---|---|---|
| 🔒 CP-1 | P04.2 | Toutes les idées shortlistées couvertes |
| 🔒 CP-2 | P04.4 | Challenges Rex traités |
| 🔒 CP-3 | P04.8 | Tableau récapitulatif validé |

## Portes qualité

| Niveau | Critères |
|---|---|
| **Minimum** | Fonctionnalités listées avec IDs, MoSCoW fait, tableau présent |
| **Standard** | + user stories, effort estimé, Rex consulté, personas mappées |
| **Excellence** | + dépendances identifiées, aucune fonctionnalité orpheline, traçabilité complète |

## Anti-patterns

- ❌ Proportions MoSCoW rigides et arbitraires (40-60% Must, etc.)
- ❌ User stories génériques sans persona spécifique
- ❌ Fonctionnalités sans lien avec un besoin identifié en P03
- ❌ Trop d'actions dans un seul tour — max 3 fonctionnalités à la fois
- ❌ Ignorer les dépendances entre fonctionnalités
- ❌ Feature creep — ajouter indéfiniment sans revalider le scope

## Menu de navigation

- **[C]** Continuer vers l'étape 5 (Exigences)
- **[R]** Retour à l'étape 3 (Personas)
- **[E]** Éditer une fonctionnalité ou une story
- **[A]** Ajouter une fonctionnalité
- **[S]** Sauvegarder & quitter
- **[?]** Aide

## Format de sortie

Ajouter au fichier PRD :
- `## 4. Fonctionnalités & User Stories` — features par thème, stories, critères d'acceptation, tableau MoSCoW + effort, matrice traçabilité, dépendances
- Mettre à jour `etape_courante: 4` dans le frontmatter
