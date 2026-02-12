---
type: step
step: "05"
name: requirements
title: Exigences Fonctionnelles et Non-Fonctionnelles
version: 2.0
agent: pm
agents_support:
  - challenger
previous: step-04-features
next: step-06-metrics
annexe: step-05-requirements.annexe.md
---

# Step 05 — Exigences Fonctionnelles et Non-Fonctionnelles

> 📍 Étape 5/7 — Exigences ██████████░░░░░░ 71%

## Contexte requis

- Fichier PRD en cours (étapes 1-4 complétées)
- Features validées et priorisées (MoSCoW + effort) à l'étape 4
- User stories et matrice de traçabilité
- Scope défini (MVP / Growth / Vision)
- **John** (PM) orchestre · **Rex** (Challenger) revoit — intensité 🔴 forte à cette étape

## Sous-tâches

| # | Sous-tâche | Agent |
|---|---|---|
| P05.1 | Rappel des features et du scope | John |
| P05.2 | Exigences fonctionnelles par domaine (batch de 3) | John + utilisateur |
| P05.3 | Exigences non-fonctionnelles adaptées au scope | John + utilisateur |
| P05.4 | Rex — Revue systématique bornée (max 2 rounds) | Rex |
| P05.5 | Questions ouvertes et hypothèses | John + utilisateur |
| P05.6 | Validation complète de la section Exigences | John |

## Instructions pour l'agent (John)

### P05.1 — Rappel des features et du scope

John récapitule le contexte issu de P04 : scope, nombre de features par priorité MoSCoW, personas.

> « Récap rapide avant de plonger dans les exigences.
> Scope : **{{SCOPE}}** · {{N_MUST}} Must · {{N_SHOULD}} Should · {{N_COULD}} Could
> Personas : {{PERSONA_1}}, {{PERSONA_2}}
>
> Les exigences vont traduire tes features en spécifications précises.
> On y va ? »

### P05.2 — Exigences fonctionnelles par domaine

John transforme chaque fonctionnalité Must et Should en exigences fonctionnelles regroupées par domaine. Détails + templates → annexe P05.2.

**Domaines** : Authentification (AUTH) · Cœur métier (CORE) · Interface utilisateur (UI) · Intégrations (INT) · Administration (ADM) · Données (DATA).

**Format REQ-ID** : `REQ-F-{DOMAINE}-{NNN}` (ex. REQ-F-AUTH-001)

> « Premier batch d'exigences — domaine **{{DOMAINE}}** : »
>
> | ID | Description | Feature source | Priorité | Critères d'acceptation |
> |---|---|---|---|---|
> | REQ-F-{{DOM}}-001 | {{DESCRIPTION}} | F-{{ID}} | Must | {{CRITÈRES}} |
> | REQ-F-{{DOM}}-002 | {{DESCRIPTION}} | F-{{ID}} | Should | {{CRITÈRES}} |
> | REQ-F-{{DOM}}-003 | {{DESCRIPTION}} | F-{{ID}} | Must | {{CRITÈRES}} |
>
> « Ces 3 exigences te semblent claires et complètes ? »

Présenter **max 3 exigences à la fois**, attendre la validation, puis batch suivant.

**🔒 Checkpoint P05.2** : toutes les features Must/Should sont couvertes par au moins une exigence fonctionnelle.

### P05.3 — Exigences non-fonctionnelles adaptées au scope

Les NFRs s'adaptent au scope — pas de copier-coller universel. Détails + table complète → annexe P05.3.

**Format REQ-ID** : `REQ-NF-{CATÉGORIE}-{NNN}` (ex. REQ-NF-PERF-001)

| Catégorie | MVP (essentiel) | Growth (modéré) | Vision (complet) |
|---|---|---|---|
| Performance | Temps de réponse < 3s | + p50/p95, capacité | + p99, débit, CDN |
| Fiabilité | Backup quotidien | + 99.5%, monitoring | + 99.9%, RTO/RPO, DR plan |
| Accessibilité | Navigation clavier | + WCAG AA | + WCAG AAA, i18n |
| Sécurité | HTTPS + auth basique | + chiffrement repos, RGPD | + audit logs, conformité |
| Scalabilité | — | Scaling horizontal basique | Architecture élastique |
| Monitoring | Logs basiques | + alertes, APM | + dashboards, SLA tracking |

> « Vu ton scope **{{SCOPE}}**, voici les NFRs que je te propose :
>
> | ID | Catégorie | Exigence | Cible |
> |---|---|---|---|
> | REQ-NF-PERF-001 | Performance | {{EXIGENCE}} | {{CIBLE}} |
> | REQ-NF-FIAB-001 | Fiabilité | {{EXIGENCE}} | {{CIBLE}} |
> | REQ-NF-SEC-001 | Sécurité | {{EXIGENCE}} | {{CIBLE}} |
>
> « Tu veux ajuster des cibles ou ajouter des catégories ? »

**🔒 Checkpoint P05.3** : NFRs couvrent au minimum Performance, Fiabilité et Sécurité.

