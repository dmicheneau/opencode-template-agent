---
type: annexe
step: 3
name: users
parent: step-03-users.md
version: 2.0
---

# Annexe Step 03 — Segments et Personas

Référence détaillée pour les procédures d'identification de segments, construction de personas, challenge Rex et mapping des besoins.

---

## P03.A1 — Procédure détaillée : Identification des segments

### Sources d'information

| Source | Ce qu'on y cherche |
|--------|-------------------|
| Session brainstorm | Thèmes récurrents, types d'utilisateurs mentionnés, problèmes évoqués |
| Vision (Step 02) | Utilisateur cible décrit, bénéfice ultime, positionnement |
| Connaissance du domaine | Acteurs existants, segmentation marché connue |
| Analyse concurrentielle | Segments adressés par les alternatives, segments négligés |

### Axes de segmentation

Croiser au moins 2 axes pour identifier des segments pertinents :

| Axe | Critères | Exemple |
|-----|----------|---------|
| Démographique | Âge, localisation, profession, niveau de revenu | « Freelances 25-35 ans en zone urbaine » |
| Comportemental | Fréquence d'usage, habitudes, canaux préférés | « Utilisateurs quotidiens vs occasionnels » |
| Motivationnel | Pourquoi ils cherchent une solution, douleur principale | « Gain de temps vs réduction de coûts » |
| Technique | Niveau d'aisance tech, outils actuels, contraintes | « Tech-savvy vs néophytes » |

### Template de segment

Pour chaque segment identifié :

| Champ | Contenu |
|-------|---------|
| **Nom** | Label court et parlant (ex : « Indépendants débordés ») |
| **Description** | 1-2 phrases décrivant qui ils sont |
| **Taille estimée** | Petite / Moyenne / Grande (ordre de grandeur) |
| **Priorité** | Primaire / Secondaire / Tertiaire |
| **Lien brainstorm** | Quelles idées de la shortlist les concernent directement |
| **Potentiel** | Pourquoi ce segment mérite d'être adressé |

### Règles de segmentation

- **Minimum 2, maximum 4 segments** — en dessous de 2, le produit est trop niché pour un PRD utile ; au-dessus de 4, la complexité explose
- **Chaque segment doit être distinct** — si deux segments ont les mêmes frustrations et objectifs, c'est un seul segment
- **Au moins 1 segment primaire** — celui qui sera servi en premier (MVP)
- **Considérer les anti-personas** — qui n'est PAS ta cible ? L'exclure explicitement aide à rester focalisé

---

## P03.A2 — Procédure détaillée : Construction persona interactive

### Template persona enrichi

```markdown
## Persona : {{PRÉNOM}} ({{SEGMENT}})

**Priorité** : 🏆 Primaire / Secondaire

### Profil
- **Âge** : {{ÂGE}} ans
- **Profil** : {{PROFESSION_OU_SITUATION}}
- **Contexte** : {{SITUATION_DETAILLEE}}

### Émotions
- 😤 **Frustrations** :
  1. {{FRUSTRATION_1}}
  2. {{FRUSTRATION_2}}
  3. {{FRUSTRATION_3}}
- 🎯 **Objectifs** :
  1. {{OBJECTIF_1}}
  2. {{OBJECTIF_2}}
  3. {{OBJECTIF_3}}
- 💬 **Citation** : "{{PHRASE_QUI_RESUME_SON_BESOIN}}"

### Journée type
📅 {{NARRATIF_3_4_PHRASES_DECRIVANT_UN_JOUR_TYPIQUE}}

### Parcours émotionnel
😤 **Frustration** : {{CE_QUI_DECLENCHE_LA_RECHERCHE}}
→ 💡 **Découverte** : {{COMMENT_ELLE_TROUVE_LE_PRODUIT}}
→ 😊 **Valeur** : {{CE_QUELLE_OBTIENT_CONCRETEMENT}}
→ 🎉 **Fidélité** : {{POURQUOI_ELLE_REVIENT_ET_RECOMMANDE}}

### Critères de succès
✅ {{COMMENT_CETTE_PERSONA_SAIT_QUELLE_A_TROUVE_LA_SOLUTION}}
```

