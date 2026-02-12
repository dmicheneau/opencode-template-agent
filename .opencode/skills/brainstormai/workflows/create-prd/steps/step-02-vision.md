---
type: step
step: 2
name: vision
title: Vision et Stratégie
agent: pm
agents_support:
  - challenger
previous: step-01-init
next: step-03-users
version: 2.0
annexe: step-02-vision.annexe.md
---

# Step 02 — Vision et Stratégie

> 📍 Étape 2/7 — Vision ████░░░░░░░░░░░░ 29%

## Contexte requis

- Fichier PRD initialisé (Step 01 complété)
- YAML frontmatter du PRD : `projet`, `type`, `domaine`, `complexité`, `scope`
- Session brainstorm : shortlist d'idées, thèmes identifiés
- Agents : **John** (PM, pilote) + **Rex** (challenger, intervient à P02.5)

## Sous-tâches

| ID | Sous-tâche | Validation |
|----|-----------|------------|
| P02.1 | Rappel du cadrage et du scope | Résumé affiché, utilisateur confirme |
| P02.2 | Co-construction de l'énoncé de vision | Vision formulée et validée par l'utilisateur |
| P02.3 | Définition des objectifs stratégiques (3-5, SMART) | Au moins 3 objectifs définis avec critères SMART |
| P02.4 | Identification du différenciateur clé | Différenciateur articulé et validé |
| P02.5 | Rex — Challenge de la vision | Challenge passé, ajustements intégrés |
| P02.6 | Validation de la section Vision du PRD | Section complète, utilisateur confirme |

## Instructions pour l'agent (John)

### P02.1 — Rappel du cadrage et du scope

> **[John]** « Avant d'attaquer la vision, faisons un rappel express :
> - **Projet** : {{PROJET}} | **Type** : {{TYPE}} | **Domaine** : {{DOMAINE}}
> - **Scope** : {{SCOPE}} | **Complexité** : {{COMPLEXITÉ}}
> - **Thèmes clés du brainstorm** : {{THÈME_1}}, {{THÈME_2}}, {{THÈME_3}}
>
> Ça te va toujours ? Si quelque chose a évolué dans ta tête, dis-le maintenant. »

Si l'utilisateur veut ajuster → modifier le frontmatter et reprendre.

### P02.2 — Co-construction de l'énoncé de vision

**Approche dialoguée** — Ne jamais écrire un mur de texte. Procéder étape par étape.

**Étape 1 — Amorce** : John propose un premier jet basé sur le template :

> **[John]** « Je te propose un premier jet de vision :
>
> *"{{PRODUIT}} est {{TYPE}} qui permet à {{CIBLE}} de {{BÉNÉFICE_CLÉ}} grâce à {{MÉCANISME_UNIQUE}}."*
>
> C'est un point de départ — qu'est-ce qui te parle ? Qu'est-ce qui sonne faux ? »

**Étape 2 — Réaction** : L'utilisateur réagit, John ajuste.

> **[John]** « OK, je reformule en intégrant tes retours :
>
> *"{{VISION_V2}}"*
>
> Mieux ? On affine encore ou ça te convient ? »

**Étape 3 — Test elevator pitch** :

> **[John]** « Essaie de m'expliquer ta vision en 30 secondes, comme si tu la pitchais à quelqu'un dans un ascenseur. Si c'est fluide, c'est bon signe. Si tu butes, on retravaille. »

**Checkpoint P02.2** : ✅ Vision formulée et validée.

→ Annexe P02.A1 : template complet, 3 exemples, technique d'affinage progressif.

### P02.3 — Définition des objectifs stratégiques

**Un par un, pas en bloc.** John propose chaque objectif individuellement.

> **[John]** « Maintenant, définissons tes objectifs stratégiques. J'en vois 3 à 5 qui découlent du brainstorm. On les construit un par un.
>
> **Objectif 1** : {{TITRE}}
> - Quoi : {{DESCRIPTION}}
> - Mesure : {{CRITÈRE_SMART}}
> - Lien brainstorm : {{IDÉE_OU_THÈME}}
> - Horizon : {{COURT/MOYEN/LONG_TERME}}
>
> Ça te parle ? On passe au suivant ou tu veux ajuster ? »

Répéter pour chaque objectif. Après le dernier :

> **[John]** « Récap de tes objectifs :
>
> | # | Objectif | Critère SMART | Lien brainstorm | Priorité |
> |---|----------|---------------|-----------------|----------|
> | 1 | {{OBJ_1}} | {{SMART_1}} | {{LIEN_1}} | {{PRIO}} |
> | 2 | {{OBJ_2}} | {{SMART_2}} | {{LIEN_2}} | {{PRIO}} |
> | 3 | {{OBJ_3}} | {{SMART_3}} | {{LIEN_3}} | {{PRIO}} |
>
> Tous bons ? »

**Checkpoint P02.3** : ✅ Au moins 3 objectifs définis, chacun avec critère SMART.

→ Annexe P02.A2 : framework SMART appliqué, catégories types, table format.

### P02.4 — Identification du différenciateur clé

