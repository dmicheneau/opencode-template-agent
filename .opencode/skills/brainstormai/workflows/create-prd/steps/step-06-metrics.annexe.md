---
type: annexe
step: "06"
name: metrics
parent: step-06-metrics.md
title: Annexe — Métriques et Jalons
version: 2.0
---

# Annexe Step 06 — Métriques et Jalons

Référence détaillée pour les procédures, templates, challenge Rex et scénarios d'erreur de l'étape P06. Complète `step-06-metrics.md`.

---

## P06.A1 — Procédure P06.2 : KPIs contextuels

### Framework AARRR (Pirate Metrics)

Le framework AARRR structure les métriques selon le parcours utilisateur :

| Étape | Question clé | Tu la mesures si... |
|---|---|---|
| **A**cquisition | Comment les gens te trouvent ? | Objectif visibilité ou croissance |
| **A**ctivation | Vivent-ils le "moment aha" ? | Objectif onboarding ou première valeur |
| **R**étention | Est-ce qu'ils reviennent ? | Objectif fidélisation |
| **R**evenue | Est-ce qu'ils paient ? | Objectif monétisation |
| **R**ecommandation | Est-ce qu'ils en parlent ? | Objectif croissance organique |

### Catalogue de KPIs par catégorie

#### Acquisition

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **CAC** | Coût pour attirer 1 utilisateur | Budget marketing ÷ nouveaux inscrits | < 10€ B2C, < 100€ B2B |
| **Taux d'inscription** | % visiteurs → comptes créés | Inscrits ÷ visiteurs × 100 | 2-5% landing, 10-20% référé |
| **Sources de trafic** | D'où viennent tes utilisateurs | Analytics (UTM, referrer) | Diversifié > 3 sources |

#### Activation

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **Complétion onboarding** | % d'inscrits qui finissent le parcours | Événement "onboarding_complete" ÷ inscrits | > 60% |
| **Time-to-value** | Temps avant la première valeur obtenue | Délai inscription → action clé | < 5 min B2C, < 1 jour B2B |
| **Première action clé** | % qui réalisent l'action core | Événement spécifique (premier match, etc.) | > 40% en 24h |

#### Rétention

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **DAU/MAU** | Fréquence d'usage quotidien | Actifs jour ÷ actifs mois | > 20% bon, > 50% exceptionnel |
| **Taux de churn** | % d'utilisateurs perdus par mois | Perdus ÷ total par mois | < 5% B2B, < 8% B2C |
| **Rétention cohorte** | % encore actifs après N jours | Actifs J7/J30 ÷ cohorte | J7 > 30%, J30 > 15% |

#### Engagement

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **Durée de session** | Temps passé par visite | Analytics (start → end) | 2 min outil, 20 min contenu |
| **Features utilisées** | Fonctionnalités par session | Compteur événements | > 3 par session |
| **Fréquence de retour** | Sessions par utilisateur par semaine | Sessions ÷ actifs | > 3/semaine |

#### Revenue

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **MRR** | Revenus mensuels récurrents | Somme abonnements actifs | Croissance > 10% mois/mois |
| **ARPU** | Revenu moyen par utilisateur | MRR ÷ payants | Dépend du marché |
| **Taux de conversion** | % gratuits → payants | Payants ÷ inscrits × 100 | 2-5% freemium, > 10% trial |
| **LTV** | Valeur totale d'un client | ARPU × durée moyenne | LTV > 3× CAC |

#### Satisfaction

| KPI | Ce qu'il mesure | Comment le collecter | Cibles typiques |
|---|---|---|---|
| **NPS** | Probabilité de recommandation | Survey in-app (0-10) / 90 jours | > 30 bon, > 50 excellent |
| **CSAT** | Satisfaction ponctuelle | Survey post-action (1-5) | > 4.0/5 |
| **Tickets support** | Volume de demandes d'aide | Helpdesk / compteur | < 5% des actifs |

---

## P06.A2 — Procédure P06.3 : Cadre SMART appliqué aux KPIs

### Template SMART par KPI

```markdown
### KPI : {{NOM_KPI}}
| Critère | Valeur |
|---|---|
| **Spécifique** | Mesurer {{QUOI}} pour {{OBJECTIF}} |
| **Mesurable** | Via {{OUTIL}} — formule : {{CALCUL}} |
| **Atteignable** | Baseline : {{ACTUEL}} → Cible : {{CIBLE}} |
| **Réaliste** | {{CONTRAINTES}} · Benchmark : {{COMPARABLE}} |
| **Temporel** | Deadline : {{DATE}} · Suivi : {{FRÉQUENCE}} |
```

