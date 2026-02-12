---
type: annexe
step: "04"
name: synthesis
parent: step-04-synthesis.md
title: Annexe — Synthèse & Priorisation Collaborative
version: 2.0
---

# Annexe Step 04 — Synthèse & Priorisation Collaborative

Ce fichier détaille les procédures, templates et scénarios de récupération pour l'étape de synthèse. Il complète le fichier principal `step-04-synthesis.md`.

---

## 1. Procédure détaillée S04.3 — Regroupement thématique

### Algorithme de clustering

Nova regroupe les idées selon 3 axes de proximité :

| Axe | Description | Exemple |
|---|---|---|
| **Proximité sémantique** | Idées qui partagent un vocabulaire ou un concept commun | « chatbot IA » et « assistant virtuel » |
| **Domaine d'application** | Idées qui ciblent le même secteur ou cas d'usage | « onboarding » et « parcours utilisateur » |
| **Mécanisme sous-jacent** | Idées qui reposent sur le même principe technique ou business | « gamification » et « système de points » |

### Règles de regroupement

1. **1 idée = max 2 thèmes** — Si une idée est à cheval sur 3+ thèmes, choisir les 2 plus pertinents
2. **Nommer les thèmes de façon évocatrice** — Pas de noms génériques (« Divers », « Autres »). Préférer des noms qui racontent une histoire (« Engagement utilisateur par le jeu », « Automatisation intelligente »)
3. **3 à 7 thèmes** — En dessous de 3, le regroupement n'apporte rien. Au-dessus de 7, c'est trop fragmenté
4. **Thème « Satellites / Hors cadre »** — Les idées orphelines qui ne rentrent dans aucun thème vont dans cette catégorie spéciale. Ce n'est pas un rejet, c'est un parking pour idées atypiques qui méritent attention

### Présentation des thèmes

Toujours présenter par thème avec le compte d'idées, jamais en liste plate :

```markdown
**🎯 Thème 1 : {{NOM_ÉVOCATEUR}}** ({{X}} idées)
- Idée #3 : {{RÉSUMÉ}} ★ (favori)
- Idée #7 : {{RÉSUMÉ}}
- Idée #15 : {{RÉSUMÉ}}

**💡 Thème 2 : {{NOM_ÉVOCATEUR}}** ({{X}} idées)
- Idée #5 : {{RÉSUMÉ}}
- ...

**🛸 Satellites / Hors cadre** ({{X}} idées)
- Idée #22 : {{RÉSUMÉ}} — atypique mais à considérer
```

### Validation utilisateur

Après présentation des thèmes, demander :
- « Est-ce que ces regroupements te parlent ? »
- « Tu veux déplacer une idée d'un thème à un autre ? »
- « Un thème à renommer ou à fusionner avec un autre ? »

Ne pas passer à S04.4 tant que l'utilisateur n'a pas validé les thèmes.

---

## 2. Procédure détaillée S04.4 — Co-évaluation

### Processus interactif

Le scoring se fait en mode collaboratif, par batch de 3 idées :

**Étape 1** — Nova présente 3 idées avec ses scores proposés :

```markdown
| # | Idée | Impact (Nova) | Faisabilité (Nova) | Score proposé |
|---|------|---------------|--------------------|---------------|
| 3 | {{IDÉE}} | Haut | Moyen | A |
| 7 | {{IDÉE}} | Moyen | Haut | B+ |
| 12 | {{IDÉE}} | Haut | Haut | A+ |
```

**Étape 2** — Nova explique brièvement son raisonnement pour chaque score :
> « J'ai mis Impact Haut pour l'idée #3 parce que... et Faisabilité Moyen parce que... »

**Étape 3** — L'utilisateur réagit :
- ✅ « D'accord avec tout »
- 🔄 « Pour moi l'impact de #7 est plus haut, c'est un vrai game-changer »
- ❓ « Pourquoi tu as mis Faisabilité Bas pour #12 ? »

**Étape 4** — Nova ajuste et passe au batch suivant

### Grille d'évaluation détaillée

#### Impact

