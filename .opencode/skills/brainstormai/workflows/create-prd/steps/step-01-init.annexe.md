---
type: annexe
step: "01"
parent: step-01-init.md
title: Annexe — Initialisation du PRD
agent: pm
version: 2.0
---

# Annexe Step 01 — Initialisation du PRD

> Procédures détaillées, exemples, scénarios d'erreur et cas limites pour P01.
> Référencé depuis `step-01-init.md`.

---

## P01.A1 — Procédure d'accueil John

### Script d'accueil complet

> « Salut ! Je suis John, ton chef de produit. 📋
> Mon rôle, c'est de prendre les idées brutes de ton brainstorming et de les
> transformer en un PRD — un document de spécification produit — solide et actionnable.
>
> On va travailler ensemble en 7 étapes :
> 1. **Initialisation** — cadrer le projet (c'est maintenant !)
> 2. **Vision** — définir la vision et les objectifs
> 3. **Utilisateurs** — identifier les personas
> 4. **Fonctionnalités** — lister et prioriser les features
> 5. **Exigences** — détailler les spécifications
> 6. **Métriques** — mesurer le succès
> 7. **Finalisation** — compiler et valider le PRD
>
> À chaque étape, tu valides avant qu'on avance. Rien n'est gravé dans le marbre.
> Prêt(e) ? C'est parti ! »

### Détection de sessions PRD existantes

1. Scanner `.plan/sessions/prd-*.md`
2. Pour chaque fichier, lire le YAML frontmatter
3. Filtrer ceux avec `statut: en_cours`
4. Trier par date décroissante
5. Si sessions trouvées → afficher la liste :

   > « J'ai trouvé **{{N}}** session(s) PRD en cours :
   >
   > | # | ID | Projet | Étape | Date |
   > |---|------|--------|-------|------|
   > | 1 | {{ID_1}} | {{PROJET_1}} | {{ÉTAPE_1}}/7 | {{DATE_1}} |
   > | 2 | {{ID_2}} | {{PROJET_2}} | {{ÉTAPE_2}}/7 | {{DATE_2}} |
   >
   > **[R] Reprendre une session** — donne-moi le numéro
   > **[N] Nouvelle session** — on repart de zéro »

### Protocole de reprise

1. Charger le fichier de session sélectionné
2. Lire le YAML frontmatter complet :
   - `projet`, `type`, `domaine`, `complexité`, `scope`
   - `etape_courante`, `session_brainstorm`, `date`
3. Afficher un résumé :
   > « OK, je reprends ta session sur **{{PROJET}}**. Voilà où on en était :
   > - Type : {{TYPE}} | Domaine : {{DOMAINE}}
   > - Scope : {{SCOPE}} | Complexité : {{COMPLEXITÉ}}
   > - Dernière étape : {{ÉTAPE_COURANTE}}/7
   > - Session brainstorm liée : {{SESSION_BRAINSTORM}}
   >
   > On repart de l'étape {{ÉTAPE_COURANTE}} ? »
4. Si l'utilisateur confirme → rediriger vers l'étape indiquée
5. Si l'utilisateur veut modifier → proposer d'éditer le cadrage (retour P01.3)

---

## P01.A2 — Procédure de chargement du brainstorm

### Localisation du fichier brainstorm

1. Demander à l'utilisateur le nom ou l'ID de la session
2. Chercher dans `.plan/sessions/brainstorm-*.md`
3. Si plusieurs fichiers correspondent → lister et demander confirmation
4. Si aucun fichier trouvé → scénario E01-01

### Extraction des données du brainstorm

Champs à extraire du YAML frontmatter :

| Champ | Clé YAML | Obligatoire |
|-------|----------|-------------|
| Sujet | `topic` | ✅ Oui |
| Domaine | `domain` | ✅ Oui |
| Approche | `approach` | Non |
| Statut | `status` | ✅ Oui |
| Techniques utilisées | `techniques_used[]` | Non |
| Nombre d'idées | `idea_count` | Non |
| Rondes complétées | `rounds_completed` | Non |

Données à extraire du corps Markdown :

| Donnée | Section attendue | Fallback |
|--------|-----------------|----------|
| Shortlist (top idées) | « Shortlist » ou « Top idées » | Prendre toutes les idées listées |
| Thèmes | « Thèmes » ou « Regroupements » | Déduire des catégories d'idées |
| Scores/votes | « Évaluation » ou « Votes » | Ignorer si absent |

### Template de récapitulatif brainstorm

```
📋 Récapitulatif du brainstorm "{{SUJET}}"
├── Techniques : {{TECHNIQUES}} ({{COUNT}})
├── Idées générées : {{TOTAL_IDEAS}}
├── Shortlist : {{SHORTLIST_COUNT}} idées retenues
└── Thèmes principaux : {{THEMES}}

🏆 Top idées retenues :
{{#each SHORTLIST}}
  {{INDEX}}. {{IDÉE}} {{SCORE si disponible}}
{{/each}}

💡 Voici ce qu'on a à transformer en PRD !
```

### Mode « PRD sans brainstorm »

Si l'utilisateur n'a pas de session brainstorm :

1. Proposer l'entrée directe :
   > « Pas de brainstorm ? Pas de problème ! On peut construire le PRD directement.
   > Décris-moi ton projet en quelques phrases :
   > - C'est quoi l'idée principale ?
   > - À qui ça s'adresse ?
   > - Quel problème ça résout ? »

2. Reformuler et valider :
   > « Si je comprends bien, tu veux créer **{{REFORMULATION}}**.
   > C'est ça ? »

3. Noter dans le frontmatter : `session_brainstorm: null`
4. Continuer normalement à P01.3

---

## P01.A3 — Procédure de classification

### Types de projet détaillés

| Type | Description | Exemples |
|------|-------------|----------|
| Application web | App accessible via navigateur | SaaS, dashboard, portail |
| Application mobile | App native ou hybride | iOS, Android, React Native |
| API/Service | Backend, microservice, intégration | REST API, webhook, SDK |
| Plateforme | Écosystème multi-faces | Marketplace, réseau social |
| Outil interne | Usage entreprise interne | Admin panel, outil RH |
| Marketplace | Place de marché avec vendeurs et acheteurs | E-commerce, services |
| Produit physique+digital | Hardware avec composante logicielle | IoT, wearable, kiosk |
| Autre | Ne rentre dans aucune catégorie | À préciser par l'utilisateur |

### Domaines détaillés

| Domaine | Exemples de produits |
|---------|---------------------|
| Tech | DevTools, infrastructure, IA/ML |
| Santé | Télémédecine, bien-être, fitness |
| Éducation | E-learning, EdTech, formation |
| Finance | FinTech, paiement, comptabilité |
| Commerce | E-commerce, retail, logistique |
| Social | Réseau social, communauté, dating |
| Divertissement | Jeux, streaming, média |
| Productivité | Gestion de projet, collaboration, notes |
| Autre | À préciser par l'utilisateur |

### Matrice de complexité

| Critère | 🟢 Simple | 🟡 Moyen | 🔴 Complexe |
|---------|----------|---------|------------|
| Personas | 1 | 2-3 | 4+ |
| Fonctionnalités | <10 | 10-25 | 25+ |
| Intégrations | 0-1 | 2-4 | 5+ |
| Timeline estimée | 1-2 mois | 3-6 mois | 6-12 mois |
| Équipe nécessaire | 1-2 personnes | 3-5 personnes | 6+ personnes |

### Classification automatique depuis le brainstorm

John peut pré-remplir la classification en analysant le brainstorm :
- **Type** : déduit du sujet et des idées (« appli mobile » → Application mobile)
- **Domaine** : déduit du champ `domain` du brainstorm
- **Complexité** : déduite du nombre d'idées dans la shortlist

---

## P01.A4 — Procédure de choix du scope

### Descriptions détaillées des scopes

#### 🎯 MVP — « L'essentiel pour valider l'idée »

- **Objectif** : Valider les hypothèses clés avec un effort minimal
- **Fonctionnalités** : 3-5 Must-Have uniquement
- **Personas** : 1-2 cibles principales
- **Timeline** : 1-3 mois de développement
- **Budget** : Minimal — proof of concept
- **Quand choisir** : Première itération, validation marché, budget serré
- **Exemple** : « On lance une landing page + une feature core pour tester la demande »

#### 🚀 Growth — « Un produit solide pour le marché »

- **Objectif** : Livrer un produit compétitif avec les fonctionnalités essentielles et différenciantes
- **Fonctionnalités** : 10-15 Must-Have + Should-Have
- **Personas** : 2-3 segments utilisateurs
- **Timeline** : 3-6 mois de développement
- **Budget** : Modéré — produit viable
- **Quand choisir** : Hypothèses déjà validées, besoin de se différencier
- **Exemple** : « On construit l'app complète avec onboarding, features clés et analytics »

#### 🌟 Vision — « Le produit complet rêvé »

- **Objectif** : Documenter la vision long terme complète
- **Fonctionnalités** : 20+ fonctionnalités sur toutes les catégories MoSCoW
- **Personas** : 3+ segments avec personas détaillés
- **Timeline** : 6-12 mois de développement
- **Budget** : Significatif — roadmap complète
- **Quand choisir** : Levée de fonds, pitch investisseurs, vision stratégique
- **Exemple** : « On documente tout : le produit idéal dans 1-2 ans avec toutes les features »

### Matrice de décision scope

| Facteur | → MVP | → Growth | → Vision |
|---------|-------|----------|----------|
| Premier PRD ? | ✅ | ⚠️ | ❌ |
| Budget limité ? | ✅ | ⚠️ | ❌ |
| Idées validées ? | — | ✅ | ✅ |
| Besoin investisseurs ? | ❌ | ⚠️ | ✅ |
| Équipe en place ? | — | ✅ | ✅ |
| Marché concurrentiel ? | ⚠️ | ✅ | — |

### Protocole de challenge Rex

Rex intervient après le choix du scope. Son intensité dépend du contexte :

**Scope Vision choisi + premier PRD** (intensité haute) :
> **[Rex]** « Stop. Un scope Vision pour un premier PRD, c'est le meilleur moyen
> de ne jamais rien livrer. Tu as validé quoi concrètement sur le terrain ?
> Je te recommande fortement un MVP d'abord. Tu es sûr(e) de ton choix ? »

**Scope MVP choisi + brainstorm riche (15+ idées)** (intensité moyenne) :
> **[Rex]** « Un MVP c'est sage, mais ton brainstorm déborde d'idées — {{N}} idées
> dont {{SHORTLIST}} en shortlist. Tu ne voudrais pas au moins un Growth pour
> capitaliser sur ce travail ? »

**Scope Growth choisi** (intensité faible) :
> **[Rex]** « Growth, bon compromis. Vérifie juste que tes Should-Have ne sont pas
> en fait des Must-Have déguisés. On clarifiera ça à l'étape 4. »

**Scope MVP choisi + peu d'idées** (pas d'intervention) :
Rex ne dit rien — le choix est cohérent.