### Bons vs mauvais exemples

| Critère | ❌ Mauvais | ✅ Bon |
|---|---|---|
| Spécifique | « Augmenter le trafic » | « 5 000 visiteurs uniques / mois » |
| Mesurable | « Les gens sont satisfaits » | « NPS > 40 via survey in-app trimestrielle » |
| Atteignable | « 1M utilisateurs en 1 mois » | « 500 inscrits en 3 mois (2 devs, 0 budget) » |
| Réaliste | « Churn 0% » | « Churn < 5% (benchmark SaaS B2B : 3-7%) » |
| Temporel | « Un jour » | « D'ici le 30 juin 2027, suivi mensuel » |

### Erreurs courantes

| Erreur | Correction |
|---|---|
| Pas de baseline (50% de quoi ?) | Établir la valeur actuelle (ou 0 si nouveau) |
| Cible copier-coller pour tous les KPIs | Adapter au contexte (scope, ressources, marché) |
| Fréquence absente | Définir : quotidien, hebdo, mensuel |
| Outil non identifié | Nommer : GA, Mixpanel, Stripe, survey in-app |
| Deadline floue (« à moyen terme ») | Date précise ou relative (L+30, L+90) |

---

## P06.A3 — Procédure P06.4 : Jalons par scope

### Scope MVP — 3 jalons

| Jalon | Durée typique | Livrables | Critères de passage |
|---|---|---|---|
| **Alpha** | L-8 à L-4 sem. | Features Must fonctionnelles, tests internes | 0 bug critique, 100% Must couverts |
| **Bêta** | L-4 à L-1 sem. | Correction bugs, onboarding, 5-20 testeurs | Complétion onboarding > 50%, 0 bloquant |
| **Lancement** | L | Produit live, monitoring, support | Uptime > 99%, KPIs d'acquisition actifs |

### Scope Growth — + 2 jalons

| Jalon | Date | Livrables | Critères de passage |
|---|---|---|---|
| **Revue 1 mois** | L+30j | Quick fixes, ajustements onboarding | Tendance acquisition positive |
| **Revue 3 mois** | L+90j | Features Should prioritaires, itérations | Rétention J30 mesurée, go/no-go |

### Scope Vision — + 2 jalons

| Jalon | Date | Livrables | Critères de passage |
|---|---|---|---|
| **Revue 6 mois** | L+180j | Features Could, A/B tests | LTV/CAC > 3, scalabilité validée |
| **Planning V2** | L+12 mois | Bilan complet, roadmap V2 | KPIs cibles atteints ou expliqués |

### Template jalon

```markdown
### Jalon : {{NOM}}
- **Date cible** : {{DATE}}
- **Livrables** : {{LIVRABLE_1}}, {{LIVRABLE_2}}
- **KPIs de passage** : {{KPI_1}} ≥ {{SEUIL}}, {{KPI_2}} ≥ {{SEUIL}}
- **Dépendances** : {{JALON_PRÉCÉDENT}}
```

---

## P06.A4 — Procédure P06.5 : Rex Challenge Métriques

### 5 questions de challenge