| Niveau | Signification | Indicateurs |
|---|---|---|
| **Haut (H)** | Change la donne | Nouveau marché, avantage compétitif fort, résout un problème critique |
| **Moyen (M)** | Améliore l'existant | Optimisation notable, meilleure expérience, gain d'efficacité |
| **Bas (B)** | Marginal | Nice-to-have, impact limité, facile à remplacer |

#### Faisabilité

| Niveau | Signification | Indicateurs |
|---|---|---|
| **Haut (H)** | Faisable rapidement | Technologie connue, ressources disponibles, délai court |
| **Moyen (M)** | Nécessite des ressources | Compétences à acquérir, budget modéré, quelques mois |
| **Bas (B)** | Très complexe | R&D nécessaire, budget élevé, délai long, forte incertitude |

### Matrice de score combiné

| | Faisabilité H | Faisabilité M | Faisabilité B |
|---|---|---|---|
| **Impact H** | **A+** | **A** | **B+** |
| **Impact M** | **B+** | **B** | **C+** |
| **Impact B** | **C** | **C** | **D** |

### Gestion des désaccords

Si l'utilisateur et Nova ne sont pas d'accord sur un score :

1. Nova explique son raisonnement avec des arguments factuels
2. L'utilisateur expose sa perspective
3. Discussion courte pour trouver un consensus
4. **Si pas de consensus** : le score de l'utilisateur prévaut (Nova propose, l'utilisateur dispose)
5. Nova note le désaccord dans ses commentaires : « Score ajusté par l'utilisateur (Nova : M, utilisateur : H) »

---

## 3. Procédure détaillée S04.6 — Rex Défi Final

### Objectif

Renforcer la confiance dans la shortlist en testant sa solidité. Rex ne cherche pas à détruire — il cherche les angles morts.

### Les 3 questions types

**Question 1 — Cohérence** :
> « Les idées #X et #Y ne sont-elles pas contradictoires ? Si tu lances les deux, est-ce qu'elles ne vont pas se cannibaliser ? »

*But* : vérifier que les idées du top fonctionnent ensemble comme un ensemble cohérent.

**Question 2 — Risque** :
> « Quel est le pire scénario si tu lances #Z en premier ? Qu'est-ce qui pourrait mal tourner ? »

*But* : identifier les risques cachés et les dépendances non évidentes.

**Question 3 — Résilience** :
> « Si le marché pivote dans 6 mois, laquelle de ces idées survit ? Et laquelle devient obsolète ? »

*But* : tester la robustesse des idées face au changement.

### Règles d'engagement de Rex

| Règle | Détail |
|---|---|
| Rex **ne peut pas** retirer une idée du top | Il questionne pour renforcer, jamais pour éliminer |
| Rex **doit** être constructif | Chaque question doit ouvrir une réflexion, pas fermer une porte |
| **Mary peut intervenir** | Si Rex est trop dur sur une idée, Mary peut défendre : « Attends Rex, cette idée a du potentiel parce que... » |
| **Limite de temps** | 3 questions maximum, pas de boucle infinie de challenges |
| **Résultat positif** | La shortlist sort renforcée, pas affaiblie |

### Après le défi

Nova résume les ajustements éventuels :
> « Suite aux questions de Rex, voici ce qui a changé :
> - L'idée #X est renforcée par {{ARGUMENT}}
> - L'idée #Y a un risque identifié : {{RISQUE}} → mitigation : {{ACTION}}
> - Aucune idée retirée du top »

---

## 4. Procédure détaillée S04.8 — Clôture multi-agents

### Scripts de clôture

**Mary (Facilitatrice)** — Ton enthousiaste, rappel du chemin parcouru :
> « Quel parcours ! On est partis de '{{SUJET}}' et on arrive avec
> {{COUNT}} idées et un top {{N}} solide. Bravo ! Tu as fait un travail
> remarquable en t'impliquant à chaque étape. »

**Rex (Challenger)** — Ton direct, dernier conseil provocateur mais bienveillant :
> « Je dois admettre que certaines idées ont résisté à mes challenges.
> Mon conseil : commence par #{{FIRST}} et garde #{{SECOND}} en plan B.
> Et n'oublie pas de tester tes hypothèses rapidement — le marché n'attend pas. »

