---
type: annexe
step: "05"
name: requirements
parent: step-05-requirements.md
title: Annexe — Exigences Fonctionnelles et Non-Fonctionnelles
version: 2.0
---

# Annexe Step 05 — Exigences Fonctionnelles et Non-Fonctionnelles

Ce fichier détaille les procédures, templates et scénarios de récupération pour l'étape Exigences. Il complète `step-05-requirements.md`.

---

## 1. Procédure P05.2 — Exigences fonctionnelles par domaine

### Catégories de domaine

| Code | Domaine | Description | Exemples typiques |
|---|---|---|---|
| AUTH | Authentification | Identité, accès, permissions | Inscription, login, rôles, 2FA |
| CORE | Cœur métier | Fonctionnalités centrales du produit | CRUD principal, logique métier, règles |
| UI | Interface utilisateur | Expérience et interactions | Navigation, formulaires, notifications visuelles |
| INT | Intégrations | Connexions externes | API tierces, webhooks, imports/exports |
| ADM | Administration | Gestion et configuration | Paramètres, modération, gestion utilisateurs |
| DATA | Données | Stockage, accès, manipulation | Recherche, filtres, migration, archivage |

### Format REQ-ID

**Convention** : `REQ-F-{CODE_DOMAINE}-{NNN}`

| Composant | Description | Exemples |
|---|---|---|
| REQ-F | Préfixe exigence fonctionnelle | — |
| CODE_DOMAINE | Code du domaine (3-4 lettres) | AUTH, CORE, UI, INT, ADM, DATA |
| NNN | Numéro séquentiel à 3 chiffres | 001, 002, 003... |

Exemples complets : `REQ-F-AUTH-001`, `REQ-F-CORE-003`, `REQ-F-UI-012`

### Template par exigence

```markdown
| ID | Description | Feature source | Priorité | Critères d'acceptation |
|---|---|---|---|---|
| REQ-F-{{DOM}}-{{NNN}} | {{DESCRIPTION_PRÉCISE}} | F-{{ID}} | {{MOSCOW}} | {{CRITÈRE_1}} · {{CRITÈRE_2}} · {{CRITÈRE_3}} |
```

**Règles d'écriture** :

| Élément | Bonne pratique | Mauvaise pratique |
|---|---|---|
| Description | Verbe d'action + complément précis | Vague (« Gérer les données ») |
| Feature source | ID explicite (F-001) | « Fonctionnalité principale » |
| Priorité | Héritée du MoSCoW de la feature | Redéfinie arbitrairement |
| Critères | Conditions testables oui/non | Subjectifs (« Facile à utiliser ») |

### Processus interactif — batch de 3

1. John identifie le premier domaine ayant des features Must/Should
2. Présente 3 exigences pour ce domaine
3. L'utilisateur valide, ajuste ou refuse chaque exigence
4. Batch suivant (même domaine ou domaine suivant)
5. Répéter jusqu'à couverture complète

**Règle** : 1 feature Must = minimum 1 exigence fonctionnelle · 1 feature Should = minimum 1 exigence fonctionnelle · 1 feature Could = optionnel.

### Traçabilité feature → exigence

À chaque batch, John maintient le compteur de couverture :

> « Couverture actuelle : {{N_COUVERTES}}/{{N_MUST_SHOULD}} features Must/Should couvertes.
> Domaines traités : {{LISTE_DOMAINES}}.
> Prochain domaine : {{DOMAINE_SUIVANT}}. »

---

## 2. Procédure P05.3 — NFRs adaptées au scope

### Table complète des NFRs par scope

#### Performance (PERF)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-PERF-001 | Temps de réponse pages | < 3s | p50 < 500ms, p95 < 2s | p50 < 200ms, p95 < 1s, p99 < 3s |
| REQ-NF-PERF-002 | Utilisateurs simultanés | 100 | 1 000 | 10 000+ |
| REQ-NF-PERF-003 | Débit | — | 100 req/s | 1 000 req/s |
| REQ-NF-PERF-004 | Temps de chargement initial | < 5s | < 3s (LCP) | < 1.5s (LCP + CLS < 0.1) |

#### Fiabilité (FIAB)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-FIAB-001 | Disponibilité | Best effort | 99.5% (18h downtime/an) | 99.9% (8.7h downtime/an) |
| REQ-NF-FIAB-002 | Backup | Quotidien | Quotidien + rétention 30j | Continu + rétention 90j |
| REQ-NF-FIAB-003 | RTO (temps de reprise) | — | < 4h | < 1h |
| REQ-NF-FIAB-004 | RPO (perte de données max) | — | < 24h | < 1h |
| REQ-NF-FIAB-005 | Plan de reprise (DR) | — | — | DR plan documenté et testé |

