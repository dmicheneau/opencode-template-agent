# Plan V4 — Pipeline de synchronisation continue + Expansion catalogue

> Version : 4.0 | Date : 2026-02-17 | **Statut : EN COURS**
> Consolide trois axes : stabilisation CI, pipeline d'alimentation continue, expansion du catalogue
> Plan v3 archivable dans `.plan/archive/v3/` une fois v4 lancé

## Contexte actuel (post-v3)

- **56 agents, 10 catégories, 9 packs** — TUI complet avec raw-mode, tabs, recherche, multi-select
- CLI non-interactif préservé (non-breaking)
- **358 tests** (241 JS + 117 Python), tous passent localement
- CI : 4 jobs GitHub Actions (test, test-cli, lint, validate-agents)
- Sync script : Python stdlib, supporte `--incremental` (ETag), `--tier core|extended|all`
- **~90 agents étendus** définis dans `EXTENDED_AGENTS` mais non intégrés au projet
- Source : `davila7/claude-code-templates` (~133+ agents, site SPA aitmpl.com)

---

## 1. Objectifs v4

| # | Objectif | Mesure de succès |
|---|----------|-----------------|
| **O1** | Stabiliser et valider la v3 en CI distant | CI GitHub Actions passe (4 jobs verts), TUI 10 tabs vérifié |
| **O2** | Automatiser la détection et l'intégration des nouveaux agents du repo source | Workflow `sync.yml` opérationnel, PRs automatiques créées |
| **O3** | Étendre le catalogue de 56 → 70+ agents avec critères de qualité | ≥14 agents extended intégrés, tous avec permissions vérifiées |
| **O4** | Maintenir la vélocité de développement via des manifestes synchronisés | `manifest.json` (projet) et `.opencode/agents/manifest.json` (sync) cohérents en permanence |

---

## 2. Axe 1 — Stabilisation & CI (priorité haute)

### 2.1 Vérification visuelle du TUI

Le TUI a été réorganisé de 12 → 10 tabs (D15). Les 10 catégories actuelles :

| Tab | Catégorie | Agents | Icône |
|-----|-----------|--------|-------|
| 1 | Languages | 10 | 💻 |
| 2 | AI & Machine Learning | 6 | 🤖 |
| 3 | Web & Mobile | 5 | 🌐 |
| 4 | Data & API | 5 | 🗄️ |
| 5 | DevOps & Infrastructure | 9 | ⚙️ |
| 6 | DevTools | 6 | 🛠️ |
| 7 | Security | 3 | 🔒 |
| 8 | MCP | 4 | 🔌 |
| 9 | Business & Management | 4 | 📊 |
| 10 | Documentation | 3 | 📝 |
| — | **Total** | **55 subagents + 1 primary (episode-orchestrator)** | — |

> Note : `fullstack-developer`, `cloud-architect`, `devops-engineer` sont en mode primary (racine), affichés dans leurs catégories respectives.

**Vérifications à effectuer** :
- [ ] Navigation par tab (flèches gauche/droite) — 10 tabs circulaires
- [ ] Compteurs d'agents corrects par catégorie
- [ ] Recherche filtre sur les 56 agents
- [ ] Installation depuis le TUI (flux E2E)
- [ ] Force reinstall via le TUI
- [ ] Affichage packs — 9 packs listés correctement
- [ ] Resize terminal — pas de corruption visuelle
- [ ] Ctrl-Z / fg — restauration propre (SIGTSTP/SIGCONT)

### 2.2 Push et validation CI

**Prérequis** : tous les tests passent localement (358/358).

| Étape | Action | Critère |
|-------|--------|---------|
| P1 | Push branche `main` sur GitHub | Pas de secrets dans le code, `.gitignore` correct |
| P2 | Vérifier les 4 jobs CI | `test` (Python 3.10/3.12/3.13), `test-cli` (Node 20/22/23), `lint`, `validate-agents` |
| P3 | Corriger les échecs éventuels | Différences env local/CI (ex: paths, Node.js version, Python modules) |
| P4 | Badge CI dans le README | Indicateur visuel de stabilité |