**Nova (Synthétiseuse)** — Ton analytique, résumé structuré :
> « Voici le résumé structuré de ta session :
> - Sujet : {{SUJET}}
> - {{COUNT}} idées générées, {{THEMES}} thèmes identifiés
> - Top {{N}} : {{LISTE_COURTE}}
> - Prochaine étape : {{ACTION_CHOISIE}} »

### Célébration selon les statistiques

| Critère | Seuil | Message |
|---|---|---|
| Nombre d'idées | 15-29 | 🎯 Bon travail ! Session productive. |
| Nombre d'idées | 30-49 | 🚀 Excellent ! Session très riche. |
| Nombre d'idées | 50+ | 🌟 Impressionnant ! Session exceptionnelle. |

**Statistiques fun** à afficher :
> « Tu as passé {{DURATION}}, généré {{COUNT}} idées, dont {{USER_COUNT}}
> de toi ! {{LIKED}} idées ont été marquées comme favorites et {{CHALLENGED}}
> ont survécu aux challenges de Rex. »

---

## 5. Templates de sortie

### Template — Shortlist finale

```markdown
## Shortlist finale

| Rang | Idée | Thème | Impact | Faisabilité | Score |
|------|------|-------|--------|-------------|-------|
| 1 | {{IDÉE_1}} | {{THÈME}} | H | H | A+ |
| 2 | {{IDÉE_2}} | {{THÈME}} | H | M | A |
| 3 | {{IDÉE_3}} | {{THÈME}} | M | H | B+ |
| ... | ... | ... | ... | ... | ... |

**Synergies identifiées** :
- Les idées #1 et #3 se renforcent mutuellement
- L'idée #2 peut servir de fondation pour #5

**Risques notés (défi Rex)** :
- {{RISQUE_1}} → mitigation : {{ACTION_1}}
- {{RISQUE_2}} → mitigation : {{ACTION_2}}
```

### Template — Archive des idées non retenues

```markdown
<details>
<summary>📦 Idées non retenues ({{N}} idées)</summary>

| # | Idée | Thème | Score | Raison de l'exclusion |
|---|------|-------|-------|-----------------------|
| 14 | {{IDÉE}} | {{THÈME}} | C | Impact jugé trop faible par rapport au top |
| 21 | {{IDÉE}} | {{THÈME}} | D | Faisabilité insuffisante à court terme |
| 28 | {{IDÉE}} | Satellites | C+ | Hors périmètre du sujet principal |
| ... | ... | ... | ... | ... |

> Ces idées ne sont pas perdues ! Elles peuvent resurgir dans une future
> session ou alimenter d'autres projets.

</details>
```

### Template — Bilan de session complet

```markdown
## Bilan de session

**Informations générales**
- Sujet : {{SUJET}}
- Date : {{DATE}}
- Durée : {{DURATION}}

**Chiffres clés**
- {{COUNT}} idées générées en {{ROUNDS}} rondes
- {{TECHNIQUES_COUNT}} techniques utilisées
- {{USER_IDEAS}} idées de l'utilisateur
- {{LIKED}} favoris, {{CHALLENGED}} challenges Rex

**Thèmes identifiés** : {{LISTE_THÈMES}}

**Shortlist finale** : {{TOP_N}} idées sélectionnées
1. {{IDÉE_1}} (A+)
2. {{IDÉE_2}} (A)
3. {{IDÉE_3}} (B+)
...

**Décision** : {{ACTION_CHOISIE}}

**Clôture**
- Mary : {{MOT_MARY}}
- Rex : {{MOT_REX}}
- Nova : {{MOT_NOVA}}
```

---

