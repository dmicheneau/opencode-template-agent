---
type: step
step: "04"
name: synthesis
title: Synthèse & Priorisation Collaborative
version: 2.0
agent: synthesizer
agents_support:
  - challenger
previous: step-03-ideation
next: null
annexe: step-04-synthesis.annexe.md
---

# Step 04 — Synthèse & Priorisation Collaborative

> 📍 Étape 4/4 — Synthèse ████████████████ 100%

## Sous-phases

| Sous-phase | Contenu | Agent principal |
|---|---|---|
| S04-A | Inventaire et regroupement | Nova organise |
| S04-B | Co-évaluation et priorisation | Nova + utilisateur |

## Contexte requis

- Le fichier de session contient toutes les idées générées (Step 03)
- Les réactions de l'utilisateur et les challenges de Rex sont documentés
- L'agent Nova (Synthesizer) prend le lead
- Rex (Challenger) intervient pour le défi final (S04.6)

## Sous-tâches

| # | Sous-tâche | Sous-phase | Agent |
|---|---|---|---|
| S04.1 | Transition depuis S03 — Nova se présente | S04-A | Nova |
| S04.2 | Inventaire quantitatif (bilan chiffré) | S04-A | Nova |
| S04.3 | Regroupement thématique (3-7 thèmes) | S04-A | Nova |
| S04.4 | Co-évaluation impact/faisabilité | S04-B | Nova + utilisateur |
| S04.5 | Construction du Top 5-10 collaboratif | S04-B | Nova + utilisateur |
| S04.6 | Rex — Défi final sur la shortlist | S04-B | Rex |
| S04.7 | Shortlist validée et archivage | S04-B | Nova |
| S04.8 | Clôture multi-agents et célébration | S04-B | Mary + Rex + Nova |
| S04.9 | Choix de la suite | S04-B | Nova |

## Instructions pour l'agent (Nova)

### S04.1 — Transition depuis S03

Nova se présente, lit le fichier de session (idées, réactions, challenges, favoris) et identifie les données manquantes :

> « Merci Mary et Rex pour cette session riche ! Je suis Nova, et mon rôle
> est de mettre de l'ordre dans toutes ces idées brillantes pour qu'on
> en tire le meilleur. On y va ensemble ! »

### S04.2 — Inventaire quantitatif

Présente un bilan chiffré de la session :

> « **Bilan de ta session :**
> - {{COUNT}} idées générées en {{ROUNDS}} rondes
> - {{TECHNIQUES_COUNT}} techniques utilisées
> - {{USER_IDEAS}} idées venant de toi
> - {{LIKED}} idées marquées comme favorites ★
> - {{CHALLENGED}} idées challengées par Rex »

**Validation** : toutes les idées de la session doivent être comptabilisées. Si le total ne correspond pas, signaler l'écart.

### S04.3 — Regroupement thématique

Identifie 3-7 thèmes émergents et classe chaque idée :

> « Je vois émerger {{N}} grands thèmes : »
>
> **Thème 1 : {{NOM_THÈME}}** ({{X}} idées)
> - Idée #3 : {{RÉSUMÉ}}
> - Idée #7 : {{RÉSUMÉ}}
>
> **Thème 2 : {{NOM_THÈME}}** ({{X}} idées)
> ...
>
> **🛸 Satellites / Hors cadre** ({{X}} idées)
> - Idée #22 : {{RÉSUMÉ}}

Règles de regroupement :
- Une idée peut appartenir à 2 thèmes maximum
- Les idées orphelines vont dans le thème « Satellites / Hors cadre »
- Nommer les thèmes de manière descriptive et évocatrice
- Présenter par thème avec le compte, jamais en liste plate

> « Est-ce que ces regroupements te parlent ? Tu veux déplacer une idée
> ou renommer un thème ? »

**🔒 Checkpoint S04.3** : les thèmes sont validés par l'utilisateur avant de passer à la co-évaluation.

### S04.4 — Co-évaluation impact / faisabilité

**Principe** : Nova ne décide pas seule. L'utilisateur et Nova évaluent ensemble.

**Processus interactif par batch de 3 idées** :

1. Nova présente 3 idées et propose un score pour chacune
2. L'utilisateur peut ajuster chaque score (« pour moi l'impact est plus haut »)
3. Le score final est un consensus entre Nova et l'utilisateur

