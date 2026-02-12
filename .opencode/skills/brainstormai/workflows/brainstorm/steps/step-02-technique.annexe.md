---
type: annexe
step: "02"
name: technique
parent: step-02-technique.md
version: 2.0
---

# Annexe Step 02 — Sélection des Techniques

Référence détaillée pour les procédures, familles, compatibilité et scénarios d'erreur de l'étape S02.

---

## S02.A1 — Procédure détaillée : Approche Guidé

### Arbre de décision pour la séquence automatique

L'agent sélectionne les techniques selon le domaine et la difficulté souhaitée.

**Par domaine :**

| Domaine | Début (🟢) | Montée (🟡) | Profondeur (🟡/🔴) | Surprise | Fermeture |
|---------|-----------|------------|-------------------|----------|-----------|
| Tech | Brainstorming Classique | SCAMPER | Analyse Morphologique | Effet Tunnel | Technique du Futur Moi |
| Santé | Méthode des Post-it | Six Chapeaux de Bono | Biomimicry | Superposition d'Idées | Méditation Guidée |
| Éducation | Round Robin | Mind Mapping | Jeu de Rôle Client | Voyage Culturel | Journaling Créatif |
| Commerce | Brainstorming Classique | SWOT Créatif | Matrice de Découverte | Worst Possible Idea | Lettre à Soi-Même |
| Social | Brainwriting 6-3-5 | Analogie Forcée | Écosystème Mapping | Fusion Interculturelle | Méditation Guidée |
| Créatif | Speed Storming | Collage Conceptuel | Intrication Conceptuelle | Destruction Créative | Journaling Créatif |
| Autre | Brainstorming Classique | SCAMPER | Les 5 Pourquoi | Pensée Inversée | Technique du Futur Moi |

**Règles d'ajustement :**
- Si l'utilisateur est débutant → limiter à 3 techniques, toutes 🟢/🟡
- Si l'utilisateur est expérimenté → aller jusqu'à 5, inclure 🔴
- Si le sujet est très technique → privilégier les familles `structurée` et `profonde`
- Si le sujet est très créatif → privilégier `créative`, `sauvage`, `quantique`

---

## S02.A2 — Procédure détaillée : Approche Choisir

### Protocole de navigation par catégories

**Étape 1 : Présentation des familles**

Affiche les 10 familles avec emoji, nombre de techniques et style en une phrase.
L'utilisateur choisit 1 à 3 familles.

**Étape 2 : Affichage des techniques**

Pour chaque famille sélectionnée, affiche les techniques dans un tableau avec :
- Nom
- Description courte (1 ligne)
- Durée en minutes
- Indicateur de difficulté : 🟢 facile, 🟡 moyen, 🔴 difficile

**Étape 3 : Sélection**

L'utilisateur donne les numéros. Mary confirme chaque choix :

> « **{{TECHNIQUE}}** — excellent choix ! {{COMMENTAIRE_CONTEXTUEL}} »

**Étape 4 : Proposition complémentaire**

Si l'utilisateur a choisi des techniques d'une seule famille :

> « Je remarque que tu as pioché uniquement dans {{FAMILLE}}. Tu veux que je te suggère une technique d'une autre famille pour apporter de la diversité ? »

---

## S02.A3 — Procédure détaillée : Approche IA recommande

### Algorithme de scoring

Pour chaque technique du catalogue, calcule un score sur 100 :

| Critère | Poids | Calcul |
|---------|-------|--------|
| Adéquation domaine | 40% | Correspondance famille/domaine du sujet |
| Diversité séquence | 25% | Bonus si famille non encore représentée |
| Progression difficulté | 20% | Bonus si difficulté croissante dans la séquence |
| Facteur surprise | 15% | Bonus pour familles non évidentes (sauvage, quantique, biomimétique, culturelle) |

**Processus :**

1. Scorer les 42 techniques individuellement
2. Construire des séquences de 3-5 en maximisant le score global
3. Vérifier les contraintes : au moins 3 familles, progression difficulté, 1 surprise
4. Présenter la meilleure séquence avec justification par technique

**Table d'adéquation domaine/famille :**

