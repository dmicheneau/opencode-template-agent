---
type: step
step: "07"
name: complete
title: Finalisation et Livraison du PRD
version: 2.0
agent: pm
agents_support:
  - challenger
  - synthesizer
  - analyst
previous: step-06-metrics
next: null
annexe: step-07-complete.annexe.md
---

# Step 07 — Finalisation et Livraison du PRD

> 📍 Étape 7/7 — Finalisation ████████████████ 100%

## Contexte requis

- Fichier PRD en cours (étapes 1-6 complétées)
- Toutes les sections rédigées et validées (vision, personas, features, exigences, métriques)
- **John** (PM) orchestre · **Rex** (Challenger) risques + revue finale · **Nova** (Synthesizer) compile · **Mary** (Analyst) clôture

## Sous-tâches

| # | Sous-tâche | Agent |
|---|---|---|
| P07.1 | Rappel global du parcours | John |
| P07.2 | Analyse des risques interactive | Rex + utilisateur |
| P07.3 | Périmètre hors-scope et roadmap post-MVP | John + utilisateur |
| P07.4 | Compilation du PRD | Nova |
| P07.5 | Checklist de validation enrichie (10 items) | John + utilisateur |
| P07.6 | Rex — Revue finale du PRD complet | Rex |
| P07.7 | Clôture multi-agents | Mary + Rex + Nova + John |
| P07.8 | Célébration et statistiques | John |
| P07.9 | Livraison et options de suite | John |

## Instructions pour l'agent (John)

### P07.1 — Rappel global du parcours

John fait un récapitulatif express du chemin parcouru pour ancrer le contexte.