### Flux de dialogue pour la construction

**Tour 1 — Esquisse** : John propose une ébauche minimale (prénom, âge, profil, 1 frustration).

> **[John]** « Pour le segment **{{SEGMENT}}**, j'imagine quelqu'un comme **{{PRÉNOM}}**, {{ÂGE}} ans, {{PROFIL}}. Sa frustration principale : {{FRUSTRATION}}. Ça te parle ? Tu connais quelqu'un comme ça ? »

**Tour 2 — Réaction** : L'utilisateur corrige, enrichit ou valide.

Réponses possibles et gestion :
- « Oui, c'est exactement ça » → John complète les 3 frustrations + 3 objectifs
- « Pas vraiment, c'est plutôt... » → John ajuste le profil et relance
- « Je connais quelqu'un comme ça, il/elle... » → John intègre l'anecdote réelle

**Tour 3 — Enrichissement** : John propose la citation, la journée type et le parcours émotionnel.

> **[John]** « Super. Voilà {{PRÉNOM}} en version complète. Dis-moi si la journée type est réaliste et si le parcours émotionnel te semble crédible. »

**Tour 4 — Finalisation** : Validation ou derniers ajustements.

### Conseils pour des personas vivantes

- Utilise des **prénoms concrets** (pas « Utilisateur A »)
- Intègre des **détails spécifiques** (« utilise Notion et Slack », pas « utilise des outils »)
- La **citation** doit sonner comme une vraie phrase qu'on dirait à un ami
- La **journée type** doit être narrative, pas une liste de tâches
- Le **parcours émotionnel** doit refléter un changement réel, pas un scénario idéal

---

## P03.A3 — Procédure détaillée : Rex Challenge Personas

### Intensité à cette étape

🟡 **Questionnement** — Rex est en mode soft à P03. Il ne cherche pas à détruire les personas, mais à s'assurer qu'elles sont solides. Tonalité : curiosité constructive, pas attaque.

### Questions type par persona

Pour **chaque persona**, Rex pose au moins 1 question parmi :

| # | Question | Ce qu'elle teste |
|---|----------|-----------------|
| 1 | « **{{PRÉNOM}}** existe-t-elle vraiment ou c'est un fantasme ? Tu as déjà parlé à quelqu'un comme ça ? » | Ancrage dans la réalité |
| 2 | « Combien de personnes correspondent réellement à ce profil ? 100 ? 10 000 ? 1 million ? » | Taille du marché |
| 3 | « Si **{{PRÉNOM}}** a déjà ces frustrations, comment elle les gère aujourd'hui sans ton produit ? » | Alternatives existantes |
| 4 | « La frustration n°1 de **{{PRÉNOM}}** — c'est un "nice to solve" ou un "hair on fire" ? » | Intensité de la douleur |
| 5 | « Tu as mis {{N}} personas. Laquelle tu sacrifierais si tu devais n'en garder qu'une seule ? » | Priorisation |

### Questions transversales (posées une fois pour toutes les personas)

| # | Question | Ce qu'elle teste |
|---|----------|-----------------|
| 6 | « Quel est le segment que tu ignores volontairement ? Et pourquoi ? » | Conscience des angles morts |
| 7 | « Tes personas ont-elles des besoins contradictoires ? Si oui, comment tu arbitres ? » | Cohérence du produit |
| 8 | « Tu n'as pas de persona "détracteur" — quelqu'un qui pourrait activement rejeter ton produit ? » | Risques d'adoption |

### Protocole de réponse

- L'utilisateur répond à chaque question de Rex
- John intègre les ajustements si nécessaire
- Rex **ne bloque jamais** — il questionne, l'utilisateur décide
- Maximum **5 questions** par session (pas de harcèlement)
- Si l'utilisateur dit « je ne sais pas » → Rex accepte et note le point comme « à explorer »

---

## P03.A4 — Procédure détaillée : Mapping besoins

### Matrice Persona × Besoin