### 2.3 Corrections identifiées

| Fix | Description | Priorité |
|-----|-------------|----------|
| F1 | Valider que `node --check src/tui/*.mjs` passe dans le job `lint` | Haute |
| F2 | Vérifier que `manifest.json` a 56 agents et 10 catégories en CI | Haute |
| F3 | S'assurer que les tests Python fonctionnent sans `GITHUB_TOKEN` en CI | Moyenne |

---

## 3. Axe 2 — Pipeline d'alimentation continue (priorité haute)

### 3.1 Architecture du workflow

```
┌─────────────────────────────────────────────────────┐
│  GitHub Actions — sync.yml (cron hebdomadaire)      │
│                                                     │
│  1. Checkout repo                                   │
│  2. Détection changements source (tree SHA)         │
│  3. sync-agents.py --incremental --tier=extended    │
│  4. Diff detection (git diff)                       │
│  5. Mise à jour manifest.json projet si nécessaire  │
│  6. Créer PR si changements détectés                │
│  7. Labelliser la PR (new-agents / updated-agents)  │
└─────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
    PR: "sync/upstream-auto"     Label: needs-curation
    (branche fixe)               (si nouveaux agents)
```

### 3.2 Fichier `.github/workflows/sync.yml`

**Déclencheurs** :
- `schedule: cron: '0 4 * * 0'` — Dimanche 04:00 UTC (hebdomadaire)
- `workflow_dispatch` — déclenchement manuel avec inputs optionnels

**Inputs workflow_dispatch** :
- `tier` : `core` | `extended` | `all` (défaut: `extended`)
- `force` : `true` | `false` (défaut: `false`)
- `dry-run` : `true` | `false` (défaut: `false`)

**Étapes détaillées** :

```yaml
# Pseudo-structure du workflow
jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write      # Pour créer des commits
      pull-requests: write  # Pour créer des PRs
    steps:
      - checkout (with: fetch-depth: 0)
      - setup-python 3.12
      - setup-node 22

      # Étape 1: Détection rapide de changements (1 appel API)
      - name: Check source repo tree SHA
        id: detect
        run: |
          python3 -c "
          import json, urllib.request, os
          token = os.environ.get('GITHUB_TOKEN', '')
          headers = {'Authorization': f'token {token}'} if token else {}
          req = urllib.request.Request(
              'https://api.github.com/repos/davila7/claude-code-templates/git/trees/main?recursive=1',
              headers=headers
          )
          resp = urllib.request.urlopen(req)
          data = json.loads(resp.read())
          sha = data['sha']
          # Comparer avec le SHA stocké
          state_file = '.sync-state.json'
          if os.path.exists(state_file):
              with open(state_file) as f:
                  state = json.load(f)
              if state.get('source_tree_sha') == sha:
                  print('::set-output name=changed::false')
              else:
                  print('::set-output name=changed::true')
          else:
              print('::set-output name=changed::true')
          print(f'::set-output name=sha::{sha}')
          "

      # Étape 2: Sync conditionnel
      - name: Run sync
        if: steps.detect.outputs.changed == 'true' || inputs.force == 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python3 scripts/sync-agents.py \
            --incremental \
            --tier=${{ inputs.tier || 'extended' }} \
            --force=${{ inputs.force || 'false' }} \
            --verbose

      # Étape 3: Mise à jour du manifest projet
      - name: Update project manifest
        if: steps.detect.outputs.changed == 'true'
        run: python3 scripts/update-manifest.py

      # Étape 4: Mise à jour de .sync-state.json
      - name: Update sync state
        run: |
          python3 -c "
          import json
          from datetime import datetime, timezone
          state = {
              'last_sync': datetime.now(timezone.utc).isoformat(),
              'source_tree_sha': '${{ steps.detect.outputs.sha }}',
          }
          with open('.sync-state.json', 'w') as f:
              json.dump(state, f, indent=2)
          "

      # Étape 5: Créer la PR
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v7
        with:
          branch: sync/upstream-auto
          title: "chore(sync): update agents from upstream"
          body: |
            ## Sync automatique des agents

            Changements détectés dans `davila7/claude-code-templates`.

            ### Checklist de revue
            - [ ] Nouveaux agents : permissions vérifiées (pas de UNKNOWN_PERMISSIONS en prod)
            - [ ] Catégories correctes pour les nouveaux agents
            - [ ] Tests passent
            - [ ] manifest.json cohérent avec les fichiers .md
          labels: |
            sync
            automated
          delete-branch: true
```