#### Accessibilité (ACC)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-ACC-001 | Niveau WCAG | Navigation clavier | WCAG 2.1 AA | WCAG 2.1 AAA |
| REQ-NF-ACC-002 | Support navigateurs | Dernières versions Chrome/Firefox/Safari | + Edge + mobile | + IE11/legacy si requis |
| REQ-NF-ACC-003 | Internationalisation | Mono-langue | — | Multi-langue (i18n/l10n) |
| REQ-NF-ACC-004 | Responsive | Mobile-first basique | Responsive complet | + PWA, offline-first |

#### Sécurité (SEC)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-SEC-001 | Transport | HTTPS obligatoire | HTTPS + HSTS | HTTPS + HSTS + Certificate pinning |
| REQ-NF-SEC-002 | Authentification | Email + mot de passe | + 2FA optionnel | + SSO, 2FA obligatoire |
| REQ-NF-SEC-003 | Chiffrement données | Transit (TLS) | + repos (AES-256) | + chiffrement applicatif |
| REQ-NF-SEC-004 | Conformité | Mentions légales, CGU | + RGPD complet | + Audit sécurité, certifications |
| REQ-NF-SEC-005 | Audit logs | — | Logs actions sensibles | Logs complets + rétention réglementaire |

#### Scalabilité (SCAL)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-SCAL-001 | Architecture | Monolithe acceptable | Scaling horizontal basique | Architecture élastique (auto-scaling) |
| REQ-NF-SCAL-002 | Base de données | Instance unique | Réplicas lecture | Sharding + réplicas |
| REQ-NF-SCAL-003 | Cache | — | Cache applicatif (Redis) | CDN + cache multi-niveaux |

#### Monitoring (MON)

| ID | Exigence | MVP | Growth | Vision |
|---|---|---|---|---|
| REQ-NF-MON-001 | Logs | Logs applicatifs basiques | Logs structurés + agrégation | Observabilité complète (logs + traces + métriques) |
| REQ-NF-MON-002 | Alertes | — | Alertes erreurs critiques | Alertes multi-niveaux + on-call |
| REQ-NF-MON-003 | APM | — | APM basique | APM + dashboards + SLA tracking |

### Processus de sélection par scope

1. John identifie le scope (MVP / Growth / Vision)
2. Présente la colonne correspondante du tableau — **pas les 3 colonnes**
3. L'utilisateur valide ou ajuste les cibles
4. Pour chaque NFR retenue : attribution du REQ-NF-ID

> « Ton scope est **{{SCOPE}}**. Je te propose ces NFRs — adaptées, pas le catalogue complet.
> On commence par la performance ? »

---

## 3. Procédure P05.4 — Rex revue bornée (max 3 rounds)

### Round 1 — Analyse des gaps

**Focus** : identifier ce qui manque.

**Template Rex** :

> **[Rex — Round 1 : Gaps]**
> « J'ai passé tes {{N_REQ_F}} exigences fonctionnelles et {{N_REQ_NF}} NFRs au crible.
>
> **Exigences manquantes** :
> - F-{{ID}} ({{NOM}}) : aucune exigence fonctionnelle → il en faut au moins 1 (Must)
> - Domaine {{DOMAINE}} : pas d'exigence pour le cas {{CAS_LIMITE}}
> - NFR manquante : {{CATÉGORIE}} non couverte alors que {{JUSTIFICATION}}
>
> **Score couverture** : {{N}}/{{TOTAL}} features couvertes.
>
> Corrige ces gaps et je repasse en round 2. »

### Round 2 — Vérification de cohérence

**Focus** : détecter les contradictions et incohérences.

**Template Rex** :

> **[Rex — Round 2 : Cohérence]**
> « Gaps corrigés, merci. Maintenant la cohérence :
>
> **Conflits détectés** :
> - REQ-F-{{ID}} et REQ-F-{{ID}} se contredisent sur {{POINT}}
> - REQ-NF-PERF-{{ID}} ({{CIBLE}}) est incompatible avec REQ-NF-{{CAT}}-{{ID}}
> - {{EXIGENCE}} suppose {{HYPOTHÈSE}} non vérifiée
>
> **Incohérences de priorité** :
> - REQ-F-{{ID}} est Must mais sa feature source est Should
>
> Résous ces conflits et on passe au round 3. »

### Round 3 — Évaluation des risques

**Focus** : quelles exigences sont à risque.

**Template Rex** :

