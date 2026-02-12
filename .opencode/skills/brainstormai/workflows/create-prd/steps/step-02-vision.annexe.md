---
type: annexe
step: 2
name: vision
parent: step-02-vision.md
version: 2.0
---

# Annexe Step 02 — Vision et Stratégie

Référence détaillée pour les procédures, templates, challenge Rex et scénarios d'erreur de l'étape P02.

---

## P02.A1 — Procédure détaillée : Co-construction de la vision

### Template de vision

Structure de base pour formuler un énoncé de vision :

> *"{{PRODUIT}} est {{TYPE}} qui permet à {{CIBLE}} de {{BÉNÉFICE_CLÉ}} grâce à {{MÉCANISME_UNIQUE}}."*

| Variable | Description | Exemple |
|----------|------------|---------|
| `{{PRODUIT}}` | Nom du produit ou projet | FitBuddy |
| `{{TYPE}}` | Nature du produit (app, plateforme, service) | une application mobile |
| `{{CIBLE}}` | Utilisateur principal | les sportifs amateurs isolés |
| `{{BÉNÉFICE_CLÉ}}` | Ce que l'utilisateur obtient | trouver un partenaire d'entraînement compatible |
| `{{MÉCANISME_UNIQUE}}` | Comment ça fonctionne (le "secret") | un matching basé sur le niveau, la localisation et les horaires |

### Technique de l'elevator pitch

Le test ultime d'une vision claire : peux-tu l'expliquer en 30 secondes ?

**Protocole :**
1. John demande à l'utilisateur de pitcher sa vision à voix haute (ou par écrit)
2. Si c'est fluide → la vision est claire
3. Si l'utilisateur bute → identifier le point de blocage :
   - Trop long → simplifier, enlever les adjectifs inutiles
   - Trop abstrait → ajouter un exemple concret
   - Trop technique → reformuler pour un non-expert
4. Réessayer jusqu'à ce que ce soit naturel

### 3 exemples de visions bien formulées

#### Exemple 1 — Application fitness (B2C)

> *"FitBuddy est une application mobile qui permet aux sportifs amateurs isolés de trouver un partenaire d'entraînement compatible grâce à un matching intelligent basé sur le niveau, la localisation et les créneaux horaires."*

**Pourquoi ça fonctionne :**
- Cible précise (sportifs amateurs *isolés* — pas tous les sportifs)
- Bénéfice clair (trouver un partenaire)
- Mécanisme différenciant (matching multi-critères)
- On comprend en 10 secondes

#### Exemple 2 — SaaS B2B (productivité)

> *"FlowBoard est une plateforme SaaS qui permet aux équipes produit de synchroniser leur roadmap avec les retours utilisateurs en temps réel grâce à un pipeline automatisé feedback → ticket → priorisation."*

**Pourquoi ça fonctionne :**
- Cible pro (équipes produit)
- Problème douloureux (déconnexion roadmap/feedback)
- Mécanisme concret (pipeline automatisé)
- Chaîne de valeur visible (feedback → ticket → priorisation)

#### Exemple 3 — Marketplace (économie circulaire)

> *"ReVêt est une marketplace qui permet aux parents de quartier d'échanger les vêtements d'enfants devenus trop petits grâce à un système de troc local sans échange d'argent."*

**Pourquoi ça fonctionne :**
- Cible hyperlocale (parents de *quartier*)
- Bénéfice concret (échanger, pas acheter)
- Mécanisme disruptif (troc sans argent)
- Ancrage territorial (local)

### Technique d'affinage progressif

| Phase | Action John | Objectif |
|-------|------------|---------|
| Draft v1 | Propose un premier jet basé sur le brainstorm | Poser une base, même imparfaite |
| Réaction | Écoute les retours : ce qui plaît, ce qui sonne faux | Identifier les mots-clés qui résonnent |
| Draft v2 | Reformule en intégrant les retours | Converger vers la bonne formulation |
| Test pitch | Demande à l'utilisateur de pitcher en 30 secondes | Vérifier la clarté et la fluidité |
| Validation | Si le pitch est fluide → valider. Sinon → itérer | Obtenir un énoncé solide |

**Nombre d'itérations typique** : 2-3. Si plus de 4, John propose 3 versions au choix.

---

## P02.A2 — Procédure détaillée : Objectifs stratégiques

### Framework SMART appliqué

Chaque objectif doit être évalué sur les 5 critères SMART :

