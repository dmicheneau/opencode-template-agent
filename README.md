# opencode-agents

> 🇬🇧 [English version](README.en.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-56-blue)
![Tests](https://img.shields.io/badge/tests-176%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![npm](https://img.shields.io/npm/v/opencode-agents?label=npm&color=cb3837)

Registre curé de **56 agents IA** pour [OpenCode](https://opencode.ai), distribué via un CLI zero-dependency et un TUI interactif. Les agents sont des fichiers `.md` contenant des system prompts pour configurer des assistants IA spécialisés.

Source : [aitmpl.com](https://www.aitmpl.com/agents) (413+ agents disponibles) + 8 agents custom.

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

Les agents sont téléchargés depuis GitHub et installés dans `.opencode/agents/`. Node.js 18+ requis.

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
npx github:dmicheneau/opencode-template-agent install --category languages,database

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

56 agents — 4 primary (`Tab` dans OpenCode) + 52 subagents (`@catégorie/nom`).

| Catégorie | # | Agents |
|-----------|---|--------|
| 💻 `languages` | 10 | typescript-pro, python-pro, golang-pro, rust-pro, java-architect, cpp-pro, php-pro, kotlin-specialist, csharp-developer, rails-expert |
| ⚙️ `devops` | 9 | cloud-architect ⭐, devops-engineer ⭐, docker-specialist, kubernetes-specialist, terraform-specialist, aws-specialist, linux-admin, ci-cd-engineer, platform-engineer |
| 🤖 `ai` | 6 | ai-engineer, data-scientist, ml-engineer, llm-architect, prompt-engineer, search-specialist |
| 🛠️ `devtools` | 5 | code-reviewer, debugger, performance-engineer, refactoring-specialist, test-automator |
| 👥 `team` | 5 | episode-orchestrator ⭐, fullstack-developer ⭐, mobile-developer, ui-designer, screenshot-ui-analyzer |
| 🔌 `mcp` | 4 | mcp-protocol-specialist, mcp-server-architect, mcp-developer, mcp-security-auditor |
| 📊 `business` | 4 | product-manager, project-manager, scrum-master, prd |
| 🗄️ `database` | 3 | database-architect, postgres-pro, redis-specialist |
| 📝 `docs` | 3 | api-documenter, documentation-engineer, technical-writer |
| 🔒 `security` | 3 | penetration-tester, security-auditor, smart-contract-auditor |
| 🔌 `api` | 2 | api-architect, graphql-architect |
| 🌐 `web` | 2 | expert-nextjs-developer, expert-react-frontend-engineer |

⭐ = agent primary

## 🎒 Packs

9 packs prédéfinis pour installer des groupes d'agents cohérents.

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

## 🏗️ Architecture du projet

```
opencode-template-agent/
├── bin/cli.mjs              # CLI entry point
├── src/
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
├── manifest.json            # 56 agents, 12 catégories, 9 packs
├── install.sh               # Script d'installation bash
├── .opencode/agents/        # Fichiers agents (.md)
│   ├── *.md                 # 4 agents primary
│   ├── languages/           # 10 agents
│   ├── devops/              # 7 subagents
│   ├── ai/                  # 6 agents
│   ├── devtools/            # 5 agents
│   ├── team/                # 3 subagents
│   ├── mcp/                 # 4 agents
│   ├── business/            # 4 agents
│   ├── database/            # 3 agents
│   ├── docs/                # 3 agents
│   ├── security/            # 3 agents
│   ├── api/                 # 2 agents
│   └── web/                 # 2 agents
└── tests/
```

## 🧪 Tests

**176 tests** (59 CLI + 117 Python).

```bash
# Tests CLI (Node.js)
node --test tests/cli.test.mjs

# Tests Python
python3 tests/run_tests.py

# Tests spécifiques
python3 -m pytest tests/test_agents.py -v
python3 -m pytest tests/test_sync_script.py -v
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir les [issues](https://github.com/dmicheneau/opencode-template-agent/issues) ouvertes.

Agents sourcés depuis [aitmpl.com](https://www.aitmpl.com/agents) ([claude-code-templates](https://github.com/davila7/claude-code-templates)).

## 📄 Licence

MIT