### 3.3 Détection de changements : deux niveaux

| Niveau | Méthode | Coût API | Granularité |
|--------|---------|----------|-------------|
| **Rapide** | Comparaison `tree SHA` du repo source vs `.sync-state.json` | 1 requête | Binaire (changé/non) |
| **Précis** | `sync-agents.py --incremental` avec ETag par agent | N requêtes (avec 304) | Par agent |

Le workflow utilise le niveau rapide d'abord (court-circuit si rien n'a changé), puis le niveau précis pour le sync effectif.

### 3.4 Gestion des nouveaux agents non curés

Quand un nouvel agent est détecté dans le repo source mais n'existe ni dans `CURATED_AGENTS` ni dans `EXTENDED_AGENTS` :

1. **Sync avec `UNKNOWN_PERMISSIONS`** (read-only, deny write/edit/bash/mcp/task)
2. **Label `needs-curation`** ajouté à la PR
3. **Section "Nouveaux agents à curéer"** dans le body de la PR avec :
   - Nom de l'agent
   - Catégorie source
   - Catégorie OpenCode suggérée (via `CATEGORY_MAPPING`)
   - Permissions actuelles (UNKNOWN → à réviser)
4. **Action requise** : Un maintainer doit :
   - Vérifier le contenu de l'agent (prompt system)
   - Assigner la bonne catégorie
   - Définir les permissions appropriées
   - Ajouter l'agent à `CURATED_AGENTS` ou `EXTENDED_AGENTS` dans `sync-agents.py`
   - Mettre à jour `manifest.json` (projet)

### 3.5 Gestion des mises à jour d'agents existants

Quand un agent déjà intégré est modifié dans le repo source :

1. Le mode `--incremental` détecte le changement via ETag (HTTP 200 vs 304)
2. Le fichier `.md` est re-généré avec les nouvelles données
3. Les permissions existantes sont préservées (elles viennent de `build_permissions()` qui relit le frontmatter source)
4. `git diff` dans le workflow montre les changements exacts
5. La PR est créée avec le label `updated-agents`

### 3.6 Script `update-manifest.py` (nouveau)

Script pont entre le manifest sync (`.opencode/agents/manifest.json`) et le manifest projet (`manifest.json`). Responsabilités :

- Lire les agents depuis `.opencode/agents/` (fichiers `.md` réels)
- Comparer avec le `manifest.json` existant
- Ajouter les nouveaux agents avec des valeurs par défaut
- Mettre à jour les descriptions des agents modifiés
- Conserver les champs manuels (`tags`, `packs`) intacts
- Signaler les agents dans le manifest mais absents du filesystem

**Contraintes** : Python stdlib only, idempotent, sans effet de bord en `--dry-run`.

### 3.7 Rate limiting et authentification

| Contexte | Limite | Token |
|----------|--------|-------|
| CI (GitHub Actions) | 5 000 req/hr | `${{ secrets.GITHUB_TOKEN }}` (automatique) |
| Local dev | 60 req/hr (sans token) | `GITHUB_TOKEN` env var optionnel |
| Sync ~90 agents (extended) | ~95 requêtes + headers | ~2 min avec 0.3s delay |
| Sync ~133 agents (all) | ~140 requêtes + headers | ~3 min avec 0.3s delay |