> **[John]** « Dernière pièce du puzzle : qu'est-ce qui fait que ton projet n'est pas "un de plus" ?
>
> Je vois un angle fort issu du brainstorm : {{ANGLE_BRAINSTORM}}.
>
> Concrètement :
> - **Pourquoi toi ?** {{PROPOSITION}}
> - **Vs alternatives** : {{POSITIONNEMENT}}
>
> C'est bien ton différenciateur, ou tu vois ça autrement ? »

Si l'utilisateur ne sait pas articuler → proposer 3 options (voir annexe, scénarios d'erreur).

### P02.5 — Rex — Challenge de la vision

Rex intervient après que la vision, les objectifs et le différenciateur sont posés.

> **[Rex]** « Bien. J'ai lu ta vision. Quelques questions :
>
> 1. **Ambition** — Ta vision est-elle suffisamment ambitieuse ? Ou c'est juste une amélioration incrémentale ?
> 2. **Différenciation** — Comment te différencies-tu *vraiment* de l'existant ? Qu'est-ce qui empêche un concurrent de copier ça demain ?
> 3. **Mesurabilité** — Est-ce que tes objectifs sont mesurables ? Si dans 6 mois je te demande "t'as réussi ?", tu peux répondre avec des chiffres ?
>
> Prends le temps de réfléchir. »

**Règles Rex ici :**
- Intensité 🟢 légère — questions ouvertes, pas d'assaut frontal
- Maximum 2 allers-retours sur un même point
- Si l'utilisateur maintient sa position → Rex accepte et note le risque
- Rex ne bloque jamais — John reprend la main après le challenge

> **[John]** « Merci Rex. Intégrons ce qui est pertinent. {{AJUSTEMENTS_SI_NÉCESSAIRE}} »

→ Annexe P02.A3 : 5 questions de challenge, règles complètes.

### P02.6 — Validation de la section Vision du PRD

> **[John]** « Voici la section Vision telle qu'elle sera dans ton PRD :
>
> ---
> ## Vision
> {{ÉNONCÉ_VISION}}
>
> ## Objectifs stratégiques
> | # | Objectif | Critère SMART | Lien brainstorm | Priorité |
> |---|----------|---------------|-----------------|----------|
> | ... | ... | ... | ... | ... |
>
> ## Différenciateur clé
> {{DIFFÉRENCIATEUR}}
> ---
>
> Tout est bon ? »

**Checkpoint P02.6** : ✅ Section Vision complète et validée.

## Protocole d'interaction

- Procéder par dialogue itératif, jamais en pavé de texte
- Proposer un draft → l'utilisateur réagit → John ajuste → validation
- Rex intervient une seule fois (P02.5), pas à chaque sous-tâche
- Chaque objectif est construit un par un, pas en bloc
- Si l'utilisateur est d'accord rapidement, ne pas ralentir artificiellement

## Points de validation

| Checkpoint | Condition | Obligatoire |
|-----------|-----------|-------------|
| Après P02.2 | Vision énoncée et validée | ✅ Oui |
| Après P02.3 | ≥ 3 objectifs SMART définis | ✅ Oui |
| Après P02.5 | Rex challenge passé | ✅ Oui |
| Après P02.6 | Section Vision complète validée | ✅ Oui |

## Portes qualité

| Niveau | Critères |
|--------|----------|
| 🥉 Minimum | Vision énoncée, 3 objectifs, scope aligné avec Step 01 |
| 🥈 Standard | + différenciateur défini, Rex challenge passé, objectifs SMART |
| 🥇 Excellence | + lien brainstorm tracé par objectif, vision testée elevator pitch, utilisateur convaincu |

## Anti-patterns

- ❌ John écrit un pavé de texte sans interaction — toujours dialoguer
- ❌ Vision trop vague (« améliorer les choses », « rendre le monde meilleur »)
- ❌ Objectifs non mesurables (« augmenter la satisfaction » sans critère chiffré)
- ❌ Ignorer le différenciateur — c'est ce qui rend le projet unique
- ❌ Ne pas challenger la vision — Rex doit intervenir à P02.5

## Gestion des erreurs

- Vision trop vague → John guide avec des exemples concrets (voir annexe P02.A4)
- L'utilisateur n'arrive pas à formuler → John propose 3 options au choix
- Objectifs en conflit avec le scope → John signale et ajuste
- Rex trop insistant → John reprend la main après 2 allers-retours
- L'utilisateur veut sauter la vision → John explique pourquoi c'est fondamental

## Menu de navigation

- **[C] Continuer** — Passer à l'étape 3 (Utilisateurs & Personas)
- **[R] Retour** — Revenir à l'étape 1 (Initialisation)
- **[V] Éditer la Vision** — Reformuler l'énoncé de vision
- **[O] Éditer les Objectifs** — Modifier les objectifs stratégiques
- **[D] Éditer le Différenciateur** — Ajuster le positionnement et la différenciation
- **[S] Sauvegarder & quitter** — Sauvegarder la progression et quitter
- **[?] Aide** — Explication de la démarche et des concepts

## Format de sortie

Ajouter au fichier PRD les sections :
- `## Vision` — Énoncé de vision validé
- `## Objectifs stratégiques` — Tableau ID/Objectif/SMART/Lien brainstorm/Priorité
- `## Différenciateur clé` — Analyse positionnement
- Mettre à jour le YAML frontmatter : `etape_courante: 2`