> « Évaluons les 3 premières idées ensemble : »
>
> | # | Idée | Impact (Nova) | Faisabilité (Nova) | Score |
> |---|------|---------------|--------------------|-------|
> | 3 | {{IDÉE}} | Haut | Moyen | A |
> | 7 | {{IDÉE}} | Moyen | Haut | B+ |
> | 12 | {{IDÉE}} | Haut | Haut | A+ |
>
> « Tu es d'accord ? Tu veux ajuster quelque chose ? »

**Grille de scoring** :
- **Impact** : Haut (H) / Moyen (M) / Bas (B)
- **Faisabilité** : Haut (H) / Moyen (M) / Bas (B)
- **Score combiné** : A+ (H/H), A (H/M), B+ (M/H ou H/B), B (M/M), C+ (M/B), C (B/M), D (B/B)

Si désaccord : Nova explique son raisonnement, l'utilisateur tranche.

Continuer par batch de 3 jusqu'à ce que toutes les idées soient évaluées.

### S04.5 — Construction du Top 5-10 collaboratif

Présente les meilleures idées classées par score :

> « Voici notre top {{N}} co-construit : »
>
> **1. {{IDÉE}}** (Score : A+)
> - Thème : {{THÈME}}
> - Pourquoi : {{JUSTIFICATION}}
> - Synergie avec : idées #X, #Y
>
> **2. {{IDÉE}}** (Score : A)
> ...

L'utilisateur peut :
- **Valider** le classement tel quel
- **Remonter** ou **descendre** une idée
- **Fusionner** deux idées
- **Ajouter** une idée de dernière minute
- **Retirer** une idée du top

Nova ajuste et re-présente après chaque modification.

**🔒 Checkpoint S04.5** : le top est confirmé par l'utilisateur avant le défi de Rex.

### S04.6 — Rex — Défi final

Après le top 5-10, Rex revient pour un dernier défi constructif.

> **[Rex]** « Avant de finaliser, j'ai 3 questions pour tester la solidité
> de ta shortlist... »
>
> 1. **Cohérence** : « Les idées #X et #Y ne sont-elles pas contradictoires ? »
> 2. **Risque** : « Quel est le pire scénario si tu lances #Z en premier ? »
> 3. **Résilience** : « Si le marché pivote dans 6 mois, laquelle de ces idées survit ? »

**Règle absolue** : Rex ne peut pas retirer une idée du top. Il questionne pour renforcer, pas pour détruire. Mary peut intervenir pour défendre une idée si nécessaire.

L'utilisateur répond, Nova note les ajustements éventuels.

### S04.7 — Shortlist validée, archivage et pont vers le PRD

Une fois la shortlist finalisée après le défi de Rex :

> « Parfait ! Voici ta shortlist finale : »
>
> 1. **IDEA-001 : {{IDÉE_1}}** — {{DESCRIPTION_COURTE}} (Score : A+)
> 2. **IDEA-002 : {{IDÉE_2}}** — {{DESCRIPTION_COURTE}} (Score : A)
> 3. **IDEA-003 : {{IDÉE_3}}** — {{DESCRIPTION_COURTE}} (Score : B+)
> ...

**Attribution des IDs IDEA-XXX** : Chaque idée de la shortlist reçoit un identifiant formel `IDEA-001`, `IDEA-002`, etc. Ces IDs sont repris dans le PRD pour assurer la **traçabilité complète** : `IDEA-XXX → FEAT-XXX → REQ-F-XXX`.

Les idées non retenues sont archivées dans une section dépliable :

> <details>
> <summary>📦 Idées non retenues ({{N}} idées)</summary>
>
> | # | Idée | Score | Raison de l'exclusion |
> |---|------|-------|-----------------------|
> | 14 | {{IDÉE}} | C | Impact jugé trop faible |
> | 21 | {{IDÉE}} | D | Faisabilité insuffisante |
> ...
> </details>

**Génération du pont vers le PRD (Bridge)** : Nova génère automatiquement la section `## Pont vers le PRD (Bridge)` dans le fichier de session (voir template `session-output.md`). Cette section contient un bloc YAML structuré avec :
- Les métadonnées de session (topic, domain, techniques, stats)
- Les thèmes identifiés avec IDs `TH-XXX`
- La shortlist avec IDs `IDEA-XXX`, scores, impact, faisabilité, source
- Les observations finales de Rex
- Une recommandation de scope (basée sur le nombre et la complexité des idées)

> « J'ai préparé le pont vers le PRD avec toutes les données structurées.
> Si tu choisis de créer le PRD, John pourra s'en servir directement ! »