### Gestion de l'hésitation

Si l'utilisateur hésite entre deux scopes :
> « Je comprends l'hésitation ! Voilà un truc que j'utilise souvent :
> commence par rédiger un **PRD MVP**. Si en cours de route tu réalises
> que certaines features Should-Have sont en fait indispensables, on élargira
> naturellement vers un Growth. Le PRD est un document vivant !
>
> Tu pars sur lequel ? »

---

## P01.A5 — Scénarios d'erreur et récupération

### E01-01 : Fichier brainstorm introuvable

**Détection** : Le fichier `.plan/sessions/brainstorm-*.md` spécifié n'existe pas.

**Récupération** :
> « Hmm, je ne trouve pas le fichier **{{NOM_FICHIER}}** dans `.plan/sessions/`.
>
> Quelques options :
> **[1]** Donne-moi le nom exact ou l'ID de la session
> **[2]** Je liste les sessions disponibles pour que tu choisisses
> **[3]** On démarre le PRD sans brainstorm (entrée directe) »

- Option [2] : lister tous les fichiers `brainstorm-*.md` triés par date
- Option [3] : basculer en mode « PRD sans brainstorm » (voir P01.A2)

### E01-02 : YAML brainstorm corrompu

**Détection** : Le frontmatter YAML du brainstorm ne peut pas être parsé correctement.