Le budget API est largement suffisant. Les 304 Not Modified ne comptent pas vers la limite.

### 3.8 Sécurité du workflow

| Mesure | Détail |
|--------|--------|
| Permissions scopées | `contents: write` + `pull-requests: write` uniquement sur le job `sync` |
| Pas de push direct sur `main` | Toujours via PR pour review humaine |
| Token automatique | `${{ secrets.GITHUB_TOKEN }}` — pas de PAT custom nécessaire |
| Branche fixe | `sync/upstream-auto` — une seule PR active à la fois |
| UNKNOWN_PERMISSIONS | Les agents non curés ne reçoivent jamais write/edit/bash |
| Validation CI sur la PR | Les 4 jobs CI s'exécutent sur la PR avant merge |
| SafeRedirectHandler | Bloque les redirections cross-origin (token leak prevention) |

---

## 4. Axe 3 — Expansion du catalogue (priorité moyenne)

### 4.1 Stratégie d'expansion

L'objectif n'est pas d'intégrer les ~90 agents d'un coup mais de les ajouter par vagues contrôlées, avec un processus de curation.

**Vagues planifiées** :

| Vague | Cible | Agents candidats | Critère |
|-------|-------|-----------------|---------|
| V1 (v4) | +14 agents → 70 total | Voir §4.2 | Haute valeur, permissions simples |
| V2 (v5) | +15 agents → 85 total | Business, docs, web avancés | Diversification catégories |
| V3 (v6) | +15 agents → 100 total | Specialist, niche | Couverture complète |

### 4.2 Candidats Vague 1 (v4)

Sélectionnés sur la base de : complémentarité avec le catalogue existant, absence de redondance, permissions claires.

| Agent | Catégorie source | Catégorie OC | Justification |
|-------|-----------------|--------------|---------------|
| `javascript-pro` | programming-languages | languages | Complément essentiel à typescript-pro |
| `react-specialist` | programming-languages | languages | Complémentaire avec expert-react |
| `swift-expert` | programming-languages | languages | Couverture iOS native |
| `django-developer` | programming-languages | languages | Complément Python web |
| `data-engineer` | data-ai | ai | Rôle distinct de data-scientist |
| `data-analyst` | data-ai | ai | Rôle orienté analyse vs modélisation |
| `sre-engineer` | devops-infrastructure | devops | Complément devops-engineer |
| `monitoring-specialist` | devops-infrastructure | devops | Observabilité |
| `database-optimizer` | database | data-api | Complément postgres-pro et database-architect |
| `nosql-specialist` | database | data-api | MongoDB, DynamoDB, etc. |
| `accessibility` | web-tools | web | Accessibilité web |
| `changelog-generator` | documentation | docs | Automatisation docs |
| `business-analyst` | business-marketing | business | Complément product-manager |
| `ux-researcher` | business-marketing | business | Recherche utilisateur |

### 4.3 Critères de curation

Un agent est intégré au catalogue s'il satisfait **au moins 4 des 6 critères** :

| # | Critère | Poids | Description |
|---|---------|-------|-------------|
| C1 | **Non-redondant** | Obligatoire | Ne duplique pas un agent existant |
| C2 | **Permissions claires** | Obligatoire | Les outils source se mappent proprement aux permissions OpenCode |
| C3 | **Prompt substantiel** | Recommandé | ≥50 lignes de contenu utile (hors boilerplate) |
| C4 | **Catégorie existante** | Recommandé | S'intègre dans une des 10 catégories (pas de nouvelle catégorie requise) |
| C5 | **Valeur utilisateur** | Recommandé | Répond à un besoin réel de développeur (pas hyper-niche) |
| C6 | **Source stable** | Recommandé | L'agent source n'est pas marqué WIP/experimental |

