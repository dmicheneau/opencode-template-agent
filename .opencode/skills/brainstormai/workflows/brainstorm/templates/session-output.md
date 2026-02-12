---
type: template
name: session-output
version: 2.0
description: Template de sortie pour une session de brainstorming
---

# Template de Session Brainstorming

> Ce template est utilisé pour générer le fichier de sortie d'une session de brainstorming.
> Les sections entre `{{ }}` sont des placeholders à remplir par le workflow.

```markdown
---
id: "{{SESSION_ID}}"
date: "{{DATE}}"
topic: "{{TOPIC}}"
domain: "{{DOMAIN}}"
approach: "{{APPROACH}}"
statut: "en_cours"
etape_courante: 1
techniques_used: []
idea_count: 0
rounds_completed: 0
date_pause: null
version: 1
source_workflow: "brainstorm"
---

# 🧠 Session de Brainstorming : {{TOPIC}}

## Contexte

| Champ | Valeur |
|-------|--------|
| **Sujet** | {{TOPIC}} |
| **Domaine** | {{DOMAIN}} |
| **Date** | {{DATE}} |
| **Approche** | {{APPROACH}} |
| **Facilitatrice** | Mary (Analyste) |
| **Durée estimée** | {{DUREE_ESTIMEE}} |

## Cadrage Initial (Étape 1)

### Récapitulatif du cadrage
{{RECAP_CADRAGE}}

### Questions de cadrage
1. {{QUESTION_1}} — {{REPONSE_1}}
2. {{QUESTION_2}} — {{REPONSE_2}}
3. {{QUESTION_3}} — {{REPONSE_3}}

### Contraintes identifiées
- {{CONTRAINTE_1}}
- {{CONTRAINTE_2}}

### Critères de succès
- {{CRITERE_1}}
- {{CRITERE_2}}

---

## Techniques sélectionnées (Étape 2)

| # | Technique | Catégorie | Durée | Micro-protocole |
|---|-----------|-----------|-------|-----------------|
| 1 | {{TECHNIQUE_1}} | {{CATEGORIE}} | {{DUREE}} | {{MICRO_PROTOCOLE}} |
| 2 | {{TECHNIQUE_2}} | {{CATEGORIE}} | {{DUREE}} | {{MICRO_PROTOCOLE}} |

---

## Rondes d'Idéation (Étape 3)

### Ronde {{N}} — {{TECHNIQUE_NAME}}

**Technique** : {{TECHNIQUE_DESCRIPTION}}
**Micro-protocole** : {{MICRO_PROTOCOLE_APPLIQUE}}

#### Idées générées
| # | Idée | Source | Réaction | Score |
|---|------|--------|----------|-------|
| 1 | {{IDEE}} | Mary / Utilisateur / Rex | 👍👎🤔💡 | {{SCORE}} |

#### Intervention Rex (si applicable)
> 🔥 **Rex** (intensité {{NIVEAU}}/5) : {{CHALLENGE_REX}}
> **Réponse** : {{REPONSE_CHALLENGE}}

#### Bilan de la ronde
- Idées générées : {{COUNT}}
- Idées retenues : {{RETAINED}}
- Idées transformées par Rex : {{TRANSFORMED}}
- Pivot suggéré : {{OUI/NON}}
- Énergie utilisateur : {{NIVEAU_ENERGIE}}

---

## Synthèse (Étape 4 — Nova)

### Thèmes émergents
| # | Thème | Idées associées | Score impact | Score faisabilité |
|---|-------|----------------|-------------|------------------|
| 1 | {{THEME}} | #1, #5, #12 | ██████████ 9/10 | ████████░░ 8/10 |

### Co-évaluation
> Les scores ci-dessous intègrent l'évaluation de l'utilisateur et celle de Nova.

### Top 5-10 Idées
| Rang | Idée | Thème | Impact | Faisabilité | Justification |
|------|------|-------|--------|-------------|---------------|
| 1 | {{IDEE}} | {{THEME}} | {{IMPACT}} | {{FAISABILITE}} | {{JUSTIFICATION}} |

### Shortlist validée
1. ⭐ {{IDEE_1}} — {{DESCRIPTION_COURTE}}
2. ⭐ {{IDEE_2}} — {{DESCRIPTION_COURTE}}
3. ⭐ {{IDEE_3}} — {{DESCRIPTION_COURTE}}

### Idées non retenues (archive)
<details>
<summary>Voir les {{N}} idées non retenues</summary>

- {{IDEE_ARCHIVE_1}} — Raison : {{RAISON}}
- {{IDEE_ARCHIVE_2}} — Raison : {{RAISON}}
</details>

---

## Pont vers le PRD (Bridge)

> Cette section est générée automatiquement par Nova à S04.7.
> Elle sert de **contrat de données** entre le brainstorm et le workflow PRD.
> P01.2 (John) lit cette section pour initialiser le PRD avec des données structurées.

```yaml
bridge:
  version: 1
  session_id: "{{SESSION_ID}}"
  topic: "{{TOPIC}}"
  domain: "{{DOMAIN}}"
  date_brainstorm: "{{DATE}}"
  techniques_used:
    - nom: "{{TECHNIQUE_1}}"
      categorie: "{{CATEGORIE}}"
    - nom: "{{TECHNIQUE_2}}"
      categorie: "{{CATEGORIE}}"
  stats:
    total_ideas: {{TOTAL_IDEAS}}
    rounds: {{ROUNDS}}
    user_ideas: {{USER_IDEAS}}
    rex_challenges: {{REX_CHALLENGES}}
    themes_count: {{THEMES_COUNT}}
  themes:
    - id: "TH-001"
      nom: "{{NOM_THEME_1}}"
      ideas_count: {{N}}
    - id: "TH-002"
      nom: "{{NOM_THEME_2}}"
      ideas_count: {{N}}
  shortlist:
    - id: "IDEA-001"
      titre: "{{IDEE_1}}"
      description: "{{DESCRIPTION_COURTE}}"
      theme: "TH-001"
      score: "A+"
      impact: "Haut"
      faisabilite: "Haut"
      source: "Mary|Utilisateur|Rex"
    - id: "IDEA-002"
      titre: "{{IDEE_2}}"
      description: "{{DESCRIPTION_COURTE}}"
      theme: "TH-001"
      score: "A"
      impact: "Haut"
      faisabilite: "Moyen"
      source: "Utilisateur"
    - id: "IDEA-003"
      titre: "{{IDEE_3}}"
      description: "{{DESCRIPTION_COURTE}}"
      theme: "TH-002"
      score: "B+"
      impact: "Moyen"
      faisabilite: "Haut"
      source: "Mary"
  archived_ideas_count: {{N_ARCHIVED}}
  rex_final_observations:
    - "{{OBSERVATION_1}}"
    - "{{OBSERVATION_2}}"
  recommended_scope: "{{mvp|growth|vision}}"
```

> **Traçabilité** : Les IDs `IDEA-XXX` sont repris dans le PRD comme
> `FEAT-XXX → IDEA-XXX` (P04) et `REQ-F-XXX → FEAT-XXX → IDEA-XXX` (P05).
> Cette chaîne permet de remonter de n'importe quelle exigence technique
> jusqu'à l'idée brainstorm d'origine.

---

## Décision finale

| Champ | Valeur |
|-------|--------|
| **Action choisie** | [Créer PRD / Continuer brainstorm / Ajuster sélection / Sauvegarder] |
| **Date de clôture** | {{DATE_CLOTURE}} |
| **Prochaine étape** | {{NEXT_STEP}} |
| **Lien PRD** | {{LIEN_PRD}} (si applicable) |

---

## Métadonnées de session

| Métrique | Valeur |
|----------|--------|
| Nombre total d'idées | {{TOTAL_IDEAS}} |
| Rondes complétées | {{ROUNDS}} |
| Interventions Rex | {{REX_INTERVENTIONS}} |
| Techniques utilisées | {{TECHNIQUES_LIST}} |
| Durée effective | {{DUREE}} |
```