| Domaine | Familles prioritaires | Familles secondaires |
|---------|----------------------|---------------------|
| Tech | structurée, profonde | créative, quantique |
| Santé | biomimétique, introspective | collaborative, culturelle |
| Éducation | collaborative, théâtrale | créative, culturelle |
| Commerce | structurée, créative | collaborative, profonde |
| Social | culturelle, collaborative | introspective, théâtrale |
| Créatif | créative, sauvage | quantique, théâtrale |

---

## S02.A4 — Procédure détaillée : Approche Aléatoire

### Règles de tirage

1. Tirer un nombre aléatoire entre 3 et 5 (nombre de techniques)
2. Pour chaque technique :
   - Tirer une famille au hasard parmi les 10
   - Vérifier la contrainte : max 2 de la même famille
   - Si contrainte violée → retirer et recommencer
   - Tirer une technique au hasard dans la famille
3. Vérifications post-tirage :
   - ✅ Au moins 1 technique 🟡 ou 🔴
   - ✅ Au moins 1 technique non-standard (sauvage/quantique/biomimétique/culturelle)
   - ✅ Pas plus de 2 techniques de la même famille
4. Si une vérification échoue → remplacer la dernière technique tirée
5. Ordonner par difficulté croissante (🟢 → 🟡 → 🔴)

**Option reroll :**

> « Si une technique ne t'inspire pas du tout, dis "relance X" et je retirerai au sort celle-là ! »

---

## S02.A5 — Catalogue des 10 familles de techniques

### 1. 🤝 Collaborative (5 techniques)
Génération collective d'idées sans jugement. Idéal pour démarrer une session ou quand on travaille à plusieurs.
- Cas typique : début de session, débloquage, mise en confiance
- Techniques : Brainstorming Classique, Brainwriting 6-3-5, Round Robin, Méthode des Post-it, Speed Storming

### 2. 🎨 Créative (5 techniques)
Associations libres, détournements et stimulations visuelles pour sortir des sentiers battus.
- Cas typique : recherche d'idées originales, innovation produit
- Techniques : SCAMPER, Mind Mapping, Analogie Forcée, Mots Aléatoires, Collage Conceptuel

### 3. 🔍 Profonde (4 techniques)
Analyse en profondeur et décomposition systématique du problème.
- Cas typique : problème complexe, recherche de causes racines
- Techniques : Les 5 Pourquoi, Analyse Morphologique, Arbre de Pertinence, Matrice de Découverte

### 4. 🏗️ Structurée (4 techniques)
Cadres et matrices pour organiser la réflexion de manière méthodique.
- Cas typique : évaluation d'idées, priorisation, analyse multi-angle
- Techniques : Six Chapeaux de Bono, SWOT Créatif, Matrice Eisenhower Inversée, Diagramme d'Ishikawa

### 5. 🎭 Théâtrale (4 techniques)
Jeux de rôle et mise en scène pour explorer les perspectives des parties prenantes.
- Cas typique : compréhension utilisateur, empathie, débat d'idées
- Techniques : Jeu de Rôle Client, Technique du Chapeau, Interview Imaginaire, Tribunal des Idées

### 6. 🌪️ Sauvage (4 techniques)
Inversion, provocation et destruction pour briser les schémas de pensée habituels.
- Cas typique : impasse créative, besoin de disruption, projet audacieux
- Techniques : Pensée Inversée, Worst Possible Idea, Exagération Extrême, Destruction Créative

### 7. 🧘 Introspective (4 techniques)
Réflexion intérieure, écriture libre et visualisation pour ancrer les idées.
- Cas typique : fin de session, approfondissement personnel, clarification
- Techniques : Journaling Créatif, Méditation Guidée, Technique du Futur Moi, Lettre à Soi-Même

### 8. 🌿 Biomimétique (4 techniques)
Inspiration des mécanismes de la nature pour résoudre des problèmes humains.
- Cas typique : innovation durable, recherche de solutions élégantes
- Techniques : Biomimicry, Écosystème Mapping, Évolution Simulée, Symbiose Conceptuelle

### 9. ⚛️ Quantique (4 techniques)
Paradoxes, superpositions et changements de perspective radicaux.
- Cas typique : problèmes insolubles, innovation de rupture, pensée non linéaire
- Techniques : Superposition d'Idées, Effet Tunnel, Intrication Conceptuelle, Observateur Quantique

### 10. 🌍 Culturelle (4 techniques)
Perspectives interculturelles et sagesses ancestrales appliquées au problème moderne.
- Cas typique : projet international, inclusion, innovation sociale
- Techniques : Voyage Culturel, Sagesse Ancestrale, Fusion Interculturelle, Rituel d'Innovation

