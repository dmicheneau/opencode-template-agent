# Plan V5 — Consolidation & Distribution

> Version : 5.0 | Date : 2026-02-18 | **Statut : EN COURS**
> Predecesseur : Plan V4 (archive/v4/)
> Objectif : passer de "projet fonctionnel" a "produit distribuable"

---

## 1. Vision

Consolider le registre d'agents et preparer la distribution publique. Passer de "projet fonctionnel" a "produit distribuable" avec npm publish, agent versioning, et install.sh fiabilise.

---

## 2. Metriques actuelles (baseline V4)

| Metrique | V4 final |
|----------|----------|
| Agents | 70 (4 primary + 66 subagents) |
| Categories | 10 |
| Packs | 15 |
| Tests | 427 (250 JS + 177 Python) |
| CI | 4 jobs, tous verts |

---

## 3. Axes de travail

### S7 — npm Publish & Distribution (priorite haute)

| # | Tache | Description |
|---|-------|-------------|
| S7.1 | Configurer package.json pour publication npm | Package `opencode-agents`, champs `name`, `version`, `bin`, `files`, `engines`, `type: module` |
| S7.2 | GitHub Releases avec release notes auto-generees | Workflow CI declenche sur tag, genere release notes depuis les commits |
| S7.3 | Tags semver git | `v4.0.0` retroactif sur le dernier commit v4 + `v5.0.0` au lancement |
| S7.4 | Workflow CI pour publish automatique sur tag | `npm publish` declenche par `push: tags: 'v*'`, avec `NPM_TOKEN` secret |

### S8 — install.sh Overhaul (priorite haute)

| # | Tache | Description |
|---|-------|-------------|
| S8.1 | Couverture de tests pour install.sh | Integrer shellcheck (lint) + bats (tests fonctionnels) dans la CI |
| S8.2 | Revoir la logique de detection des agents installes | Fiabiliser la detection des fichiers `.md` existants, gerer les cas edge |
| S8.3 | Decision D21 | Deprecier install.sh en faveur de npx uniquement ? |

### S9 — Agent Expansion Wave 2 (priorite moyenne)

| # | Tache | Description |
|---|-------|-------------|
| S9.1 | Re-sync tier extended | Triage des nouveaux candidats depuis le repo source |
| S9.2 | Cible 85 agents (+15) | Integration vague 2 selon les criteres de curation C1-C6 (voir Plan V4 SS4.3) |
| S9.3 | Revue des packs existants | Ajout de nouveaux packs si pertinent pour les 15 agents supplementaires |

### S10 — TUI Enhancements (priorite moyenne)

| # | Tache | Description |
|---|-------|-------------|
| S10.1 | Vue detail agent | Panneau lateral ou popup affichant la description complete, permissions, tags |
| S10.2 | Overlay aide raccourcis clavier | Touche `?` pour afficher un overlay avec tous les raccourcis disponibles |
| S10.3 | Decision D22 | Support themes (dark/light/custom) ? |

### S11 — Infrastructure & DevOps (priorite basse)

| # | Tache | Description |
|---|-------|-------------|
| S11.1 | Pin GitHub Actions par SHA | Configurer Dependabot pour maintenir les SHA a jour automatiquement |
| S11.2 | Revisiter D18 | Auto-merge sync PRs apres periode de rodage (voir Plan V4 SS7/D18) |
| S11.3 | Agent versioning | Tracker la version installee de chaque agent (metadata locale) |

### S12 — Community & Adoption (priorite basse)

| # | Tache | Description |
|---|-------|-------------|
| S12.1 | npm keywords et GitHub topics | Ameliorer la discoverability sur npm et GitHub |
| S12.2 | Decision D23 | Telemetrie opt-in (download counts) ? |
| S12.3 | Template contributions communautaires | Template `.md` + guide pour soumettre un agent via PR |

---

## 4. Decisions a prendre

