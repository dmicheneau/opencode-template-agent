# 📋 Revues par agents spécialisés

**Date** : 2026-02-12
**Méthode** : 4 agents spécialisés lancés en parallèle via le tool `task`
**Pipeline** : code-reviewer → security-auditor → product-manager → documentation-engineer

---

## Scores de synthèse

| Agent | Rôle | Score | Verdict |
|-------|------|-------|---------|
| **code-reviewer** | Qualité code + architecture | **7.5/10** | Script solide, manque tests et retry `_raw_get` |
| **security-auditor** | Sécurité permissions + tokens | **5.5/10** (risque) | Path traversal critique, bash global trop permissif |
| **product-manager** | Stratégie produit + adoption | **5.9/10** | "Prototype solide, pas encore un produit" |
| **documentation-engineer** | Cohérence documentation | **7.2/10** | Bonne structure, incohérences numériques à corriger |

---

## 🔴 Issues critiques (consensus multi-agents)

### 1. Artefact « Specifically:. » dans 27 descriptions d'agents (63%)
- **Détecté par** : code-reviewer (M1), documentation-engineer (C1)
- **Impact** : Qualité perçue, affichage autocomplétion OpenCode
- **Correction** : Fixer la regex dans `extract_short_description()`, régénérer les agents

### 2. Vulnérabilité de traversée de chemin en mode `--all`
- **Détecté par** : security-auditor (C-01), CVSS 7.5
- **Impact** : Écriture de fichiers hors du répertoire agents si le dépôt source est compromis
- **Correction** : Valider que le path résolu reste sous `output_dir.resolve()`

### 3. `episode-orchestrator.md` utilise `tools:` déprécié
- **Détecté par** : documentation-engineer (C2), security-auditor (observation)
- **Impact** : Viole ADR-001, comporte ambiguïté de résolution tools vs permission
- **Correction** : Migrer vers `permission:` uniquement

### 4. Permission globale `bash: { "*": "allow" }` dans `opencode.json`
- **Détecté par** : security-auditor (H-03)
- **Impact** : Neutralise les restrictions bash des agents restreints
- **Correction** : Changer en `"ask"` au lieu de `"allow"`

### 5. Absence de `.gitignore` racine
- **Détecté par** : security-auditor (H-01), documentation-engineer (observation)
- **Impact** : Risque de commit accidentel de `.env`, `__pycache__/`, secrets
- **Correction** : Créer `.gitignore` à la racine

---

## 🟡 Issues majeures

### Code
| # | Issue | Source | Effort |
|---|-------|--------|--------|
| M-C1 | `_raw_get()` sans retry ni rate-limit (vs `_api_get()` robuste) | code-reviewer | 1h |
| M-C2 | `build_permissions()` appelé 2 fois par agent (DRY) | code-reviewer | 30min |
| M-C3 | Aucun test unitaire pour 1059 lignes | code-reviewer | 4-8h |
| M-C4 | `parse_frontmatter()` fragile, pas de warning sur lignes ignorées | code-reviewer | 1h |

### Sécurité
| # | Issue | Source | Effort |
|---|-------|--------|--------|
| M-S1 | Fuite token via redirection HTTP cross-origin | security-auditor | 1h |
| M-S2 | `task: { "*": allow }` permet l'escalade inter-agents | security-auditor | 2h |
| M-S3 | Supply chain sans vérification d'intégrité (checksums) | security-auditor | 3h |
| M-S4 | Parsing YAML fragile face à l'injection | security-auditor | 1h |

