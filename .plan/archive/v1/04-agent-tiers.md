# 🎯 Stratégie 3 niveaux — Curation des agents

## Contexte

Le registre source (aitmpl.com / `davila7/claude-code-templates`) contient **399 agents** répartis dans **27 catégories**. Importer la totalité serait contre-productif : bruit dans l'autocomplétion, agents de faible qualité, doublons fonctionnels, catégories hors-scope (marketing, podcasts, OCR...).

La stratégie adoptée est un système à **3 niveaux** (tiers) permettant de couvrir tous les cas d'usage.

---

## Tier 1 — Core (43 agents synchronisés + 1 custom = 44 total) ✅ Actif

### Objectif
Couvrir les besoins de développement les plus courants avec un ratio signal/bruit maximal.

### Critères de sélection
- Pertinence directe pour le développement logiciel
- Qualité du system prompt (structure, longueur, exemples)
- Couverture des langages et frameworks majeurs
- Complémentarité (pas de doublons fonctionnels)
- Profil de permissions cohérent

### Répartition actuelle

| Catégorie | Agents | Exemples |
|-----------|--------|----------|
| `languages/` | 10 | typescript-pro, python-pro, golang-pro, rust-pro... |
| `devtools/` | 5 | code-reviewer, test-automator, debugger... |
| `ai/` | 6 | ai-engineer, prompt-engineer, llm-architect... |
| `devops/` | 2 | kubernetes-specialist, terraform-specialist |
| `security/` | 3 | security-auditor, penetration-tester, smart-contract-auditor |
| `database/` | 2 | database-architect, postgres-pro |
| `web/` | 2 | expert-nextjs-developer, expert-react-frontend-engineer |
| `api/` | 2 | api-architect, graphql-architect |
| `docs/` | 3 | documentation-engineer, api-documenter, technical-writer |
| `business/` | 3 | product-manager, scrum-master, project-manager |
| `team/` | 2 | ui-designer, mobile-developer |
| **Primary (racine)** | 4 | episode-orchestrator (custom), fullstack-developer, devops-engineer, cloud-architect |

### Commande
```bash
python scripts/sync-agents.py              # Sync uniquement le tier 1
```

---

## Tier 2 — Extended (~120-150 agents) 🔜 Phase 2

### Objectif
Étendre la couverture aux agents de niche pertinents sans sacrifier la qualité.

### Catégories candidates à ajouter

| Catégorie source | Agents estimés | Exemples potentiels |
|-----------------|----------------|---------------------|
| `image-processing` | 5-8 | image-optimizer, svg-specialist |
| `cms-ecommerce` | 8-12 | shopify-developer, wordpress-expert |
| `game-development` | 6-10 | unity-developer, game-designer |
| `testing` (extended) | 5-8 | e2e-tester, load-tester, chaos-engineer |
| `cloud-providers` | 8-12 | aws-specialist, azure-architect, gcp-pro |
| `monitoring` | 4-6 | observability-engineer, logging-specialist |
| `networking` | 3-5 | network-architect, dns-specialist |
| `data-engineering` | 6-10 | etl-specialist, data-pipeline-architect |
| `mobile` (extended) | 5-8 | ios-developer, android-specialist, flutter-pro |
| `design` (extended) | 4-6 | figma-to-code, design-system-architect |

### Critères d'inclusion (Tier 2)
1. System prompt > 500 mots
2. Pas de doublon fonctionnel avec un agent Tier 1
3. Pertinence pour au moins 10% des développeurs
4. Prompt bien structuré (sections, exemples, contraintes)

### Mécanisme
```bash
python scripts/sync-agents.py --tier extended   # À implémenter
```

Le script devra supporter un nouveau flag `--tier` (core | extended | all) et une liste `EXTENDED_AGENTS` en plus de `CURATED_AGENTS`.

---

## Tier 3 — All (399 agents) ⚙️ Disponible

### Objectif
Accès complet à la totalité du registre source pour les utilisateurs avancés.

### Risques identifiés
- **Bruit** : autocomplétion polluée par 399 entrées
- **Qualité variable** : certains agents ont des prompts très courts ou vides
- **Doublons** : plusieurs agents couvrent le même domaine
- **Hors-scope** : agents marketing, podcasts, OCR, social media...
- **Permissions** : pas de profil adapté pour les agents inconnus

### Mitigations
- Avertissement affiché lors de l'utilisation de `--all`
- Permissions restrictives par défaut (read-only) pour les agents non curés
- Sous-répertoires supplémentaires créés automatiquement
- Préfixe `@misc/` pour les agents sans catégorie mappée

### Commande existante
```bash
python scripts/sync-agents.py --all           # Déjà implémenté
python scripts/sync-agents.py --all --filter game-development  # Filtrer
```

---

## Implémentation — Modifications requises

### Script `sync-agents.py`

1. **Ajouter `EXTENDED_AGENTS` dict** : ~120-150 agents curés manuellement (Tier 2)
2. **Ajouter flag `--tier`** : `core` (défaut), `extended`, `all`
3. **Ajouter profil de permission `unknown`** : read-only pour les agents non curés (Tier 3)
4. **Warning sur `--all`** : message d'avertissement + confirmation en mode interactif

### Catégories OpenCode à ajouter

| Sous-répertoire | Catégories source mappées |
|----------------|--------------------------|
| `cloud/` | cloud-providers |
| `data/` | data-engineering, image-processing |
| `gaming/` | game-development |
| `mobile/` (extended) | mobile extensions |
| `monitoring/` | monitoring, observability |
| `testing/` | testing extensions |
| `misc/` | catch-all pour les non-mappés |

---

## Métriques de succès

| Métrique | Tier 1 | Tier 2 | Tier 3 |
|----------|--------|--------|--------|
| Agents | 43 | ~150 | 399 |
| Qualité moyenne | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Bruit autocomplétion | Faible | Moyen | Élevé |
| Couverture domaines | 70% dev | 90% dev | 100% |
| Maintenance | Faible | Moyenne | Élevée |
| Recommandé pour | Tous | Power users | Explorateurs |

---

## Chronologie

| Phase | Action | Échéance estimée |
|-------|--------|-----------------|
| Phase 0 ✅ | Tier 1 Core (43 agents) | Fait |
| Phase 1 | Stabilisation Tier 1 | 1-2 semaines |
| Phase 2 | Curation Tier 2 Extended | 2-4 semaines |
| Phase 3 | Publication + documentation tiers | 4-6 semaines |