> **[Rex — Round 3 : Risques]**
> « Dernière passe. Exigences à risque :
>
> **Risques techniques** :
> - REQ-F-{{ID}} : dépend d'une API tierce non testée → risque moyen
> - REQ-NF-PERF-{{ID}} : cible {{CIBLE}} ambitieuse pour un {{SCOPE}} → à surveiller
>
> **Risques de scope** :
> - {{N}} exigences pourraient être déplacées en phase suivante
>
> **Verdict** : {{VERDICT — validé / validé avec réserves / à revoir}} »

### Après round 3 — Clôture obligatoire

Rex **doit** conclure après le round 3 :

| Situation | Action Rex |
|---|---|
| Tout résolu | « ✅ Exigences validées. Aucun point en suspens. » |
| Points mineurs restants | « ✅ Validé avec réserves. Points taggés "à revoir post-PRD" : {{LISTE}} » |
| Problème majeur | « ⚠️ Point critique non résolu : {{POINT}}. Je recommande de le traiter avant de continuer, mais c'est ta décision. » |

**Pas de round 4.** Si l'utilisateur veut continuer à itérer, les points restants sont taggés « à revoir post-PRD » et documentés dans P05.5.

---

## 4. Procédure P05.5 — Questions ouvertes et hypothèses

### Template question ouverte

```markdown
| ID | Question | Impact | Propriétaire | Deadline suggérée |
|---|---|---|---|---|
| QO-001 | {{QUESTION_PRÉCISE}} | {{HAUT/MOYEN/BAS}} | {{QUI_DOIT_RÉPONDRE}} | {{DATE_OU_ÉTAPE}} |
```

**Sources de questions ouvertes** :
- Points non résolus des rounds Rex
- Ambiguïtés identifiées pendant P05.2 (exigences fonctionnelles)
- Cibles NFR à confirmer (performance, fiabilité)
- Dépendances externes non vérifiées

### Template hypothèse

```markdown
| ID | Hypothèse | Risque si fausse | Validation prévue |
|---|---|---|---|
| HYP-001 | {{HYPOTHÈSE_EXPLICITE}} | {{CONSÉQUENCE}} | {{COMMENT_VALIDER}} |
```

**Types d'hypothèses courantes** :

| Type | Exemple | Risque typique |
|---|---|---|
| Technique | « L'API {{SERVICE}} supporte {{FONCTIONNALITÉ}} » | Refonte architecture si faux |
| Utilisateur | « Les utilisateurs accepteront {{CONTRAINTE}} » | Taux d'adoption faible |
| Business | « Le marché est prêt pour {{FEATURE}} » | Investissement sans retour |
| Réglementaire | « {{RÉGLEMENTATION}} ne s'applique pas à notre cas » | Mise en conformité tardive |
| Performance | « {{TECHNOLOGIE}} tient la charge à {{CIBLE}} » | Rearchitecture sous pression |

### Processus

1. John liste les QO et HYP identifiées pendant P05.2-P05.4
2. L'utilisateur ajoute les siennes
3. Attribution d'un propriétaire et d'une deadline pour chaque QO
4. Documentation des conséquences si chaque HYP s'avère fausse

> « J'ai identifié {{N_QO}} questions ouvertes et {{N_HYP}} hypothèses.
> Prends un moment pour vérifier — il y en a peut-être d'autres ? »

---

## 5. Scénarios d'erreur et récupération

| ID | Scénario | Détection | Récupération |
|---|---|---|---|
| E05-01 | Features P04 incomplètes (pas de MoSCoW, pas de stories) | P05.1 | Retour à P04 : « Tes features n'ont pas de priorisation. On doit la faire avant de continuer. » |
| E05-02 | L'utilisateur rejette toutes les exigences proposées | P05.2, > 2 rejets consécutifs | John change d'approche : « Dis-moi ce que tu attends de F-{{ID}} avec tes propres mots, je reformule. » |
| E05-03 | NFRs inadaptées au scope (SLA 99.99% pour un MVP) | P05.3 | John recadre : « Pour un MVP, on n'a pas besoin de ce niveau. Voici ce qui est adapté... » |
| E05-04 | Rex identifie un gap critique non résolvable | P05.4 Round 1 | Tag « à revoir post-PRD » + documentation dans P05.5 avec impact et propriétaire |
| E05-05 | Conflit entre exigences non résolu après discussion | P05.4 Round 2 | L'utilisateur tranche, John documente la décision et le raisonnement |
| E05-06 | Trop d'hypothèses (> 10) — signe d'incertitude | P05.5 | John priorise : « 10 hypothèses, c'est beaucoup. Lesquelles ont le plus gros impact si elles sont fausses ? On se concentre sur le top 5. » |
| E05-07 | Session interrompue | Reprise | Reprendre au dernier checkpoint validé (CP-1, CP-2, CP-3) |
| E05-08 | L'utilisateur veut ajouter des détails d'implémentation | P05.2 | John recadre : « C'est un détail technique — on le garde pour la spec technique. Ici, on reste au niveau "quoi", pas "comment". » |

