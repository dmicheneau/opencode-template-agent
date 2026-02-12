---
type: annexe
step: "04"
name: features
parent: step-04-features.md
title: Annexe — Fonctionnalités et Priorisation
version: 2.0
---

# Annexe Step 04 — Fonctionnalités et Priorisation

Ce fichier détaille les procédures, templates et scénarios de récupération pour l'étape Features & Priorisation. Il complète `step-04-features.md`.

---

## 1. Procédure P04.2 — Transformation idées → features

### Règles de transformation

| Règle | Description | Exemple |
|---|---|---|
| 1 idée → 1 feature | Idée précise et autonome | « Notifications push » → F-001 |
| 1 idée → 2-3 features | Idée large, plusieurs capacités | « Dashboard » → F-002 Tableau de bord, F-003 Export, F-004 Alertes |
| 1 idée → 0 feature | Trop vague ou déjà couverte | « Améliorer l'UX » → couverte par d'autres features |
| N idées → 1 feature | Idées convergentes | « Chat temps réel » + « Messagerie équipe » → F-005 Messagerie |

### Convention de nommage

- **ID** : `F-001`, `F-002`... (séquentiel)
- **Nom** : verbe d'action ou nom court, max 5 mots
- **Description** : 1 phrase concrète

### Template fiche feature

```markdown
**F-{{ID}} : {{NOM}}**
- **Description** : {{1_PHRASE}}
- **Source** : Idée(s) #{{ID_1}}, #{{ID_2}}
- **Thème** : {{THÈME}}
- **Persona(s)** : {{PERSONA_1}}, {{PERSONA_2}}
- **Besoin(s)** : {{BESOIN_1}}
```

### Regroupement par thème

1. Identifier 3-5 thèmes naturels (ex. « Onboarding », « Core Product », « Analytics »)
2. 1 feature = exactement 1 thème
3. Thème > 5 features → envisager de le scinder
4. Thème = 1 seule feature → rattacher à un autre thème

---

## 2. Procédure P04.3 — User stories interactives

### Template

```markdown
**US-{{ID}}** (Feature : F-{{ID_FEATURE}})
En tant que **{{PERSONA}}**, je veux **{{ACTION}}** pour **{{BÉNÉFICE}}**.

Critères d'acceptation :
- [ ] {{CRITÈRE_1}}
- [ ] {{CRITÈRE_2}}
- [ ] {{CRITÈRE_3}}
```

### Règles d'écriture

| Élément | Bonne pratique | Mauvaise pratique |
|---|---|---|
| Persona | Nom spécifique du persona P03 | « En tant qu'utilisateur » |
| Action | Verbe concret + complément | Verbe vague (« gérer ») |
| Bénéfice | Résultat mesurable | Abstrait (« être plus efficace ») |
| Critères | Conditions testables (oui/non), 3-5 par story | Critères subjectifs |

### Exemples

**Onboarding** :
> En tant que **Sophie**, je veux **créer mon compte en moins de 2 minutes** pour **commencer sans frustration**.
> - [ ] Max 4 champs dans le formulaire
> - [ ] Confirmation email en < 30 secondes
> - [ ] Parcours guidé automatique après inscription

**Core product** :
> En tant que **Marc**, je veux **filtrer mes projets par statut et date** pour **retrouver rapidement un projet en cours**.
> - [ ] Filtres cumulables
> - [ ] Résultats en < 1 seconde
> - [ ] Filtre actif visible et désactivable en un clic

**Analytics** :
> En tant que **Claire**, je veux **exporter un rapport mensuel en PDF** pour **partager les métriques avec ma direction**.
> - [ ] KPIs du dashboard inclus
> - [ ] Export en < 10 secondes
> - [ ] Mise en page prête à imprimer

---

## 3. Procédure P04.5 — MoSCoW flexible

### Définitions détaillées

| Priorité | Question clé | Exemples typiques |
|---|---|---|
| **Must Have** | « Sans ça, le produit ne fonctionne pas ? » | Authentification, feature core, sauvegarde |
| **Should Have** | « Très important, mais on peut lancer sans ? » | Notifications, recherche avancée |
| **Could Have** | « Serait bien, si on a le temps ? » | Mode sombre, export CSV |
| **Won't Have** | « Pas maintenant, plus tard ? » | Multi-langue, marketplace |

### Limites par scope

| Scope | Must max | Should max | Total recommandé |
|---|---|---|---|
| MVP | 5 | 5 | 8-12 |
| Growth | 10 | 10 | 15-25 |
| Vision | 15 | 15 | 25-40 |

### Triggers de challenge Rex

