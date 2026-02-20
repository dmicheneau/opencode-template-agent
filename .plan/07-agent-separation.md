# S7 — Séparation agents produit / agents de développement

> **Version** : 2.1 — Corrigée suite aux revues v1 et v2 (2×2 reviewers : code + CI/CD)

## Problème

Les 70 agents produit (templates distribués aux utilisateurs) vivent dans `.opencode/agents/` — le même répertoire qu'OpenCode utilise pour charger les agents actifs du projet. Conséquences :

1. **Conflits de permissions** — les sub-agents qui modifient les agents produit entrent en conflit avec le chargement OpenCode
2. **Échecs d'écriture silencieux** — 4 cas documentés de sub-agents incapables d'écrire des fichiers
3. **Confusion conceptuelle** — pas de séparation entre "agents utilisés pour développer" et "agents livrés aux utilisateurs"

## Solution

Déplacer les 70 agents produit de `.opencode/agents/` vers `agents/` à la racine du projet. Garder `.opencode/agents/` exclusivement pour les agents de développement du projet (si nécessaire).

**Contrainte critique** : la destination d'installation chez l'utilisateur doit rester `.opencode/agents/` — c'est là qu'OpenCode attend les agents. Seul l'emplacement source dans le repo change.

## Découverte clé : dual usage de `base_path`

Le champ `base_path` dans `manifest.json` est actuellement `".opencode/agents"` et sert à **deux fins** :
- **Source** : construction de l'URL GitHub raw pour le téléchargement (`getDownloadUrl()`)
- **Destination** : chemin d'installation local sur la machine de l'utilisateur (`getDestination()`)

Ces deux usages doivent être séparés. Solution : ajouter un champ `source_path` dans le manifest pour l'URL de téléchargement, et garder `base_path` pour la destination d'installation.

---

## Inventaire complet des fichiers impactés

### Fichiers nécessitant des modifications (SOURCE → `agents/`)

| Fichier | Ligne(s) | Référence actuelle | Changement |
|---------|----------|-------------------|------------|
| `manifest.json` | 5 | `"base_path": ".opencode/agents"` | Ajouter `"source_path": "agents"`, garder `base_path` |
| `src/installer.mjs` | `getDownloadUrl()` | Utilise `base_path` pour l'URL | Utiliser `source_path \|\| base_path` |
| `scripts/sync-agents.py` | 1432-1433 | `--output-dir` défaut `.opencode/agents` | Changer en `agents` |
| `scripts/update-manifest.py` | 4, 18, 132 | `DEFAULT_SYNC_MANIFEST = ".opencode/agents/manifest.json"` | Changer en `agents/manifest.json` |
| `scripts/enrich_agents.py` | ~10 | `AGENTS_DIR = .opencode/agents` | Changer en `agents` |
| `install.sh` | 308 | `${script_dir}/.opencode/agents` | `${script_dir}/agents` |
| `install.sh` | 400 | `${source_dir}/.opencode/agents` | `${source_dir}/agents` |
| `.github/workflows/ci.yml` | 95-96, 184, 198, 213 | `'.opencode/agents'`, `find .opencode/agents` | Changer en `agents` |
| `.github/workflows/sync-agents.yml` | 144, 147, 158-160, 184, 194, 212, 263, 289, 315, 340 | `git add/diff .opencode/agents/`, `find .opencode/agents`, `--sync-manifest .opencode/agents/manifest.json`, inline Python `agents_dir` et validation | Changer en `agents`. **Attention L263** : validation d'existence utilise `base_path` — doit utiliser `source_path` pour vérifier les fichiers sur disque |
| `README.md` | ~109 | Mentions `.opencode/agents/` comme source | Mettre à jour |
| `docs/architecture.md` | Multiples | Diagrammes Mermaid | Mettre à jour |

### Fichiers à déplacer

| Fichier actuel | Destination | Raison |
|---------------|-------------|--------|
| `.opencode/agents/**/*.md` (70 fichiers) | `agents/**/*.md` | Templates produit |
| `.opencode/agents/manifest.json` (sync tracking) | `agents/manifest.json` | Artifact de sync, lié aux sources |
| `.opencode/agents/.manifest-lock.json` | `agents/.manifest-lock.json` | Lock du repo, lié aux sources |

### Fichiers analysés et confirmés NON impactés (DESTINATION — inchangés)