## 6. Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|---|---|---|---|
| E04-01 | Trop peu d'idées pour un top 5 (< 10 idées) | Comptage à S04.2 | Réduire à un top 3, proposer retour en idéation (S03) |
| E04-02 | L'utilisateur n'est satisfait d'aucune idée | Rejet systématique à S04.5 | Proposer un retour en idéation avec de nouvelles techniques |
| E04-03 | Scoring trop homogène (tout en B) | Tous les scores identiques | Affiner les critères : ajouter un sous-critère différenciant |
| E04-04 | L'utilisateur veut tout garder dans le top | Refus de prioriser | Expliquer l'importance de prioriser : « Un top 15 n'est plus un top, c'est une liste. Quelles sont tes 5 préférées parmi celles-ci ? » |
| E04-05 | Rex trop négatif en closing | Rex détruit la dynamique positive | Mary intervient pour temporiser : « Rex a raison de questionner, mais rappelons les forces de ces idées... » |
| E04-06 | Désaccord persistant utilisateur/Nova sur les scores | Plus de 3 désaccords consécutifs | L'utilisateur a le dernier mot. Nova note : « Scores ajustés selon tes préférences » |
| E04-07 | Idées manquantes dans l'inventaire | Compteur S04.2 ≠ total S03 | Identifier les idées manquantes, les ajouter au regroupement |
| E04-08 | L'utilisateur veut revenir en S03 | Demande explicite de continuer l'idéation | Sauvegarder l'état actuel de S04, retourner en S03 avec contexte préservé |
| E04-09 | Session interrompue pendant la co-évaluation | Reprise de session | Reprendre au dernier batch évalué grâce aux scores déjà persistés |
| E04-10 | Thèmes trop nombreux (> 7) | Comptage à S04.3 | Proposer de fusionner les thèmes les plus proches : « Ces 2 thèmes se chevauchent, on les fusionne ? » |

---

## 7. Transition vers le PRD

### Préparation du handoff

Quand l'utilisateur choisit **[1] Créer le PRD**, Nova prépare le passage de relais vers John (PM) :

#### Données à transmettre

| Donnée | Source | Format |
|---|---|---|
| Shortlist finale | S04.7 | Liste ordonnée avec scores |
| Thèmes identifiés | S04.3 | Liste avec descriptions |
| Contraintes connues | S01 (cadrage) | Liste des contraintes mentionnées |
| Scores détaillés | S04.4 | Matrice impact/faisabilité |
| Risques identifiés | S04.6 (Rex) | Liste avec mitigations |
| Statistiques session | S04.2 | Chiffres clés |
| Idées archivées | S04.7 | Section dépliable |

#### Message de transition

> **[Nova]** « Parfait ! Je passe le relais à John, notre expert PRD.
> Il va transformer ta shortlist en document produit structuré.
> John aura accès à tout le contexte de notre session. »
>
> **[John]** « Merci Nova ! J'ai bien reçu ta shortlist de {{N}} idées.
> On va construire un PRD solide ensemble. Commençons... »

#### Intégrité du handoff

- Vérifier que le fichier de session est complet et sauvegardé
- S'assurer que le YAML frontmatter contient `statut: "complétée"`
- Le workflow `create-prd` lit la session brainstorm via le champ `session_brainstorm` de son propre frontmatter
- John (PM) démarre avec un récapitulatif du brainstorm avant de poser ses propres questions

---

## 8. Gardes comportementaux agents

### Nova (agent principal S04)

| Garde | Comportement attendu |
|---|---|
| Transparence | Toujours expliquer le raisonnement derrière un score ou un regroupement |
| Co-construction | Ne jamais imposer un classement — toujours demander validation |
| Exhaustivité | Chaque idée doit être classée dans un thème ET évaluée |
| Bienveillance | Même les idées de score D méritent une raison d'exclusion respectueuse |
| Progression | Présenter par batch de 3, jamais tout d'un coup |

### Rex (agent support S04.6)

| Garde | Comportement attendu |
|---|---|
| Constructif | Questions qui renforcent, jamais qui détruisent |
| Limité | Maximum 3 questions, pas de boucle infinie |
| Respectueux | Reconnaître les forces avant de questionner les faiblesses |
| Soumis au consensus | Accepter la décision finale de l'utilisateur sans insister |

### Mary (intervention S04.8)

| Garde | Comportement attendu |
|---|---|
| Enthousiaste | Célébrer le travail accompli de façon sincère |
| Récapitulatif | Rappeler le chemin parcouru depuis le sujet initial |
| Pont | Faire le lien entre l'énergie créative de S03 et la rigueur de S04 |

---