| Trigger | Seuil | Message Rex |
|---|---|---|
| Trop de Must | > limite scope | « {{N}} Must-Have pour un {{SCOPE}}. C'est un MVP ou une fusée ? 🚀 » |
| Aucun Won't | 0 Won't | « Zéro Won't Have ? Même les meilleurs produits disent non à quelque chose. » |
| Tout en Must/Should | 0 Could | « Rien en Could Have ? Ça me semble suspect. » |
| Scope creep | > limite totale × 1.5 | « {{N}} features pour un {{SCOPE}} ? Tu construis 3 produits ? » |
| Must sans story | Must sans US | « F-{{ID}} est Must mais n'a pas de user story. Pour qui c'est indispensable ? » |

### Pourquoi pas de proportions rigides

L'ancien système imposait 40-60% Must, 20-30% Should, 10-20% Could. C'est arbitraire :
- Un MVP peut avoir 30% Must → normal
- Un projet réglementaire peut avoir 70% Must → normal aussi
- Forcer des proportions pousse à sur/sous-prioriser artificiellement

**Bonne approche** : limites absolues par scope plutôt que pourcentages relatifs.

---

## 4. Procédure P04.6 — T-shirt sizing

### Grille

| Taille | Effort | Complexité | Exemple |
|---|---|---|---|
| **XS** | Quelques heures | Configuration | Modifier un libellé |
| **S** | 1-2 jours | Simple, peu de dépendances | Filtre basique |
| **M** | 3-5 jours | Moyenne, quelques intégrations | Formulaire complexe |
| **L** | 1-2 semaines | Importante, plusieurs composants | Dashboard analytics |
| **XL** | 2+ semaines | Majeure, architecture | Messagerie temps réel |

### Calibration

1. Choisir une feature « référence M » ensemble
2. Comparer chaque feature : « Par rapport à F-{{REF}}, c'est plus petit ou plus grand ? »
3. Moitié moins → S · double → L

### Heuristiques de challenge Rex

| Signal | Message Rex |
|---|---|
| Intégration externe en S | « Ça inclut auth, gestion d'erreurs, tests ? Plutôt M... » |
| Temps réel en M | « Websocket, synchro, gestion de connexion ? Plutôt L. » |
| Tout en S/M | « Soit ton produit est simple, soit tu sous-estimes. Biais classique. » |
| Feature IA en S | « Même un prompt a besoin de tests et d'itérations. Plutôt M ou L. » |

---

## 5. Procédure P04.7 — Matrice features → personas → besoins

### Format

```markdown
| Idée brainstorm | Feature | User Story | Persona | Besoin (P03) |
|---|---|---|---|---|
| #3 — {{RÉSUMÉ}} | F-001 | US-001 | {{PERSONA}} | {{BESOIN}} |
| #5 — {{RÉSUMÉ}} | F-002 | US-002, US-003 | {{PERSONA}} | {{BESOIN}} |
| (ajout direct) | F-004 | US-005 | {{PERSONA}} | {{BESOIN}} |
```

### Détection d'anomalies

**Feature orpheline** (pas de persona) :
> **[Nova]** « ⚠️ F-{{ID}} n'est liée à aucun persona. On l'associe, on crée un nouveau segment, ou on la déplace en Won't Have ? »

**Persona sous-servi(e)** (aucune feature Must/Should) :
> **[Nova]** « ⚠️ {{PERSONA}} n'a aucune feature prioritaire. Persona secondaire ou feature oubliée ? »

**Besoin orphelin** (besoin P03 non couvert) :
> **[Nova]** « ⚠️ Le besoin '{{BESOIN}}' de {{PERSONA}} n'est couvert par aucune feature. On crée une feature ou c'est hors scope ? »

---

## 6. Rex — Interventions détaillées

### Après P04.2 (features)

| Contexte | Challenge |
|---|---|
| Feature vague | « F-{{ID}} — c'est quoi concrètement ? Si tu ne peux pas l'expliquer en 1 phrase, c'est trop flou. » |
| Déjà chez concurrent | « F-{{ID}} existe chez {{CONCURRENT}}. Qu'est-ce qui rend ta version différente ? » |
| Redondance | « F-{{ID}} et F-{{AUTRE}} ne font pas la même chose sous des noms différents ? » |
| Sans source brainstorm | « F-{{ID}} ne vient d'aucune idée. D'où ça sort ? Feature creep ? » |

### Après P04.5 (MoSCoW)

| Contexte | Challenge |
|---|---|
| Trop de Must | « Trop de Must-Have tue le Must-Have. Si tout est prioritaire, rien ne l'est. » |
| Must discutable | « F-{{ID}} est vraiment Must ? Lance sans demain. Le produit est inutile ou juste moins bien ? » |
| Pas de Won't | « Dire non, c'est aussi un choix stratégique. Qu'est-ce que tu sacrifies ? » |

### Après P04.6 (effort)