---

## S02.A6 — Table de compatibilité des techniques

### Synergies recommandées (techniques qui se complètent bien)

| Technique A | Technique B | Synergie |
|------------|------------|---------|
| Brainstorming Classique | SCAMPER | Le brainstorming génère la masse, SCAMPER la transforme |
| Mind Mapping | Les 5 Pourquoi | La carte mentale déploie, les 5 Pourquoi approfondissent |
| Worst Possible Idea | Pensée Inversée | Les pires idées deviennent les meilleures en les inversant |
| Six Chapeaux de Bono | Jeu de Rôle Client | Les angles de Bono enrichis par l'empathie utilisateur |
| Analogie Forcée | Biomimicry | Deux formes d'analogie qui se renforcent mutuellement |
| Journaling Créatif | Méditation Guidée | L'introspection écrite prolonge la visualisation |
| SWOT Créatif | Matrice de Découverte | L'analyse stratégique nourrie par les combinaisons inédites |

### Redondances à éviter (techniques en séquence)

| Technique A | Technique B | Problème |
|------------|------------|---------|
| Brainstorming Classique | Brainwriting 6-3-5 | Même principe (génération libre), résultats similaires |
| Pensée Inversée | Worst Possible Idea | Deux inversions consécutives = lassitude |
| Journaling Créatif | Lettre à Soi-Même | Deux techniques d'écriture introspective trop proches |
| Mind Mapping | Arbre de Pertinence | Deux représentations arborescentes redondantes |
| Superposition d'Idées | Intrication Conceptuelle | Concepts quantiques proches, confusion possible |
| Voyage Culturel | Fusion Interculturelle | Approche culturelle similaire, mieux en garder une seule |

### Séquences recommandées par cas courant

**Projet tech / startup :**
1. Brainstorming Classique → SCAMPER → Analyse Morphologique

**Projet social / impact :**
1. Round Robin → Voyage Culturel → Biomimicry

**Projet créatif / artistique :**
1. Mots Aléatoires → Collage Conceptuel → Destruction Créative

**Projet business / commercial :**
1. Méthode des Post-it → SWOT Créatif → Six Chapeaux de Bono

**Déblocage / impasse :**
1. Worst Possible Idea → Effet Tunnel → Exagération Extrême

---

## S02.A7 — Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|----|---------|-----------|-------------|
| E02.1 | L'utilisateur ne connaît aucune technique | Il demande « c'est quoi ? » ou hésite longuement | Propose une mini-démo de 2-3 techniques sur son sujet réel. « Tiens, je te montre comment ça marche avec ton sujet... » |
| E02.2 | L'utilisateur veut une technique hors catalogue | Il mentionne une technique non listée | Adapte : « Je ne l'ai pas dans mon catalogue, mais je peux m'en inspirer ! Décris-moi le principe et on l'intègre. » Crée une entrée temporaire. |
| E02.3 | Toutes les techniques sélectionnées sont de la même famille | Vérification automatique après S02.2 | « Je remarque que tu as choisi uniquement des techniques {{FAMILLE}}. Tu veux diversifier pour élargir les perspectives ? Je te suggère {{TECHNIQUE_AUTRE_FAMILLE}}. » |
| E02.4 | L'utilisateur est indécis (aucun choix après 2 relances) | Pas de réponse ou « je ne sais pas » | Propose un « starter pack » par défaut : « Pas de souci ! Je te propose un pack débutant éprouvé : Brainstorming Classique → SCAMPER → Pensée Inversée. On part là-dessus ? » |
| E02.5 | L'utilisateur veut plus de 5 techniques | Il demande 6+ techniques | « Je comprends ton enthousiasme ! Mais au-delà de 5 techniques, la fatigue créative s'installe. Je te propose de faire un premier cycle de 5, et si tu es encore chaud après, on relance un second cycle. Ça te va ? » |
| E02.6 | Le fichier techniques.csv est vide ou inaccessible | Erreur de lecture du fichier | « Hmm, je n'arrive pas à charger le catalogue des techniques. Pas de panique, je connais les classiques par cœur ! On part avec Brainstorming Classique, SCAMPER et Six Chapeaux de Bono ? » |
| E02.7 | L'utilisateur veut changer d'approche en cours de S02 | Il dit « finalement je préfère guidé » | « Aucun souci, on change d'approche ! » Relance S02.2 avec la nouvelle approche sans perdre le contexte. |
| E02.8 | L'utilisateur ne valide pas la séquence (boucle infinie) | 3+ modifications sans confirmation | « On a fait {{N}} ajustements — ta séquence actuelle est déjà solide ! Je te propose de la tester telle quelle. Si ça ne colle pas, on ajustera en cours de route. » |

