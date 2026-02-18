# opencode-agents

> 🇫🇷 [Version française](README.md)

[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
![Agents](https://img.shields.io/badge/agents-70-blue)
![Tests](https://img.shields.io/badge/tests-427%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![npm](https://img.shields.io/npm/v/opencode-agents?label=npm&color=cb3837)

Curated registry of **70 AI agents** for [OpenCode](https://opencode.ai), distributed via a zero-dependency CLI and interactive TUI. Agents are `.md` files containing system prompts that configure specialized AI assistants.

Source: [aitmpl.com](https://www.aitmpl.com/agents) (413+ agents available). The 4 primary agents are custom.

## 🚀 Quickstart

```bash
# Interactive TUI (auto-detects TTY)
npx github:dmicheneau/opencode-template-agent

# Quick CLI — install the backend pack
npx github:dmicheneau/opencode-template-agent install --pack backend
```

## 📦 Installation

### Mode 1 — Interactive TUI (recommended)

```bash
npx github:dmicheneau/opencode-template-agent
```

The CLI auto-detects whether the terminal supports TTY and launches the interactive TUI. You can also explicitly invoke it:

```bash
npx github:dmicheneau/opencode-template-agent tui
```

**What it does:**

- Browse categories with tabs (`← →` / `Tab`)
- Navigate agents with `↑ ↓`
- Select agents with `Space`, install with `Enter`
- Built-in search (`/`), packs, and categories

### Mode 2 — Non-interactive CLI

Agents are downloaded from GitHub and installed into `.opencode/agents/`. Requires Node.js 20+.

**Commands:**

```bash
# Install a specific agent
npx github:dmicheneau/opencode-template-agent install typescript-pro

# Install one or more packs (comma or space separated)
npx github:dmicheneau/opencode-template-agent install --pack backend
npx github:dmicheneau/opencode-template-agent install --pack backend,devops

# Install one or more categories
npx github:dmicheneau/opencode-template-agent install --category languages
npx github:dmicheneau/opencode-template-agent install --category languages,data-api

# Install all agents
npx github:dmicheneau/opencode-template-agent install --all

# List all agents by category
npx github:dmicheneau/opencode-template-agent list

# List available packs
npx github:dmicheneau/opencode-template-agent list --packs

# Search agents
npx github:dmicheneau/opencode-template-agent search docker
npx github:dmicheneau/opencode-template-agent search "machine learning"
```

**Options:**

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing agent files |
| `--dry-run` | Preview what would be installed without writing any files |

> **Note:** `--pack` and `--category` are mutually exclusive.

### Mode 3 — Bash script / Local clone

**Via bash script:**

```bash
curl -fsSL https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/install.sh | bash
```

Options: `--copy`, `--global`, `--dir PATH`, `--force`, `--dry-run`, `--uninstall`.

**From a local clone:**

```bash
git clone https://github.com/dmicheneau/opencode-template-agent.git ~/.opencode-agents
echo 'export OPENCODE_CONFIG_DIR=~/.opencode-agents' >> ~/.zshrc
source ~/.zshrc
```

## 🏗️ Architecture

> Full documentation: [`docs/architecture.md`](docs/architecture.md)

### Global architecture

```mermaid
flowchart TB
    User["User"]

    subgraph CLI["bin/cli.mjs — CLI Entry Point"]
        Parse["Argument parsing<br/>(install, list, search, tui)"]
    end

    subgraph TUI["Interactive TUI"]
        Index["index.mjs<br/>Orchestrator<br/>(lifecycle, main loop,<br/>signals)"]
        Screen["screen.mjs<br/>Terminal I/O<br/>(raw mode, flush,<br/>resize, onInput)"]
        Input["input.mjs<br/>Keystroke parser<br/>(raw bytes → ~20 Actions)"]
        State["state.mjs<br/>State machine<br/>(browse, search, confirm,<br/>installing, pack_detail,<br/>done, quit)"]
        Renderer["renderer.mjs<br/>Frame builder<br/>(state → ANSI string)"]
        Ansi["ansi.mjs<br/>ANSI codes, colors,<br/>box drawing, palettes<br/>(catColor, tabColor)"]
    end

    subgraph Data["Data Layer"]
        Registry["registry.mjs<br/>Manifest loader<br/>(validation, getAgent,<br/>getCategory, searchAgents,<br/>resolvePackAgents)"]
        Manifest["manifest.json<br/>70 agents | 10 categories<br/>15 packs"]
        Installer["installer.mjs<br/>GitHub raw download<br/>→ .opencode/agents/"]
    end

    subgraph Sync["Sync Pipeline"]
        Upstream["davila7/claude-code-templates<br/>(upstream repo)"]
        SyncScript["sync-agents.py<br/>(1200 lines, fetch,<br/>tools→permission conversion,<br/>CURATED + EXTENDED agents)"]
        SyncCommon["sync_common.py<br/>(HTTP, ETag cache,<br/>frontmatter, validation)"]
        UpdateManifest["update-manifest.py<br/>(manifest merge,<br/>NEEDS_REVIEW prefix)"]
        GHA["GitHub Actions<br/>(weekly cron Mon 6AM UTC,<br/>CI: test + lint + validate)"]
    end

    LocalDir[".opencode/agents/<br/>Installed agents"]

    User --> CLI
    Parse -->|"tui"| Index
    Parse -->|"install"| Installer
    Parse -->|"list / search"| Registry

    Index --> Screen
    Screen --> Input
    Input --> State
    State --> Renderer
    Renderer --> Ansi
    Ansi -->|"ANSI frames"| Screen

    Index --> Registry
    Index --> Installer
    Registry --> Manifest
    Installer -->|"downloads"| LocalDir

    Upstream --> SyncScript
    SyncScript --> SyncCommon
    SyncScript --> UpdateManifest
    UpdateManifest --> Manifest
    GHA -->|"orchestrates"| SyncScript
    GHA -->|"orchestrates"| UpdateManifest

    classDef entrypoint fill:#4a90d9,stroke:#2c5f8a,color:#fff
    classDef tui fill:#6ab04c,stroke:#3d7a28,color:#fff
    classDef data fill:#f0932b,stroke:#c0741e,color:#fff
    classDef sync fill:#9b59b6,stroke:#6c3483,color:#fff
    classDef storage fill:#e74c3c,stroke:#a93226,color:#fff
    classDef user fill:#34495e,stroke:#1c2833,color:#fff

    class User user
    class Parse entrypoint
    class Index,Screen,Input,State,Renderer,Ansi tui
    class Registry,Manifest,Installer data
    class Upstream,SyncScript,SyncCommon,UpdateManifest,GHA sync
    class LocalDir storage
```

Two additional diagrams are available in [`docs/architecture.md`](docs/architecture.md):

- **TUI user flow** — state machine and transitions (browse → search → confirm → installing → done)
- **Agent update pipeline** — detailed 10-step GitHub Actions sync pipeline with security checks

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

## 🔄 Automatic sync

Agents are automatically synced from [aitmpl.com](https://www.aitmpl.com/agents) via a weekly GitHub Actions workflow.

### How it works

1. **Weekly cron** — every Monday at 06:00 UTC, the `sync-agents.yml` workflow checks for updates
2. **Change detection** — new, modified, or deleted agents are identified
3. **Manifest update** — `scripts/update-manifest.py` merges synced agents with the main manifest while preserving curated metadata (tags, descriptions, packs)
4. **Validation** — automated tests, frontmatter verification, and manifest consistency checks
5. **Pull Request** — a PR is automatically created with a detailed report for human review

New agents are marked `[NEEDS_REVIEW]` in the manifest and require manual review before merging.

### Manual trigger

```bash
# Via GitHub CLI
gh workflow run "Sync Agents" -f tier=core -f dry_run=true    # Dry-run (no commit)
gh workflow run "Sync Agents" -f tier=core                     # Actual sync (core only)
gh workflow run "Sync Agents" -f tier=extended                  # Extended sync
gh workflow run "Sync Agents" -f tier=all -f force=true        # Full forced sync
```

### Sync scripts

| Script | Description |
|--------|-------------|
| `scripts/sync-agents.py` | Downloads agents from the upstream repo |
| `scripts/update-manifest.py` | Merges sync manifest with the main manifest |
| `scripts/sync_common.py` | Shared HTTP utilities and helpers |

## 🧪 Tests

**427 tests** (250 JS + 177 Python).

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