**Important** : On mappe des **besoins**, pas des features. Un besoin est un problème à résoudre ou un objectif à atteindre. Une feature est une solution technique — ça vient à P04.

| | Besoin 1 | Besoin 2 | Besoin 3 | Besoin 4 |
|---|---------|---------|---------|---------|
| **{{PERSONA_1}}** | 🔴 Critique | 🟡 Important | — | 🟢 Souhaitable |
| **{{PERSONA_2}}** | 🟡 Important | 🔴 Critique | 🟢 Souhaitable | — |
| **{{PERSONA_3}}** | — | 🟢 Souhaitable | 🔴 Critique | 🟡 Important |

### Niveaux de priorité

| Priorité | Signification | Critère |
|----------|--------------|---------|
| 🔴 Critique | Sans ça, la persona n'utilise pas le produit | Bloquant pour l'adoption |
| 🟡 Important | La persona l'attend mais peut tolérer son absence au début | Différenciateur significatif |
| 🟢 Souhaitable | C'est un bonus qui renforce la satisfaction | Agréable mais pas décisif |
| — | Non pertinent | Ce besoin ne concerne pas cette persona |

### Template de besoin

Pour chaque besoin identifié :

| Champ | Contenu |
|-------|---------|
| **ID** | B01, B02, B03... |
| **Besoin** | Formulation courte et centrée utilisateur |
| **Personas concernées** | Liste des personas avec priorité |
| **Source** | Brainstorm idée #N / Vision objectif #N / Rex challenge |
| **Validation** | Comment savoir que ce besoin est satisfait |

### Règles de mapping

- Chaque persona doit avoir **au moins 2 besoins** identifiés
- Au moins **1 besoin critique** par persona primaire
- Les besoins doivent être **indépendants des solutions** (« pouvoir collaborer en temps réel » et non « avoir un chat intégré »)
- Si un besoin est 🔴 Critique pour toutes les personas → c'est un besoin fondamental du produit

---

## P03.A5 — Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|----|---------|-----------|-------------|
| E03.1 | L'utilisateur ne parvient pas à identifier de segments | Réponses vagues, « je ne sais pas qui sont mes utilisateurs » | John propose 2-3 segments basés uniquement sur les idées du brainstorm : « Regarde les idées qu'on a générées — elles parlent à qui selon toi ? Moi je vois au moins {{SEGMENT_1}} et {{SEGMENT_2}}. » |
| E03.2 | L'utilisateur veut plus de 5 personas | Il ajoute des personas sans s'arrêter | John freine : « Tu as déjà {{N}} personas — au-delà de 5, on risque de diluer l'attention. Chaque persona supplémentaire, c'est de la complexité en plus à P04. Tu veux vraiment ajouter ou on priorise celles qu'on a ? » |
| E03.3 | Les personas sont toutes identiques (pas de différenciation) | Frustrations et objectifs similaires entre personas | John signale : « Je remarque que **{{PERSONA_A}}** et **{{PERSONA_B}}** ont les mêmes frustrations. C'est peut-être un seul segment ? Ou alors, qu'est-ce qui les distingue vraiment ? » |
| E03.4 | L'utilisateur refuse le challenge de Rex | Il dit « pas besoin » ou ignore les questions | John négocie : « Je comprends, mais les questions de Rex nous aident à solidifier les personas avant d'investir du temps sur les features. On peut faire une version express — juste 2 questions ? » |
| E03.5 | L'utilisateur mappe directement des features au lieu de besoins | Il dit « cette persona a besoin d'un dashboard » au lieu de « cette persona a besoin de visualiser ses données » | John recadre : « Bonne idée, mais on va garder ça pour l'étape 4. Pour l'instant, quel est le *besoin* derrière ce dashboard ? Visualiser ses données ? Prendre des décisions plus vite ? » |
| E03.6 | L'utilisateur veut sauter l'étape personas | Il dit « on connaît déjà nos utilisateurs, passons aux features » | John explique : « Je comprends l'envie d'avancer, mais des personas bien posées maintenant vont te faire gagner du temps à P04 et P05. On peut faire une version express en 5 minutes — juste les frustrations clés et les besoins critiques. Ça te va ? » |