### Produit
| # | Issue | Source | Effort |
|---|-------|--------|--------|
| M-P1 | `OPENCODE_CONFIG_DIR` destructif (écrase la config existante) | product-manager | 4-6h |
| M-P2 | `opencode.json` contient des configs MCP personnelles (finder, memoai) | product-manager | 30min |
| M-P3 | Naming faible « opencode-template-agent » | product-manager | 15min |
| M-P4 | README français uniquement (limite l'audience à ~5%) | product-manager | 3-4h |
| M-P5 | Aucune boucle de feedback (CONTRIBUTING, Discussions, templates) | product-manager | 1-2h |

### Documentation
| # | Issue | Source | Effort |
|---|-------|--------|--------|
| M-D1 | Incohérence numérique : badge 43 ≠ 4+40=44 | documentation-engineer | 15min |
| M-D2 | Agent fantôme `architect-reviewer` dans CURATED_AGENTS mais pas sur disque | documentation-engineer | 30min |
| M-D3 | Profils de permissions non alignés entre architecture et README | documentation-engineer | 30min |
| M-D4 | Version Python contradictoire (3.7 vs 3.8) | documentation-engineer | 15min |
| M-D5 | `04-agent-tiers.md` : fullstack-developer mal catégorisé dans team/ | documentation-engineer | 15min |

---

## 🟢 Améliorations mineures

- Import `traceback` dans la boucle au lieu du top du fichier (code-reviewer m1)
- `chr(10)` obscur pour newline (code-reviewer m2)
- Mapping `blockchain-web3 → security/` trop étroit pour Tier 2 (code-reviewer m4)
- `discover_all_agents()` ne supporte qu'un niveau de profondeur (code-reviewer m5)
- Méthode 4 (one-liner) fragile dans le README (documentation-engineer m2)
- Skills et `opencode.json` non documentés (documentation-engineer)
- Pas de section Troubleshooting (documentation-engineer)
- Pas de lien vers `.plan/` dans le README (documentation-engineer m4)
- Paramètre `source_path` inutilisé dans `build_opencode_agent()` (code-reviewer M5)
- Limiter la taille des téléchargements à 1 Mo (security-auditor L-01)
- Fichier `.pyc` dans l'arborescence (security-auditor L-02)

---

## 📊 Plan de remédiation priorisé

### Sprint 0 — Immédiat (< 24h)
| # | Action | Source | Effort |
|---|--------|--------|--------|
| 1 | Créer `.gitignore` racine | security + docs | 5 min |
| 2 | Fixer `bash: "*": "ask"` dans `opencode.json` | security | 2 min |
| 3 | Ajouter validation path traversal dans `sync_agent()` | security | 30 min |
| 4 | Corriger regex `Specifically:.` + régénérer agents | code + docs | 1h |
| 5 | Migrer `episode-orchestrator.md` vers `permission:` only | docs + security | 30 min |
| 6 | Nettoyer `opencode.json` (retirer configs MCP personnelles) | product | 30 min |

### Sprint 1 — Court terme (1 semaine)
| # | Action | Source | Effort |
|---|--------|--------|--------|
| 7 | Ajouter retry à `_raw_get()` | code-reviewer | 1h |
| 8 | Unifier les chiffres (43 vs 44) dans toute la doc | docs | 1h |
| 9 | Résoudre agent fantôme `architect-reviewer` | docs | 30 min |
| 10 | Protection redirect cross-origin pour le token | security | 1h |
| 11 | Corriger permissions web agents (nextjs, react: write/edit deny) | product | 30 min |
| 12 | Aligner profils de permissions entre docs | docs | 30 min |
| 13 | Unifier version Python minimale | docs | 15 min |
| 14 | DRY: appeler `build_permissions()` une seule fois | code-reviewer | 30 min |
| 15 | Documenter script `install.sh` intelligent | product | 4-6h |

### Sprint 2 — Moyen terme (2-4 semaines)
| # | Action | Source | Effort |
|---|--------|--------|--------|
| 16 | Écrire tests unitaires pour fonctions pures | code-reviewer | 4-8h |
| 17 | Restreindre `task` par niveau de confiance | security | 2h |
| 18 | Mécanisme de checksums pour supply chain | security | 3h |
| 19 | README bilingue (FR + EN) | product | 3-4h |
| 20 | CONTRIBUTING.md + issue templates | product + docs | 2-4h |
| 21 | GIF/vidéo de démo | product | 1-2h |
| 22 | Renommer le repo → `opencode-agents` | product | 15 min |

---

## 💡 Recommandations stratégiques convergentes

### Les 4 agents s'accordent sur :

1. **Le script de sync est solide mais manque de tests** — fonctions pures facilement testables
2. **Le modèle de permissions est bien conçu mais contournable** — `task: "*": allow` partout crée une brèche
3. **La documentation est excellente en structure, fragile en exactitude** — incohérences numériques systématiques
4. **Le produit est un prototype, pas encore distribuable publiquement** — P0 obligatoires avant publication
5. **Le timing est bon (premier arrivant dans l'écosystème OpenCode)** — mais l'exécution doit être rapide

### Message clé du product-manager :
> *« Vous avez construit un excellent moteur — il manque la carrosserie, le nom sur la plaque, et un premier client pour valider que la route existe. »*

### Effort estimé pour les P0 : **~4 heures de travail ciblé**
### Score projeté après corrections P0 : **~8/10** (vs 6.5/10 actuellement en moyenne)

---

*Rapport généré automatiquement par le pipeline de revue multi-agents*
*Prochaine revue recommandée : après implémentation du Sprint 0*
