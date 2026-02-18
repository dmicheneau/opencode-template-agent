# opencode-agents

> 🇫🇷 [Version française](README.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-70-blue)
![Tests](https://img.shields.io/badge/tests-418%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![npm](https://img.shields.io/npm/v/opencode-agents?label=npm&color=cb3837)

Curated registry of **70 AI agents** for [OpenCode](https://opencode.ai), distributed via a zero-dependency CLI and interactive TUI. Agents are `.md` files containing system prompts that configure AI assistants for specific roles.

Source: [aitmpl.com](https://www.aitmpl.com/agents) (413+ agents available). The 4 primary agents are custom.

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

Agents are downloaded from GitHub and installed into `.opencode/agents/`. Requires Node.js 20+.

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
npx github:dmicheneau/opencode-template-agent install --category languages,data-api

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

70 agents — 4 primary (`Tab` in OpenCode) + 66 subagents (`@category/name`).

| Category | Agents | Description |
|----------|--------|-------------|
| 💻 Languages | 11 | TypeScript, Python, Go, Rust, Java, C#, PHP, Kotlin, C++, Rails, Swift |
| 🤖 AI | 9 | AI engineering, data science, ML, MLOps, LLM, prompts, research, data engineering, data analysis |
| 🌐 Web | 9 | React, Next.js, Vue, Angular, fullstack, mobile, UI design, UI analysis, accessibility |
| 🗄️ Data & API | 5 | API architecture, GraphQL, databases, PostgreSQL, Redis |
| ⚙️ DevOps | 10 | Docker, Kubernetes, Terraform, AWS, CI/CD, Linux, platform, SRE |
| 🛠️ DevTools | 8 | Code review, debugging, performance, refactoring, testing, orchestration, microservices, QA |
| 🔒 Security | 4 | Security audit, penetration testing, smart contracts, security engineering |
| 🔌 MCP | 4 | MCP protocol, servers, development, security audit |
| 📊 Business | 6 | Product management, project management, PRD, Scrum, UX research, business analysis |
| 📝 Docs | 4 | Technical documentation, API docs, writing, diagrams |

⭐ 4 primary agents (`Tab` in OpenCode): cloud-architect, devops-engineer, fullstack-developer, episode-orchestrator

## 🎒 Packs

15 predefined packs for installing coherent groups of agents.

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
| `data-stack` | data-engineer, data-analyst, data-scientist, database-architect, postgres-pro | Data stack |
| `ml-to-production` | data-scientist, ml-engineer, mlops-engineer, llm-architect, docker-specialist, kubernetes-specialist | ML to production |
| `frontend-complete` | expert-react-frontend-engineer, expert-nextjs-developer, vue-expert, angular-architect, accessibility, ui-designer | Complete frontend |
| `ship-it-safely` | ci-cd-engineer, docker-specialist, kubernetes-specialist, sre-engineer, security-engineer, qa-expert | Safe deployment |
| `product-discovery` | product-manager, ux-researcher, business-analyst, prd, ui-designer | Product discovery |
| `architecture-docs` | microservices-architect, api-architect, database-architect, diagram-architect, documentation-engineer | Architecture & docs |

## 🔄 Automatic Sync

Agents are synced from [aitmpl.com](https://www.aitmpl.com/agents) via a weekly GitHub Actions workflow.

### How it works

1. **Weekly cron** — every Monday at 06:00 UTC, the `sync-agents.yml` workflow checks for updates
2. **Change detection** — new, modified, or deleted agents are identified
3. **Manifest update** — `scripts/update-manifest.py` merges synced agents with the main manifest while preserving curated metadata (tags, descriptions, packs)
4. **Validation** — automated tests, frontmatter verification, and manifest consistency checks
5. **Pull Request** — a PR is automatically created with a detailed report for human review

### Manual trigger

```bash
# Via GitHub CLI
gh workflow run "Sync Agents" -f tier=core -f dry_run=true    # Dry-run (no commit)
gh workflow run "Sync Agents" -f tier=core                     # Actual sync (core agents only)
gh workflow run "Sync Agents" -f tier=extended                  # Extended tier sync
gh workflow run "Sync Agents" -f tier=all -f force=true        # Full forced sync (all tiers)
```

New agents are marked `[NEEDS_REVIEW]` in the manifest and require manual review before merging.

### Sync scripts

| Script | Description |
|--------|-------------|
| `scripts/sync-agents.py` | Downloads agents from the upstream repo |
| `scripts/update-manifest.py` | Merges sync manifest with the main manifest |
| `scripts/sync_common.py` | Shared HTTP utilities and helpers |

## 🏗️ Project architecture

```
opencode-template-agent/
├── bin/cli.mjs              # CLI entry point
├── src/
│   ├── meta.mjs             # Version, user agent
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
├── scripts/
│   ├── sync-agents.py       # Upstream sync pipeline
│   ├── update-manifest.py   # Sync manifest → main manifest merge
│   └── sync_common.py       # Shared HTTP utilities
├── manifest.json            # 70 agents, 10 categories, 15 packs
├── install.sh               # Bash install script
├── .opencode/agents/        # Agent files (.md)
│   ├── *.md                 # 4 primary agents
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

**418 tests** (241 JS + 177 Python).

```bash
# All JS tests (CLI + TUI)
node --test tests/cli.test.mjs tests/tui.test.mjs

# All Python tests
python3 tests/run_tests.py

# Specific tests
python3 -m pytest tests/test_agents.py -v
python3 -m pytest tests/test_sync_script.py -v
python3 -m pytest tests/test_update_manifest.py -v
```

## 🤝 Contributing

Contributions are welcome! See the open [issues](https://github.com/dmicheneau/opencode-template-agent/issues).

Agents sourced from [aitmpl.com](https://www.aitmpl.com/agents) ([claude-code-templates](https://github.com/davila7/claude-code-templates)).

## 📄 License

MIT
