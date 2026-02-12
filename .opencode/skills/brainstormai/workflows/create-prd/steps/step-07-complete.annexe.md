---
type: annexe
step: "07"
name: complete
parent: step-07-complete.md
title: Annexe — Finalisation et Livraison du PRD
version: 2.0
---

# Annexe Step 07 — Finalisation et Livraison du PRD

Ce fichier détaille les procédures, templates et scénarios de récupération pour l'étape Finalisation & Livraison. Il complète `step-07-complete.md`.

---

## 1. Procédure P07.2 — Analyse de risques interactive

### Processus mené par Rex (3 phases)

**Phase 1 — Proposition initiale** : Rex passe en revue le PRD, identifie 3-5 risques avec ID, catégorie, probabilité (H/M/B), impact (H/M/B) et mitigation.

**Phase 2 — Complétion** : L'utilisateur réagit (valide, ajuste, conteste), ajoute ses propres risques. Rex ajuste les niveaux si besoin.

**Phase 3 — Consolidation** : Rex finalise le registre, chaque risque reçoit un propriétaire, tri par score décroissant.

### Matrice de risques (Probabilité × Impact)

|  | **Impact Haut** | **Impact Moyen** | **Impact Bas** |
|---|---|---|---|
| **Proba Haute** | 🔴 Critique | 🟡 Élevé | 🟡 Modéré |
| **Proba Moyenne** | 🟡 Élevé | 🟡 Modéré | 🟢 Faible |
| **Proba Basse** | 🟡 Modéré | 🟢 Faible | 🟢 Négligeable |

### Catégories et exemples typiques

| Catégorie | Exemples |
|---|---|
| **Technique** | Complexité sous-estimée, dépendances externes, scalabilité, intégrations fragiles |
| **Business** | Marché trop petit, monétisation incertaine, concurrence, timing |
| **Équipe** | Compétences manquantes, capacité insuffisante, dépendance personne clé |
| **Utilisateur** | Adoption faible, besoin mal identifié, résistance au changement |
| **Réglementaire** | RGPD, brevets, licences tierces, régulation sectorielle |

### Stratégies de mitigation

| Type | Stratégies typiques |
|---|---|
| Technique | POC, prototypage, architecture découplée, tests automatisés |
| Business | Validation marché, interviews utilisateurs, MVP rapide, pivot possible |
| Équipe | Recrutement anticipé, formation, documentation, pair programming |
| Utilisateur | Tests précoces, beta fermée, onboarding guidé, feedback loops |
| Réglementaire | Audit juridique, consultation expert, veille, privacy by design |

### Format du registre

```markdown
| ID | Catégorie | Description | P | I | Score | Mitigation | Propriétaire |
|---|---|---|---|---|---|---|---|
| RR-001 | {{CAT}} | {{DESC}} | H/M/B | H/M/B | 🔴/🟡/🟢 | {{MIT}} | {{PROP}} |
```

---

## 2. Procédure P07.3 — Hors-scope et roadmap

### Sources du hors-scope

| Source | Description |
|---|---|
| Won't Have (P04) | Features marquées Won't Have lors du MoSCoW |
| Could Have coûteux | Could Have en effort L/XL |
| Suggestions Rex | Capacités jugées prématurées |
| Questions ouvertes (P05) | Hypothèses non validées |

### Template roadmap post-MVP

| Phase | Horizon | Feature | Dépendance | Priorité |
|---|---|---|---|---|
| Phase 2 | 3-6 mois | {{FEATURE}} | Retours utilisateurs MVP | Haute |
| Phase 3 | 6-12 mois | {{FEATURE}} | Phase 2 livrée | Moyenne |

**Règles** : Phase 2 = Should Have différés + retours terrain · Phase 3 = Could Have + expansion · Max 5 features par phase · Chaque feature a une dépendance claire.

---

## 3. Procédure P07.4 — Compilation PRD par Nova

### Collecte et vérification section par section

| Section PRD | Source | Vérification |
|---|---|---|
| Résumé exécutif + vision | P02 | Vision énoncée, différenciateur présent |
| Objectifs stratégiques | P02 | ≥ 3 objectifs SMART |
| Personas et segments | P03 | ≥ 2 personas avec scénarios |
| Features et user stories | P04 | IDs, MoSCoW, stories |
| Exigences fonctionnelles | P05 | REQ-F-IDs, critères d'acceptation |
| Exigences non-fonctionnelles | P05 | REQ-NF-IDs, cibles par scope |
| Métriques de succès | P06 | KPIs, SMART, jalons |
| Risques | P07.2 | Registre avec mitigations |
| Hors-scope et roadmap | P07.3 | Won't Have + Phase 2/3 |