**Critères d'exclusion** (véto) :
- Agent qui nécessite des outils non disponibles dans OpenCode
- Agent spécifique à un service propriétaire non mainstream (ex: railway, sentry)
- Agent dont le contenu est principalement des exemples Claude Code non transposables

### 4.4 Processus d'intégration d'un nouvel agent

```
1. Identifier le candidat (EXTENDED_AGENTS ou découvert)
    │
2. Vérifier les 6 critères de curation (C1-C6)
    │
3. Déterminer la catégorie OpenCode (CATEGORY_MAPPING)
    │
4. Convertir via sync-agents.py --filter <category> --tier=extended
    │
5. Réviser les permissions générées (build_permissions)
    │
6. Si permissions OK → ajouter à CURATED_AGENTS dans sync-agents.py
   Si permissions KO → ajuster manuellement
    │
7. Mettre à jour manifest.json (projet)
   - Ajouter l'entrée agent
   - Ajouter aux packs pertinents
   - Mettre à jour agent_count
    │
8. Ajouter les tests
   - test_agents.py : vérifier la présence du fichier
   - cli.test.mjs : vérifier dans les résultats de search/list
    │
9. Commit + PR
```

### 4.5 Agents à NE PAS intégrer

Analyse des agents `EXTENDED_AGENTS` qui sont redondants ou hors scope :

| Agent | Raison d'exclusion |
|-------|-------------------|
| `rust-engineer` | Redondant avec `rust-pro` |
| `devops-expert` | Redondant avec `devops-engineer` |
| `terraform-engineer` | Redondant avec `terraform-specialist` |
| `nextjs-developer` | Redondant avec `expert-nextjs-developer` |
| `react-performance-optimizer` | Trop niche — couvert par `expert-react-frontend-engineer` |
| `graphql-performance-optimizer` | Trop niche — couvert par `graphql-architect` |
| `mcp-server-architect` (ext) | Déjà intégré dans CURATED via la catégorie mcp |
| `mcp-developer` (ext) | Déjà intégré dans CURATED via la catégorie mcp |
| `mcp-protocol-specialist` (ext) | Déjà intégré dans CURATED via la catégorie mcp |
| `platform-engineer` (ext) | Déjà intégré dans CURATED via devops |
| `general-purpose` | Trop générique, pas de valeur ajoutée |

---

## 5. Tâches détaillées

### S1.x — Stabilisation & CI

- [ ] **S1.1** — Vérification visuelle TUI : parcourir les 10 tabs, vérifier compteurs, tester recherche et installation
- [ ] **S1.2** — Push sur GitHub : vérifier `.gitignore`, pas de secrets, commit propre
- [ ] **S1.3** — Corriger les échecs CI éventuels (différences local/CI)
- [ ] **S1.4** — Ajouter badge CI au README.md
- [ ] **S1.5** — Vérifier que `node --check src/tui/*.mjs` passe dans le job lint
- [ ] **S1.6** — Documenter la v3 dans CHANGELOG.md (si non existant, le créer)

### S2.x — Pipeline de synchronisation continue

- [ ] **S2.1** — Créer `.sync-state.json` initial avec le tree SHA actuel du repo source
- [ ] **S2.2** — Créer `.github/workflows/sync.yml` avec :
  - Cron hebdomadaire (dimanche 04:00 UTC)
  - Trigger `workflow_dispatch` avec inputs (tier, force, dry-run)
  - Détection rapide via tree SHA
  - Sync conditionnel avec `sync-agents.py --incremental`
  - Création PR via `peter-evans/create-pull-request`
- [ ] **S2.3** — Créer `scripts/update-manifest.py` pour synchroniser le manifest projet avec les fichiers `.md` réels
  - Lire tous les `.md` dans `.opencode/agents/`
  - Comparer avec `manifest.json`
  - Ajouter/mettre à jour les entrées
  - Préserver les champs manuels (tags, packs)
  - Mode `--dry-run`