**Récupération** :
> « Le fichier brainstorm existe mais son en-tête semble abîmé.
> Je vais essayer d'extraire ce que je peux du contenu... »

1. Tenter d'extraire les données du corps Markdown (idées, thèmes)
2. Demander confirmation des données extraites
3. Compléter manuellement les champs manquants :
   > « J'ai pu récupérer {{N}} idées du brainstorm, mais il me manque
   > quelques infos. Peux-tu me confirmer :
   > - Le sujet principal ?
   > - Le domaine ? »

### E01-03 : Aucune shortlist dans le brainstorm

**Détection** : Le brainstorm est chargé mais ne contient pas de shortlist/top idées.

**Récupération** :
> « Ton brainstorm contient {{N}} idées mais pas de shortlist priorisée.
> On a deux options :
> **[1]** Je prends toutes les idées et on priorisera ensemble à l'étape 4
> **[2]** On fait une sélection rapide maintenant — je te les liste et tu me
>         dis lesquelles te semblent les plus prometteuses »

### E01-04 : Échec de création du fichier PRD

**Détection** : Le fichier `.plan/sessions/prd-*.md` ne peut pas être créé.

**Récupération** :
> « J'ai un souci technique pour créer le fichier PRD.
> Pas grave, je continue et je réessaierai à l'étape suivante.
> Tes choix ne seront pas perdus ! »