### Contrôles de cohérence

| Contrôle | Action si échoue |
|---|---|
| N features P04 = N features PRD | Signaler l'écart |
| Chaque persona a ≥ 1 feature Must/Should | ⚠️ Persona sous-servi |
| Chaque KPI lié à un objectif P02 | ⚠️ KPI orphelin |
| Chaque feature Must/Should a ≥ 1 REQ-F | ⚠️ Feature sans exigence |
| Chaque risque 🔴 a une mitigation concrète | ⚠️ Risque non mitigé |

Standardisation : YAML frontmatter complet, sections numérotées (1-10), tableaux alignés, émojis cohérents.

---

## 4. Procédure P07.6 — Rex Revue Finale

### Revue structurée en 5 axes (chacun noté /5)

| Axe | Question clé | Critère 5/5 |
|---|---|---|
| **Cohérence** | Contradictions entre sections ? | Zéro contradiction, flux logique |
| **Complétude** | Manque-t-il quelque chose ? | Toutes sections remplies, checklist ≥ 9/10 |
| **Faisabilité** | Réalisable avec les ressources ? | Effort cohérent avec scope et équipe |
| **Différenciation** | Le produit se démarque ? | Différenciateur clair, pas un clone |
| **Risques** | Bien identifiés et mitigés ? | Registre complet, mitigations concrètes |

### Verdicts

| Verdict | Condition | Action |
|---|---|---|
| **Prêt à livrer** ✅ | Score ≥ 20/25, aucun axe < 3 | Continuer vers P07.7 |
| **Quelques ajustements** 🟡 | Score 15-19/25 ou 1 axe < 3 | John propose corrections, pas de retour en arrière |
| **Retravailler {{SECTION}}** 🔴 | Score < 15/25 ou 2+ axes < 3 | Retour guidé à l'étape concernée |

### Règles Rex

- Retour **honnête mais constructif** — pas de complaisance ni de démolition
- Maximum 5 observations
- Le « plus gros risque » est une opinion, pas un veto
- Rex ne peut pas bloquer la livraison si l'utilisateur maintient sa position après 1 aller-retour

---

## 5. Procédure P07.7 — Clôture multi-agents

### Scripts par agent

**John (📋)** : prochaines étapes recommandées (partage technique, sprint validation, revue 3 mois). Ton : professionnel, rassurant.

**Rex (🔥)** : dernier conseil contextuel. Exemples :
- « Ne tombe pas amoureux de ta solution. Reste amoureux du problème. »
- « Ton plus gros risque n'est pas technique — c'est de ne pas écouter tes premiers utilisateurs. »
- « Si dans 3 mois tu n'as pas invalidé au moins une hypothèse, tu n'as pas assez testé. »

**Nova (🔭)** : résumé exécutif en 5 lignes (Quoi / Pourquoi / Comment / Mesure / Risque).

**Mary (🧠)** : célébration du chemin parcouru, rappel du sujet de départ vs. PRD final. Ton : enthousiaste.

### Tiers de célébration

| Niveau | Condition | Message |
|---|---|---|
| 🥉 Bronze | Checklist 6-7/10 | « Bon travail. Quelques points à renforcer. » |
| 🥈 Argent | Checklist 8-9/10 | « Excellent ! PRD solide et bien structuré. » |
| 🥇 Or | 10/10 + Rex ≥ 20/25 | « PRD exemplaire ! Du travail de pro. 🏆 » |

### Statistiques générées

| Stat | Source |
|---|---|
| Sections | Template PRD (10 standard) |
| Features / Exigences / KPIs / Risques / Personas | Compteurs P03-P07 |
| Durée | Heure début P01 → fin P07 |
| Score complétude | (checklist / 10) × 100 |

---

## 6. Template de livraison

### Nom de fichier

Format : `prd-{{SUJET_SLUG}}-{{DATE}}.md` — slug : minuscules, tirets, sans accents, max 30 caractères.

### YAML frontmatter du PRD final