| ID | Question | Options | Statut |
|----|----------|---------|--------|
| D21 | Deprecier install.sh ? | A: Deprecier (npx only) / B: Maintenir les deux | A trancher |
| D22 | Support themes TUI ? | A: Dark/light toggle / B: Variables env / C: Pas maintenant | A trancher |
| D23 | Telemetrie opt-in ? | A: npm download counts only / B: Custom analytics / C: Aucune | A trancher |

---

## 5. Criteres de succes V5

### Obligatoires

| # | Critere | Mesure |
|---|---------|--------|
| CS10 | Package publie sur npm | Installable via `npx opencode-agents`, version semver correcte |
| CS11 | >= 80 agents curates dans le manifest | `manifest.json` -> `agent_count >= 80` |
| CS12 | install.sh teste ou deprecie | Soit couverture shellcheck + bats, soit depreciation documentee |
| CS13 | >= 440 tests, tous verts | 250+ JS, 190+ Python, CI 4 jobs verts |
| CS14 | TUI avec vue detail agent | S10.1 livre, accessible via `Enter` ou panneau lateral |

### Recommandes

| # | Critere | Mesure |
|---|---------|--------|
| CS15 | GitHub Releases automatiques | Release notes generees sur chaque tag semver |
| CS16 | Agent versioning operationnel | Version trackee localement pour chaque agent installe |
| CS17 | Template contribution communautaire | Fichier template + guide dans `CONTRIBUTING.md` ou `docs/` |

---

## 6. Sequencement

```
S7 (npm publish) ─────────────────────> bloque S12.1
S8 (install.sh) ──────> independant
S9 (expansion) ───────> apres S7 (pour publier avec les nouveaux agents)
S10 (TUI enhance) ────> independant
S11 (infra) ──────────> independant, peut demarrer en parallele
S12 (community) ──────> apres S7
```

**Ordre recommande** :
1. **S7.1-S7.4** — npm publish & distribution (1-2 sessions)
2. **S8.1-S8.3** — install.sh overhaul (1 session)
3. **S10.1-S10.3** — TUI enhancements (1-2 sessions)
4. **S9.1-S9.3** — Agent expansion wave 2 (1 session)
5. **S11.1-S11.3** — Infrastructure & DevOps (1 session)
6. **S12.1-S12.3** — Community & adoption (1 session)

---

## 7. Estimation globale

| Axe | Effort | Priorite |
|-----|--------|----------|
| S7 — npm Publish & Distribution | 3-4h | Haute |
| S8 — install.sh Overhaul | 2-3h | Haute |
| S9 — Agent Expansion Wave 2 | 2-3h | Moyenne |
| S10 — TUI Enhancements | 4-6h | Moyenne |
| S11 — Infrastructure & DevOps | 2h | Basse |
| S12 — Community & Adoption | 1-2h | Basse |

**Total estime : 14-20h de travail (5-8 sessions)**

---

## 8. Risques

| # | Risque | Severite | Mitigation |
|---|--------|----------|------------|
| R9 | npm publish echoue (nom pris, scope manquant) | Moyen | Verifier la disponibilite du nom `opencode-agents` sur npm avant S7.1 |
| R10 | install.sh deprecie trop tot, utilisateurs impactes | Moyen | Periode de depreciation avec warning avant suppression |
| R11 | Expansion wave 2 introduit des agents de faible qualite | Bas | Criteres de curation C1-C6 maintenus, review manuelle obligatoire |
| R12 | Vue detail TUI complexifie le code raw-mode | Moyen | Garder le design simple (popup modale, pas de panneau lateral complexe) |
| R13 | Agent versioning ajoute de la complexite pour peu de valeur | Bas | Implementer de facon minimale (fichier JSON local) |

---

## 9. Contraintes

- Zero npm deps — **obligatoire**
- Python stdlib only pour les scripts — **obligatoire**
- Node.js 20+ ESM only — **obligatoire**
- Agents permission-based (jamais `tools:` deprecated) — **obligatoire**
- Documentation plan en francais — **obligatoire**
- Code et UI en anglais — **obligatoire**
- Pas de push direct sur `main` pour le sync — PR obligatoire — **obligatoire**
- Semver stricte pour les tags et releases npm — **obligatoire**