### P05.4 — Rex — Revue systématique bornée

Rex intervient avec une intensité 🔴 forte. **Maximum 2 rounds**, chacun avec un focus spécifique :

| Round | Focus | Objectif |
|---|---|---|
| Round 1 | Gaps + Cohérence — exigences manquantes et conflits | Identifier ce qui n'est pas couvert + détecter les contradictions |
| Round 2 | Risques — exigences à risque et faisabilité | Évaluer la faisabilité et valider l'ensemble |

> **[Rex — Round 1]** « J'ai analysé tes exigences. Gaps détectés :
> - {{GAP_1}} — F-{{ID}} n'a aucune exigence fonctionnelle
> - {{GAP_2}} — aucune exigence de {{CATÉGORIE}} pour {{CAS}}
> - {{GAP_3}} — cas limites non couverts pour REQ-F-{{ID}} »

Après le round 2 : Rex **doit** valider ou tagger les points restants « à revoir post-PRD ». Pas de round 3.

> **[Rex — Clôture]** « 2 rounds faits. Points résolus : {{N}}/{{TOTAL}}.
> Points taggés "à revoir post-PRD" : {{LISTE}}. On avance. »

Détails des templates par round → annexe P05.4.

### P05.5 — Questions ouvertes et hypothèses

John collecte les questions non résolues et les hypothèses faites pendant P05.2-P05.4. Détails → annexe P05.5.

> « Voici les questions ouvertes et hypothèses que j'ai identifiées :
>
> **Questions ouvertes** :
> | ID | Question | Impact | Propriétaire | Deadline suggérée |
> |---|---|---|---|---|
> | QO-001 | {{QUESTION}} | {{IMPACT}} | {{PROPRIO}} | {{DEADLINE}} |
>
> **Hypothèses** :
> | ID | Hypothèse | Risque si fausse | Validation prévue |
> |---|---|---|---|
> | HYP-001 | {{HYPOTHÈSE}} | {{RISQUE}} | {{VALIDATION}} |
>
> « Des questions ou hypothèses à ajouter ? »

### P05.6 — Validation complète de la section Exigences

John présente le récapitulatif complet.

> « Récapitulatif des exigences :
> - **{{N_REQ_F}}** exigences fonctionnelles ({{N_DOMAINES}} domaines)
> - **{{N_REQ_NF}}** exigences non-fonctionnelles (scope {{SCOPE}})
> - **{{N_QO}}** questions ouvertes · **{{N_HYP}}** hypothèses
> - Rex : **{{N_ROUNDS}}** rounds, {{N_POINTS_RÉSOLUS}} points résolus, {{N_À_REVOIR}} à revoir
>
> Tout est bon pour toi ? On passe aux métriques ? »

**🔒 Checkpoint P05.6** : récapitulatif validé par l'utilisateur.

## Protocole d'interaction

- Batch de 3 exigences à la fois — jamais tout d'un coup
- John propose, l'utilisateur valide ou ajuste — Rex challenge mais ne supprime rien
- NFRs adaptées au scope — pas de SLA 99.99% pour un MVP
- Traçabilité fonctionnalité → exigence maintenue à chaque batch
- Rex borné à 2 rounds — pas de boucle infinie

## Points de validation

| Checkpoint | Après | Critère |
|---|---|---|
| 🔒 CP-1 | P05.2 | Features Must/Should couvertes par des REQ-F |
| 🔒 CP-2 | P05.3 | NFRs Performance + Fiabilité + Sécurité définies |
| 🔒 CP-3 | P05.6 | Récapitulatif complet validé |

## Portes qualité

| Niveau | Critères |
|---|---|
| **Minimum** | Exigences fonctionnelles listées pour les fonctionnalités Must-Have |
| **Standard** | + NFRs adaptées au scope, Rex review 1 round, REQ-IDs attribués |
| **Excellence** | + hypothèses documentées, questions ouvertes tracées, traçabilité fonctionnalité→REQ complète |

## Anti-patterns

- ❌ Boucle de correction Rex infinie (max 2 rounds, point final)
- ❌ NFRs copiés-collés sans adaptation au scope (MVP ≠ Vision)
- ❌ Exigences trop techniques pour un PRD (détails d'implémentation)
- ❌ Ignorer les hypothèses et questions ouvertes
- ❌ Présenter toutes les exigences d'un coup (max 3 par batch)

## Menu de navigation

- **[C]** Continuer vers l'étape 6 (Métriques)
- **[R]** Retour à l'étape 4 (Features)
- **[E]** Éditer une exigence
- **[S]** Sauvegarder & quitter
- **[?]** Aide

## Format de sortie

Ajouter au fichier PRD :
- `## 5. Exigences fonctionnelles` — par domaine, REQ-F-IDs, critères d'acceptation
- `## 6. Exigences non-fonctionnelles` — par catégorie, REQ-NF-IDs, cibles adaptées au scope
- `## 7. Questions ouvertes & Hypothèses` — tableaux QO + HYP
- Mettre à jour `etape_courante: 5` dans le frontmatter