| Critère | Question clé | Exemple bon | Exemple mauvais |
|---------|-------------|-------------|-----------------|
| **S**pécifique | C'est quoi exactement ? | « Atteindre 500 utilisateurs actifs mensuels » | « Avoir beaucoup d'utilisateurs » |
| **M**esurable | Comment tu sais que c'est atteint ? | « Mesuré via analytics embarqué » | « Quand ça marchera bien » |
| **A**tteignable | C'est réaliste avec tes moyens ? | « 500 en 3 mois, on est 2 développeurs » | « 1 million en 1 mois » |
| **R**éaliste | Ça a du sens pour ton projet ? | « Les sportifs utilisent déjà des apps similaires » | « Les retraités vont adorer coder » |
| **T**emporel | C'est pour quand ? | « D'ici la fin du T1 2027 » | « Un jour, peut-être » |

### Catégories types d'objectifs

Selon le type de projet, certaines catégories d'objectifs reviennent :

| Catégorie | Description | Exemples d'indicateurs |
|-----------|------------|----------------------|
| 📈 Acquisition | Attirer de nouveaux utilisateurs | Inscriptions, téléchargements, visiteurs uniques |
| 🔄 Engagement | Faire revenir les utilisateurs | Sessions/semaine, durée d'utilisation, taux d'activation |
| 🔒 Rétention | Garder les utilisateurs sur la durée | Taux de rétention J7/J30, churn rate |
| 💰 Monétisation | Générer des revenus | MRR, ARPU, taux de conversion gratuit→payant |
| ⭐ Satisfaction | Rendre les utilisateurs heureux | NPS, CSAT, taux de recommandation |

**Combinaison recommandée par scope :**

| Scope | Catégories à couvrir |
|-------|---------------------|
| MVP | Acquisition + 1 autre (engagement ou satisfaction) |
| Growth | Acquisition + Engagement + Rétention |
| Vision | Les 5 catégories |

### Comment lier chaque objectif au brainstorm

Pour chaque objectif, identifier :
1. Le(s) thème(s) du brainstorm qui le soutiennent
2. Les idées spécifiques de la shortlist qui y contribuent
3. La force du lien : **direct** (l'idée crée l'objectif) ou **indirect** (l'idée soutient l'objectif)

> **[John]** « Pour ton objectif "{{OBJ}}", je vois un lien direct avec l'idée n°{{N}} du brainstorm ("{{IDÉE}}"). C'est bien de cette inspiration qu'on parle ? »

### Format table des objectifs

| ID | Objectif | Critère SMART | Lien brainstorm | Priorité |
|----|----------|---------------|-----------------|----------|
| OBJ-01 | {{TITRE}} | {{CRITÈRE}} — d'ici {{DATE}} | Thème {{X}}, Idée n°{{N}} | 🔴 Haute / 🟡 Moyenne / 🟢 Basse |
| OBJ-02 | {{TITRE}} | {{CRITÈRE}} — d'ici {{DATE}} | Thème {{X}}, Idée n°{{N}} | 🔴 / 🟡 / 🟢 |
| OBJ-03 | {{TITRE}} | {{CRITÈRE}} — d'ici {{DATE}} | Thème {{X}}, Idée n°{{N}} | 🔴 / 🟡 / 🟢 |

---

## P02.A3 — Procédure détaillée : Rex Challenge

### 5 questions de challenge vision