---

## P03.A6 — Exemples concrets

### Exemple 1 : Application de gestion de budget pour freelances

**Contexte :** Brainstorm sur « aider les indépendants à gérer leurs finances ». 2 segments identifiés.

**Segment 1 : Freelances débutants**

> **[John]** « Pour les freelances débutants, j'imagine **Léa** :
>
> **Léa**, 27 ans, graphiste freelance depuis 8 mois. Elle a quitté son CDI pour se lancer, mais la gestion financière la stresse énormément. Elle fait ses factures sur un tableur Google Sheets qu'elle a trouvé sur internet. »
>
> *L'utilisateur réagit : « Oui, c'est très juste. Mais elle a aussi peur du RSI et des impôts. »*
>
> **[John]** « Parfait, j'intègre ça. Voilà Léa en version enrichie :
>
> ## Persona : Léa (Freelances débutants)
> **Priorité** : 🏆 Primaire
> - **Âge** : 27 ans | **Profil** : Graphiste freelance depuis 8 mois
> - **Contexte** : Ex-salariée en CDI, micro-entreprise, travaille seule depuis chez elle
> - 😤 **Frustrations** :
>   1. Ne sait jamais combien elle va gagner le mois prochain
>   2. Terrifiée par les déclarations URSSAF et les impôts
>   3. Son tableur ne lui dit pas si elle peut se payer un logiciel à 50€/mois
> - 🎯 **Objectifs** :
>   1. Savoir en temps réel combien elle a réellement disponible (après charges)
>   2. Ne plus avoir peur de l'URSSAF
>   3. Se sentir légitime et professionnelle dans sa gestion
> - 💬 **Citation** : "Je suis créative pour mes clients, mais dès qu'il faut gérer l'argent, je panique."
> - 📅 **Journée type** : Léa commence sa journée en vérifiant ses mails — un client a payé, un autre demande un devis. Elle ouvre son tableur, ajoute le paiement, puis se demande si elle doit mettre de côté pour l'URSSAF ou si elle peut s'acheter cette tablette graphique. Elle referme le tableur et se remet au design en se disant qu'elle "verra plus tard".
> - 😤→💡→😊→🎉 **Parcours émotionnel** :
>   - 😤 Frustration : Reçoit un mail de l'URSSAF et ne sait pas combien mettre de côté
>   - 💡 Découverte : Une amie freelance lui recommande l'app
>   - 😊 Valeur : Voit instantanément "tu peux dépenser 340€ ce mois-ci après charges"
>   - 🎉 Fidélité : Première déclaration URSSAF faite en 2 minutes, recommande l'app à 3 collègues
> - ✅ **Critères de succès** : Léa sait qu'elle a trouvé la solution quand elle ouvre l'app le matin sans stress.
>
> **[Rex]** « Léa est très sympa, mais combien de "Léa" existent réellement ? Tu as des chiffres ? Et sa frustration n°2 sur l'URSSAF — les comptables en ligne ne résolvent pas déjà ça à 30€/mois ? »

**Segment 2 : Freelances confirmés**

> **[John]** « Pour le second segment, je pense à **Thomas** :
>
> **Thomas**, 38 ans, développeur freelance depuis 6 ans. Il gère bien sa trésorerie mais jongle entre 4 outils différents. Son problème n'est pas de comprendre, c'est que ça lui prend trop de temps. »
>
> ## Persona : Thomas (Freelances confirmés)
> **Priorité** : Secondaire
> - **Âge** : 38 ans | **Profil** : Développeur web freelance, EURL
> - **Contexte** : 6 ans d'expérience, CA 80K€/an, 3-4 clients réguliers
> - 😤 **Frustrations** :
>   1. Perd 3h par semaine à jongler entre Bankin', un tableur et son comptable
>   2. N'a pas de vue consolidée revenus/charges/trésorerie
>   3. Repousse toujours l'optimisation fiscale par manque de temps
> - 🎯 **Objectifs** :
>   1. Un seul endroit pour tout voir
>   2. Automatiser les tâches récurrentes (relances, catégorisation)
>   3. Optimiser sa rémunération (dividendes vs salaire)
> - 💬 **Citation** : "Je suis capable de coder une app en un week-end, mais ma compta me prend un dimanche par mois."
> - ✅ **Critères de succès** : Thomas sait qu'il a trouvé la solution quand il récupère ses 3h par semaine.