```yaml
---
id: "{{PRD_ID}}"
session_source: "{{SESSION_ID}}"
nom_projet: "{{NOM_PROJET}}"
date_creation: "{{DATE_CRÉATION}}"
date_fin: "{{DATE_FIN}}"
statut: complété
etape_courante: 7
scope: "{{SCOPE}}"
version: "{{VERSION}}"
auteur: "John (PM)"
source_workflow: create-prd
score_completude: "{{SCORE}}%"
checklist_score: "{{SCORE}}/10"
rex_verdict: "{{VERDICT}}"
rex_score: "{{SCORE}}/25"
---
```

---

## 7. Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|---|---|---|---|
| E07-01 | Sauvegarde PRD échoue | Erreur écriture | Réessayer · vérifier `.plan/sessions/` · afficher en markdown pour copie manuelle |
| E07-02 | Checklist < 6/10 | P07.5 | John identifie sections à renforcer · « Tu as {{SCORE}}/10. On améliore {{ITEMS}} ? » |
| E07-03 | Rex verdict « Retravailler » | P07.6 | Rex identifie la section · retour guidé · « {{SECTION}} a besoin d'attention. On y retourne ? » |
| E07-04 | Utilisateur veut recommencer | Choix explicite | Archiver version courante (statut « abandonné ») · repartir P01 |
| E07-05 | Section manquante | Nova P07.4 | Compléter rapidement ou taguer « à compléter » |
| E07-06 | Copie presse-papier échoue | Option [3] | Fallback affichage markdown (option [2]) |
| E07-07 | Incohérence détectée par Nova | P07.4 | Signaler · proposer correction avant compilation |
| E07-08 | Session interrompue | Reprise | Reprendre au dernier checkpoint (CP-1/2/3) |

---

## 8. Exemple complet — Clôture PRD « App Budget Freelances »

**Contexte** : MVP · Personas Sophie + Marc · 8 features · 18 exigences · 5 KPIs · 45 min

**P07.2** — Rex propose 3 risques :

| ID | Cat. | Description | P | I | Mitigation |
|---|---|---|---|---|---|
| RR-001 | Technique | Intégration bancaire complexe | H | H | POC 2 banques avant dev |
| RR-002 | Utilisateur | Sophie ne comprend pas le jargon | M | H | Tests utilisateur + glossaire |
| RR-003 | Business | Marché saturé d'apps budget | M | M | Différenciateur freelance-first |

L'utilisateur ajoute RR-004 (Réglementaire — RGPD données bancaires, P:M, I:H).

