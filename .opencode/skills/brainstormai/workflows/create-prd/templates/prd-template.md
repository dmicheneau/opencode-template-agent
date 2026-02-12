---
type: template
name: prd-output
version: 2.0
description: Template du Product Requirements Document généré par le workflow create-prd
---

# Template PRD

> Ce template est utilisé par le workflow create-prd pour générer le document PRD final.
> Les sections entre `{{ }}` sont remplacées par le contenu généré à chaque étape.

```markdown
---
id: "{{PRD_ID}}"
session_source: "{{SESSION_ID}}"
nom_projet: "{{NOM_PROJET}}"
date_creation: "{{DATE}}"
date_modification: "{{DATE_MODIF}}"
statut: "en_cours"
etape_courante: 1
scope: "{{SCOPE}}"
version: 1
auteur: "John (PM)"
source_workflow: "create-prd"
---

# 📋 PRD — {{nom_du_projet}}

> **Version** : {{version}}
> **Date** : {{date}}
> **Auteur** : John (PM) — assisté par l'équipe BrainStormAI
> **Session brainstorm** : {{session_id}}
> **Scope** : {{scope}} (MVP / Growth / Vision)
> **Statut** : {{statut}}

---

## 1. Résumé exécutif

### Vision
{{vision_statement}}

### Différenciateur clé
{{différenciateur}}

### Utilisateur cible
{{utilisateur_cible}}

### Calendrier MVP
{{calendrier_mvp}}

### Récapitulatif brainstorm
> Résumé des idées clés issues de la session brainstorm {{session_id}} :
> - Top idées retenues : {{top_idées}}
> - Thèmes principaux : {{thèmes}}

---

## 2. Objectifs stratégiques

{{objectifs_stratégiques}}

### Challenge Rex — Vision & Objectifs
> 🔥 {{challenge_vision}}

---

## 3. Segments utilisateurs & Personas

{{segments_et_personas}}

### Challenge Rex — Personas
> 🔥 {{challenge_personas}}

---

## 4. Fonctionnalités & User Stories

### Classification MoSCoW

#### Must Have (Indispensable)
{{must_have}}

#### Should Have (Important)
{{should_have}}

#### Could Have (Souhaitable)
{{could_have}}

#### Won't Have (Hors scope MVP)
{{wont_have}}

### Challenge Rex — Priorisation
> 🔥 {{challenge_priorisation}}

---

## 5. Exigences fonctionnelles

{{exigences_fonctionnelles}}

---

## 6. Exigences non-fonctionnelles

### Performance
{{perf}}

### Fiabilité
{{fiabilité}}

### Accessibilité
{{accessibilité}}

### Sécurité
{{sécurité}}

---

## 7. Métriques de succès

### KPIs
{{kpis}}

### Critères SMART
{{critères_smart}}

### Jalons
| Jalon | Échéance | Critère de succès |
|-------|----------|-------------------|
{{jalons}}

### Challenge Rex — Réalisme des métriques
> 🔥 {{challenge_métriques}}

---

## 8. Analyse des risques

| Risque | Catégorie | Probabilité | Impact | Mitigation |
|--------|-----------|-------------|--------|------------|
{{risques}}

### Challenge Rex — Risques manquants
> 🔥 {{challenge_risques}}

---

## 9. Hors scope & Roadmap post-MVP

### Hors scope MVP
{{hors_scope}}

### Phase 2 (post-MVP)
{{phase_2}}

### Phase 3 (long terme)
{{phase_3}}

---

## 10. Checklist de validation

- [ ] Vision claire et différenciée
- [ ] Personas validés par l'utilisateur
- [ ] Features priorisées (MoSCoW)
- [ ] Exigences fonctionnelles complètes
- [ ] Exigences non-fonctionnelles définies
- [ ] KPIs mesurables
- [ ] Risques identifiés et mitigés
- [ ] Scope MVP délimité
- [ ] Revue par Rex (Challenger) effectuée à chaque étape
- [ ] Cohérence globale vérifiée

---

## 11. Historique des modifications

| Version | Date | Étape | Changements |
|---------|------|-------|-------------|
| 1 | {{DATE}} | Init | Création du PRD |

---

*Généré par BrainStormAI v3 — Workflow create-prd*
```