**Mapping besoins :**

| | Visibilité trésorerie temps réel | Simplification administrative | Optimisation fiscale | Automatisation |
|---|---|---|---|---|
| **Léa** | 🔴 Critique | 🔴 Critique | 🟢 Souhaitable | 🟡 Important |
| **Thomas** | 🟡 Important | 🟡 Important | 🔴 Critique | 🔴 Critique |

---

### Exemple 2 : Plateforme de mentorat entre étudiants et professionnels

**Contexte :** Brainstorm sur « connecter les étudiants avec des pros pour des conseils carrière ». 3 segments.

**Segment 1 : Étudiants en fin de cursus (primaire)**

> ## Persona : Amina (Étudiants fin de cursus)
> **Priorité** : 🏆 Primaire
> - **Âge** : 23 ans | **Profil** : Étudiante en M2 informatique
> - **Contexte** : Stage de fin d'études à trouver, pas de réseau pro, première de sa famille à faire des études longues
> - 😤 **Frustrations** :
>   1. Ne connaît personne dans l'industrie tech
>   2. Les forums et LinkedIn lui semblent artificiels et intimidants
>   3. Ne sait pas si elle veut du dev, du data ou du product
> - 🎯 **Objectifs** :
>   1. Parler avec quelqu'un qui fait le métier au quotidien
>   2. Comprendre la réalité d'un poste avant de s'engager
>   3. Avoir un contact qui peut la recommander
> - 💬 **Citation** : "J'ai de bonnes notes, mais je n'ai aucune idée de ce que je vais faire dans 6 mois."
> - 📅 **Journée type** : Amina sort de cours à 17h, rentre chez elle, ouvre LinkedIn et scrolle des offres de stage sans savoir lesquelles lui correspondraient. Elle aimerait demander à quelqu'un « c'est comment ton quotidien ? », mais elle ne connaît personne dans le milieu. Elle finit par postuler à 3 offres au hasard en se disant « on verra bien ».
> - 😤→💡→😊→🎉 **Parcours émotionnel** :
>   - 😤 Frustration : Reçoit un refus de stage sans feedback
>   - 💡 Découverte : Un prof mentionne la plateforme en cours
>   - 😊 Valeur : Conversation de 30 min avec une data engineer qui lui décrit sa journée
>   - 🎉 Fidélité : Décroche un stage grâce à une recommandation de son mentor

**Segment 2 : Professionnels mentors (secondaire)**

> ## Persona : Karim (Professionnels mentors)
> **Priorité** : Secondaire
> - **Âge** : 34 ans | **Profil** : Product Manager dans une scale-up
> - **Contexte** : 10 ans d'expérience, envie de donner en retour, ex-étudiant sans réseau lui-même
> - 😤 **Frustrations** :
>   1. Veut aider mais ne sait pas par où commencer
>   2. Les programmes de mentorat existants sont trop formels et chronophages
>   3. N'a pas envie de s'engager sur 6 mois sans savoir si ça lui plaît
> - 🎯 **Objectifs** :
>   1. Aider ponctuellement, sans pression de temps
>   2. Se sentir utile au-delà de son job
>   3. Rencontrer des profils motivés et curieux
> - 💬 **Citation** : "J'aurais adoré avoir quelqu'un pour me guider quand j'étais étudiant. Mais je n'ai pas 2h par semaine à donner."
> - ✅ **Critères de succès** : Karim sait que ça marche quand un étudiant lui envoie un message 6 mois plus tard pour dire « j'ai décroché le poste, merci ».

**Segment 3 : Établissements (tertiaire)**