- [ ] **S2.4** — Écrire les tests pour `update-manifest.py` dans `tests/test_update_manifest.py`
- [ ] **S2.5** — Tester le workflow `sync.yml` en mode `workflow_dispatch` + `dry-run`
- [ ] **S2.6** — Tester le workflow en conditions réelles (laisser tourner 1 semaine)
- [ ] **S2.7** — Ajouter un label automatique `needs-curation` quand des agents avec UNKNOWN_PERMISSIONS sont détectés
- [ ] **S2.8** — Documenter le processus de sync dans un `docs/SYNC.md` ou section README

### S3.x — Expansion du catalogue

- [ ] **S3.1** — Intégrer la vague 1 : 14 agents (voir §4.2)
  - [ ] S3.1.1 — `javascript-pro` (languages)
  - [ ] S3.1.2 — `react-specialist` (languages)
  - [ ] S3.1.3 — `swift-expert` (languages)
  - [ ] S3.1.4 — `django-developer` (languages)
  - [ ] S3.1.5 — `data-engineer` (ai)
  - [ ] S3.1.6 — `data-analyst` (ai)
  - [ ] S3.1.7 — `sre-engineer` (devops)
  - [ ] S3.1.8 — `monitoring-specialist` (devops)
  - [ ] S3.1.9 — `database-optimizer` (data-api)
  - [ ] S3.1.10 — `nosql-specialist` (data-api)
  - [ ] S3.1.11 — `accessibility` (web)
  - [ ] S3.1.12 — `changelog-generator` (docs)
  - [ ] S3.1.13 — `business-analyst` (business)
  - [ ] S3.1.14 — `ux-researcher` (business)
- [ ] **S3.2** — Mettre à jour `manifest.json` : 56 → 70 agents
  - [ ] S3.2.1 — Ajouter les 14 entrées agents avec descriptions, tags, catégories
  - [ ] S3.2.2 — Mettre à jour `agent_count` : 70
  - [ ] S3.2.3 — Créer/mettre à jour les packs pertinents
- [ ] **S3.3** — Mettre à jour les tests pour refléter 70 agents
  - [ ] S3.3.1 — Mettre à jour les constantes de comptage dans `test_agents.py`
  - [ ] S3.3.2 — Mettre à jour les constantes de comptage dans `cli.test.mjs`
  - [ ] S3.3.3 — Vérifier le TUI avec 70 agents (scroll, performance)
- [ ] **S3.4** — Vérifier les permissions de chaque nouvel agent (pas de UNKNOWN_PERMISSIONS résiduel)
- [ ] **S3.5** — Mettre à jour le TUI : vérifier l'équilibre des compteurs par tab

---

## 6. Critères de succès

### Obligatoires (v4 ne peut être considéré terminé sans)

| # | Critère | Mesure |
|---|---------|--------|
| CS1 | CI passe sur GitHub | 4 jobs verts sur `main` |
| CS2 | Workflow `sync.yml` fonctionnel | ≥1 exécution réussie (manuelle ou cron) |
| CS3 | PR automatique créée lors de changements upstream | PR visible sur GitHub avec les bons labels |
| CS4 | ≥70 agents dans le catalogue | `manifest.json` → `agent_count ≥ 70` |
| CS5 | Tous les tests passent | ≥370 tests (241+ JS, 117+ Python, + nouveaux) |
| CS6 | Aucun agent avec UNKNOWN_PERMISSIONS dans le catalogue intégré | Tous les agents dans `manifest.json` ont des permissions explicites |

### Recommandés (bonus v4)

| # | Critère | Mesure |
|---|---------|--------|
| CS7 | Script `update-manifest.py` opérationnel | Peut être exécuté en CLI avec `--dry-run` |
| CS8 | Documentation du processus de sync | `docs/SYNC.md` ou section README |
| CS9 | CHANGELOG.md créé et à jour | Historique v1-v4 documenté |
| CS10 | `.sync-state.json` maintenu automatiquement | Mis à jour par le workflow `sync.yml` |

---

## 7. Décisions à prendre

