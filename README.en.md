# opencode-agents

> 🇫🇷 [Version française](README.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-56-blue)
![Tests](https://img.shields.io/badge/tests-176%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![npm](https://img.shields.io/npm/v/opencode-agents?label=npm&color=cb3837)

Curated registry of **56 AI agents** for [OpenCode](https://opencode.ai), distributed via a zero-dependency CLI and interactive TUI. Agents are `.md` files containing system prompts that configure AI assistants for specific roles.

Source: [aitmpl.com](https://www.aitmpl.com/agents) (413+ agents available) + 8 custom agents.

## 🚀 Quickstart

```bash
npx github:dmicheneau/opencode-template-agent                            # Interactive TUI (auto-detects TTY)
npx github:dmicheneau/opencode-template-agent list                       # Browse the catalog
npx github:dmicheneau/opencode-template-agent install --pack backend     # Install a pack
npx github:dmicheneau/opencode-template-agent install typescript-pro     # Install an agent
```

## 📦 Installation

### Via npx (recommended)

```bash
npx github:dmicheneau/opencode-template-agent install --pack backend
```

Agents are downloaded from GitHub and installed into `.opencode/agents/`. Requires Node.js 18+.

### Via bash script

```bash
curl -fsSL https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/install.sh | bash
```

Options: `--copy`, `--global`, `--dir PATH`, `--force`, `--dry-run`, `--uninstall`.

### From the local repo

```bash
git clone https://github.com/dmicheneau/opencode-template-agent.git ~/.opencode-agents
echo 'export OPENCODE_CONFIG_DIR=~/.opencode-agents' >> ~/.zshrc
source ~/.zshrc
```

## 💡 Commands

### tui (interactive mode)

```bash
npx github:dmicheneau/opencode-template-agent                # Auto-detects TTY and launches TUI
npx github:dmicheneau/opencode-template-agent tui             # Explicitly launch the TUI
```

Browse categories, search agents, and install directly from the interactive interface.

### install

```bash
# Single agent
npx github:dmicheneau/opencode-template-agent install typescript-pro

# One or more packs (comma or space separated)
npx github:dmicheneau/opencode-template-agent install --pack backend
npx github:dmicheneau/opencode-template-agent install --pack backend,devops

# One or more categories
npx github:dmicheneau/opencode-template-agent install --category languages
npx github:dmicheneau/opencode-template-agent install --category languages,database

# All agents
npx github:dmicheneau/opencode-template-agent install --all
```

Options: `--force` (overwrite existing files), `--dry-run` (preview without writing).

> `--pack` and `--category` are mutually exclusive.

### list

```bash
npx github:dmicheneau/opencode-template-agent list            # All agents by category
npx github:dmicheneau/opencode-template-agent list --packs    # Available packs
```

### search

```bash
npx github:dmicheneau/opencode-template-agent search docker
npx github:dmicheneau/opencode-template-agent search "machine learning"
```

## 📋 Available agents

56 agents — 4 primary (`Tab` in OpenCode) + 52 subagents (`@category/name`).

| Category | # | Agents |
|----------|---|--------|
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

⭐ = primary agent

## 🎒 Packs

9 predefined packs for installing coherent groups of agents.

| Pack | Agents | Description |
|------|--------|-------------|
| `backend` | postgres-pro, redis-specialist, database-architect, api-architect, python-pro, typescript-pro, debugger, test-automator | Backend stack |
| `frontend` | expert-react-frontend-engineer, expert-nextjs-developer, typescript-pro, ui-designer, performance-engineer, test-automator | Frontend stack |
| `devops` | devops-engineer, cloud-architect, docker-specialist, kubernetes-specialist, terraform-specialist, aws-specialist, ci-cd-engineer, linux-admin, platform-engineer | Infrastructure |
| `fullstack` | fullstack-developer, typescript-pro, expert-react-frontend-engineer, expert-nextjs-developer, postgres-pro, api-architect, debugger, test-automator, code-reviewer | Full stack |
| `ai` | ai-engineer, data-scientist, ml-engineer, llm-architect, prompt-engineer, search-specialist | AI & ML |
| `security` | security-auditor, penetration-tester, smart-contract-auditor | Security |
| `mcp` | mcp-protocol-specialist, mcp-server-architect, mcp-developer, mcp-security-auditor | MCP servers |
| `quality` | code-reviewer, test-automator, debugger, performance-engineer, refactoring-specialist | Code quality |
| `startup` | fullstack-developer, typescript-pro, expert-nextjs-developer, postgres-pro, docker-specialist, product-manager, ui-designer, test-automator | Startup kit |

## 🏗️ Project architecture

```
opencode-template-agent/
├── bin/cli.mjs              # CLI entry point
├── src/
│   ├── registry.mjs         # Manifest, search, filtering
│   ├── installer.mjs        # Download + install
│   ├── display.mjs          # ANSI output
│   └── tui/                 # Interactive TUI (6 modules)
│       ├── index.mjs        # Entry point + TTY detection
│       ├── state.mjs        # State machine
│       ├── screen.mjs       # Screen rendering
│       ├── renderer.mjs     # Layout + formatting
│       ├── input.mjs        # User input handling
│       └── ansi.mjs         # ANSI escape sequences
├── manifest.json            # 56 agents, 12 categories, 9 packs
├── install.sh               # Bash install script
├── .opencode/agents/        # Agent files (.md)
│   ├── *.md                 # 4 primary agents
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
# CLI tests (Node.js)
node --test tests/cli.test.mjs

# Python tests
python3 tests/run_tests.py

# Specific tests
python3 -m pytest tests/test_agents.py -v
python3 -m pytest tests/test_sync_script.py -v
```

## 🤝 Contributing

Contributions are welcome! See the open [issues](https://github.com/dmicheneau/opencode-template-agent/issues).

Agents sourced from [aitmpl.com](https://www.aitmpl.com/agents) ([claude-code-templates](https://github.com/davila7/claude-code-templates)).

## 📄 License

MIT