Rex pose 2 à 4 de ces questions (jamais les 5 d'un coup) :

| # | Question | Ce que ça teste | Si faible |
|---|---|---|---|
| 1 | « Comment tu mesures "{{KPI}}" concrètement ? Tu as l'outil ? » | Faisabilité | John propose un outil gratuit (GA, Mixpanel free, Stripe) |
| 2 | « Ton objectif de {{CIBLE}} en {{DURÉE}} — d'où ça sort ? » | Réalisme | John cherche un benchmark comparable |
| 3 | « Un seul KPI pour juger du succès : lequel ? » | North star | Si hésitation → pas de north star, John aide |
| 4 | « {{KPI}} = gros chiffre, mais quel impact concret ? » | Vanity metric | Remplacer ou déprioriser |
| 5 | « {{N}} jalons en {{DURÉE}}. Lequel tu sacrifies en premier ? » | Priorisation | Jalons mal hiérarchisés → revoir |

### Détection des vanity metrics

| Signal | Vanity metric | Alternative actionnable |
|---|---|---|
| Gros chiffre total | « 10 000 inscrits ! » | Inscrits actifs cette semaine (DAU) |
| Pas de contexte | « 500 téléchargements » | Funnel : téléchargements → inscriptions → activation |
| Non actionnable | « 2 000 pages vues » | Taux de rebond, conversion |
| Pas de tendance | « 100 utilisateurs » | Croissance semaine/semaine (+12%) |

> **[Rex]** « Si demain tu doubles "{{KPI}}", qu'est-ce qui change pour ton produit ? Rien ? C'est du bruit, pas du signal. »

### Technique "Et si tu mesurais l'inverse ?"

| KPI proposé | Inverse | Ce que ça révèle |
|---|---|---|
| Taux d'inscription | Taux d'abandon formulaire | Où tu perds les gens |
| Durée de session | Taux de sortie < 30 sec | Si le produit accroche |
| NPS positif | Détracteurs (0-6) | Gravité des insatisfactions |
| Features utilisées | Features jamais utilisées | Code mort à éliminer |

### North Star Metric

La north star est le **seul KPI** qui capture la valeur fondamentale de ton produit.

| Type de produit | North star typique | Pourquoi |
|---|---|---|
| Marketplace | Transactions complétées | Valeur acheteur + vendeur |
| SaaS productivité | Actions core / utilisateur / semaine | Usage = rétention |
| Réseau social | DAU avec interaction | Engagement = croissance |
| E-commerce | Commandes livrées | Promesse tenue |
| Contenu | Temps de lecture/visionnage | Valeur perçue |

**Test** : 1) « La seule chose que ton produit doit réussir ? » 2) « Si ce chiffre monte, ton produit va bien ? » 3) « Ton équipe comprend ce KPI ? » — Si oui aux 3 → c'est ta north star.

---

## P06.A5 — Scénarios d'erreur et récupération

| ID | Scénario | Récupération |
|---|---|---|
| E06.1 | Objectifs P02 oubliés ou incohérents | Revenir à P02, mettre à jour, reprendre P06 |
| E06.2 | L'utilisateur ne sait pas choisir de KPIs | John propose 2-3 KPIs pré-sélectionnés : « Je te recommande ceux-là. » |
| E06.3 | Trop de KPIs (> 3 par objectif) | Rex : « Si tu mesures tout, tu ne mesures rien. Garde les 2 qui comptent. » |
| E06.4 | Cibles irréalistes | John propose un benchmark : « En {{DOMAINE}}, la cible typique est {{RANGE}}. » |
| E06.5 | Timeline incohérente avec le scope | John recadre le nombre de jalons selon le scope |
| E06.6 | Session interrompue | Reprendre au dernier checkpoint validé |

---

## P06.A6 — Exemple complet : Parcours P06 pour SportMate

**Contexte** : App mobile matching sportif en zone rurale · Scope MVP · 3 objectifs (Acquisition 200 actifs, Engagement 3 sessions/sem, Satisfaction NPS > 40)

**P06.1** — John rappelle les 3 objectifs, l'utilisateur confirme.

**P06.2** — KPIs contextuels :

> **[John]** « OBJ-01 Acquisition locale — KPIs : inscriptions par canton + taux d'activation. »
> **Utilisateur** : « Les deux, c'est complémentaire. »

**P06.3** — SMART : Inscriptions/canton → Spécifique (3 cantons), Mesurable (Firebase), Atteignable (0→50), Réaliste (flyers mairie), Temporel (L+90j). Ajusté à 50/canton (stretch: 67).

**P06.4** — 3 jalons : Alpha (L-6 sem) → Bêta (L-2 sem) → Lancement.

**P06.5** — Rex : « 150 inscrits sans budget — comment ? 1 seul KPI ? » → Utilisateur choisit taux d'activation = north star.

**P06.6** — Validation :

> | KPI | Objectif | Baseline | Cible | Mesure | Deadline |
> |---|---|---|---|---|---|
> | Inscriptions/canton | OBJ-01 | 0 | 50 (stretch: 67) | Firebase + géoloc | L+90j |
> | Taux d'activation | OBJ-01 | 0% | > 40% | Événement "first_match" | L+30j |
> | Sessions/semaine | OBJ-02 | 0 | 3 | Firebase Analytics | L+90j |
> | NPS | OBJ-03 | — | > 40 | Survey in-app trimestrielle | L+180j |
>
> **North Star** : Taux d'activation (premier match réalisé)

---

## P06.A7 — Gardes comportementaux

### John (PM)