| Contexte | Challenge |
|---|---|
| Sous-estimation | « Tout en S/M ? Syndrome de l'optimisme. Prends ta plus grosse S : 1-2 jours, vraiment ? » |
| XL en Must | « F-{{ID}} est Must ET XL. Plus gros risque du planning. Si ça dérape, tout glisse. » |
| Could en L/XL | « 3 features Could en L/XL. Gros effort pour du "serait bien". Cohérent ? » |

### Détection feature creep

| Signal | Seuil | Action Rex |
|---|---|---|
| Ajouts post-P04.2 | > 3 | « {{N}} features ajoutées depuis le début. Exploration ou construction ? » |
| Total > limite | > scope × 1.5 | « {{N}} features pour un {{SCOPE}}. On fait un tri ? » |
| Must ajouté tard | Après priorisation | « Must-Have ajouté maintenant ? Vérifie que ça ne bouscule pas le reste. » |

---

## 7. Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|---|---|---|---|
| E04-01 | Shortlist trop courte (< 3 idées) | P04.1 | Retour brainstorm ou mode « entrée directe » |
| E04-02 | Rejet systématique des features | P04.2 | Reprendre depuis les idées brutes, proposer à l'utilisateur de nommer ses features |
| E04-03 | Difficulté avec les user stories | P04.3 | John prend le lead : « Je propose, tu valides le bénéfice » |
| E04-04 | Trop de features (> 2× scope) | P04.5 | Rex + exercice de tri : « Si tu ne gardes que 5, lesquelles ? » |
| E04-05 | Aucun Must-Have | P04.5 | « Quelle est LA fonctionnalité sans laquelle ton produit n'a aucun sens ? » |
| E04-06 | Désaccord persistant priorité | > 2 allers-retours | L'utilisateur tranche, John note la divergence |
| E04-07 | Dépendances circulaires | P04.7 | « F-001 dépend de F-003 qui dépend de F-001. Quelle feature peut être autonome ? » |
| E04-08 | Session interrompue | Reprise | Reprendre au dernier checkpoint validé (CP-1/2/3) |

---

## 8. Exemple complet — App de gestion freelance

**Scope** : MVP · **Shortlist** : 8 idées · **Personas** : Sophie (débutante), Marc (confirmé)

**P04.2** — Nova regroupe en 3 thèmes, premier batch :
- **F-001** : Création de projet ← Idée #1
- **F-002** : Suivi temps ← Idées #2, #6
- **F-003** : Dashboard projet ← Idée #3

**P04.4** — Rex : « F-002 suivi temps, il y a 50 apps. Qu'est-ce qui te différencie ? Et tu n'as aucune feature de facturation — pour un freelance, c'est le nerf de la guerre. »

**P04.5** — Priorisation :

| ID | Feature | Priorité | Effort |
|---|---|---|---|
| F-001 | Création de projet | Must | S |
| F-002 | Suivi temps | Must | M (réf.) |
| F-003 | Dashboard | Should | M |
| F-004 | Facturation | Should | XL |
| F-005 | Gestion clients | Should | S |
| F-006 | Rappels | Should | S |
| F-007 | Export comptable | Could | M |
| F-008 | Templates | Won't | M |

Rex : « F-003 Dashboard, c'est vraiment Must ? Tu peux lancer avec une liste. » → Ajusté en Should. Rex : « F-004 Facturation en XL et Should — c'est ton plus gros morceau hors MVP. Attention au planning. »

**Résultat** : 2 Must · 4 Should · 1 Could · 1 Won't ✅

---

## 9. Gardes comportementaux

### John (agent principal)

| Garde | Comportement |
|---|---|
| Méthodique | Batch de 3 — jamais tout d'un coup |
| Traçable | Chaque feature a un ID, une source, un persona |
| Gardien scope | Signale le feature creep sans bloquer |

### Nova (support P04.2, P04.7)

| Garde | Comportement |
|---|---|
| Organisatrice | Regroupe en thèmes avant de transformer |
| Vigilante | Détecte orphelins, personas sous-servis, besoins non couverts |
| Ponctuelle | Intervient à P04.2 et P04.7, pas en continu |

### Rex (support P04.4, P04.5, P04.6)

| Garde | Comportement |
|---|---|
| Ciblé | 3-5 challenges max par intervention |
| Constructif | Questionne pour améliorer, pas détruire |
| Calibré | Intensité légère — plus forte en P05 |

---

