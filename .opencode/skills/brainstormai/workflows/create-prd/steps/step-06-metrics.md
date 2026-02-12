---
type: step
step: "06"
name: metrics
title: Métriques et Jalons
version: 2.0
agent: pm
agents_support:
  - challenger
previous: step-05-requirements
next: step-07-complete
annexe: step-06-metrics.annexe.md
---

# Step 06 — Métriques et Jalons

> 📍 Étape 6/7 — Métriques ████████████░░░░ 86%

## Contexte requis

- Fichier PRD en cours (étapes 1-5 complétées)
- Objectifs stratégiques définis à l'étape 2 (avec critères SMART)
- Features priorisées (MoSCoW) et exigences validées
- Agents : **John** (PM, pilote) + **Rex** (Challenger, intervient à P06.5)

## Sous-tâches

| # | Sous-tâche | Agent | Validation |
|---|---|---|---|
| P06.1 | Rappel des objectifs stratégiques (depuis P02) | John | Objectifs affichés, utilisateur confirme |
| P06.2 | Définition des KPIs par objectif (contextuels) | John + utilisateur | Au moins 1 KPI par objectif, lien explicite |
| P06.3 | Application du cadre SMART à chaque KPI | John + utilisateur | Chaque KPI a les 5 critères renseignés |
| P06.4 | Jalons et timeline (adaptés au scope) | John + utilisateur | Jalons définis avec dates et livrables |
| P06.5 | Rex — Challenge des métriques | Rex | Challenges traités, ajustements intégrés |
| P06.6 | Validation de la section Métriques du PRD | John | Section complète, utilisateur confirme |

## Instructions pour l'agent (John)

### P06.1 — Rappel des objectifs stratégiques

> **[John]** « Avant de définir tes métriques, rappelons tes objectifs stratégiques :
>
> | # | Objectif | Critère SMART | Priorité |
> |---|----------|---------------|----------|
> | OBJ-01 | {{OBJ_1}} | {{SMART_1}} | {{PRIO}} |
> | OBJ-02 | {{OBJ_2}} | {{SMART_2}} | {{PRIO}} |
>
> Chaque KPI doit servir un de ces objectifs. Pas de métrique orpheline.
> Ça te va ? Si un objectif a évolué, dis-le maintenant. »

Si un objectif a changé → mettre à jour la section P02 puis continuer.

### P06.2 — Définition des KPIs par objectif

**Un objectif à la fois.** John propose 1-3 KPIs contextuels avec le *pourquoi*.

> **[John]** « **Objectif 1 : {{OBJ_1}}**
>
> Tu mesures l'{{CATÉGORIE}} parce que ton objectif est de {{RAISON_CONCRÈTE}}.
>
> | KPI | Ce qu'il mesure | Pourquoi il compte |
> |---|---|---|
> | {{KPI_1}} | {{DESCRIPTION}} | {{LIEN_OBJECTIF}} |
> | {{KPI_2}} | {{DESCRIPTION}} | {{LIEN_OBJECTIF}} |
>
> Lequel te parle le plus ? »

Attendre la réaction → ajuster → objectif suivant. Catalogue KPIs → annexe P06.2.

**🔒 Checkpoint P06.2** : au moins 1 KPI défini par objectif stratégique.

### P06.3 — Application du cadre SMART

Pour chaque KPI validé, John complète les 5 critères SMART avec l'utilisateur.

> **[John]** « On passe ton KPI "{{KPI}}" au crible SMART :
>
> | Critère | Valeur |
> |---|---|
> | **Spécifique** | {{QUOI_EXACTEMENT}} |
> | **Mesurable** | {{COMMENT_MESURER}} — outil : {{OUTIL}} |
> | **Atteignable** | Baseline {{BASELINE}} → Cible {{CIBLE}} |
> | **Réaliste** | {{CONTRAINTES_ET_JUSTIFICATION}} |
> | **Temporel** | {{DEADLINE}} |
>
> L'outil de mesure est en place ou à prévoir ? »

Détails + bons/mauvais exemples → annexe P06.3.

### P06.4 — Jalons et timeline

John propose des jalons **adaptés au scope** choisi en P01 :

| Scope | Jalons | Horizon |
|---|---|---|
| MVP | 3 : Alpha → Bêta → Lancement | 3-6 mois |
| Growth | 5 : + Revue 1 mois + Revue 3 mois | 6-12 mois |
| Vision | 7 : + Revue 6 mois + 12 mois + Planning V2 | 12-24 mois |

