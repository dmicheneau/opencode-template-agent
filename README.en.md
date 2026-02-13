# 🤖 OpenCode Agent Template

> 🇫🇷 **Version française** : [README.md](README.md)

![Agents](https://img.shields.io/badge/agents-134-blue)
![Primary](https://img.shields.io/badge/primary-4-green)
![Subagents](https://img.shields.io/badge/subagents-130-orange)
![OpenCode](https://img.shields.io/badge/OpenCode-compatible-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Synced from](https://img.shields.io/badge/synced%20from-aitmpl.com-purple)
[![CI](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dmicheneau/opencode-template-agent/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-117%20passing-brightgreen)](tests/)

> A curated collection of **134 AI agents** (133 synced from [aitmpl.com](https://www.aitmpl.com/agents) — 43 core + 90 extended — + 1 custom) for [OpenCode](https://opencode.ai), converted and adapted from the source registry (399+ agents available).

## 📑 Table of Contents

- [What is this?](#what-is-this-)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Available Agents](#available-agents)
- [Architecture](#architecture)
- [Tests](#-tests)
- [Permission System](#permission-system)
- [Synchronization](#synchronization)
- [Customization](#customization)
- [Troubleshooting](#-troubleshooting)
- [Sources & References](#sources--references)
- [License](#license)

## 🎯 What is this?

This repository is an **agent registry** for OpenCode. It provides:

- **4 primary agents** — switchable with `Tab`
- **130 subagents** — invocable via `@category/name` or the `Task` tool
- **Category-based organization** using OpenCode's [nested agents](https://deepwiki.com/anomalyco/opencode/3.3-agent-system)
- **Modern `permission:` format** (not the deprecated `tools:` field)
- **Sync script** to fetch agents from a remote URL (GitHub)

### Sources

Agents are sourced from the [claude-code-templates](https://github.com/davila7/claude-code-templates) project (20k+ ⭐) and **automatically converted** from Claude Code format to OpenCode format by the `sync-agents.py` script.

## 🚀 Quick Start

### Method 1: Clone + `OPENCODE_CONFIG_DIR` (recommended)

```bash
# Clone the agent registry
git clone https://github.com/dmicheneau/opencode-template-agent.git ~/.opencode-agents

# Add to your shell profile (.bashrc / .zshrc)
echo 'export OPENCODE_CONFIG_DIR=~/.opencode-agents' >> ~/.zshrc
source ~/.zshrc

# OpenCode automatically loads the agents on startup
opencode
```

### Method 2: Copy into your project

```bash
# Copy agents into your existing project
cp -r ~/.opencode-agents/.opencode/agents/* .opencode/agents/
```

### Method 3: Global symlink

```bash
# Symlink to the global OpenCode config
ln -s ~/.opencode-agents/.opencode/agents ~/.config/opencode/agents
```

### Method 4: One-liner in your shell profile

```bash
# Auto-download on terminal launch
export OPENCODE_CONFIG_DIR=$(git clone --depth 1 -q https://github.com/dmicheneau/opencode-template-agent.git /tmp/oc-agents 2>/dev/null || true; echo /tmp/oc-agents)
```

## 💡 Usage

### Primary Agents

Switch between primary agents using **`Tab`** in OpenCode:

| Agent | Description |
|-------|-------------|
| `episode-orchestrator` | Workflow orchestrator for episodic pipelines |
| `fullstack-developer` | General-purpose full-stack developer |
| `devops-engineer` | DevOps and infrastructure engineer |
| `cloud-architect` | Cloud and distributed systems architect |

### Subagents

Invoke subagents with **`@category/name`**:

```
@languages/typescript-pro    → TypeScript expert
@devtools/code-reviewer      → Code review
@ai/ai-engineer              → AI engineer
@security/security-auditor   → Security audit
@database/postgres-pro       → PostgreSQL expert
@docs/technical-writer       → Technical writer
```

Or via the **Task tool** from a primary agent:

```
Task(subagent_type="languages/typescript-pro", prompt="Refactor this module...")
Task(subagent_type="devtools/code-reviewer", prompt="Review this PR...")
```

## 📋 Available Agents

### 🖥️ Programming Languages — `@languages/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| TypeScript Pro | `@languages/typescript-pro` | Advanced TypeScript, strict mode, type-level programming |
| Python Pro | `@languages/python-pro` | Python 3.11+, async, type-safe, FastAPI/Django |
| Golang Pro | `@languages/golang-pro` | Idiomatic Go, concurrency, microservices |
| Rust Pro | `@languages/rust-pro` | Rust, ownership, lifetimes, async/await |
| Java Architect | `@languages/java-architect` | Enterprise Java, Spring Boot, microservices |
| C++ Pro | `@languages/cpp-pro` | C++20/23, templates, zero-overhead abstractions |
| PHP Pro | `@languages/php-pro` | PHP 8.3+, Laravel/Symfony, strict typing |
| Kotlin Specialist | `@languages/kotlin-specialist` | Kotlin, coroutines, multiplatform |
| C# Developer | `@languages/csharp-developer` | ASP.NET Core, modern C#, Entity Framework |
| Rails Expert | `@languages/rails-expert` | Ruby on Rails, Hotwire, Rails conventions |

### 🛠️ Developer Tools — `@devtools/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Code Reviewer | `@devtools/code-reviewer` | Code review, quality, security |
| Test Automator | `@devtools/test-automator` | Test frameworks, CI/CD testing |
| Refactoring Specialist | `@devtools/refactoring-specialist` | Refactoring, clean code, patterns |
| Debugger | `@devtools/debugger` | Bug diagnosis, stack trace analysis |
| Performance Engineer | `@devtools/performance-engineer` | Performance optimization, profiling |

### 🤖 AI & Data — `@ai/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| AI Engineer | `@ai/ai-engineer` | End-to-end AI systems, MLOps |
| Prompt Engineer | `@ai/prompt-engineer` | Prompt design and optimization |
| Data Scientist | `@ai/data-scientist` | Data analysis, ML, statistics |
| ML Engineer | `@ai/ml-engineer` | ML pipelines, serving, optimization |
| LLM Architect | `@ai/llm-architect` | LLM architecture, RAG, fine-tuning |
| Search Specialist | `@ai/search-specialist` | Advanced web search, multi-source synthesis |

### ☁️ DevOps & Infrastructure — `@devops/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Kubernetes Specialist | `@devops/kubernetes-specialist` | K8s, deployment, troubleshooting |
| Terraform Specialist | `@devops/terraform-specialist` | IaC, Terraform modules, state management |

### 🔒 Security — `@security/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Security Auditor | `@security/security-auditor` | Security audits, compliance (SOC2, ISO27001) |
| Penetration Tester | `@security/penetration-tester` | Penetration testing, vulnerability exploitation |
| Smart Contract Auditor | `@security/smart-contract-auditor` | Smart contract audits, blockchain security |

### 🗄️ Databases — `@database/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Database Architect | `@database/database-architect` | Data modeling, scalability, technology selection |
| PostgreSQL Pro | `@database/postgres-pro` | PostgreSQL optimization, replication, tuning |

### 🌐 Web & Frontend — `@web/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Next.js Developer | `@web/expert-nextjs-developer` | Next.js 16, App Router, Server Components |
| React Engineer | `@web/expert-react-frontend-engineer` | React 19, hooks, TypeScript, performance |

### 🔌 API & GraphQL — `@api/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| API Architect | `@api/api-architect` | REST API design, patterns, mentoring |
| GraphQL Architect | `@api/graphql-architect` | GraphQL schemas, federation, performance |

### 📝 Documentation — `@docs/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Documentation Engineer | `@docs/documentation-engineer` | Documentation systems, information architecture |
| API Documenter | `@docs/api-documenter` | API documentation, OpenAPI, interactive portals |
| Technical Writer | `@docs/technical-writer` | Technical writing, guides, tutorials |

### 💼 Business — `@business/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Product Manager | `@business/product-manager` | Product strategy, roadmap, prioritization |
| Project Manager | `@business/project-manager` | Project management, risk, planning |
| Scrum Master | `@business/scrum-master` | Agile, sprints, retrospectives |

### 🏗️ Team — `@team/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| UI Designer | `@team/ui-designer` | UI/UX design, design systems, accessibility |
| Mobile Developer | `@team/mobile-developer` | React Native, Flutter, cross-platform |

## 🏗️ Architecture

```
opencode-template-agent/
├── .opencode/
│   ├── opencode.json                        # OpenCode configuration
│   ├── agents/
│   │   ├── episode-orchestrator.md          # ⭐ Primary — orchestrator
│   │   ├── fullstack-developer.md           # ⭐ Primary — full-stack
│   │   ├── devops-engineer.md               # ⭐ Primary — DevOps
│   │   ├── cloud-architect.md               # ⭐ Primary — Cloud
│   │   ├── ai/                              # 🤖 6 AI subagents
│   │   ├── api/                             # 🔌 2 API subagents
│   │   ├── business/                        # 💼 3 Business subagents
│   │   ├── database/                        # 🗄️ 2 Database subagents
│   │   ├── devops/                          # ☁️ 2 DevOps subagents
│   │   ├── devtools/                        # 🛠️ 5 DevTools subagents
│   │   ├── docs/                            # 📝 3 Docs subagents
│   │   ├── languages/                       # 🖥️ 10 Language subagents
│   │   ├── mcp/                              # 🔧 MCP subagents
│   │   ├── security/                        # 🔒 3 Security subagents
│   │   ├── specialist/                      # 🎯 Specialist subagents
│   │   ├── team/                            # 🏗️ 2 Team subagents
│   │   ├── web/                             # 🌐 2 Web subagents
│   │   └── manifest.json                    # Sync metadata
│   ├── skills/
│   │   ├── brainstormai/
│   │   ├── browser-mcp/
│   │   ├── memory/
│   │   └── sequential-thinking/
│   └── package.json
├── scripts/
│   └── sync-agents.py                       # Sync script
└── README.md
```

## 🧪 Tests

The project includes a suite of **117 tests** covering:

- **Agent validation**: frontmatter format, permissions, categories (20 tests)
- **Sync script**: GitHub API, transformation, cache, permissions (97 tests)

```bash
# Run all tests
python3 tests/run_tests.py

# Specific tests
python3 -m pytest tests/test_agents.py -v
python3 -m pytest tests/test_sync_script.py -v
```

## 🔐 Permission System

Agents use OpenCode's modern **`permission:`** format (the `tools:` field is deprecated).

### YAML Frontmatter Format

```yaml
---
description: "Agent description"
mode: subagent
permission:
  write: allow          # allow | ask | deny
  edit: ask             # always ask for safety
  bash:
    "*": ask            # ask by default
    "git status": allow # pre-approved git commands
    "git diff*": allow
    "git log*": allow
  task:
    "*": allow          # can invoke other subagents
---
```

### Permission Profiles

| Profile | write | edit | bash | Other | Example |
|---------|-------|------|------|-------|---------|
| **full-access** | `allow` | `ask` | `{*: ask, git: allow}` | `task: {*: allow}` | `typescript-pro`, `python-pro` |
| **read-only** | `deny` | `deny` | `deny` | `task: {*: allow}` | `security-auditor` |
| **analysis** | `deny` | `deny` | `{git: allow, *: ask}` | `task: {*: allow}` | `penetration-tester` |
| **content** | `allow` | `ask` | `deny` | `webfetch: allow`, `task: {*: allow}` | `product-manager`, `technical-writer` |
| **primary** | `allow` | `ask` | `{git: allow, *: ask}` | `task: {*: allow}` | `fullstack-developer`, `cloud-architect` |

### Permission Merge Order

```
Global Config → Agent Config → Session Override → Runtime Flag
```

## 🔄 Synchronization

The `sync-agents.py` script fetches agents from GitHub and converts them to the OpenCode format.

> **Prerequisites**: Python 3.8+ (stdlib only, no external dependencies).

### Commands

```bash
# List available agents (shows [core] and [ext] tags)
python3 scripts/sync-agents.py --list

# Sync all 133 curated agents (43 core + 90 extended)
python3 scripts/sync-agents.py --force

# Sync only the 43 core agents
python3 scripts/sync-agents.py --tier core --force

# Sync only the 90 extended agents
python3 scripts/sync-agents.py --tier extended --force

# Clean and re-sync
python3 scripts/sync-agents.py --clean --force

# Sync ALL 399+ agents
python3 scripts/sync-agents.py --all --force

# Filter by category
python3 scripts/sync-agents.py --filter security

# Preview without writing
python3 scripts/sync-agents.py --dry-run

# Verbose mode
python3 scripts/sync-agents.py --verbose --force
```

### GitHub Authentication

```bash
# Without token: 60 requests/hour (enough for the 133 curated agents)
python3 scripts/sync-agents.py --force

# With token: 5,000 requests/hour (required for --all)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
python3 scripts/sync-agents.py --all --force
```

### Automated Updates

```bash
# Via cron (daily update)
0 6 * * * cd ~/.opencode-agents && git pull && python3 scripts/sync-agents.py --force

# In a CI/CD pipeline
- run: |
    git clone --depth 1 https://github.com/dmicheneau/opencode-template-agent.git /tmp/agents
    python3 /tmp/agents/scripts/sync-agents.py --output-dir .opencode/agents --force
```

## ✏️ Customization

### Adding a Custom Agent

Create a `.md` file in `.opencode/agents/`:

```bash
# Root-level agent (will be primary or all)
cat > .opencode/agents/my-agent.md << 'EOF'
---
description: "My custom agent"
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
  task:
    "*": allow
---
You are an expert in...
EOF

# Agent in an existing category
cat > .opencode/agents/languages/zig-pro.md << 'EOF'
---
description: "Zig expert, high-performance systems"
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
  task:
    "*": allow
---
You are an expert in Zig...
EOF
```

### Modifying a Synced Agent

Edit the `.md` file directly. The `--clean` flag only removes files with the `<!-- Synced from aitmpl.com -->` header. Remove this header to protect your changes from being overwritten.

### Excluding Agents

Simply delete the `.md` file or add `disable: true` to the frontmatter:

```yaml
---
description: "Disabled agent"
disable: true
---
```

### Changing the Default Model

```yaml
---
description: "Agent with specific model"
mode: subagent
model: anthropic/claude-sonnet-4-20250514
---
```

## 🔧 Troubleshooting

### Sync fails with a 403 error

GitHub enforces a rate limit of 60 requests/hour for unauthenticated requests. Solutions:

```bash
# Use incremental sync (saves requests)
python3 scripts/sync-agents.py --incremental

# Or set a GitHub token for 5,000 req/h
export GITHUB_TOKEN=ghp_your_token
python3 scripts/sync-agents.py --force
```

### Agents are not detected by OpenCode

Check that:
1. Files are in `.opencode/agents/` (not in another directory)
2. The YAML frontmatter is valid (starts with `---`)
3. The `permission:` field is present (not `tools:` which is deprecated)

```bash
# Validate all agents
python3 tests/run_tests.py
```

### Installation fails

```bash
# Run in diagnostic mode
bash install.sh --dry-run

# Check prerequisites
python3 --version  # Python 3.8+ required
git --version
```

### How to add a custom agent

Create a `.md` file in `.opencode/agents/` **without** the `<!-- Synced from aitmpl.com` comment — it will never be overwritten by sync. See [Customization](#-customization).

## 📚 Sources & References

| Resource | Link |
|----------|------|
| aitmpl.com | [https://www.aitmpl.com/agents](https://www.aitmpl.com/agents) |
| claude-code-templates | [https://github.com/davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) |
| OpenCode — Agents | [https://opencode.ai/docs/agents/](https://opencode.ai/docs/agents/) |
| OpenCode — Configuration | [https://opencode.ai/docs/config/](https://opencode.ai/docs/config/) |
| DeepWiki — Agent System | [https://deepwiki.com/anomalyco/opencode/3.3-agent-system](https://deepwiki.com/anomalyco/opencode/3.3-agent-system) |

## 📄 License

MIT