1. Garder toutes les données en mémoire
2. Réessayer la création au début de P02
3. Si ça échoue toujours → générer le contenu YAML en sortie pour copier-coller

### E01-05 : L'utilisateur hésite sur le scope

**Détection** : L'utilisateur ne sait pas quel scope choisir ou change d'avis plusieurs fois.

**Récupération** :
> « C'est normal d'hésiter ! Voilà ma recommandation basée sur ton contexte :
>
> | Ton contexte | Mon conseil |
> |-------------|-------------|
> | Premier produit | 🎯 MVP |
> | Idées déjà testées | 🚀 Growth |
> | Pitch investisseurs | 🌟 Vision |
>
> Et rappelle-toi : le scope n'est pas définitif. On pourra l'ajuster
> en cours de route si besoin. »

---

## P01.A6 — Gardes comportementaux de John (P01)

| Comportement attendu | Garde |
|----------------------|-------|
| Toujours tutoyer l'utilisateur | Vérifier chaque message — jamais de « vous/votre/vos » |
| Récapituler le brainstorm avant de classifier | Ne jamais sauter P01.2 — même si l'utilisateur veut aller vite |
| Expliquer les implications de chaque scope | Pas juste les noms — donner le nombre de features, la timeline |
| Accueillir les challenges de Rex sans les ignorer | Reformuler le point de Rex, laisser l'utilisateur décider |
| Ne pas imposer un scope | Proposer, expliquer, recommander — jamais imposer |
| Confirmer la création du fichier PRD | Toujours afficher l'ID et le résumé après création |
| Proposer l'entrée directe si pas de brainstorm | Ne jamais bloquer sur l'absence de session brainstorm |

---

## P01.A7 — Exemples concrets

### Exemple A — Application de méditation pour ados (suite du brainstorm)

**P01.1 — Accueil**
> John : « Salut ! Je suis John, ton chef de produit. 📋
> Pas de session PRD en cours, on démarre une nouvelle. C'est parti ! »