## 10. Risques spécifiques à P04

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP04-01 | Feature creep — ajout continu de features après la transformation initiale | Haute | Critique | Rex détecte au-delà de 3 ajouts post-P04.2 et alerte. Rappeler le scope choisi à P01. Exercice de tri : « si tu ne gardes que 5, lesquelles ? » |
| RP04-02 | Priorisation absente ou arbitraire — toutes les features en Must-Have | Haute | Haut | Appliquer les limites MoSCoW par scope (MVP : 5 Must max). Rex challenge chaque Must : « lance sans demain — le produit est inutile ou juste moins bien ? » |
| RP04-03 | Frontières floues entre features — deux features qui se chevauchent ou une feature trop large | Moyenne | Haut | Appliquer la règle « si tu ne peux pas l'expliquer en 1 phrase, c'est trop flou ». Nova détecte les redondances lors du regroupement par thème |
| RP04-04 | Faisabilité technique ignorée — des features XL en Must sans conscience de l'effort réel | Moyenne | Critique | T-shirt sizing obligatoire avant la validation finale. Rex alerte sur les Must XL : « plus gros risque du planning — si ça dérape, tout glisse » |
| RP04-05 | Features sans user stories — des features listées sans lien avec une persona ou un bénéfice concret | Moyenne | Haut | Chaque feature Must/Should doit avoir au moins 1 user story. Nova détecte les orphelins lors du mapping P04.7 |

---

## 11. Portes qualité P04

Trois niveaux d'exigence pour valider la sortie de l'étape Fonctionnalités et Priorisation.

| Critère | 🟢 Minimum | 🟡 Standard | 🔴 Excellence |
|---------|-----------|------------|--------------|
| Alignement features-vision | Chaque feature a un lien identifié avec une idée du brainstorm ou la vision | Features regroupées par thème, chaque thème tracé vers un objectif de P02 | Matrice complète idées → features → personas → besoins, aucune feature orpheline |
| Rigueur de priorisation | Chaque feature a une priorité MoSCoW attribuée | Limites MoSCoW respectées selon le scope, au moins 1 Won't Have identifié | Priorisation challengée par Rex, chaque Must justifié, arbitrages documentés |
| Clarté du périmètre | Les features sont nommées et décrites en 1 phrase | Chaque feature a un ID, un nom, une description, une source et un persona associé | Fiches features complètes, user stories rédigées avec critères d'acceptation testables |
| Mapping valeur utilisateur | Au moins 1 persona est associée à chaque feature Must | Chaque persona a au moins 1 feature Must ou Should, besoins P03 couverts | Aucun besoin critique orphelin, aucune persona sous-servie, cohérence vérifiée par Nova |
| Évaluation de faisabilité | Un T-shirt sizing est attribué à chaque feature | Calibration faite sur une feature de référence, efforts cohérents entre features | Rex a challengé les estimations suspectes (intégrations en S, temps réel en M, tout en S/M) |

**Règle** : le niveau **Minimum** est obligatoire pour passer à P05. Les niveaux Standard et Excellence sont recommandés mais non bloquants.

---

## 12. Anti-patterns P04

Erreurs récurrentes à éviter lors de la définition et la priorisation des fonctionnalités.

| # | Anti-pattern | Pourquoi c'est un problème | Comment l'éviter |
|---|-------------|---------------------------|-----------------|
| 1 | **Syndrome de la wish list** — lister toutes les features imaginables sans filtre | Le PRD devient un catalogue exhaustif impossible à exécuter — l'équipe ne sait pas par où commencer | Respecter les limites par scope (MVP : 8-12 features total). Si la liste dépasse 1.5× la limite, Rex déclenche un tri forcé |
| 2 | **Gold plating** — ajouter des détails et des raffinements excessifs aux features | L'effort explose sur des éléments non essentiels — le MVP ne sort jamais | Se concentrer sur la description en 1 phrase et les critères d'acceptation testables. Les détails UX/UI viennent plus tard |
| 3 | **Pas de définition MVP** — aucune distinction claire entre ce qui est indispensable et ce qui est optionnel | L'équipe ne sait pas quoi construire en premier — tout semble aussi important | Exiger au moins 1 Won't Have. Appliquer le test : « lance sans demain — le produit est inutile ou juste moins bien ? » pour chaque Must |
| 4 | **Features sans user stories** — des fonctionnalités listées sans lien avec un utilisateur réel ou un bénéfice concret | Les features deviennent des spécifications techniques déconnectées des besoins — risque de construire ce que personne ne demande | Chaque feature doit répondre à « En tant que {{PERSONA}}, je veux {{ACTION}} pour {{BÉNÉFICE}} ». Si la phrase ne fonctionne pas, la feature est mal définie |
| 5 | **Ignorer les dépendances et la faisabilité** | Des features Must en XL qui dépendent d'autres features créent un effet domino — un retard sur une feature bloque tout | T-shirt sizing obligatoire. Rex alerte sur les Must XL. Vérifier les dépendances circulaires à P04.7 |
| 6 | **Tout en Must-Have** | Si tout est prioritaire, rien ne l'est — la priorisation perd son sens et le scope explose | Respecter les limites absolues par scope. Rex challenge : « trop de Must-Have tue le Must-Have ». Faire l'exercice « si tu ne gardes que 5, lesquelles ? » |
