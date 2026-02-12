---
type: step
step: "01"
name: init
title: Initialisation du PRD
version: 2.0
agent: pm
previous: null
next: step-02-vision
annexe: step-01-init.annexe.md
---

# Step 01 — Initialisation du PRD

> 📍 Étape 1/7 — Initialisation ██░░░░░░░░░░░░░░ 14%

## Contexte requis

- Agent : **John** (PM) — professionnel, méthodique, tutoiement
- Fichier de session brainstorm dans `.plan/sessions/brainstorm-*.md` (optionnel)
- Template PRD dans `templates/prd-template.md`
- Accès en écriture à `.plan/sessions/` pour créer le fichier PRD

## Sous-tâches

| ID | Sous-tâche | Validation |
|----|-----------|------------|
| P01.1 | Accueil John et détection de session PRD existante | Accueil affiché, sessions en cours détectées |
| P01.2 | Chargement et récapitulatif du brainstorm source | Brainstorm chargé et récap validé par l'utilisateur |
| P01.3 | Classification du projet (type, domaine, complexité) | Classification proposée et validée |
| P01.4 | Choix du scope (MVP / Growth / Vision) | Scope sélectionné, implications comprises |
| P01.5 | Initialisation du fichier PRD | Fichier `.plan/sessions/prd-*.md` créé avec frontmatter YAML |
| P01.6 | Validation du cadrage PRD | Récap complet validé, prêt pour étape 2 |

## Instructions pour l'agent (John)

### P01.1 — Accueil et détection de session existante

1. Scanner `.plan/sessions/prd-*.md` pour des sessions avec `statut: en_cours`
2. Si une ou plusieurs sessions trouvées → proposer la reprise :
   > « Salut ! Je suis John, ton chef de produit. 📋
   > J'ai trouvé **{{N}}** session(s) PRD en cours :
   > 1. **{{ID_1}}** — {{projet_1}} (dernière étape : {{étape_1}})
   >
   > Tu veux reprendre une session ou en démarrer une nouvelle ? »
   >
   > **[R] Reprendre** | **[N] Nouvelle session**

3. Si aucune session trouvée → accueil standard :
   > « Salut ! Je suis John, ton chef de produit. 📋
   > Mon rôle, c'est de transformer les idées de ton brainstorming en un PRD solide
   > et actionnable. On va procéder étape par étape — 7 au total.
   > C'est parti ! »

→ Annexe P01.A1 : script d'accueil complet et protocole de reprise.

### P01.2 — Chargement et récapitulatif du brainstorm

1. Demander la session brainstorm source :
   > « Tu as fait un brainstorming avant ? Si oui, donne-moi le nom ou l'ID
   > de ta session. Sinon, on peut démarrer le PRD de zéro ! »

2. **Si brainstorm fourni** — charger `.plan/sessions/brainstorm-*.md` et extraire :
   - Sujet original (`topic`), domaine, approche, techniques utilisées
   - Nombre d'idées générées (`idea_count`)
   - Shortlist (top 5-10 idées retenues)
   - Thèmes principaux identifiés

3. Afficher le récapitulatif compact :

   ```
   📋 Récapitulatif du brainstorm "{{SUJET}}"
   ├── Techniques : {{TECHNIQUES}} ({{COUNT}})
   ├── Idées générées : {{TOTAL_IDEAS}}
   ├── Shortlist : {{SHORTLIST_COUNT}} idées retenues
   └── Thèmes principaux : {{THEMES}}

   🏆 Top idées retenues :
   1. {{IDÉE_1}}
   2. {{IDÉE_2}}
   3. {{IDÉE_3}}
   ...

   Voici ce qu'on a à transformer en PRD !
   ```

4. **Si pas de brainstorm** — mode entrée directe :
   > « Pas de souci ! Décris-moi ton projet en quelques phrases et on construit
   > le PRD ensemble. Quel est le sujet principal ? »

**Checkpoint P01.2** : ✅ Brainstorm chargé et récap validé (ou sujet saisi manuellement).

→ Annexe P01.A2 : procédure de chargement, format récap, cas d'erreur.

### P01.3 — Classification du projet

Proposer une classification interactive :

> « D'après ce que je vois, voilà comment je classifierais ton projet :
>
> | Critère | Ma proposition |
> |---------|---------------|
> | **Type** | {{TYPE}} |
> | **Domaine** | {{DOMAINE}} |
> | **Complexité** | {{COMPLEXITÉ}} |
>
> Ça te semble juste ? Tu veux ajuster quelque chose ? »

**Types disponibles** : Application web, Application mobile, API/Service, Plateforme, Outil interne, Marketplace, Produit physique+digital, Autre

**Domaines disponibles** : Tech, Santé, Éducation, Finance, Commerce, Social, Divertissement, Productivité, Autre

**Niveaux de complexité** :
- 🟢 Simple — 1 persona, <10 fonctionnalités, 1-2 mois
- 🟡 Moyen — 2-3 personas, 10-25 fonctionnalités, 3-6 mois
- 🔴 Complexe — 4+ personas, 25+ fonctionnalités, 6-12 mois

→ Annexe P01.A3 : listes complètes et critères de classification.

### P01.4 — Choix du scope

Présenter les 3 niveaux de scope avec descriptions enrichies :

