# opencode-agents

> 🇬🇧 [English version](README.en.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-70-blue)
![Tests](https://img.shields.io/badge/tests-427%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![npm](https://img.shields.io/npm/v/opencode-agents?label=npm&color=cb3837)

Registre curé de **70 agents IA** pour [OpenCode](https://opencode.ai), distribué via un CLI zero-dependency et un TUI interactif. Les agents sont des fichiers `.md` contenant des system prompts pour configurer des assistants IA spécialisés.

Source : [aitmpl.com](https://www.aitmpl.com/agents) (413+ agents disponibles). Les 4 agents primary sont custom.

## 🚀 Quickstart

```bash
npx github:dmicheneau/opencode-template-agent                            # TUI interactif (auto-détecte TTY)
npx github:dmicheneau/opencode-template-agent list                       # Parcourir le catalogue
npx github:dmicheneau/opencode-template-agent install --pack backend     # Installer un pack
npx github:dmicheneau/opencode-template-agent install typescript-pro     # Installer un agent
```

## 📦 Installation

### Via npx (recommandé)

```bash
npx github:dmicheneau/opencode-template-agent install --pack backend
```

Les agents sont téléchargés depuis GitHub et installés dans `.opencode/agents/`. Node.js 20+ requis.

### Via script bash

```bash
curl -fsSL https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/install.sh | bash
```

Options : `--copy`, `--global`, `--dir PATH`, `--force`, `--dry-run`, `--uninstall`.

### Depuis le repo local

```bash
git clone https://github.com/dmicheneau/opencode-template-agent.git ~/.opencode-agents
echo 'export OPENCODE_CONFIG_DIR=~/.opencode-agents' >> ~/.zshrc
source ~/.zshrc
```

## 💡 Commandes

### tui (mode interactif)

```bash
npx github:dmicheneau/opencode-template-agent                # Auto-détecte TTY et lance le TUI
npx github:dmicheneau/opencode-template-agent tui             # Lancer explicitement le TUI
```

Parcourir les catégories, rechercher des agents et installer directement depuis l'interface interactive.

### install

```bash
# Un agent
npx github:dmicheneau/opencode-template-agent install typescript-pro

# Un ou plusieurs packs (virgule ou espace)
npx github:dmicheneau/opencode-template-agent install --pack backend
npx github:dmicheneau/opencode-template-agent install --pack backend,devops

# Une ou plusieurs catégories
npx github:dmicheneau/opencode-template-agent install --category languages
npx github:dmicheneau/opencode-template-agent install --category languages,data-api

# Tous les agents
npx github:dmicheneau/opencode-template-agent install --all
```

Options : `--force` (écraser les fichiers existants), `--dry-run` (aperçu sans écriture).

> `--pack` et `--category` sont mutuellement exclusifs.

### list

```bash
npx github:dmicheneau/opencode-template-agent list            # Tous les agents par catégorie
npx github:dmicheneau/opencode-template-agent list --packs    # Packs disponibles
```

### search

```bash
npx github:dmicheneau/opencode-template-agent search docker
npx github:dmicheneau/opencode-template-agent search "machine learning"
```

## 📋 Agents disponibles

70 agents — 4 primary (`Tab` dans OpenCode) + 66 subagents (`@catégorie/nom`).

| Catégorie | Agents | Description |
|-----------|--------|-------------|
| 💻 Languages | 11 | TypeScript, Python, Go, Rust, Java, C#, PHP, Kotlin, C++, Rails, Swift |
| 🤖 AI | 9 | AI engineering, data science, ML, MLOps, LLM, prompts, recherche, data engineering, data analysis |
| 🌐 Web | 9 | React, Next.js, Vue, Angular, fullstack, mobile, UI design, analyse UI, accessibilité |
| 🗄️ Data & API | 5 | Architecture API, GraphQL, bases de données, PostgreSQL, Redis |
| ⚙️ DevOps | 10 | Docker, Kubernetes, Terraform, AWS, CI/CD, Linux, plateforme, SRE |
| 🛠️ DevTools | 8 | Code review, debugging, performance, refactoring, tests, orchestration, microservices, QA |
| 🔒 Security | 4 | Audit sécurité, tests de pénétration, smart contracts, security engineering |
| 🔌 MCP | 4 | Protocole MCP, serveurs, développement, audit sécurité |
| 📊 Business | 6 | Product management, project management, PRD, Scrum, UX research, business analysis |
| 📝 Docs | 4 | Documentation technique, API, rédaction, diagrammes |

⭐ 4 agents primary (`Tab` dans OpenCode) : cloud-architect, devops-engineer, fullstack-developer, episode-orchestrator

## 🎒 Packs

15 packs prédéfinis pour installer des groupes d'agents cohérents.

| Pack | Agents | Description |
|------|--------|-------------|
| `backend` | postgres-pro, redis-specialist, database-architect, api-architect, python-pro, typescript-pro, debugger, test-automator | Stack backend |
| `frontend` | expert-react-frontend-engineer, expert-nextjs-developer, typescript-pro, ui-designer, performance-engineer, test-automator | Stack frontend |
| `devops` | devops-engineer, cloud-architect, docker-specialist, kubernetes-specialist, terraform-specialist, aws-specialist, ci-cd-engineer, linux-admin, platform-engineer | Infrastructure |
| `fullstack` | fullstack-developer, typescript-pro, expert-react-frontend-engineer, expert-nextjs-developer, postgres-pro, api-architect, debugger, test-automator, code-reviewer | Full stack |
| `ai` | ai-engineer, data-scientist, ml-engineer, llm-architect, prompt-engineer, search-specialist | IA & ML |
| `security` | security-auditor, penetration-tester, smart-contract-auditor | Sécurité |
| `mcp` | mcp-protocol-specialist, mcp-server-architect, mcp-developer, mcp-security-auditor | MCP servers |
| `quality` | code-reviewer, test-automator, debugger, performance-engineer, refactoring-specialist | Qualité code |
| `startup` | fullstack-developer, typescript-pro, expert-nextjs-developer, postgres-pro, docker-specialist, product-manager, ui-designer, test-automator | Kit startup |
| `data-stack` | data-engineer, data-analyst, data-scientist, database-architect, postgres-pro | Stack données |
| `ml-to-production` | data-scientist, ml-engineer, mlops-engineer, llm-architect, docker-specialist, kubernetes-specialist | ML en production |
| `frontend-complete` | expert-react-frontend-engineer, expert-nextjs-developer, vue-expert, angular-architect, accessibility, ui-designer | Frontend complet |
| `ship-it-safely` | ci-cd-engineer, docker-specialist, kubernetes-specialist, sre-engineer, security-engineer, qa-expert | Déploiement sûr |
| `product-discovery` | product-manager, ux-researcher, business-analyst, prd, ui-designer | Découverte produit |
| `architecture-docs` | microservices-architect, api-architect, database-architect, diagram-architect, documentation-engineer | Architecture & docs |

## 🔄 Synchronisation automatique

Les agents sont synchronisés automatiquement depuis [aitmpl.com](https://www.aitmpl.com/agents) via un workflow GitHub Actions hebdomadaire.

### Fonctionnement

1. **Cron hebdomadaire** — chaque lundi à 06:00 UTC, le workflow `sync-agents.yml` vérifie les mises à jour
2. **Détection des changements** — les agents nouveaux, modifiés ou supprimés sont identifiés
3. **Mise à jour du manifest** — `scripts/update-manifest.py` fusionne les agents synchronisés avec le manifest principal en préservant les métadonnées curées (tags, descriptions, packs)
4. **Validation** — tests automatiques, vérification du frontmatter et de la cohérence du manifest
5. **Pull Request** — une PR est créée automatiquement avec un rapport détaillé pour revue humaine

### Lancement manuel

```bash
# Via GitHub CLI
gh workflow run "Sync Agents" -f tier=core -f dry_run=true    # Dry-run (pas de commit)
gh workflow run "Sync Agents" -f tier=core                     # Sync réelle (core uniquement)
gh workflow run "Sync Agents" -f tier=extended                  # Sync étendue
gh workflow run "Sync Agents" -f tier=all -f force=true        # Sync complète forcée
```

Les nouveaux agents sont marqués `[NEEDS_REVIEW]` dans le manifest et nécessitent une revue manuelle avant merge.

### Scripts de sync

| Script | Description |
|--------|-------------|
| `scripts/sync-agents.py` | Télécharge les agents depuis le repo upstream |
| `scripts/update-manifest.py` | Fusionne le manifest sync avec le manifest principal |
| `scripts/sync_common.py` | Utilitaires HTTP et helpers partagés |

## 🏗️ Architecture du projet

```
opencode-template-agent/
├── bin/cli.mjs              # CLI entry point
├── src/
│   ├── meta.mjs             # Version, user agent
│   ├── registry.mjs         # Manifest, search, filtering
│   ├── installer.mjs        # Download + install
│   ├── display.mjs          # ANSI output
│   └── tui/                 # TUI interactif (6 modules)
│       ├── index.mjs        # Entry point + TTY detection
│       ├── state.mjs        # State machine
│       ├── screen.mjs       # Screen rendering
│       ├── renderer.mjs     # Layout + formatting
│       ├── input.mjs        # User input handling
│       └── ansi.mjs         # ANSI escape sequences
├── scripts/
│   ├── sync-agents.py       # Pipeline de sync upstream
│   ├── update-manifest.py   # Fusion manifest sync → manifest principal
│   └── sync_common.py       # Utilitaires HTTP partagés
├── manifest.json            # 70 agents, 10 catégories, 15 packs
├── install.sh               # Script d'installation bash
├── .opencode/agents/        # Fichiers agents (.md)
│   ├── *.md                 # 4 agents primary
│   ├── languages/           # 11 agents
│   ├── ai/                  # 9 agents
│   ├── web/                 # 9 agents
│   ├── data-api/            # 5 agents
│   ├── devops/              # 10 agents
│   ├── devtools/            # 8 agents
│   ├── security/            # 4 agents
│   ├── mcp/                 # 4 agents
│   ├── business/            # 6 agents
│   └── docs/                # 4 agents
└── tests/
```

## 🧪 Tests

**427 tests** (250 JS + 177 Python).

```bash
# Tous les tests JS (CLI + TUI)
node --test tests/cli.test.mjs tests/tui.test.mjs

# Tous les tests Python
python3 tests/run_tests.py

# Tests spécifiques
python3 -m pytest tests/test_agents.py -v
python3 -m pytest tests/test_sync_script.py -v
python3 -m pytest tests/test_update_manifest.py -v
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir les [issues](https://github.com/dmicheneau/opencode-template-agent/issues) ouvertes.

Agents sourcés depuis [aitmpl.com](https://www.aitmpl.com/agents) ([claude-code-templates](https://github.com/davila7/claude-code-templates)).

## 📄 Licence

MIT