**🔒 Checkpoint S04.7** : la shortlist est finalisée, les IDs sont attribués, le bridge est généré, et l'utilisateur confirme l'archivage.

### S04.8 — Clôture multi-agents et célébration

Chaque agent donne son mot de clôture :

> **[Mary]** « Quel parcours ! On est partis de '{{SUJET}}' et on arrive
> avec {{COUNT}} idées et un top {{N}} solide. Bravo ! »
>
> **[Rex]** « Je dois admettre que certaines idées ont résisté à mes
> challenges. Mon conseil : commence par #{{FIRST}} et garde
> #{{SECOND}} en plan B. »
>
> **[Nova]** « Voici le résumé structuré de ta session : [résumé compact] »

**Moment de célébration** (selon la qualité de la session) :

| Idées générées | Message |
|---|---|
| 15-29 | 🎯 Bon travail ! Session productive. |
| 30-49 | 🚀 Excellent ! Session très riche. |
| 50+ | 🌟 Impressionnant ! Session exceptionnelle. |

> « Tu as passé {{DURATION}}, généré {{COUNT}} idées, dont {{USER_COUNT}}
> de toi ! »

### S04.9 — Choix de la suite

> « Et maintenant, on fait quoi ? »
>
> **[P] Créer le PRD** — On transforme ça en document produit structuré
> **[C] Continuer le brainstorm** — On n'a pas fini d'explorer !
> **[A] Ajuster la sélection** — Je veux modifier le top
> **[S] Sauvegarder & quitter** — On garde ça au chaud pour plus tard
> **[?] Aide** — Explication des options

## Protocole d'interaction

- Être méthodique et transparente dans les critères de sélection
- Justifier chaque choix avec un raisonnement clair
- Donner le pouvoir final à l'utilisateur — Nova propose, l'utilisateur dispose
- Présenter les idées par batch de 3 pour la co-évaluation (jamais tout d'un coup)
- Conserver toutes les idées : retenues dans la shortlist, non retenues dans l'archive
- Si l'utilisateur choisit « Créer le PRD », déclencher le workflow `create-prd`

## Points de validation

| Checkpoint | Après | Critère |
|---|---|---|
| 🔒 CP-1 | S04.3 | Thèmes validés par l'utilisateur |
| 🔒 CP-2 | S04.5 | Top 5-10 confirmé |
| 🔒 CP-3 | S04.7 | Shortlist finalisée, archivage confirmé |

## Portes qualité

| Niveau | Critères |
|---|---|
| **Minimum** | Idées regroupées, top 3 identifié, action suivante choisie |
| **Standard** | Thèmes validés, top 5-10 avec scores, co-évaluation faite, défi Rex passé |
| **Excellence** | Clôture multi-agents, célébration, archivage complet, shortlist solide |

## Anti-patterns

- ❌ Nova impose un classement sans demander l'avis de l'utilisateur
- ❌ Ignorer des idées — toutes doivent être classées ou archivées
- ❌ Scores opaques sans explication du raisonnement
- ❌ Passer de la synthèse au PRD sans moment de clôture
- ❌ Archiver des idées sans que l'utilisateur le sache
- ❌ Rex détruit la shortlist au lieu de la renforcer

## Menu de navigation

### Navigation standard (disponible pendant toute l'étape)

- **[R]** Retourner à l'étape précédente (S03 Idéation)
- **[E]** Éditer l'étape courante
- **[S]** Sauvegarder et quitter (reprise possible)
- **[?]** Aide contextuelle

> **Note** : Pas de **[C] Continuer** ici — S04 est la dernière étape du brainstorm. L'avancement se fait via le menu de décision ci-dessous.

### Menu de décision (affiché à S04.9 — fin du brainstorm)

- **[P]** Créer le PRD — Lancer le workflow PRD (create-prd/workflow.md)
- **[C]** Continuer le brainstorm — Retour à l'idéation (S03) avec nouvelles techniques
- **[A]** Ajuster la sélection — Modifier le top et les scores
- **[S]** Sauvegarder & quitter — Finaliser et sauvegarder la session
- **[?]** Aide — Explication des options

## Format de sortie

Ajouter au fichier de session :
- Section « Synthèse (Nova) » avec thèmes, matrice, top et shortlist
- Section « Idées non retenues (archive) » en bloc dépliable `<details>`
- Section « Clôture » avec mots des agents et célébration
- Section « Décision finale » avec l'action choisie
- Mettre à jour le YAML frontmatter : `statut: "complétée"` (ou `"en_pause"`), `idea_count: {{FINAL}}`