> « Récap du chemin parcouru :
> 1. **Cadrage** (P01) — Projet {{PROJET}}, type {{TYPE}}, scope {{SCOPE}}
> 2. **Vision** (P02) — *"{{VISION_COURTE}}"*
> 3. **Personas** (P03) — {{N_PERSONAS}} personas : {{PERSONA_1}}, {{PERSONA_2}}
> 4. **Features** (P04) — {{N_FEATURES}} features ({{N_MUST}} Must · {{N_SHOULD}} Should · {{N_COULD}} Could · {{N_WONT}} Won't)
> 5. **Exigences** (P05) — {{N_REQ_F}} fonctionnelles · {{N_REQ_NF}} non-fonctionnelles
> 6. **Métriques** (P06) — {{N_KPIS}} KPIs · {{N_JALONS}} jalons
>
> Sacré parcours ! Dernière ligne droite — risques, compilation et livraison. »

### P07.2 — Analyse des risques interactive (Rex)

Rex prend le lead. Procédure détaillée → annexe P07.2.

> **[Rex]** « J'ai suivi tout le parcours. Voici les risques identifiés :
>
> | ID | Catégorie | Description | P | I | Score | Mitigation |
> |---|---|---|---|---|---|---|
> | RR-001 | Technique | {{RISQUE}} | H | H | 🔴 | {{MITIGATION}} |
> | RR-002 | Business | {{RISQUE}} | M | H | 🟡 | {{MITIGATION}} |
> | RR-003 | Utilisateur | {{RISQUE}} | M | M | 🟡 | {{MITIGATION}} |
>
> Tu vois d'autres risques ? Tu veux ajuster les niveaux ? »

**Phase 2 — L'utilisateur complète** : ajouter des risques, modifier probabilités/impacts, proposer des mitigations alternatives.

**Phase 3 — Registre finalisé** : Rex consolide avec catégories (Technique · Business · Équipe · Utilisateur · Réglementaire) et attribue un propriétaire par risque.

**🔒 Checkpoint P07.2** : au moins 3 risques identifiés avec mitigations.

### P07.3 — Périmètre hors-scope et roadmap post-MVP

> « Soyons clairs sur ce qu'on **ne fait pas** dans cette version :
>
> **Hors-scope MVP** : {{WON'T_HAVE_1}}, {{WON'T_HAVE_2}}, {{FEATURE_ÉCARTÉE}}
>
> **Roadmap post-MVP** :
> | Phase | Horizon | Features | Dépendance |
> |---|---|---|---|
> | Phase 2 | 3-6 mois | {{FEATURES_PHASE_2}} | Retours utilisateurs MVP |
> | Phase 3 | 6-12 mois | {{FEATURES_PHASE_3}} | KPIs Phase 2 atteints |
>
> Ça te semble réaliste ? » — Détails → annexe P07.3.

### P07.4 — Compilation du PRD (Nova)

Nova assemble le document avec le template `.plan/workflows/create-prd/templates/prd-template.md`.

> **[Nova]** « Compilation en cours — vérification section par section :
> ✅ Vision · ✅ Objectifs · ✅ Personas · ✅ Features · ✅ Exigences F · ✅ Exigences NF · ✅ KPIs · ✅ Risques · ✅ Hors-scope
>
> Contrôles de cohérence :
> - Compteur fonctionnalités : {{N_FEATURES}} → {{N_STORIES}} stories → {{N_REQ_F}} exigences ✅
> - Personas : chaque fonctionnalité liée à un persona ✅
> - KPIs : chaque KPI lié à un objectif ✅
>
> PRD compilé — {{N_SECTIONS}} sections, prêt pour la revue. » — Détails → annexe P07.4.

### P07.5 — Checklist de validation enrichie

**Chaque item est vérifié ensemble**, jamais auto-coché.

> « Vérifions la checklist :
>
> | # | Item | Statut |
> |---|---|---|
> | 1 | Vision claire et validée | ✅/❌ |
> | 2 | Personas définis avec scénarios d'usage | ✅/❌ |
> | 3 | Features priorisées (MoSCoW) avec user stories | ✅/❌ |
> | 4 | Exigences fonctionnelles avec REQ-IDs | ✅/❌ |
> | 5 | Exigences non-fonctionnelles adaptées au scope | ✅/❌ |
> | 6 | KPIs SMART liés aux objectifs | ✅/❌ |
> | 7 | Risques identifiés avec mitigations | ✅/❌ |
> | 8 | Hors-scope défini | ✅/❌ |
> | 9 | Roadmap post-MVP esquissée | ✅/❌ |
> | 10 | PRD cohérent et complet | ✅/❌ |
>
> Score : **{{SCORE}}/10** · Items à revoir : {{ITEMS_NON_COCHÉS}} »

**🔒 Checkpoint P07.5** : checklist vérifiée, score ≥ 6/10 pour passer.

### P07.6 — Rex — Revue finale du PRD complet

Rex lit le PRD compilé en entier et donne 3-5 observations finales structurées sur 5 axes. Procédure → annexe P07.6.

> **[Rex]** « J'ai lu le PRD en entier. Revue finale :
>
> **Cohérence globale** : {{SCORE}}/5 — {{COMMENTAIRE}}
> **Points forts** : {{POINT_FORT_1}}, {{POINT_FORT_2}}
> **Faiblesses** : {{FAIBLESSE_1}}
>
> **Si je devais parier, voici le plus gros risque :** *"{{RISQUE_PRINCIPAL}}"*
>
> **Verdict** : {{PRÊT_À_LIVRER / QUELQUES_AJUSTEMENTS / RETRAVAILLER_SECTION}}
>
> Mon dernier conseil : {{CONSEIL_FINAL}}. »

Rex donne un verdict honnête mais constructif. Max 5 observations. Détails des 5 axes et règles de verdict → annexe P07.6.

### P07.7 — Clôture multi-agents

Les 4 agents interviennent pour clôturer la session. Chacun apporte sa perspective unique. Script détaillé → annexe P07.7.

> **[John]** « Ton PRD est solide. Prochaines étapes : partage technique, sprint de validation, revue dans 3 mois. C'est un document vivant — fais-le évoluer. »

> **[Rex]** « J'ai poussé fort, mais ce PRD a résisté. Mon dernier conseil : {{CONSEIL_REX}}. Bonne chance — tu en auras besoin. 😉 »

> **[Nova]** « Résumé en 5 lignes :
> 1. **Quoi** : {{PRODUIT}} · 2. **Pourquoi** : {{PROBLÈME}} · 3. **Comment** : {{DIFFÉRENCIATEUR}}
> 4. **Mesure** : {{KPI_PRINCIPAL}} · 5. **Risque** : {{RISQUE_PRINCIPAL}} »

> **[Mary]** « De l'idée '{{SUJET}}' à ce PRD complet — quel chemin parcouru ! Bravo ! 🎉 »

### P07.8 — Célébration et statistiques

John présente les statistiques de la session et le score de complétude.

> 🎉 **PRD terminé !**
>
> **Statistiques** :
> - 📄 PRD de **{{N_SECTIONS}}** sections
> - 🎯 **{{N_FEATURES}}** features spécifiées
> - 📋 **{{N_REQS}}** exigences ({{N_REQ_F}} fonctionnelles + {{N_REQ_NF}} non-fonctionnelles)
> - 📊 **{{N_KPIS}}** KPIs définis
> - ⚠️ **{{N_RISQUES}}** risques identifiés
> - 👤 **{{N_PERSONAS}}** personas créés
>
> ⏱️ **Durée** : tu as passé {{DURATION}} sur ce PRD
>
> 🏆 **Score de complétude** : {{SCORE_COMPLETUDE}}%
> *(checklist {{SCORE_CHECKLIST}}/10 · Rex verdict : {{VERDICT_REX}})*

### P07.9 — Livraison et options de suite

> « Comment veux-tu procéder ? »

## Protocole d'interaction

- Rex mène P07.2 (risques) et P07.6 (revue) — John orchestre le reste
- Nova compile à P07.4 — elle vérifie la cohérence transversale
- Checklist vérifiée item par item avec l'utilisateur — jamais auto-cochée
- Clôture multi-agents : chaque agent parle avec sa personnalité propre
- Si Rex verdict « Retravailler {{SECTION}} » → retour guidé à l'étape concernée

## Points de validation

| Checkpoint | Après | Critère |
|---|---|---|
| 🔒 CP-1 | P07.2 | ≥ 3 risques identifiés avec mitigations |
| 🔒 CP-2 | P07.5 | Checklist vérifiée, score ≥ 6/10 |
| 🔒 CP-3 | P07.6 | Revue Rex complétée, verdict rendu |

## Portes qualité

| Niveau | Critères |
|---|---|
| **Minimum** | PRD compilé, sauvegardé, checklist ≥ 6/10 |
| **Standard** | + risques analysés, Rex review, checklist ≥ 8/10 |
| **Excellence** | + multi-agent closing, célébration, checklist 10/10, hors-scope documenté |

## Anti-patterns

- ❌ Risques ajoutés en dernière minute sans analyse (Rex doit les structurer)
- ❌ PRD livré sans revue Rex — la revue finale est obligatoire
- ❌ Pas de moment de clôture (transition abrupte après la checklist)
- ❌ Sauvegarder dans le mauvais répertoire (`v3/sessions/` au lieu de `.plan/sessions/`)
- ❌ Checklist complétée automatiquement sans vérification avec l'utilisateur

## Menu de navigation

### Navigation standard (disponible pendant toute l'étape)

- **[R]** Retourner à l'étape précédente (P06 Métriques)
- **[E]** Éditer l'étape courante
- **[S]** Sauvegarder et quitter (reprise possible)
- **[?]** Aide contextuelle

### Menu de livraison (affiché à P07.9 — fin du PRD)

- **[D]** Sauvegarder le PRD (`.plan/sessions/prd-{{ID}}.md`)
- **[V]** Afficher le PRD complet en Markdown
- **[C]** Copier dans le presse-papier (best effort)
- **[B]** Retourner au brainstorm pour itérer
- **[S]** Sauvegarder & quitter
- **[?]** Aide

## Format de sortie

Sauvegarder dans `.plan/sessions/prd-{{SUJET_SLUG}}-{{DATE}}.md` :
- YAML frontmatter : `statut: complété`, `date_fin`, `version`, `score_completude`, `checklist_score`
- Toutes les sections compilées · Mettre à jour `etape_courante: 7`