### D16 — Fréquence du cron de sync

**Contexte** : Le workflow `sync.yml` tourne sur un cron. Quelle fréquence ?

| Option | Fréquence | Budget API/mois | Avantage | Inconvénient |
|--------|-----------|-----------------|----------|--------------|
| **A** | Quotidien (04:00 UTC) | ~120 req × 30 = 3 600 | Détection rapide | Bruit si peu de changements |
| **B** | Hebdomadaire (dim 04:00) | ~120 req × 4 = 480 | Équilibre détection/bruit | Max 7 jours de délai |
| **C** | Bihebdomadaire | ~120 req × 2 = 240 | Minimal | Délai trop long |

**Recommandation** : **Option B** (hebdomadaire). Le repo source (`davila7/claude-code-templates`) n'a pas un rythme de mise à jour quotidien. Un sync hebdomadaire est suffisant. Le workflow_dispatch permet de déclencher manuellement en cas de besoin urgent.

**Statut** : ⬜ À trancher

---

### D17 — Scope du tier pour le sync automatique

**Contexte** : Le cron doit-il syncer uniquement les `CURATED_AGENTS`, les `EXTENDED_AGENTS` aussi, ou tout ?

| Option | Tier | Agents | Risque |
|--------|------|--------|--------|
| **A** | `core` (curated only) | 56 (actuels) | Aucun nouveau agent détecté automatiquement |
| **B** | `extended` (core + extended) | ~130 | Nouveaux agents avec UNKNOWN_PERMISSIONS dans la PR |
| **C** | `all` (discover) | 133+ | Agents inconnus avec permissions restrictives |

**Recommandation** : **Option B** (`extended`). Les agents `EXTENDED_AGENTS` ont déjà un mapping de catégorie défini. Les agents hors de cette liste nécessitent un travail de curation trop important pour être automatisé. Le `--tier=all` reste disponible en `workflow_dispatch` pour une exploration ponctuelle.

**Statut** : ⬜ À trancher

---

### D18 — Auto-merge des PRs de sync sans nouveaux agents

**Contexte** : Quand le sync détecte uniquement des mises à jour de contenu (pas de nouveaux agents), la PR peut-elle être auto-mergée ?

| Option | Comportement | Risque |
|--------|-------------|--------|
| **A** | Toujours review manuelle | Sûr mais friction |
| **B** | Auto-merge si : (1) pas de nouveaux agents, (2) CI passe, (3) diff < 500 lignes | Rapide pour les mises à jour mineures |
| **C** | Auto-merge si uniquement des changements de contenu (pas de frontmatter modifié) | Plus restrictif, plus sûr |

**Recommandation** : **Option A** pour les premières semaines (période de rodage), puis évaluer **Option C** après 4-6 semaines de fonctionnement sans incident.

**Statut** : ⬜ À trancher

---

### D19 — Nouvelles catégories pour les agents extended

**Contexte** : Certains agents `EXTENDED_AGENTS` ont un mapping vers des catégories inexistantes (`specialist`, `media`). Faut-il créer de nouvelles catégories ?

| Option | Catégories | Impact TUI |
|--------|-----------|------------|
| **A** | Garder 10 catégories — mapper `specialist` → `devtools`, `media` → `docs` | 0 impact |
| **B** | Ajouter `specialist` (11 catégories) | 1 tab de plus |
| **C** | Ajouter `specialist` + `media` (12 catégories) | Retour à 12 tabs (annule D15) |

**Recommandation** : **Option A**. La réorganisation D15 (12 → 10 catégories) était un gain UX validé. Ne pas revenir en arrière. Les agents `specialist` et `media` sont peu nombreux et peuvent être absorbés par les catégories existantes. Réévaluer si le catalogue dépasse 100 agents.

**Statut** : ⬜ À trancher

---

### D20 — Script `update-manifest.py` vs extension de `sync-agents.py`