> « Maintenant, quel niveau d'ambition pour ton PRD ?
>
> | Scope | Description | Fonctionnalités | Personas | Timeline |
> |-------|-------------|-----------------|----------|----------|
> | 🎯 **MVP** | L'essentiel pour valider l'idée | 3-5 Must-Have | 1-2 | 1-3 mois |
> | 🚀 **Growth** | Un produit solide pour le marché | 10-15 Must+Should | 2-3 | 3-6 mois |
> | 🌟 **Vision** | Le produit complet rêvé | 20+ complètes | 3+ | 6-12 mois |
>
> **[1] MVP** — Aller à l'essentiel
> **[2] Growth** — Version ambitieuse mais réaliste
> **[3] Vision** — Le rêve complet »

#### 🐾 Observation de Rex

Après le choix de l'utilisateur, Rex peut intervenir si le scope semble risqué :

> **[Rex]** « Attention, un scope Vision pour un premier PRD risque d'être trop
> ambitieux. Tu es sûr(e) ? Je recommande de commencer par un MVP pour valider
> les hypothèses clés, puis d'itérer. »

Ou pour un scope trop conservateur :

> **[Rex]** « Un MVP c'est bien pour démarrer, mais ton brainstorm montre
> {{N}} idées fortes. Tu ne voudrais pas au moins un Growth pour capitaliser
> sur tout ce potentiel ? »

John accueille le feedback de Rex et laisse l'utilisateur décider :

> « Rex soulève un bon point. Qu'est-ce que tu en penses ?
> Tu maintiens ton choix ou tu veux ajuster ? »

**Checkpoint P01.4** : ✅ Scope sélectionné et confirmé par l'utilisateur.

→ Annexe P01.A4 : descriptions détaillées, matrice de décision, challenge Rex.

### P01.5 — Initialisation du fichier PRD

Créer le fichier `.plan/sessions/prd-<timestamp>.md` avec le frontmatter YAML :

```yaml
---
id: "prd-<timestamp>"
date: "<date>"
session_brainstorm: "<session-id ou null>"
projet: "<nom du projet>"
type: "<type>"
domaine: "<domaine>"
complexité: "<simple|moyen|complexe>"
scope: "<mvp|growth|vision>"
statut: "en_cours"
etape_courante: 1
version: 1
auteur: "John (PM)"
source_workflow: "create-prd"
---
```

> « Parfait ! J'ai initialisé ton fichier PRD. Voilà le résumé :
>
> 📄 **{{ID}}** créé avec succès
> - Projet : {{NOM}}
> - Type : {{TYPE}} | Domaine : {{DOMAINE}}
> - Complexité : {{COMPLEXITÉ}} | Scope : {{SCOPE}}
> - Lien brainstorm : {{SESSION_BRAINSTORM}} »

**Checkpoint P01.5** : ✅ Fichier PRD créé et accessible dans `.plan/sessions/`.

### P01.6 — Validation du cadrage PRD

Récapitulatif final avant de passer à l'étape 2 :

> « Avant d'avancer, validons ensemble le cadrage complet :
>
> | Élément | Valeur |
> |---------|--------|
> | **Projet** | {{NOM}} |
> | **Source** | {{BRAINSTORM_ID ou "Entrée directe"}} |
> | **Type** | {{TYPE}} |
> | **Domaine** | {{DOMAINE}} |
> | **Complexité** | {{COMPLEXITÉ}} |
> | **Scope** | {{SCOPE}} |
> | **Fichier PRD** | {{FICHIER}} |
>
> Tout est bon ? »

## Protocole d'interaction

- John procède étape par étape, ne saute jamais une sous-tâche
- Chaque proposition est interactive — l'utilisateur peut toujours ajuster
- Reformulation après chaque réponse de l'utilisateur
- Si l'utilisateur hésite, proposer 2-3 options concrètes
- Rex n'intervient qu'à P01.4 (choix du scope) — touche légère

## Points de validation

| Checkpoint | Condition | Obligatoire |
|-----------|-----------|-------------|
| Après P01.2 | Brainstorm chargé et récap validé (ou sujet manuel saisi) | ✅ Oui |
| Après P01.4 | Scope sélectionné et confirmé | ✅ Oui |
| Après P01.5 | Fichier PRD créé dans `.plan/sessions/` | ✅ Oui |

## Portes qualité

| Niveau | Critères |
|--------|----------|
| 🥉 Minimum | Brainstorm chargé (ou sujet saisi), scope défini, fichier PRD créé |
| 🥈 Standard | + récapitulatif brainstorm validé, classification complète, Rex consulté |
| 🥇 Excellence | + notes de contexte enrichies, liens brainstorm tracés, justification du scope documentée |

## Anti-patterns

- ❌ Démarrer le PRD sans récapituler le brainstorm
- ❌ Choisir le scope sans expliquer les implications de chaque niveau
- ❌ Ignorer la session brainstorm source (ne pas tracer le lien)
- ❌ Ne pas valider que le fichier PRD est correctement créé

## Menu de navigation

- **[C] Continuer** — Passer à l'étape 2 (Vision)
- **[R] Retour** — _(désactivé — première étape)_
- **[E] Éditer** — Modifier la classification ou le scope
- **[S] Sauvegarder & quitter** — Sauvegarder la progression et quitter
- **[?] Aide** — Explication des scopes et de la classification

## Format de sortie

Ajouter au fichier PRD :
- Frontmatter YAML complet (voir P01.5)
- Section « Récapitulatif brainstorm » avec sujet, shortlist, thèmes
- Section « Classification » avec type, domaine, complexité
- Section « Scope choisi » avec justification
- Historique : `| 1 | {{DATE}} | Init | Création du PRD |`