Rex pose entre 2 et 4 de ces questions selon le contexte (jamais les 5 d'un coup) :

| # | Question | Ce que ça teste | Si la réponse est faible |
|---|----------|----------------|------------------------|
| 1 | « Qu'est-ce qui empêche un concurrent de copier ça demain ? » | Barrière à l'entrée / avantage défendable | John aide à identifier un avantage : données, communauté, tech, réseau, marque |
| 2 | « Si tu devais résumer ta vision en 5 mots, lesquels ? » | Clarté et essence de la vision | Si l'utilisateur galère → la vision est trop complexe, simplifier |
| 3 | « Quel est le plus grand risque de cette vision ? » | Conscience des risques | Si l'utilisateur ne voit aucun risque → drapeau rouge, Rex insiste |
| 4 | « Comment sais-tu que le marché veut ça ? » | Validation marché / problème réel | Si pas de preuve → noter le risque, suggérer une validation rapide |
| 5 | « Dans 2 ans, comment tu sais si ta vision a réussi ? » | Critères de succès long terme | Si pas de réponse claire → lier aux objectifs SMART définis |

### Règles d'intervention de Rex à P02

| Règle | Description |
|-------|------------|
| Intensité | 🟢 Légère — questions ouvertes, curiosité bienveillante |
| Timing | Après P02.4, quand vision + objectifs + différenciateur sont posés |
| Limite | Maximum 2 allers-retours par point challengé |
| Blocage | Interdit — si l'utilisateur maintient sa position, Rex accepte et note le risque |
| Médiation | John reprend la main après chaque intervention de Rex |
| Ton | « Je pose la question parce que... » — jamais « Tu as tort parce que... » |

### Scénario type d'échange Rex

> **[Rex]** « Ta vision parle de "matching intelligent". Qu'est-ce qui empêche un concurrent de copier ton algorithme demain ? »
>
> **Utilisateur** : « On aura des données exclusives grâce à notre communauté locale. »
>
> **[Rex]** « Intéressant. Ça veut dire que ton avantage est le réseau local, pas la tech. C'est noté. »
>
> **[John]** « Bon point. Je reformule le différenciateur pour mettre en avant l'ancrage local plutôt que l'algorithme. Ça te va ? »

---

## P02.A4 — Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|----|---------|-----------|-------------|
| E02.1 | Vision trop vague (« améliorer les choses ») | Énoncé sans cible précise, sans mécanisme, ou trop générique | John propose 3 reformulations concrètes : « Laquelle se rapproche le plus de ce que tu as en tête ? Tu peux aussi mixer des éléments de chacune. » |
| E02.2 | L'utilisateur n'arrive pas à formuler sa vision | Silence prolongé, réponses évasives (« je sais pas trop ») | John revient aux fondamentaux : « Réponds-moi à 3 questions simples : 1) C'est pour qui ? 2) Ça résout quel problème ? 3) Comment ? Avec ça, je te construis une vision. » |
| E02.3 | Objectifs en conflit avec le scope choisi | Un objectif Growth/Vision alors que le scope est MVP | John signale : « Attention, cet objectif dépasse le scope MVP qu'on a défini. On le garde en roadmap future ou on ajuste le scope ? » |
| E02.4 | Objectifs non mesurables malgré guidage | L'utilisateur insiste sur des formulations vagues | John propose un critère chiffré : « Si tu me dis "améliorer la satisfaction", je te propose de le traduire en NPS > 40 à 6 mois. Ça te parle ? » |
| E02.5 | L'utilisateur veut sauter la vision (« on s'en fiche ») | Refus explicite de l'étape | John explique : « La vision, c'est la boussole du projet. Sans elle, on risque de construire des features qui ne vont nulle part. Même en 2 phrases, ça vaut le coup. On fait vite ? » |
| E02.6 | Rex challenge trop dur, l'utilisateur se braque | Réactions négatives, frustration | John intervient : « Merci Rex, on a capté. On note le risque et on avance. » Rex baisse l'intensité immédiatement. |

---

## P02.A5 — Gardes comportementaux des agents

### John (PM) — Pilote de l'étape

- Procède toujours par dialogue, jamais en monologue
- Propose un draft avant de demander à l'utilisateur de créer de zéro
- Valide chaque sous-section avant de passer à la suivante
- N'impose jamais une formulation — propose et ajuste
- Si l'utilisateur dit « c'est bien » rapidement → ne pas ralentir artificiellement, passer à la suite
- Si l'utilisateur hésite → poser 2-3 questions ciblées, pas 10
- Connecte toujours les objectifs aux idées du brainstorm pour assurer la traçabilité
- Anti-mur-de-texte : jamais plus de 10 lignes d'affilée sans interaction

### Rex (challenger) — Intervention ciblée