**P07.5** — Checklist : **8/10** ✅ (manquent #9 roadmap vague, #10 cohérence post-RR-004)

**P07.6** — Rex : Score 19/25 · Verdict « Quelques ajustements 🟡 » · Plus gros risque : intégration bancaire · Conseil : « Ne lance pas le dev sans POC. Vraiment. »

**P07.7** — Clôture :
> **[John]** « PRD solide. 10 sections, 8 features. Prochaine étape : revue technique de RR-001. »
> **[Rex]** « Ce PRD a tenu mes 7 rounds. Dernier conseil : si le POC bancaire échoue, un import CSV suffit pour le MVP. »
> **[Nova]** « 1. SaaS freelances · 2. Gestion financière simplifiée · 3. Interface + intégration bancaire · 4. 500 inscriptions/3 mois · 5. Risque intégration mitigé par POC »
> **[Mary]** « De "aider les freelances" à ce PRD de 10 sections — bravo ! 🎉 »

**P07.8** — 📄 10 sections · 🎯 8 features · 📋 18 exigences · 📊 5 KPIs · ⚠️ 4 risques · 🏆 80% — 🥈 Argent

**P07.9** — Sauvegardé : `.plan/sessions/prd-app-budget-freelances-2026-02-06.md`

---

## 9. Gardes comportementaux

### John (orchestrateur)

| Garde | Comportement |
|---|---|
| Récapitulatif | Rappel du parcours complet avant finalisation |
| Checklist rigoureuse | Chaque item vérifié avec l'utilisateur, jamais auto-coché |
| Célébration | Statistiques, remerciements, fierté du travail accompli |
| Livraison propre | Bon répertoire (`.plan/sessions/`), bon format, bon frontmatter |

### Rex (risques + revue)

| Garde | Comportement |
|---|---|
| Expert risques | Mène P07.2 — son domaine de prédilection |
| Revue honnête | Verdict sans complaisance à P07.6, mais constructif |
| Borné | Max 5 observations en revue finale |
| Dernier mot | Conseil final direct et bienveillant |

### Nova (compilation)

| Garde | Comportement |
|---|---|
| Assembleuse | Compile section par section, pas en bloc |
| Vigilante | Détecte incohérences transversales |
| Résumé | 5 lignes claires et actionnables |

### Mary (clôture)

| Garde | Comportement |
|---|---|
| Enthousiaste | Célèbre le chemin parcouru |
| Mémorielle | Rappelle le sujet de départ vs. PRD final |
| Ponctuelle | Intervient uniquement à P07.7 |

---

## 10. Risques spécifiques à P07

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP07-01 | PRD incomplet — sections manquantes ou partiellement remplies | Moyenne | Haut | Nova vérifie section par section lors de P07.4. Checklist obligatoire à P07.5 — chaque item validé avec l'utilisateur. |
| RP07-02 | Incohérences entre sections — données contradictoires d'une étape à l'autre | Moyenne | Haut | Nova effectue les contrôles de cohérence transversaux (features ↔ exigences ↔ KPIs ↔ risques). Signaler et corriger avant compilation. |
| RP07-03 | Validation bâclée — sign-off sans relecture approfondie | Haute | Haut | Rex revue finale structurée en 5 axes avec score /25. Verdict honnête sans complaisance. Pas d'auto-validation. |
| RP07-04 | Revue finale précipitée — pression pour livrer sans passer par toutes les étapes P07 | Moyenne | Moyen | Respecter la séquence complète P07.1 → P07.9. John rappelle les étapes restantes si l'utilisateur veut sauter. |
| RP07-05 | Points ouverts non traités — questions et hypothèses de P05 oubliées dans le document final | Moyenne | Moyen | Intégrer la section « Questions ouvertes et hypothèses » dans le PRD final. Vérifier que chaque QO a un propriétaire et une deadline. |

---

## 11. Portes qualité P07

| Niveau | Critères |
|--------|----------|
| **Minimum** | Toutes les 10 sections du PRD présentes · Checklist ≥ 6/10 · Rex revue finale effectuée · Document sauvegardé dans `.plan/sessions/` avec le bon format de nom |
| **Standard** | Tous les critères Minimum + Checklist ≥ 8/10 · Rex score ≥ 18/25, aucun axe < 3/5 · Cohérence vérifiée par Nova (0 incohérence majeure) · YAML frontmatter complet · Approbation explicite de l'utilisateur · Statistiques de clôture générées |
| **Excellence** | Tous les critères Standard + Checklist 10/10 · Rex score ≥ 22/25 · Zéro section « à compléter » · Roadmap post-MVP détaillée avec dépendances · Toutes les questions ouvertes ont un propriétaire et un plan de résolution · Résumé exécutif Nova validé par l'utilisateur · PRD prêt pour transmission directe à l'équipe technique |

---

## 12. Anti-patterns P07

| Anti-pattern | Description | Conséquence | Remède |
|---|---|---|---|
| Rubber-stamping | Valider la checklist sans vérifier chaque item — cocher en série sans lire | PRD livré avec des lacunes non détectées | John vérifie chaque item avec l'utilisateur. Jamais d'auto-cochage. Poser la question pour chaque point. |
| Sauter la revue Rex finale | Considérer la revue Rex comme optionnelle ou la survoler par manque de temps | Incohérences et risques non détectés dans le document final | Rex revue finale est obligatoire. Si l'utilisateur insiste pour sauter, documenter le refus et le risque associé. |
| Checklist incomplète | Ne pas passer tous les items de la checklist — s'arrêter aux premiers OK | Faux sentiment de complétude, sections faibles ignorées | Parcourir les 10 items dans l'ordre. Score affiché à la fin. Si < 6/10, proposer des améliorations ciblées. |
| Pas de plan de livraison | PRD finalisé mais aucune indication sur les prochaines étapes ou le destinataire | Document qui reste dans un tiroir, pas d'action concrète | John propose les prochaines étapes à P07.7 : partage technique, sprint de validation, revue à 3 mois. |
| Ignorer les points ouverts | Questions ouvertes et hypothèses de P05 non reportées dans le PRD final | Décisions prises sur des bases non vérifiées, surprises en cours de développement | Intégrer systématiquement la section QO/HYP dans le PRD. Vérifier que chaque hypothèse a un plan de validation. |