---

## S02.A8 — Gardes comportementaux de l'agent

### Mary (analyst)

- Reste enthousiaste mais ne pousse jamais une technique que l'utilisateur rejette
- Explique toujours une technique avant de la proposer en sélection
- Ne montre jamais les 42 techniques d'un coup — toujours par famille ou par recommandation
- Propose une diversité de familles proactivement
- Si l'utilisateur choisit uniquement des techniques 🟢 faciles, suggère doucement :
  > « Super sélection ! Tu veux qu'on ajoute un petit défi avec une technique 🟡 pour pimenter ? »

### Rex (challenger) — intervention ponctuelle S02.5

- Intervient uniquement si redondance détectée entre techniques
- Ton direct mais constructif : signale le risque, propose une alternative
- Ne bloque jamais la sélection — l'utilisateur a le dernier mot
- Maximum 1 intervention par sélection (pas de harcèlement)

---

## S02.A9 — Exemples concrets

### Exemple 1 : Sélection guidée pour un projet tech

**Contexte :** Sujet = « Application mobile de covoiturage pour zones rurales », Domaine = Tech

> **[Mary]** « Voilà le parcours que je te propose :
> 1. 🟢 **Brainstorming Classique** (~15 min) — on génère un max d'idées librement
> 2. 🟡 **SCAMPER** (~30 min) — on prend tes meilleures idées et on les transforme systématiquement
> 3. 🔴 **Analyse Morphologique** (~45 min) — on décompose le problème en dimensions et on combine
>
> ⏱️ Durée estimée : ~90 min (3 techniques)
> Tu veux qu'on y aille comme ça ? »

### Exemple 2 : IA recommande pour un projet social

**Contexte :** Sujet = « Réduire l'isolement des personnes âgées en milieu urbain », Domaine = Social

> **[Mary]** « J'ai analysé ton sujet. Voici mes recommandations :
>
> | # | Technique | Famille | Pourquoi | Difficulté |
> |---|-----------|---------|----------|------------|
> | 1 | Round Robin | 🤝 Collaborative | Pour générer des idées inclusives sans pression | 🟢 |
> | 2 | Jeu de Rôle Client | 🎭 Théâtrale | Pour te mettre dans la peau d'une personne âgée isolée | 🟡 |
> | 3 | Voyage Culturel | 🌍 Culturelle | Pour découvrir comment d'autres cultures gèrent l'isolement | 🟡 |
> | 4 | Symbiose Conceptuelle | 🌿 Biomimétique | Les écosystèmes naturels résistent à l'isolement — inspirons-nous | 🟡 |
>
> ⏱️ Durée estimée : ~95 min (4 techniques × ~24 min) »

### Exemple 3 : Browsing par catégorie pour un projet créatif

**Contexte :** Sujet = « Créer un festival de street art interactif », Domaine = Créatif

> **[Mary]** « Voici les 10 familles. Lesquelles t'attirent ? »
>
> *L'utilisateur choisit : 🎨 Créative et 🌪️ Sauvage*
>
> **[Mary]** « Voici les techniques de ces deux familles : »
>
> **🎨 Créative :**
> | # | Technique | En bref | Durée | Difficulté |
> |---|-----------|---------|-------|------------|
> | 1 | SCAMPER | Transformer systématiquement une idée existante | 30 min | 🟡 |
> | 2 | Mind Mapping | Déployer les ramifications à partir du sujet central | 25 min | 🟢 |
> | 3 | Analogie Forcée | Appliquer les principes d'un autre domaine | 20 min | 🟡 |
> | 4 | Mots Aléatoires | Des mots au hasard comme tremplin créatif | 15 min | 🟢 |
> | 5 | Collage Conceptuel | Assembler des images pour inspirer des solutions | 30 min | 🟡 |
>
> **🌪️ Sauvage :**
> | # | Technique | En bref | Durée | Difficulté |
> |---|-----------|---------|-------|------------|
> | 6 | Pensée Inversée | Aggraver le problème puis inverser | 20 min | 🟢 |
> | 7 | Worst Possible Idea | Générer les pires idées puis les retourner | 15 min | 🟢 |
> | 8 | Exagération Extrême | Pousser chaque paramètre à l'extrême | 15 min | 🟢 |
> | 9 | Destruction Créative | Tout détruire et reconstruire de zéro | 25 min | 🟡 |
>
> *L'utilisateur choisit : 3 (Analogie Forcée), 5 (Collage Conceptuel), 9 (Destruction Créative)*
>
> **[Rex]** « Intéressant choix. Attention, Analogie Forcée et Collage Conceptuel sont toutes deux des techniques d'association — tu risques des résultats qui se recoupent. Tu veux garder les deux ou remplacer l'une par Exagération Extrême pour plus de contraste ? »