- Intervient une seule fois à P02.5, pas à chaque sous-tâche
- Pose 2 à 4 questions maximum (pas les 5 d'un coup)
- Intensité 🟢 légère — c'est le début du PRD, pas un stress-test
- Si la vision est solide → le dit : « Rien à redire ici, c'est clair et différenciant. »
- Ne reformule jamais la vision à la place de l'utilisateur
- Accepte la décision de l'utilisateur après 2 allers-retours maximum

---

## P02.A6 — Exemple concret : Parcours P02 complet

### Contexte

Projet issu d'un brainstorm : « Application mobile pour trouver des partenaires de sport en zone rurale ».
- Type : application mobile
- Domaine : santé / sport
- Scope : MVP
- Thèmes brainstorm : matching local, communauté, motivation mutuelle, sécurité

### P02.1 — Rappel

> **[John]** « Rappel de là où on en est :
> - **Projet** : SportMate | **Type** : App mobile | **Domaine** : Sport/Santé
> - **Scope** : MVP | **Complexité** : Moyenne (3-6 mois)
> - **Thèmes clés** : matching local, communauté sportive, motivation mutuelle
>
> On est toujours alignés ? »
>
> **Utilisateur** : « Oui, c'est bon. »

### P02.2 — Vision

> **[John]** « Premier jet :
>
> *"SportMate est une application mobile qui permet aux sportifs amateurs en zone rurale de trouver un partenaire d'entraînement à proximité grâce à un matching basé sur le sport pratiqué, le niveau et la disponibilité."*
>
> Qu'est-ce qui te parle ? Qu'est-ce que tu changerais ? »
>
> **Utilisateur** : « J'aime bien, mais je voudrais insister sur le côté motivation, pas juste trouver quelqu'un. »
>
> **[John]** « Compris. Version 2 :
>
> *"SportMate est une application mobile qui permet aux sportifs amateurs isolés en zone rurale de rester motivés et réguliers grâce à un matching local avec des partenaires d'entraînement compatibles."*
>
> Le shift est sur "rester motivés et réguliers" plutôt que juste "trouver quelqu'un". Ça colle ? »
>
> **Utilisateur** : « Oui, parfait ! »
>
> **[John]** « Super. Pitch-moi ça en 30 secondes pour vérifier que c'est fluide. »

### P02.3 — Objectifs (un par un)

> **[John]** « Objectif 1 : **Acquisition locale**
> - Quoi : Atteindre 200 utilisateurs actifs dans 3 zones rurales pilotes
> - Mesure : Comptes créés + au moins 1 match réalisé
> - Lien brainstorm : Thème "matching local" + Idée n°2 "géolocalisation par canton"
> - Horizon : Court terme (3 mois post-lancement)
>
> Ça te va ? »
>
> **Utilisateur** : « 200 c'est pas beaucoup... »
>
> **[John]** « Pour un MVP en zone rurale avec 3 cantons pilotes, 200 actifs c'est un bon signal. Si tu veux viser plus haut, on peut dire 500, mais assure-toi que c'est réaliste avec tes moyens de lancement. C'est le A de SMART : atteignable. »
>
> **Utilisateur** : « OK, on reste à 200 pour le MVP. »

*(Même processus pour les objectifs 2 et 3)*

### P02.5 — Challenge Rex

> **[Rex]** « Ta vision parle de "zone rurale". Comment sais-tu que les sportifs ruraux utilisent des apps pour trouver des partenaires ? Ils ne vont pas juste au club de sport du village ? »
>
> **Utilisateur** : « Justement, dans beaucoup de villages il n'y a plus de club. C'est le problème. »
>
> **[Rex]** « OK, ça tient. Et qu'est-ce qui empêche Strava ou Meetup de lancer la même feature demain ? »
>
> **Utilisateur** : « Ils sont urbains, ils ne comprennent pas la ruralité. »
>
> **[Rex]** « C'est un bon angle, mais "ils ne comprennent pas" c'est fragile comme barrière. Je note le risque. »
>
> **[John]** « Merci Rex. On pourrait renforcer le différenciateur en ajoutant l'angle communautaire local : partenariats avec les mairies et associations sportives rurales. C'est une barrière plus solide qu'une simple compréhension du terrain. Ça te parle ? »
>
> **Utilisateur** : « Oui, bonne idée. »

### P02.6 — Validation

> **[John]** « Section Vision finale pour ton PRD :
>
> ---
> ## Vision
> *"SportMate est une application mobile qui permet aux sportifs amateurs isolés en zone rurale de rester motivés et réguliers grâce à un matching local avec des partenaires d'entraînement compatibles."*
>
> ## Objectifs stratégiques
> | # | Objectif | SMART | Lien brainstorm | Priorité |
> |---|----------|-------|-----------------|----------|
> | 1 | Acquisition locale | 200 actifs en 3 zones à 3 mois | Matching local, géoloc canton | 🔴 Haute |
> | 2 | Engagement régulier | 3 sessions/semaine/utilisateur à 6 mois | Motivation mutuelle | 🔴 Haute |
> | 3 | Satisfaction partenaire | NPS > 40 à 6 mois | Communauté, sécurité | 🟡 Moyenne |
>
> ## Différenciateur clé
> Ancrage rural via partenariats mairies/associations sportives locales + matching hyperlocal (canton).
> ---
>
> Tout est bon ? [C] Continuer / [E] Éditer / [R] Retour »

---

## P02.A7 — Risques spécifiques à l'étape

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|-----------|
| R02.1 | Vision trop inspirationnelle et pas assez opérationnelle | Moyenne | Haut | Le test elevator pitch force la concrétisation |
| R02.2 | Objectifs déconnectés du brainstorm (perte de traçabilité) | Haute | Critique | Lien brainstorm obligatoire dans la table des objectifs |
| R02.3 | Différenciateur superficiel (facilement copiable) | Moyenne | Haut | Rex challenge spécifiquement ce point à P02.5 |
| R02.4 | Utilisateur qui valide tout sans réfléchir (acquiescement passif) | Moyenne | Moyen | John teste avec des questions de reformulation : « Redis-moi ta vision dans tes mots ? » |
| R02.5 | Trop d'itérations sur la formulation (perfectionnisme) | Basse | Moyen | Maximum 4 itérations. Au-delà, John propose 3 versions au choix pour trancher |

---

## P02.A8 — Portes qualité P02

Trois niveaux d'exigence pour valider la sortie de l'étape Vision et Stratégie.

| Critère | 🟢 Minimum | 🟡 Standard | 🔴 Excellence |
|---------|-----------|------------|--------------|
| Clarté de la vision | Un énoncé de vision existe avec cible et bénéfice identifiés | Vision formulée selon le template (produit + type + cible + bénéfice + mécanisme), testée via elevator pitch | Vision itérée 2-3 fois, pitch fluide en 30 secondes, validée par l'utilisateur dans ses propres mots |
| Qualité SMART des objectifs | Au moins 2 objectifs définis avec un critère mesurable chacun | 3+ objectifs couvrant au moins 2 catégories (acquisition, engagement, rétention…), tous avec indicateurs chiffrés et horizon temporel | Objectifs couvrant les catégories recommandées pour le scope, chaque objectif lié à un thème/idée du brainstorm, priorités explicites |
| Unicité du différenciateur | Un élément différenciant est mentionné | Différenciateur formulé comme avantage défendable (pas juste « meilleure UX ») | Différenciateur challengé par Rex, réponse argumentée, barrière à l'entrée identifiée |
| Alignement brainstorm | La vision reprend le sujet du brainstorm | Les objectifs font référence aux thèmes et idées de la shortlist | Traçabilité complète : chaque objectif pointe vers des idées spécifiques du brainstorm |
| Adhésion utilisateur | L'utilisateur a dit « oui » au récapitulatif | L'utilisateur a reformulé la vision dans ses propres mots | L'utilisateur a répondu aux questions de Rex avec conviction et cohérence |

**Règle** : le niveau **Minimum** est obligatoire pour passer à P03. Les niveaux Standard et Excellence sont recommandés mais non bloquants.

---

## P02.A9 — Anti-patterns P02

Erreurs récurrentes à éviter lors de la définition de la vision et des objectifs stratégiques.

| # | Anti-pattern | Pourquoi c'est un problème | Comment l'éviter |
|---|-------------|---------------------------|-----------------|
| 1 | **Vision trop générique** (« améliorer la vie des gens ») | Une vision floue ne guide aucune décision produit — impossible de prioriser les features à P04 | Exiger les 5 composantes du template : produit, type, cible précise, bénéfice concret, mécanisme unique |
| 2 | **Objectifs non mesurables** (« avoir du succès », « satisfaire les utilisateurs ») | Sans critère chiffré, impossible de savoir si l'objectif est atteint — le PRD perd sa fonction de boussole | Appliquer systématiquement le framework SMART : chaque objectif doit avoir un indicateur quantifié et un horizon temporel |
| 3 | **Copier la vision d'un concurrent** | Le produit démarre sans identité propre, aucun différenciateur réel — vulnérable dès qu'un concurrent bouge | Utiliser les insights uniques du brainstorm pour ancrer la vision dans un angle original. Rex doit challenger « qu'est-ce qui t'empêche d'être copié ? » |
| 4 | **Vision déconnectée des besoins utilisateurs** | La vision sonne bien sur le papier mais ne résout aucun problème réel — risque d'un produit que personne ne veut | Toujours lier la vision aux frustrations identifiées dans le brainstorm. Tester avec la question : « quel problème concret ça résout ? » |
| 5 | **Trop d'objectifs sans priorisation** | 8+ objectifs diluent l'attention et rendent le suivi impossible — tout devient prioritaire, donc rien ne l'est | Limiter à 3-5 objectifs selon le scope. Chaque objectif doit avoir une priorité explicite (haute/moyenne/basse) |
| 6 | **Valider la vision sans la challenger** | L'utilisateur acquiesce passivement sans s'approprier la vision — désengagement aux étapes suivantes | John demande à l'utilisateur de reformuler dans ses propres mots. Rex pose au moins 2 questions. Si l'utilisateur ne peut pas pitcher en 30s, la vision n'est pas prête |