---

## 6. Exemple complet — App de suivi sportif « SportMate »

**Scope** : Growth · **Features** : 12 (4 Must, 5 Should, 2 Could, 1 Won't)
**Personas** : Alex (coureur amateur), Léa (coach indépendante)

### P05.2 — Exigences fonctionnelles

**Domaine AUTH** — batch 1 :

| ID | Description | Feature source | Priorité | Critères d'acceptation |
|---|---|---|---|---|
| REQ-F-AUTH-001 | L'utilisateur peut créer un compte avec email et mot de passe | F-001 | Must | Formulaire < 4 champs · validation email · mot de passe 8+ chars |
| REQ-F-AUTH-002 | L'utilisateur peut se connecter via Google ou Apple | F-001 | Should | OAuth 2.0 · création compte auto si nouveau · fusion si même email |
| REQ-F-AUTH-003 | L'utilisateur peut réinitialiser son mot de passe | F-001 | Must | Email envoyé < 30s · lien expire en 24h · nouveau mot de passe validé |

> « Ces 3 exigences AUTH, ça te convient ? »

**Domaine CORE** — batch 2 :

| ID | Description | Feature source | Priorité | Critères d'acceptation |
|---|---|---|---|---|
| REQ-F-CORE-001 | L'utilisateur peut enregistrer une séance d'entraînement | F-002 | Must | Type + durée + intensité · sauvegarde < 1s · confirmation visuelle |
| REQ-F-CORE-002 | Le système calcule des statistiques hebdomadaires | F-003 | Must | Distance totale · durée moyenne · progression vs semaine précédente |
| REQ-F-CORE-003 | Le coach peut créer un programme pour un athlète | F-005 | Should | 1-12 semaines · exercices par jour · partage par lien |

### P05.3 — NFRs (scope Growth)

| ID | Catégorie | Exigence | Cible |
|---|---|---|---|
| REQ-NF-PERF-001 | Performance | Temps de réponse | p50 < 500ms, p95 < 2s |
| REQ-NF-PERF-002 | Performance | Utilisateurs simultanés | 1 000 |
| REQ-NF-FIAB-001 | Fiabilité | Disponibilité | 99.5% |
| REQ-NF-FIAB-002 | Fiabilité | Backup | Quotidien, rétention 30 jours |
| REQ-NF-ACC-001 | Accessibilité | WCAG | Niveau AA |
| REQ-NF-SEC-001 | Sécurité | Transport + stockage | HTTPS + chiffrement repos (AES-256) |
| REQ-NF-SEC-002 | Sécurité | Conformité | RGPD complet |
| REQ-NF-MON-001 | Monitoring | Alertes | Erreurs critiques + APM basique |

### P05.4 — Rex

**Round 1** : « F-004 (notifications) n'a aucune exigence. Et tu n'as rien sur la gestion des données personnelles pour le RGPD — droit à l'oubli, export données ? »
→ Correction : ajout REQ-F-CORE-004, REQ-F-DATA-001, REQ-F-DATA-002.

**Round 2** : « REQ-NF-PERF-001 dit p95 < 2s, mais REQ-F-CORE-002 calcule des stats sur potentiellement des mois de données. Compatible ? »
→ Ajustement : ajout « stats pré-calculées, recalcul asynchrone max 1×/jour ».

**Round 3** : « REQ-F-AUTH-002 (OAuth Google/Apple) en Should — si Apple est obligatoire pour l'App Store, ça devrait être Must. Point à vérifier. »
→ Tag HYP-001 : « Apple Sign-In n'est pas obligatoire si pas d'autres login sociaux ».

**Clôture** : « ✅ Validé avec réserves. 1 hypothèse à vérifier (HYP-001). »

### P05.5 — Questions et hypothèses

| ID | Question | Impact | Propriétaire | Deadline |
|---|---|---|---|---|
| QO-001 | Apple Sign-In obligatoire si Google Sign-In présent ? | Must vs Should pour F-001 | Équipe mobile | Avant dev |

| ID | Hypothèse | Risque si fausse | Validation |
|---|---|---|---|
| HYP-001 | Apple Sign-In pas obligatoire sans autre login social | Refus App Store | Vérifier guidelines Apple |
| HYP-002 | 1 000 utilisateurs simultanés suffisent pour 12 mois | Scaling prématuré si > 1 000 | Projection marché |

### Résultat final

> 12 REQ-F · 8 REQ-NF · 1 question ouverte · 2 hypothèses · Rex : 3 rounds, tout résolu sauf HYP-001

---

## 7. Gardes comportementaux

### John (agent principal)

| Garde | Comportement |
|---|---|
| Méthodique | Batch de 3 exigences — jamais de dump complet |
| Traçable | Chaque REQ-F pointe vers une feature source (F-{{ID}}) |
| Adaptatif | NFRs calibrées au scope — pas de copier-coller |
| Cadrant | Refuse les détails d'implémentation — « quoi », pas « comment » |
| Documenteur | Questions ouvertes et hypothèses systématiquement capturées |

### Rex (support P05.4)

| Garde | Comportement |
|---|---|
| Intense | Intensité 🔴 forte — cette étape est son terrain principal |
| Borné | Maximum 3 rounds — clôture obligatoire après |
| Structuré | Chaque round a un focus spécifique (gaps → cohérence → risques) |
| Constructif | Identifie les problèmes ET suggère des pistes de résolution |
| Pragmatique | Tag « à revoir post-PRD » plutôt que bloquer indéfiniment |

---

## 8. Risques spécifiques à P05

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP05-01 | Exigences trop vagues — critères d'acceptation non testables | Haute | Haut | Appliquer la règle « condition testable oui/non » à chaque critère. John reformule si le critère est subjectif. |
| RP05-02 | Exigences contradictoires entre domaines | Moyenne | Haut | Rex round 2 dédié à la cohérence. Documenter la décision si conflit non résolu. |
| RP05-03 | Sur-spécification — trop de détails d'implémentation dans les exigences | Haute | Moyen | John applique le garde « quoi, pas comment ». Recadrer dès qu'un détail technique apparaît. |
| RP05-04 | NFRs manquantes — exigences non-fonctionnelles oubliées ou ignorées | Moyenne | Haut | Passer systématiquement toutes les catégories NFR (PERF, FIAB, ACC, SEC, SCAL, MON) même si certaines sont écartées. |
| RP05-05 | Rounds Rex dépassant la limite de 3 — boucle de révision infinie | Moyenne | Moyen | Clôture obligatoire après round 3. Points restants taggés « à revoir post-PRD » et documentés dans P05.5. |

---

## 9. Portes qualité P05

| Niveau | Critères |
|--------|----------|
| **Minimum** | Chaque feature Must/Should a au moins 1 REQ-F · Chaque REQ-F a un critère d'acceptation testable · Au moins 3 catégories NFR couvertes · Rex round 1 effectué |
| **Standard** | Tous les critères Minimum + Chaque REQ-F tracée vers sa feature source (F-ID) · Priorités cohérentes entre features et exigences · Toutes les catégories NFR pertinentes couvertes avec cibles adaptées au scope · Rex 3 rounds complétés · Questions ouvertes et hypothèses documentées |
| **Excellence** | Tous les critères Standard + 100 % des features Must/Should/Could couvertes · Critères d'acceptation avec seuils quantifiés · NFRs avec baselines et cibles SMART · Zéro conflit détecté par Rex · Hypothèses classées par impact avec plan de validation |

---

## 10. Anti-patterns P05

| Anti-pattern | Description | Conséquence | Remède |
|---|---|---|---|
| Exigences ambiguës | Utilisation de termes vagues (« rapide », « facile », « intuitif ») sans critère mesurable | Interprétations divergentes, tests impossibles | Reformuler avec des conditions testables : « < 2s », « en 3 clics max », « taux d'erreur < 5 % » |
| Gold plating | Ajouter des exigences au-delà de ce que les features demandent — spécifier le superflu | Scope creep, retards, effort gaspillé | Vérifier que chaque REQ-F est tracée vers une feature. Si pas de feature source → supprimer ou reporter |
| Pas de critères d'acceptation | Exigences sans conditions de validation — on ne sait pas quand c'est « fini » | Développement sans fin, recette impossible | Imposer au moins 2 critères d'acceptation testables par exigence Must |
| Dépendances circulaires | REQ-F-A dépend de REQ-F-B qui dépend de REQ-F-A — boucle bloquante | Impossible de planifier l'implémentation | Identifier les dépendances lors de P05.2. Casser la boucle en isolant une exigence de base |
| Ignorer le feedback Rex | Rejeter systématiquement les observations de Rex sans justification | Gaps et incohérences non résolus dans le PRD final | Documenter la raison du rejet. Si > 2 rejets consécutifs, Rex escalade en « point critique » dans P05.5 |