| Fichier | Ligne(s) | Référence | Raison |
|---------|----------|-----------|--------|
| `src/installer.mjs` `getDestination()` | — | Utilise `base_path` | Chemin destination chez l'utilisateur, correct |
| `src/installer.mjs` `uninstallAgent()` | — | Opère sur destination | Inchangé |
| `src/lock.mjs` | 54, 167, 239, 283, 318 | `.opencode/agents` (fallback) | 5 fallbacks destination-side |
| `src/display.mjs` | 142 | `.opencode/agents/<name>.md` | Aide utilisateur, réfère à la destination |
| `src/registry.mjs` | 62-84 | Pas de chemin hardcodé | Lit `base_path` du manifest dynamiquement |
| `src/lockfile.mjs` | — | Opère sur destination | Inchangé |
| `scripts/sync_common.py` | — | Aucune ref `.opencode/agents` | Reçoit `output_dir` en paramètre de l'appelant |
| `scripts/update-manifest.py` | 251 | `.opencode/agents` (fallback `base_path`) | Fallback destination — reste correct |
| `scripts/quality_scorer.py` | — | Arguments CLI | Pas de chemin hardcodé |
| `tests/test_agents.py` | 6, 464 | `.opencode/agents` | Docstrings décrivant la destination |
| `tests/cli.test.mjs` | 696, 704 | `.opencode/agents` | Tests d'installation (destination) |
| `tests/lock.test.mjs` | 34, 54, 105, 118, 120 | `.opencode/agents` | Tests lock destination-side |
| `tests/tui.test.mjs` | 21 | `.opencode/agents` | Fixture manifest `base_path` |
| `tests/test_update_manifest.py` | 58, 502 | `.opencode/agents` | Fixtures `base_path` |
| `tests/test_enrichment.py` | — | Aucune ref `.opencode/agents` | Arguments CLI, pas de chemin hardcodé |
| `src/tui/renderer.mjs` | — | `.opencode/agents` (affichage) | Texte destination-side dans le TUI |
| `src/tui/state.mjs` | — | `.opencode/agents` (commentaire) | Commentaire destination-side |

### Mise à jour du typedef Manifest et validation

| Fichier | Changement |
|---------|------------|
| `src/registry.mjs` | Ajouter `source_path?: string` au typedef JSDoc `Manifest` (l.34-45) |
| `src/registry.mjs` | Ajouter validation de `source_path` dans `validateManifest()` (mêmes règles que `base_path` : pas de `..`, pas de chemin absolu) — optionnel car le champ est facultatif |

---

## Stratégie de déploiement coordonné

> **Finding critique de la revue v1+v2** : la migration touche 3 canaux de distribution avec des timelines de propagation différentes. La séquence doit être honnête sur la fenêtre de risque.

### Les 3 canaux

1. **GitHub raw URLs** — mises à jour au merge, mais cache CDN Fastly de 5-10 min
2. **npm package** (`opencode-agents`) — mis à jour au `npm publish` (propagation ~5 min)
3. **`install.sh`** — fetché live depuis GitHub raw (cache CDN, donc ~5-10 min après merge)

### Pourquoi "publier la CLI d'abord" ne marche pas

Le `manifest.json` est **bundlé dans le package npm**. Si on publie la CLI avant le merge, le manifest bundlé n'a pas `source_path` — l'expression `source_path || base_path` résout vers `base_path` = `.opencode/agents`. Après le merge, les fichiers sont dans `agents/` → 404 pour tous les utilisateurs, y compris ceux sur la nouvelle CLI.

### Séquence de déploiement correcte

```
Étape 1 : Merger tout d'un coup sur main
          (git mv + manifest avec source_path + code changes + install.sh + CI)
          ⚠️ FENÊTRE DE RISQUE OUVERTE — anciennes CLI → 404
          
Étape 2 : npm publish immédiatement après le merge
          (code avec source_path || base_path + manifest avec source_path)
          
Étape 3 : Attendre propagation npm (~5 min)
          ✅ FENÊTRE FERMÉE pour les utilisateurs npx
          
Étape 4 : Attendre le cache CDN GitHub (~5-10 min)
          ✅ FENÊTRE FERMÉE pour install.sh
          
Étape 5 : Vérification post-déploiement (voir checklist ci-dessous)
```

**Durée de la fenêtre de risque** : ~5-10 minutes entre le merge et la propagation npm. Acceptable en pré-1.0 avec une base d'utilisateurs limitée.