**Contexte** : Faut-il un script séparé pour synchroniser `manifest.json` (projet) ou étendre `sync-agents.py` ?

| Option | Approche | Avantage | Inconvénient |
|--------|----------|----------|--------------|
| **A** | Nouveau script `update-manifest.py` | Séparation des responsabilités claire | Un script de plus à maintenir |
| **B** | Flag `--update-project-manifest` dans `sync-agents.py` | Un seul script | Mélange sync upstream + gestion projet |

**Recommandation** : **Option A**. Le sync script fait déjà 1 180 lignes. Le manifest projet a une structure différente (tags, packs, descriptions manuelles) du manifest sync. Les responsabilités sont distinctes.

**Statut** : ⬜ À trancher

---

## 8. Séquencement

Les trois axes ont des dépendances légères :

```
Axe 1 (Stabilisation)     Axe 2 (Pipeline)         Axe 3 (Expansion)
━━━━━━━━━━━━━━━━━━━       ━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━
S1.1 TUI visual check     │                         │
S1.2 Push GitHub ──────── S2.1 .sync-state.json     │
S1.3 Fix CI errors  │     S2.2 sync.yml             │
S1.4 Badge CI       │     S2.3 update-manifest.py   │
S1.5 Lint check     │     S2.4 Tests                │
S1.6 CHANGELOG      │     S2.5 Test workflow_dispatch│
                    │     S2.6 Rodage 1 semaine      │
                    │     S2.7 Labels auto           │
                    │     S2.8 Documentation         S3.1 Intégrer 14 agents
                    │                                S3.2 Manifest → 70
                    │                                S3.3 Tests → 370+
                    │                                S3.4 Permissions check
                    └── dépendance : CI doit         S3.5 TUI vérification
                        passer avant de créer
                        le workflow sync
```

**Ordre recommandé** :
1. **S1.1-S1.3** — Stabilisation critique (1 session)
2. **S2.1-S2.4** — Pipeline sync + script update-manifest (1-2 sessions)
3. **S3.1-S3.5** — Expansion catalogue (1-2 sessions)
4. **S1.4-S1.6, S2.5-S2.8** — Polish & documentation (1 session)

**Total estimé : 4-6 sessions**

---

## 9. Risques

| # | Risque | Sévérité | Mitigation |
|---|--------|----------|------------|
| R1 | Échecs CI inattendus (diff local/CI) | 🟡 Moyen | S1.3 — corriger itérativement |
| R2 | Rate limit GitHub API pendant le sync cron | 🟢 Bas | Token automatique en CI = 5 000 req/hr. Budget ~120 req/semaine |
| R3 | `peter-evans/create-pull-request` breaking change | 🟢 Bas | Pinning de version avec SHA |
| R4 | Conflit de merge sur `sync/upstream-auto` si PR non mergée | 🟡 Moyen | `delete-branch: true` + force-push sur la branche sync |
| R5 | Agents source avec contenu vide ou cassé | 🟢 Bas | `sync-agents.py` skip déjà les agents avec body vide |
| R6 | Scope creep — tenter d'intégrer trop d'agents en v4 | 🟡 Moyen | Limiter à 14 agents (vague 1). Les autres en v5 |
| R7 | `update-manifest.py` écrase des champs manuels (tags, packs) | 🟠 Haut | Tests exhaustifs + mode `--dry-run` + diff visible dans la PR |
| R8 | TUI ne gère pas bien 70+ agents (scroll, performance) | 🟢 Bas | Trivial pour 70 items. Aucune virtualisation nécessaire |

---

## 10. Contraintes

- Zero npm deps — **obligatoire**
- Python stdlib only pour les scripts — **obligatoire**
- Node.js 20+ ESM only — **obligatoire**
- Agents permission-based (jamais `tools:` deprecated) — **obligatoire**
- Documentation plan en français — **obligatoire**
- Code et UI en anglais — **obligatoire**
- Pas de push direct sur `main` pour le sync — PR obligatoire — **obligatoire**