---

## S02.A10 — Risques spécifiques à l'étape

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|-----------|
| R02.1 | Surcharge cognitive malgré la navigation par famille | Moyenne | Moyen | Limiter à 3 familles max en affichage simultané |
| R02.2 | L'utilisateur passe trop de temps à choisir (paralysie décisionnelle) | Haute | Moyen | Après 5 min d'hésitation, proposer le starter pack |
| R02.3 | Séquence mal équilibrée (toutes faciles ou toutes difficiles) | Moyenne | Haut | Vérification automatique + suggestion de rééquilibrage |
| R02.4 | Estimation de durée irréaliste (l'utilisateur n'a pas tant de temps) | Moyenne | Haut | Si total > 120 min, suggérer de réduire à 3 techniques |
| R02.5 | Perte de la sélection si interruption | Basse | Haut | Sauvegarder dans le YAML dès S02.2 validé |

---

## S02.A11 — Portes qualité (Min / Std / Exc)

| Critère | Minimum | Standard | Excellence |
|---------|---------|----------|------------|
| Pertinence des techniques | Au moins 1 technique sélectionnée, liée au domaine du sujet | 3-4 techniques couvrant au moins 2 familles, progression de difficulté respectée | 3-5 techniques de 3+ familles, scoring IA justifié, synergie inter-techniques vérifiée |
| Qualité de la recommandation | Proposition d'un starter pack par défaut sans personnalisation | Recommandation adaptée au domaine et au profil utilisateur avec justification courte | Recommandation argumentée par critère (domaine, diversité, difficulté, surprise), alternatives proposées |
| Compréhension utilisateur | L'utilisateur a choisi sans poser de question | L'utilisateur comprend chaque technique choisie (description lue, pas de confusion) | L'utilisateur peut expliquer pourquoi chaque technique est pertinente pour son sujet |
| Estimation temporelle | Durée totale affichée en fin de sélection | Durée par technique + durée totale affichées, alerte si > 120 min | Durée détaillée, pauses suggérées, ordre optimisé pour la gestion de l'énergie |
| Plan de secours | Aucun plan B — on avance avec la sélection telle quelle | Si une technique ne fonctionne pas en S03, Mary sait quelle technique de remplacement proposer | Techniques de backup identifiées pour chaque sélection, stratégie de pivot documentée dans le YAML |

---

## S02.A12 — Anti-patterns

| Anti-pattern | Symptôme | Correction |
|--------------|----------|------------|
| Technique imposée | Mary recommande une technique et passe directement à la suite sans attendre la validation | Toujours demander confirmation explicite ; proposer des alternatives si l'utilisateur hésite |
| Préférences ignorées | L'utilisateur exprime une préférence (« j'aime bien les jeux de rôle ») mais Mary recommande autre chose sans en tenir compte | Intégrer les préférences comme critère prioritaire dans le scoring ; expliquer le raisonnement si la recommandation diffère |
| Sur-explication | Mary détaille chaque technique pendant 10 lignes, l'utilisateur décroche avant d'avoir choisi | Limiter à 1-2 phrases par technique en mode catalogue ; proposer « tu veux que je t'en dise plus ? » pour les curieux |
| Paralysie décisionnelle | L'utilisateur hésite depuis 3+ relances, compare indéfiniment les options sans se décider | Proposer le starter pack après 2 hésitations ; rappeler qu'on peut ajuster en cours de route en S03 |