| Garde | Comportement |
|---|---|
| Contextuel | Relie chaque KPI à un objectif de P02 |
| Progressif | Un objectif à la fois |
| Pédagogue | Explique le *pourquoi*, pas juste le *quoi* |
| Pragmatique | Outils de mesure concrets et accessibles |
| Anti-mur-de-texte | Max 8 lignes sans interaction |

### Rex (Challenger)

| Garde | Comportement |
|---|---|
| Intensité 🟡 | Modérée — directe mais constructive |
| Timing | Après P06.4, quand KPIs + jalons sont posés |
| Focus | Mesurabilité, réalisme, vanity metrics, north star |
| Limite | 3-5 challenges, 2 allers-retours par point |
| Blocage interdit | Accepter la décision de l'utilisateur, noter le risque |

---

## P06.A8 — Risques spécifiques à P06

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP06-01 | Vanity metrics — KPIs impressionnants mais non actionnables | Haute | Haut | Appliquer le test Rex : « Si tu doubles ce chiffre, qu'est-ce qui change ? » Remplacer par un KPI actionnable. |
| RP06-02 | KPIs non mesurables — pas d'outil ni de méthode de collecte identifiés | Moyenne | Haut | Exiger un outil concret et une formule de calcul pour chaque KPI dès P06.3. Pas d'outil = pas de KPI. |
| RP06-03 | Baselines absentes — cibles définies sans point de référence | Haute | Moyen | Établir la valeur actuelle (ou 0 si produit nouveau) pour chaque KPI. Cible sans baseline = cible arbitraire. |
| RP06-04 | Métriques non alignées avec les objectifs — KPIs déconnectés de P02 | Moyenne | Haut | Vérifier que chaque KPI est relié à un objectif de P02. KPI orphelin = KPI à supprimer ou objectif manquant. |
| RP06-05 | Jalons irréalistes — timeline incohérente avec les ressources et le scope | Moyenne | Moyen | Calibrer le nombre de jalons selon le scope (MVP = 3, Growth = +2, Vision = +2). Vérifier la faisabilité avec l'utilisateur. |

---

## P06.A9 — Portes qualité P06

| Niveau | Critères |
|--------|----------|
| **Minimum** | Chaque objectif P02 a au moins 1 KPI associé · Chaque KPI a un outil de mesure identifié · Baselines définies (valeur actuelle ou 0) · Jalons définis selon le scope |
| **Standard** | Tous les critères Minimum + Chaque KPI passe le cadre SMART complet · Cibles réalistes avec benchmark ou justification · North star metric identifiée · Plan de monitoring défini (fréquence + responsable) · Rex challenge effectué (2-4 questions) |
| **Excellence** | Tous les critères Standard + Zéro vanity metric détectée · Chaque KPI a une cible standard et une cible stretch · Métriques leading et lagging équilibrées · Alignement vision ↔ objectifs ↔ KPIs ↔ jalons vérifié bout en bout · Dashboard ou tableau de bord esquissé |

---

## P06.A10 — Anti-patterns P06

| Anti-pattern | Description | Conséquence | Remède |
|---|---|---|---|
| Trop de métriques | Mesurer 10+ KPIs — « dashboard de Noël » | Perte de focus, paralysie analytique, aucun KPI suivi sérieusement | Limiter à 2-3 KPIs par objectif. Rex challenge : « Lequel tu sacrifies en premier ? » |
| Pas de propriétaire | KPIs définis mais personne n'est responsable du suivi | Métriques jamais consultées, aucune action corrective | Attribuer un propriétaire et une fréquence de revue à chaque KPI |
| Indicateurs retardés uniquement | Que des lagging indicators (chiffre d'affaires, churn) sans leading indicators (activation, engagement) | Réaction trop tardive, pas de signal d'alerte précoce | Équilibrer avec des indicateurs avancés : complétion onboarding, fréquence d'usage, NPS |
| Potentiel de gaming | KPIs qui incitent à des comportements pervers (ex. : « nombre d'inscrits » sans activation) | Optimisation du chiffre au détriment de la valeur réelle | Coupler chaque KPI avec un « garde-fou » : inscrits + taux d'activation, sessions + durée utile |
| Déconnexion de la valeur utilisateur | Métriques purement business sans indicateur de satisfaction ou d'usage réel | Produit rentable à court terme mais sans rétention | Inclure au moins 1 KPI centré utilisateur (NPS, CSAT, rétention cohorte) par objectif |