> ## Persona : Claire (Établissements)
> **Priorité** : Tertiaire
> - **Âge** : 45 ans | **Profil** : Responsable insertion pro dans une école d'ingénieurs
> - **Contexte** : Pression pour améliorer le taux d'emploi des diplômés, budget limité
> - ✅ **Critères de succès** : Claire sait que ça fonctionne quand le taux d'emploi à 6 mois de ses étudiants augmente de 10%.

> **[Rex]** « Trois questions rapides :
> 1. Amina est ta persona primaire — mais est-ce qu'elle a les moyens de payer ? Ou c'est Karim/Claire qui paie ? Ton modèle économique change tout.
> 2. Karim veut aider "ponctuellement" — mais si tous tes mentors sont ponctuels, qui assure la continuité ?
> 3. Tu n'as pas de persona "étudiant qui ne sait pas qu'il a besoin d'un mentor" — comment tu l'atteins ? »

**Mapping besoins :**

| | Accès à un réseau pro | Flexibilité d'engagement | Matching pertinent | Suivi de la relation | Métriques d'impact |
|---|---|---|---|---|---|
| **Amina** | 🔴 Critique | 🟡 Important | 🔴 Critique | 🟢 Souhaitable | — |
| **Karim** | — | 🔴 Critique | 🟡 Important | 🟢 Souhaitable | 🟡 Important |
| **Claire** | 🟡 Important | — | 🟡 Important | 🔴 Critique | 🔴 Critique |

---

## P03.A7 — Gardes comportementaux des agents

### John (PM)

- Construit les personas en **dialogue**, jamais en remplissant un template silencieusement
- Encourage l'utilisateur à **penser à des personnes réelles** qu'il connaît
- Distingue toujours **persona primaire vs secondaire** — pose la question explicitement
- Ne propose **jamais** de mapper aux features à P03 — recadre poliment si l'utilisateur anticipe
- Valorise les détails concrets apportés par l'utilisateur (« excellent, c'est exactement ce genre de détail qui rend une persona vivante ! »)
- Propose une version « express » si l'utilisateur montre des signes d'impatience

### Rex (Challenger)

- Intensité 🟡 — questionne, ne confronte pas
- Maximum **5 questions** par session P03
- Accepte « je ne sais pas » comme réponse valide — note le point pour plus tard
- Ne remet jamais en cause la **légitimité** de l'utilisateur à connaître son marché
- Propose toujours une **alternative** avec sa critique (« et si plutôt... ? »)
- Félicite si les réponses sont solides : « OK, tes personas tiennent la route. Bien joué. »

---