> **[John]** « Scope {{SCOPE}}, je te propose {{N}} jalons :
>
> | Jalon | Date cible | Livrables clés | KPIs associés | Critères de passage |
> |---|---|---|---|---|
> | {{JALON_1}} | {{DATE}} | {{LIVRABLES}} | {{KPIS}} | {{CRITÈRES}} |
> | {{JALON_2}} | {{DATE}} | {{LIVRABLES}} | {{KPIS}} | {{CRITÈRES}} |
>
> Réaliste ? Cohérent avec tes features Must-Have ? »

Détails + templates par scope → annexe P06.4.

**🔒 Checkpoint P06.4** : jalons définis avec dates, livrables et KPIs associés.

### P06.5 — Rex — Challenge des métriques

Rex intervient après que les KPIs et jalons sont posés.

> **[Rex]** « J'ai lu tes métriques. Quelques questions :
>
> 1. **Mesurabilité** — "{{KPI}}" : comment tu vas le mesurer concrètement ? Tu as les outils en place ?
> 2. **Réalisme** — Ton objectif de {{CIBLE}} est-il réaliste avec un scope {{SCOPE}} et une équipe de {{TAILLE}} ?
> 3. **Focus** — Si tu ne devais garder qu'un seul KPI pour juger du succès de ton produit, lequel ?
>
> Et attention : {{KPI_SUSPECT}} ressemble à une vanity metric. Un gros chiffre, mais quel impact concret ? »

**Règles Rex :**
- Intensité 🟡 modérée — maximum 3-5 challenges, 2 allers-retours par point
- Si l'utilisateur maintient sa position → accepter et noter le risque

> **[John]** « Merci Rex. {{AJUSTEMENTS_SI_NÉCESSAIRE}}. On récapitule ? »

Détails + questions de challenge + north star metric → annexe P06.5.

### P06.6 — Validation de la section Métriques

> **[John]** « Section Métriques pour ton PRD :
>
> | KPI | Objectif lié | Baseline | Cible | Mesure | Deadline |
> |---|---|---|---|---|---|
> | {{KPI_1}} | OBJ-{{N}} | {{BASE}} | {{CIBLE}} | {{OUTIL}} | {{DATE}} |
>
> **North Star Metric** : {{NSM}} — *{{POURQUOI}}*
>
> | Jalon | Date | Livrables | Critères de passage |
> |---|---|---|---|
> | ... | ... | ... | ... |
>
> Tout est bon pour toi ? »

**🔒 Checkpoint P06.6** : section Métriques complète et validée.

## Protocole d'interaction

- Un objectif à la fois → KPIs → SMART → valider → suivant
- Relier chaque KPI à un objectif de P02 — pas de métrique orpheline
- Expliquer le *pourquoi*, pas juste lister
- Rex intervient une seule fois (P06.5) — John propose, l'utilisateur dispose

## Points de validation

| Checkpoint | Après | Critère |
|---|---|---|
| 🔒 CP-1 | P06.2 | Au moins 1 KPI par objectif stratégique |
| 🔒 CP-2 | P06.4 | Jalons définis avec dates et livrables |
| 🔒 CP-3 | P06.6 | Section Métriques complète et validée |

## Portes qualité

| Niveau | Critères |
|---|---|
| **Minimum** | 1 KPI par objectif, 3 jalons définis, cibles chiffrées |
| **Standard** | + SMART validé pour chaque KPI, Rex consulté, timeline réaliste, outils de mesure identifiés |
| **Excellence** | + baseline définie, alertes sur métriques planifiées, north star metric identifiée, jalons liés aux KPIs |

## Anti-patterns

- ❌ KPIs déconnectés des objectifs stratégiques — chaque KPI doit servir un objectif de P02
- ❌ Métriques vanité (vanity metrics) : gros chiffre sans impact réel sur le produit
- ❌ Pas de cible chiffrée — « augmenter le trafic » n'est pas SMART, il faut un nombre
- ❌ Timeline irréaliste par rapport au scope — MVP en 2 semaines avec 10 jalons
- ❌ Trop de KPIs — plus de 3 par objectif = perte de focus, choisir les plus parlants

## Menu de navigation

- **[C]** Continuer vers l'étape 7 (Finalisation)
- **[R]** Retour à l'étape 5 (Exigences)
- **[E]** Éditer un KPI ou un jalon
- **[S]** Sauvegarder & quitter
- **[?]** Aide

## Format de sortie

Ajouter au fichier PRD la section `## 7. Métriques de succès` — tableau KPIs, north star metric, tableau jalons. Mettre à jour `etape_courante: 6`.