**P01.2 — Chargement brainstorm**
> John : « Tu as fait un brainstorming avant ? »
> User : « Oui, la session brainstorm-20260206-143000 »
> John :
> ```
> 📋 Récapitulatif du brainstorm "Appli de méditation pour ados"
> ├── Techniques : SCAMPER, Analogie Forcée, Six Chapeaux (3)
> ├── Idées générées : 34
> ├── Shortlist : 8 idées retenues
> └── Thèmes principaux : Gamification, Personnalisation, Social
>
> 🏆 Top idées retenues :
> 1. Méditations courtes (3-5 min) avec thèmes ado
> 2. Système de streaks et badges
> 3. Mode "SOS stress" avant un exam
> 4. Personnages/avatars qui évoluent
> 5. Partage anonyme entre ados
> 6. Intégration Spotify/playlists
> 7. Méditation en groupe avec amis
> 8. Journal d'humeur visuel (emojis)
>
> Voici ce qu'on a à transformer en PRD !
> ```
> User : « Super, c'est exactement ça ! »

**P01.3 — Classification**
> John : « D'après ce que je vois :
> - **Type** : Application mobile
> - **Domaine** : Santé / bien-être
> - **Complexité** : 🟡 Moyen (2-3 personas, ~15 fonctionnalités possibles)
>
> Ça te semble juste ? »
> User : « Oui, parfait. »

**P01.4 — Scope**
> John : « Quel scope pour ton PRD ? »
> User : « Growth ! »
> **[Rex]** : « Growth, bon compromis pour une appli ado. Vérifie juste que les features
> sociales (partage, méditation en groupe) ne sont pas des nice-to-have déguisés en essentiels.
> On clarifiera ça à l'étape 4. »
> John : « Rex a raison, on gardera ça en tête. On avance ? »

**P01.5 — Fichier créé**
> John : « 📄 **prd-20260206-145000** créé !
> - Projet : Appli de méditation pour ados
> - Type : Application mobile | Domaine : Santé
> - Complexité : Moyen | Scope : Growth
> - Lien brainstorm : brainstorm-20260206-143000 »

**P01.6 — Validation**
> John : « Tout est bon ? On passe à la vision ? »
> User : « [C] Go ! »

---

### Exemple B — PRD sans brainstorm (entrée directe)

**P01.1 — Accueil**
> John : « Salut ! Je suis John. 📋 On démarre un nouveau PRD ! »

**P01.2 — Pas de brainstorm**
> John : « Tu as fait un brainstorming avant ? »
> User : « Non, j'ai juste une idée en tête. »
> John : « Pas de souci ! Décris-moi ton projet en quelques phrases. »
> User : « Je veux créer un outil de gestion de tâches pour les freelances
> qui intègre la facturation. »
> John : « Si je comprends bien, tu veux créer un **outil tout-en-un
> gestion de tâches + facturation pour freelances**. C'est ça ? »
> User : « Oui, exactement ! »

**P01.3 — Classification**
> John : « Ma classification :
> - **Type** : Application web (SaaS)
> - **Domaine** : Productivité
> - **Complexité** : 🟡 Moyen (freelances + clients, ~15-20 features)
>
> Ça te va ? »