## 9. Risques spécifiques à S04

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RS04-01 | Perte de nuances lors du clustering — des idées subtiles sont écrasées dans des thèmes trop larges | Haute | Haut | Limiter à 3-7 thèmes, nommer chaque thème de façon évocatrice, conserver un thème « Satellites » pour les idées atypiques |
| RS04-02 | Biais de popularité — les idées les plus « évidentes » ou marquées 🔥 dominent la shortlist au détriment d'idées plus originales | Moyenne | Haut | Nova vérifie que le top inclut au moins 1 idée hors des favoris explicites ; Rex challenge les choix « trop confortables » |
| RS04-03 | Convergence prématurée — l'utilisateur veut conclure trop vite sans évaluer toutes les idées | Moyenne | Moyen | Nova insiste pour évaluer par batch de 3, ne pas sauter d'idées ; rappeler que les pépites sont parfois cachées dans le lot |
| RS04-04 | Cartographie incomplète — certaines idées de S03 manquent à l'inventaire de S04.2 | Basse | Haut | Vérification systématique du compteur S04.2 vs total S03 ; lister les idées manquantes et les réintégrer avant le clustering |
| RS04-05 | Synthèse finale trop abstraite — le document de sortie est creux, sans actionabilité concrète | Moyenne | Haut | Exiger au moins 1 prochaine action concrète dans le bilan ; Rex vérifie que chaque idée du top a un « comment » et pas seulement un « quoi » |

---

## 10. Portes qualité (Min / Std / Exc)

| Critère | Minimum | Standard | Excellence |
|---------|---------|----------|------------|
| Cohérence des clusters | Idées regroupées en au moins 3 thèmes, chaque idée assignée à 1 thème | 3-7 thèmes nommés de façon évocatrice, idées correctement assignées, thème Satellites présent si nécessaire | Thèmes validés par l'utilisateur, regroupements ajustés après feedback, liens inter-thèmes identifiés |
| Couverture de toutes les idées | Au moins 80% des idées de S03 apparaissent dans l'inventaire S04.2 | 100% des idées inventoriées, aucune idée manquante, compteur vérifié | 100% inventoriées + idées hybrides de S03-C intégrées, favoris (🔥) et contributions utilisateur (➕) marqués |
| Actionnabilité des recommandations | Une shortlist existe avec au moins 3 idées classées | Shortlist de 5-7 idées avec scores impact/faisabilité, justification Nova pour chaque score | Shortlist validée par l'utilisateur, risques identifiés par Rex avec mitigations, synergies entre idées documentées |
| Qualité de la priorisation | Idées classées par ordre sans critère explicite | Matrice impact/faisabilité appliquée, scores A+ à D attribués, désaccords notés | Scoring co-construit avec l'utilisateur, argumentaire pour chaque rang, plan B identifié si l'idée #1 échoue |
| Complétude du document de synthèse | Fichier de session sauvegardé avec shortlist et statut mis à jour | Fichier complet : shortlist, thèmes, scores, bilan chiffré, mots de clôture des 3 agents | Document enrichi : archive des idées non retenues, statistiques fun, transition PRD préparée si applicable |

---

## 11. Anti-patterns

| Anti-pattern | Symptôme | Correction |
|--------------|----------|------------|
| Cherry-picking des favoris | Nova ne retient que les idées marquées 🔥 et ignore les idées 💡 ou non réagies qui ont du potentiel | Évaluer systématiquement toutes les idées par batch de 3 ; vérifier que le top ne contient pas uniquement des favoris utilisateur |
| Sur-abstraction | Les thèmes sont si génériques (« Innovation », « Expérience ») qu'ils ne disent plus rien sur le contenu | Nommer les thèmes avec des formulations évocatrices qui racontent une histoire ; éviter les mots-valises ; demander à l'utilisateur si le nom lui parle |
| Idées atypiques ignorées | Les idées du thème « Satellites » sont traitées comme du déchet et jamais réévaluées | Nova mentionne explicitement les Satellites dans le récap ; proposer de les croiser avec les idées du top pour créer des hybrides |
| Sortie bâclée | La clôture est expédiée en 2 lignes, le bilan est incomplet, les agents ne prennent pas la parole | Suivre le protocole de clôture multi-agents (S04.8) : chaque agent donne son mot, statistiques affichées, célébration adaptée |
| Énergie créative perdue | La transition S03→S04 est si abrupte que l'utilisateur perd toute motivation pour le tri | Nova commence par un récap enthousiaste du travail accompli ; valoriser la richesse avant d'entamer le tri ; garder un ton dynamique pendant le scoring |