**Note technique** : `source_path || base_path` est une **expression de sélection de valeur** (JS: `manifest.source_path || manifest.base_path`), PAS un retry HTTP avec fallback. Si `source_path` est absent du manifest bundlé, l'expression retourne toujours `base_path`.

### Checklist de vérification post-déploiement (go/no-go)

Exécuter après l'étape 4 (attendre 10 min après le merge) :

| Check | Commande | Résultat attendu | Si échec |
|-------|----------|-------------------|----------|
| GitHub raw URL agents | `curl -sI https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/agents/languages/typescript-pro.md` | HTTP 200 | Attendre 5 min, re-tester. Si toujours KO après 15 min → rollback |
| GitHub raw URL ancienne | `curl -sI https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/.opencode/agents/languages/typescript-pro.md` | HTTP 404 | Attendu — confirme que la migration est effective |
| npx list | `npx opencode-agents list` | 70 agents listés | Vérifier npm propagation, re-tester dans 5 min |
| npx install | `npx opencode-agents install typescript-pro` (dans un dossier temp) | Fichier créé dans `.opencode/agents/` | Investiguer getDownloadUrl, rollback si bloqué |
| install.sh | `curl -sL <url> \| bash` (dans un dossier temp) | Installation réussie | Attendre cache CDN, re-tester dans 10 min |

**Décision rollback** : si la vérification échoue après 30 min → rollback (`git revert` + `npm unpublish`). Au-delà de 30 min, fix forward.

### Pour les utilisateurs avec d'anciennes versions en cache (`npm install -g`)

Ces utilisateurs devront mettre à jour manuellement. Documenter dans les release notes :
> ⚠️ Si vous utilisez une version installée globalement, mettez à jour : `npm update -g opencode-agents`

---

## Phase 0 : Préparation

### Objectif
Préparer la migration sans casser l'existant.

### Tâches

- [ ] P0.1 — Créer la structure de répertoires `agents/` à la racine avec les 10 sous-répertoires (web, languages, ai, data-api, devops, devtools, security, mcp, business, docs)
- [ ] P0.2 — Vérifier que `agents/` n'est pas dans `.gitignore`
- [ ] P0.3 — Prendre un snapshot des tests avant migration : `node --test tests/*.test.mjs` et `python3 tests/run_tests.py` — documenter le nombre de tests passants comme baseline

### Critères de succès
- Structure `agents/` vide créée
- Tous les tests passent avant migration (baseline documentée)

---

## Phase 1 : Migration des fichiers

### Objectif
Déplacer les 70 fichiers agents et les artifacts associés.

### Tâches

