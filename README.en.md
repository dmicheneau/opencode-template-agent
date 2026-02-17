# opencode-agents

> 🇫🇷 [Version française](README.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-56-blue)
![Tests](https://img.shields.io/badge/tests-401%20passing-brightgreen)
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

| Category | Agents | Description |
|----------|--------|-------------|
| 💻 Languages | 10 | TypeScript, Python, Go, Rust, Java, C#, PHP, Kotlin, C++, Rails |
| 🤖 AI | 6 | AI engineering, data science, ML, LLM, prompts, research |
| 🌐 Web | 6 | React, Next.js, fullstack, mobile, UI design, UI analysis |
| 🗄️ Data & API | 5 | API architecture, GraphQL, databases, PostgreSQL, Redis |
| ⚙️ DevOps | 9 | Docker, Kubernetes, Terraform, AWS, CI/CD, Linux, platform |
| 🛠️ DevTools | 6 | Code review, debugging, performance, refactoring, testing, orchestration |
| 🔒 Security | 3 | Security audit, penetration testing, smart contracts |
| 🔌 MCP | 4 | MCP protocol, servers, development, security audit |
| 📊 Business | 4 | Product management, project management, PRD, Scrum |
| 📝 Docs | 3 | Technical documentation, API docs, writing |

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

## 🔄 Automatic Sync

Agents are automatically synced from [aitmpl.com](https://www.aitmpl.com/agents) via a weekly GitHub Actions workflow.

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
gh workflow run "Sync Agents" -f tier=core                     # Actual sync
gh workflow run "Sync Agents" -f tier=all -f force=true        # Full forced sync
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
├── manifest.json            # 56 agents, 10 categories, 9 packs
├── install.sh               # Bash install script
├── .opencode/agents/        # Agent files (.md)
│   ├── *.md                 # 4 primary agents
│   ├── languages/           # 10 agents
│   ├── ai/                  # 6 agents
│   ├── web/                 # 6 agents
│   ├── data-api/            # 5 agents
│   ├── devops/              # 9 agents
│   ├── devtools/            # 6 agents
│   ├── security/            # 3 agents
│   ├── mcp/                 # 4 agents
│   ├── business/            # 4 agents
│   └── docs/                # 3 agents
└── tests/
```

## 🧪 Tests

**401 tests** (241 JS + 160 Python).

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