## P03.A8 — Risques spécifiques à P03

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP03-01 | Segments manquants — un groupe d'utilisateurs clé n'est pas identifié | Moyenne | Critique | Croiser systématiquement les axes de segmentation (démographique, comportemental, motivationnel, technique). Vérifier avec Rex : « quel segment tu ignores volontairement ? » |
| RP03-02 | Personas stéréotypées — profils caricaturaux sans ancrage réel | Haute | Haut | Encourager l'utilisateur à penser à des personnes réelles qu'il connaît. Intégrer des détails spécifiques (outils utilisés, contexte concret) plutôt que des généralités |
| RP03-03 | Cas limites ignorés — les utilisateurs atypiques ou edge cases ne sont pas considérés | Moyenne | Haut | Identifier explicitement les anti-personas (qui n'est PAS la cible). Demander « et les utilisateurs qui ne rentrent dans aucune case ? » |
| RP03-04 | Surcharge de personas — trop de personas diluent la priorisation | Moyenne | Moyen | Respecter la limite de 4 segments maximum. Si l'utilisateur en veut plus, demander : « laquelle tu sacrifierais si tu devais n'en garder qu'une seule ? » |
| RP03-05 | Hypothèses non validées — les frustrations et objectifs des personas sont inventés sans base factuelle | Haute | Critique | Rex challenge chaque persona avec « elle existe vraiment ? Tu as parlé à quelqu'un comme ça ? ». Noter les hypothèses à valider comme « à explorer » |

---

## P03.A9 — Portes qualité P03

Trois niveaux d'exigence pour valider la sortie de l'étape Segments et Personas.

| Critère | 🟢 Minimum | 🟡 Standard | 🔴 Excellence |
|---------|-----------|------------|--------------|
| Réalisme des personas | Au moins 1 persona définie avec prénom, âge, profil et 1 frustration | 2-3 personas complètes (frustrations, objectifs, citation, journée type, parcours émotionnel) | Personas enrichies par des anecdotes réelles de l'utilisateur, détails spécifiques (outils, contexte précis), anti-personas identifiées |
| Couverture des parcours utilisateurs | La persona primaire a un parcours émotionnel esquissé | Chaque persona a un parcours émotionnel complet (frustration → découverte → valeur → fidélité) | Parcours validés comme crédibles par l'utilisateur, scénarios alternatifs considérés |
| Identification des points de douleur | Au moins 1 frustration par persona | 2-3 frustrations par persona, hiérarchisées par intensité | Frustrations challengées par Rex (« nice to solve » vs « hair on fire »), alternatives actuelles identifiées |
| Priorisation des segments | Distinction entre persona primaire et secondaire | Segments classés avec justification (taille, potentiel, lien brainstorm) | Priorisation challengée par Rex, réponse argumentée sur le choix du segment primaire |
| Profondeur de l'empathie | Les personas ont des caractéristiques de base | Citations réalistes, journée type narrative | L'utilisateur peut « pitcher » la persona comme s'il la connaissait personnellement |
| Mapping des besoins | Au moins 1 besoin par persona | Matrice persona × besoin complète avec niveaux de priorité (critique/important/souhaitable) | Chaque besoin est indépendant des solutions, sourcé (brainstorm/vision/Rex), avec critère de validation |

**Règle** : le niveau **Minimum** est obligatoire pour passer à P04. Les niveaux Standard et Excellence sont recommandés mais non bloquants.

---

## P03.A10 — Anti-patterns P03

Erreurs récurrentes à éviter lors de l'identification des segments et la construction des personas.

| # | Anti-pattern | Pourquoi c'est un problème | Comment l'éviter |
|---|-------------|---------------------------|-----------------|
| 1 | **Personas fictives sans données** (« j'imagine que… ») | Des personas inventées de toutes pièces mènent à des features qui ne répondent à aucun besoin réel — le produit rate sa cible | Toujours demander : « tu connais quelqu'un comme ça ? ». Ancrer chaque persona dans une personne réelle ou une observation concrète. Accepter « je ne sais pas » et noter le point à valider |
| 2 | **Trop de personas** (5+) | Chaque persona génère des besoins, des features et des user stories — la complexité explose à P04/P05, rendant le PRD ingérable | Limiter à 4 segments maximum (2-3 pour un MVP). Demander l'exercice « laquelle tu sacrifies ? » pour forcer la priorisation |
| 3 | **Ignorer les utilisateurs secondaires** | Se focaliser uniquement sur la persona primaire crée des angles morts — les utilisateurs secondaires (admins, payeurs, modérateurs) ont des besoins différents qui impactent le produit | Identifier au moins 1 persona secondaire. Vérifier qui paie, qui administre, qui modère — ce ne sont pas toujours les mêmes que l'utilisateur final |
| 4 | **Aucune validation des hypothèses** | Les frustrations et objectifs sont postulés sans preuve — risque de construire un produit sur des croyances fausses | Rex doit challenger chaque persona : « elle existe vraiment ? », « combien de personnes correspondent à ce profil ? ». Noter toute hypothèse non validée comme « à explorer » |
| 5 | **Personas toutes identiques** | Si deux personas ont les mêmes frustrations et objectifs, c'est un seul segment déguisé — on perd du temps sans gagner en compréhension | John détecte les doublons : « {{PERSONA_A}} et {{PERSONA_B}} ont les mêmes frustrations. C'est un seul segment ou qu'est-ce qui les distingue vraiment ? » |
| 6 | **Mapper des features au lieu de besoins** | Dire « cette persona a besoin d'un dashboard » court-circuite la réflexion — on saute directement à la solution sans comprendre le problème | Recadrer systématiquement : « quel est le besoin derrière ? Visualiser ses données ? Prendre des décisions plus vite ? » Les features viennent à P04 |