- [ ] P1.1 — `git mv .opencode/agents/<category>/<name>.md agents/<category>/<name>.md` pour chaque agent (70 fichiers)
- [ ] P1.2 — Déplacer les 4 agents racine (fullstack-developer, devops-engineer, cloud-architect, episode-orchestrator) vers `agents/`
- [ ] P1.3 — Déplacer `.opencode/agents/manifest.json` (sync tracking) vers `agents/manifest.json`
- [ ] P1.4 — Déplacer `.opencode/agents/.manifest-lock.json` vers `agents/.manifest-lock.json`
- [ ] P1.5 — Mettre à jour `manifest.json` (racine, le registre curé) :
  - Ajouter `"source_path": "agents"`
  - Garder `"base_path": ".opencode/agents"` (destination d'installation)
- [ ] P1.6 — Vérifier que `git status` montre des renames (pas des delete+add)
- [ ] P1.7 — Vérifier que les 70 fichiers + 2 artifacts sont présents dans `agents/`

### Critères de succès
- 70 fichiers `.md` + `manifest.json` (sync) + `.manifest-lock.json` dans `agents/`
- `manifest.json` (racine) a les deux champs `source_path` et `base_path`
- Git détecte les renames
- `.opencode/agents/` ne contient plus de fichiers produit

---

## Phase 2 : Mise à jour du code

### Objectif
Adapter tout le code pour utiliser `source_path` (repo) vs `base_path` (installation utilisateur).

### Tâches

#### 2A — Code source CLI (`src/`)

- [ ] P2.1 — `src/installer.mjs` : modifier `getDownloadUrl()` pour utiliser `manifest.source_path || manifest.base_path` (rétrocompatibilité)
- [ ] P2.2 — Vérifier que `getDestination()` continue d'utiliser `base_path` — aucun changement attendu
- [ ] P2.3 — `src/registry.mjs` : ajouter `source_path?: string` au typedef JSDoc `Manifest` (l.34-45)
- [ ] P2.4 — `src/registry.mjs` : ajouter validation optionnelle de `source_path` dans `validateManifest()` (pas de `..`, pas de chemin absolu, seulement si le champ est présent)

#### 2B — Scripts Python (`scripts/`)

- [ ] P2.5 — `scripts/sync-agents.py` : changer `--output-dir` par défaut de `.opencode/agents` à `agents` (l.1432-1433)
- [ ] P2.6 — `scripts/update-manifest.py` : changer `DEFAULT_SYNC_MANIFEST` de `.opencode/agents/manifest.json` à `agents/manifest.json` (l.132) + commentaires (l.4, 18)
- [ ] P2.7 — `scripts/enrich_agents.py` : changer `AGENTS_DIR` de `.opencode/agents` à `agents`

#### 2C — Tests

- [ ] P2.8 — Ajouter des tests pour le fallback `source_path` dans `getDownloadUrl()` :
  - Manifest avec `source_path` → URL utilise `source_path`
  - Manifest sans `source_path` → URL utilise `base_path` (rétrocompat)
  - Manifest avec `source_path` vide → fallback sur `base_path`
- [ ] P2.9 — Ajouter un test de validation `source_path` dans registry (pas de `..`, pas absolu)
- [ ] P2.10 — Vérifier que tous les tests existants passent sans modification (les 12 refs dans les tests sont côté destination, confirmé par audit)

#### 2D — CI/CD

- [ ] P2.11 — `.github/workflows/ci.yml` : remplacer les références source `.opencode/agents` par `agents` (l.95-96, 184, 198, 213)
- [ ] P2.12 — `.github/workflows/sync-agents.yml` : remplacer les références source `.opencode/agents` par `agents` (l.144, 184, 289, 315, 340 + scripts inline)

#### 2E — Installation alternative

- [ ] P2.13 — `install.sh` : modifier `get_source_dir()` l.308 : `${script_dir}/.opencode/agents` → `${script_dir}/agents`
- [ ] P2.14 — `install.sh` : modifier `install_merge()` l.400 : `${source_dir}/.opencode/agents` → `${source_dir}/agents`

### Critères de succès
- `grep -rn '.opencode/agents' src/ scripts/ .github/ install.sh` ne retourne que des références **destination** (confirmées dans l'inventaire NON impactés)
- Nouveaux tests pour `source_path` ajoutés et passants

---

## Phase 3 : Nettoyage et documentation

### Objectif
Nettoyer l'ancien emplacement et documenter la nouvelle architecture.

### Tâches

- [ ] P3.1 — Supprimer les sous-répertoires vides dans `.opencode/agents/` (web/, languages/, etc.)
- [ ] P3.1b — `.opencode/agents/.sync-cache.json` : fichier gitignored, pas de `git mv` nécessaire. Il sera recréé automatiquement dans `agents/` au prochain `sync-agents.py`. Supprimer l'ancien manuellement si présent.
- [ ] P3.2 — NE PAS supprimer `.opencode/agents/` lui-même — OpenCode peut en avoir besoin pour les agents de dev
- [ ] P3.3 — Ajouter un `agents/README.md` :
  ```
  # Agents produit
  Ce répertoire contient les 70 templates d'agents distribués aux utilisateurs
  via la CLI `opencode-agents`. La destination d'installation chez l'utilisateur
  est `.opencode/agents/`.
  ```
- [ ] P3.4 — Mettre à jour `README.md` principal — section architecture, chemins
- [ ] P3.5 — Mettre à jour `docs/architecture.md` — diagrammes Mermaid
- [ ] P3.6 — Ajouter une note dans `.plan/02-progress-v6.md` documentant la migration

### Critères de succès
- `.opencode/agents/` ne contient aucun agent produit ni artifact de sync
- Documentation à jour avec les nouveaux chemins
- Pas de documentation contradictoire

---

## Phase 4 : Validation

### Objectif
S'assurer que tout fonctionne après la migration.

### Tâches

- [ ] P4.1 — Exécuter la suite de tests JS : `node --test tests/*.test.mjs` — tous les tests doivent passer
- [ ] P4.2 — Exécuter la suite de tests Python : `python3 tests/run_tests.py` — tous les tests doivent passer
- [ ] P4.3 — Vérifier spécifiquement les nouveaux tests `source_path` (P2.8, P2.9)
- [ ] P4.4 — Test end-to-end de la CLI :
  - `npx opencode-agents list` — vérifie que les 70 agents sont listés
  - `npx opencode-agents install <agent>` — vérifie l'installation dans `.opencode/agents/`
  - `npx opencode-agents uninstall <agent>` — vérifie la suppression
- [ ] P4.5 — Test de `install.sh` — vérifie que l'installation alternative fonctionne avec le nouveau chemin source
- [ ] P4.6 — Vérifier que les GitHub Actions CI passent (push sur une branche de test)
- [ ] P4.7 — Vérifier le quality scorer sur le nouveau chemin : `python3 scripts/quality_scorer.py agents/languages/typescript-pro.md`

### Critères de succès
- Tous les tests passants (baseline + nouveaux tests)
- CLI fonctionnelle end-to-end
- CI verte
- Quality scorer opérationnel

---

## Plan de rollback

### Avant merge (Phase 0-4 en cours)

```bash
git checkout main -- .opencode/agents/ manifest.json src/ scripts/ tests/ .github/ install.sh README.md docs/
rm -rf agents/
```
Simple, tout est dans git.

### Après merge sur main

Le rollback `git checkout main` est un no-op si la migration est déjà sur main. Stratégie :

1. `git revert <commit-migration>` — crée un commit inverse
2. Si la CLI a été publiée sur npm : `npm unpublish opencode-agents@<version>` ou publier un patch qui revient à l'ancien comportement
3. Vérifier que les GitHub raw URLs `.opencode/agents/` répondent à nouveau 200

**Critères de déclenchement** : si la checklist de vérification post-déploiement échoue après 30 minutes de tentatives → rollback immédiat. Au-delà de 30 minutes post-merge, fix forward (les caches CDN sont purgés, le rollback causerait une deuxième rupture).

---

## Analyse de risques

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|------------|
| Anciennes CLI → 404 pendant fenêtre de propagation npm | Moyenne | Élevé | Séquence de déploiement (CLI d'abord, migration ensuite) |
| Tests cassés par les changements de chemin | Faible | Moyen | Audit confirmé : 12 refs test sont côté destination, inchangées |
| GitHub raw URL cassée après merge | Faible | Élevé | Tester depuis branche avant merge (P4.6) |
| CI workflows cassés | Moyenne | Moyen | Tester sur branche dédiée (P4.6) |
| Historique git perdu sur les fichiers | Faible | Faible | `git mv` pour préserver les renames |
| `install.sh` cassé pendant race window (curl mid-migration) | Très faible | Moyen | Merger en off-peak, install.sh se met à jour instantanément |
| `.manifest-lock.json` perdu ou mal placé | Faible | Faible | Déplacement explicite en P1.4 |

---

## Priorité et ordre d'exécution

Cette migration est **bloquante** pour le travail S2 (enrichissement des agents). Tant que les agents produit vivent dans `.opencode/agents/`, les sub-agents auront des problèmes d'écriture.

**Ordre recommandé** : S7 → S2 (reprendre l'enrichissement une fois la migration faite)

## Estimation

- Phase 0 : 10 min
- Phase 1 : 20 min (git mv × 70 + artifacts)
- Phase 2 : 90 min (code changes + nouveaux tests + CI updates)
- Phase 3 : 20 min (documentation)
- Phase 4 : 30 min (validation complète)
- **Total estimé : ~3h**

---

## Changelog du plan

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2026-02-20 | Plan initial |
| 2.0 | 2026-02-20 | Intégration findings revue v1 : stratégie de déploiement coordonné, inventaire fichiers corrigé (+sync manifest, +lock file, +lock.mjs confirmé non impacté, +display.mjs confirmé non impacté), rollback post-merge, nouveaux tests source_path, estimation revue à 3h, typedef Manifest mis à jour |
| 2.1 | 2026-02-20 | Intégration findings revue v2 : séquence de déploiement corrigée (merge d'abord, publish ensuite — fenêtre 5-10 min), checklist go/no-go post-déploiement, sync-agents.yml lignes complétées (L147, L158-160, L194, L212, L263), critères de déclenchement rollback, `.sync-cache.json` noté, inventaire non-impactés complété (+test_enrichment.py, +tui/*.mjs), sémantique `source_path \|\| base_path` clarifiée |