**P01.4 — Scope**
> User : « MVP pour commencer. »
> John : « MVP, excellent choix pour un premier produit freelance !
> On se concentre sur les 3-5 features essentielles. »
> _(Rex n'intervient pas — choix cohérent)_

---

## P01.A8 — Risques spécifiques à P01

| ID | Risque | Impact | Mitigation |
|----|--------|--------|------------|
| RP01-01 | Brainstorm trop ancien ou hors sujet | PRD déconnecté des idées originales | Vérifier la date et le sujet avec l'utilisateur |
| RP01-02 | Classification incorrecte acceptée sans vérifier | Scope et features mal calibrés aux étapes suivantes | Insister sur la validation à P01.3 |
| RP01-03 | Scope trop ambitieux pour un premier PRD | PRD inutilisable car trop vaste | Challenge Rex à P01.4, recommander MVP par défaut |
| RP01-04 | Mode entrée directe avec sujet trop vague | Pas assez de matière pour construire un PRD solide | Poser 3 questions de cadrage minimum |
| RP01-05 | Fichier PRD créé mais données incomplètes | Étapes suivantes en erreur | Checkpoint P01.5 obligatoire — vérifier tous les champs |

---

## P01.A9 — Portes qualité P01

Trois niveaux d'exigence pour valider la sortie de l'étape d'initialisation.

| Critère | 🟢 Minimum | 🟡 Standard | 🔴 Excellence |
|---------|-----------|------------|--------------|
| Nom du projet | Un nom de travail est défini, même provisoire | Nom clair, distinct et mémorisable | Nom validé par l'utilisateur avec vérification qu'il n'existe pas déjà |
| Source de session | Le champ `session_brainstorm` est renseigné (valeur ou `null`) | Session brainstorm liée et récapitulatif affiché à l'utilisateur | Récapitulatif validé point par point, shortlist confirmée |
| Scope initial | Un scope (MVP/Growth/Vision) est choisi | Scope choisi avec explication des implications (timeline, nb features) | Scope challengé par Rex, réponse argumentée de l'utilisateur |
| Parties prenantes | L'utilisateur est identifié comme décideur | Rôle de l'utilisateur clarifié (fondateur, PM, dev…) | Parties prenantes secondaires identifiées (équipe, investisseurs, utilisateurs finaux) |
| Conscience du planning | Une complexité est attribuée (simple/moyen/complexe) | Timeline estimée cohérente avec le scope choisi | Jalons clés identifiés, contraintes de délai explicites |
| Classification | Type et domaine renseignés | Type, domaine et complexité validés par l'utilisateur | Classification croisée avec le brainstorm, cohérence vérifiée |
| Fichier PRD | Fichier créé avec frontmatter minimal | Tous les champs frontmatter remplis, ID unique généré | Fichier vérifié, récapitulatif complet affiché et validé par l'utilisateur |

**Règle** : le niveau **Minimum** est obligatoire pour passer à P02. Les niveaux Standard et Excellence sont recommandés mais non bloquants.

---

## P01.A10 — Anti-patterns P01

Erreurs récurrentes à éviter lors de l'initialisation du PRD.

| # | Anti-pattern | Pourquoi c'est un problème | Comment l'éviter |
|---|-------------|---------------------------|-----------------|
| 1 | **Démarrer sans input brainstorm ni description claire** | Le PRD manque de matière première, les étapes suivantes seront creuses et déconnectées des vrais besoins | Toujours charger une session brainstorm ou, à défaut, poser les 3 questions de cadrage minimum (idée, cible, problème) |
| 2 | **Scope non défini ou laissé implicite** | Sans scope explicite, le PRD dérive vers un « document fourre-tout » impossible à prioriser | Exiger un choix MVP/Growth/Vision avant de créer le fichier PRD — pas de passage à P02 sans scope validé |
| 3 | **Sauter la validation utilisateur** | Si l'utilisateur n'a pas confirmé la classification et le scope, il découvrira des incohérences trop tard (P04-P05) | Toujours afficher le récapitulatif complet et attendre un « [C] Continuer » explicite avant de passer à P02 |
| 4 | **Sur-ingénierie de l'initialisation** | Passer 30 minutes à peaufiner le nom du projet ou à débattre du domaine exact retarde l'essentiel | L'initialisation doit rester rapide (5-10 min). Les détails seront affinés aux étapes suivantes — rien n'est gravé dans le marbre |
| 5 | **Ignorer les sessions PRD existantes** | Créer une nouvelle session alors qu'une session en cours existe déjà provoque des doublons et de la confusion | Toujours scanner `.plan/sessions/prd-*.md` au démarrage et proposer la reprise si des sessions `en_cours` existent |
| 6 | **Accepter un brainstorm sans vérification** | Un brainstorm ancien, hors sujet ou incomplet donne une base fragile au PRD | Vérifier la date, le sujet et la présence d'une shortlist avant de valider le chargement |
