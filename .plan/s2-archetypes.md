# S2.2 — Permission Archetypes

**Created:** 2026-02-19
**Status:** Design complete
**Task:** S2.2 from 01-tasks-v6.md
**Principle:** Least privilege. Start with deny, add what's needed.

---

## Overview

5 archetypes replace the current one-size-fits-all "balanced" preset applied to 65/70 agents.

| # | Archetype | Agents | Write | Edit | Bash | Task | Core principle |
|---|-----------|--------|-------|------|------|------|----------------|
| 1 | **Builder** | 28 | allow | allow | patterns | allow | Creates and modifies code, runs tests |
| 2 | **Auditor** | 9 | deny | deny | deny | allow | Read-only. Delegates fixes, never modifies |
| 3 | **Analyst** | 6 | allow | ask | patterns | allow | Computes, outputs reports, restricted bash |
| 4 | **Orchestrator** | 5 | deny | deny | deny | allow | Delegates and plans. No direct execution |
| 5 | **Specialist** | 22 | allow | allow | domain-scoped | allow | Broad read, targeted bash per domain |

**Total: 70 agents**

### The 17 Permissions (from `src/permissions/presets.mjs`)

```
read, write, edit, bash, glob, grep, webfetch, task, mcp,
todoread, todowrite, distill, prune, sequentialthinking,
memory, browsermcp, skill
```

### Universal Safe Set (allow for ALL archetypes)

These 7 permissions are read-only or reasoning tools — zero risk:

| Permission | Why universal |
|---|---|
| `read` | Every agent needs to read files |
| `glob` | File discovery, no side effects |
| `grep` | Content search, no side effects |
| `distill` | Context summarization |
| `prune` | Context management |
| `sequentialthinking` | Reasoning/planning tool |
| `skill` | Load skill instructions |

---

## 1. Builder

> Agents that CREATE code — write, compile, test, ship.

### Permission Map

| Permission | Action | Rationale |
|---|---|---|
| read | allow | — |
| write | **allow** | Creates new files (source, configs, tests) |
| edit | **allow** | Modifies existing code |
| bash | **patterns** | Build/test/run commands allowed; destructive ops ask |
| glob | allow | — |
| grep | allow | — |
| webfetch | allow | Fetch docs, package registries, API references |
| task | **allow** | Delegate subtasks to other agents |
| mcp | ask | External tool integrations need user consent |
| todoread | allow | Read project context |
| todowrite | allow | Track work items |
| distill | allow | — |
| prune | allow | — |
| sequentialthinking | allow | — |
| memory | allow | Remember decisions across sessions |
| browsermcp | deny | Code agents don't need browser control |
| skill | allow | — |

### Bash Pattern Map

```yaml
bash:
  "*": ask
  # --- Git ---
  "git *": allow
  # --- JS/TS ecosystem ---
  "npm *": allow
  "npx *": allow
  "yarn *": allow
  "pnpm *": allow
  "node *": allow
  "bun *": allow
  "deno *": allow
  "tsc *": allow
  # --- Python ---
  "pytest*": allow
  "python -m pytest*": allow
  "python *": allow
  "python3 *": allow
  "pip *": allow
  "pip3 *": allow
  "uv *": allow
  "ruff *": allow
  "mypy *": allow
  # --- Go ---
  "go test*": allow
  "go build*": allow
  "go run*": allow
  "go mod*": allow
  "go vet*": allow
  "golangci-lint*": allow
  # --- Rust ---
  "cargo test*": allow
  "cargo build*": allow
  "cargo run*": allow
  "cargo clippy*": allow
  "cargo fmt*": allow
  # --- JVM ---
  "mvn *": allow
  "gradle *": allow
  "gradlew *": allow
  # --- .NET ---
  "dotnet *": allow
  # --- C/C++ ---
  "make*": allow
  "cmake*": allow
  "gcc *": allow
  "g++ *": allow
  "clang*": allow
  # --- General build tools ---
  "just *": allow
  "task *": allow
  # --- Safe read commands ---
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "wc *": allow
  "which *": allow
  "echo *": allow
  "mkdir *": allow
  "pwd": allow
  "env": allow
  "printenv*": allow
```

### Rationale

Builders are the workhorses — they need broad write access and the ability to build/test/lint across any language ecosystem. The `*: ask` default ensures unknown commands still require confirmation. Destructive commands (`rm`, `chmod`, `curl`, `wget`) fall through to `ask` deliberately. Browser access is denied because code generation doesn't require it.

### Agent List (28)

| Category | Agent | Notes |
|---|---|---|
| languages | typescript-pro | |
| languages | golang-pro | |
| languages | python-pro | |
| languages | java-architect | |
| languages | rust-pro | |
| languages | kotlin-specialist | |
| languages | csharp-developer | |
| languages | php-pro | |
| languages | cpp-pro | |
| languages | swift-expert | |
| languages | rails-expert | |
| web | angular-architect | |
| web | expert-nextjs-developer | |
| web | expert-react-frontend-engineer | |
| web | fullstack-developer | Primary mode — also builds code |
| web | mobile-developer | |
| web | vue-expert | |
| devtools | test-automator | Writes test code + runs tests |
| devtools | debugger | Writes fixes + reproduces bugs |
| devtools | refactoring-specialist | Restructures existing code |
| mcp | mcp-developer | Builds MCP servers |
| mcp | mcp-server-architect | Builds MCP infrastructure |
| ai | ai-engineer | Builds AI systems end-to-end |
| ai | ml-engineer | Builds ML pipelines |
| ai | data-engineer | Builds ETL/data pipelines |
| devops | ci-cd-engineer | Writes pipeline configs |
| devops | docker-specialist | Writes Dockerfiles/compose |
| devops | terraform-specialist | Writes IaC (.tf files) |

---

## 2. Auditor

> Agents that REVIEW without modifying. Read everything, touch nothing.

### Permission Map

| Permission | Action | Rationale |
|---|---|---|
| read | allow | — |
| write | **deny** | Auditors never create files |
| edit | **deny** | Auditors never modify files |
| bash | **deny** | No shell access — prevents accidental changes |
| glob | allow | — |
| grep | allow | — |
| webfetch | ask | May need CVE databases or spec references — with consent |
| task | **allow** | Delegates fixes to Builder agents |
| mcp | deny | No external tool access |
| todoread | allow | Read project context |
| todowrite | deny | Auditors don't manage tasks |
| distill | allow | — |
| prune | allow | — |
| sequentialthinking | allow | — |
| memory | allow | Remember findings across sessions |
| browsermcp | deny | No browser access |
| skill | allow | — |

### Bash Pattern Map

None. Bash is `deny`.

### Rationale

The hardest constraint and the most important one. An auditor that can write is a compromised audit. Even "harmless" bash commands create an attack surface — if an auditor agent is confused or prompted, it could `rm -rf` or exfiltrate data. The `task: allow` escape valve lets auditors create actionable findings: "delegate to typescript-pro to fix X." `webfetch: ask` is the one concession — auditors legitimately need to check CVE databases, OWASP references, and specification documents, but under user supervision.

**Verification workflow:** Auditors verify findings by delegating execution to Builder agents via Task. For example, code-reviewer delegates `tsc --noEmit` to typescript-pro and analyzes the output. This adds a round-trip but preserves audit integrity — the reviewer never modifies the codebase it's reviewing.

### Agent List (9)

| Category | Agent | Notes |
|---|---|---|
| devtools | code-reviewer | Reviews code quality, delegates fixes |
| devtools | qa-expert | Quality strategy — doesn't write tests |
| devtools | performance-engineer | Identifies bottlenecks, recommends fixes |
| security | security-auditor | Compliance assessments, risk evaluation |
| security | smart-contract-auditor | Smart contract vulnerability analysis |
| mcp | mcp-security-auditor | MCP server security reviews |
| mcp | mcp-protocol-specialist | Spec compliance verification |
| web | accessibility | WCAG audits, a11y checks |
| web | screenshot-ui-analyzer | Visual analysis — read-only by nature |

---

## 3. Analyst

> Agents that ANALYZE data — compute, visualize, report.

### Permission Map

| Permission | Action | Rationale |
|---|---|---|
| read | allow | — |
| write | **allow** | Creates reports, notebooks, output files |
| edit | **ask** | Modifying existing analysis needs consent |
| bash | **patterns** | Data tools allowed, system tools restricted |
| glob | allow | — |
| grep | allow | — |
| webfetch | allow | Fetch datasets, APIs, documentation |
| task | **allow** | Delegate to specialists |
| mcp | ask | External data sources with consent |
| todoread | allow | Read project context |
| todowrite | allow | Track analysis progress |
| distill | allow | — |
| prune | allow | — |
| sequentialthinking | allow | — |
| memory | allow | Remember analysis context |
| browsermcp | deny | Analysts work with data, not browsers |
| skill | allow | — |

### Bash Pattern Map

```yaml
bash:
  "*": ask
  # --- Python data stack ---
  "python *": allow
  "python3 *": allow
  "pip *": allow
  "pip3 *": allow
  "uv *": allow
  "jupyter *": allow
  "ipython*": allow
  # --- R ---
  "Rscript *": allow
  # --- Data tools ---
  "sqlite3 *": allow
  "jq *": allow
  "csvkit*": allow
  "csvtool*": allow
  # --- Safe read commands ---
  "cat *": allow
  "head *": allow
  "tail *": allow
  "wc *": allow
  "sort *": allow
  "uniq *": allow
  "cut *": allow
  "ls*": allow
  "pwd": allow
  "echo *": allow
  # --- Git (read-only context) ---
  "git log*": allow
  "git status*": allow
  "git diff*": allow
  "git show*": allow
```

### Rationale

Analysts need to crunch data and produce outputs. `write: allow` lets them create reports and notebooks. `edit: ask` because modifying existing analyses is riskier than creating new ones — you don't want an analyst silently overwriting a validated dataset. Bash is scoped to data tools (Python, R, jq, sqlite3) and read-only system commands. Database clients (psql, redis-cli) deliberately fall to `ask` — connecting to production databases warrants explicit consent. Git is read-only (log/status/diff only).

### Agent List (6)

| Category | Agent | Notes |
|---|---|---|
| ai | data-analyst | SQL analytics, BI dashboards |
| ai | data-scientist | Predictive modeling, statistics |
| ai | prompt-engineer | Analyzes/optimizes prompts |
| ai | search-specialist | Web research and synthesis |
| business | business-analyst | Requirements, process modeling |
| business | ux-researcher | User research, journey mapping |

---

## 4. Orchestrator

> Agents that COORDINATE other agents — plan, delegate, track.

### Permission Map

| Permission | Action | Rationale |
|---|---|---|
| read | allow | — |
| write | **deny** | Orchestrators don't create files |
| edit | **deny** | Orchestrators don't modify files |
| bash | **deny** | Orchestrators delegate execution |
| glob | allow | — |
| grep | allow | — |
| webfetch | ask | May need project context (Jira, specs) |
| task | **allow** | PRIMARY tool — delegates everything |
| mcp | deny | No external tools |
| todoread | allow | Track project progress |
| todowrite | **allow** | Manage tasks, backlogs, sprint boards |
| distill | allow | — |
| prune | allow | — |
| sequentialthinking | allow | — |
| memory | allow | Remember project context across sessions |
| browsermcp | deny | No browser |
| skill | allow | — |

### Bash Pattern Map

None. Bash is `deny`.

### Rationale

Orchestrators are the purest expression of least privilege. They exist to coordinate, not execute. `task: allow` is their lifeline — every action flows through delegation to specialized agents. `todowrite: allow` because managing tasks IS their job (unlike auditors, who only read tasks). `write: deny` and `edit: deny` are non-negotiable — an orchestrator that directly modifies code bypasses the entire review chain. The `prd` agent (mode: "all") gets this archetype because its job is producing structured requirements that get delegated for implementation.

### Agent List (5)

| Category | Agent | Notes |
|---|---|---|
| devtools | episode-orchestrator | Primary mode — coordinates subagent workflows |
| business | project-manager | Plans, tracks, coordinates |
| business | scrum-master | Facilitates, removes impediments |
| business | product-manager | Strategy, prioritization |
| business | prd | Mode "all" — produces PRDs, delegates implementation |

---

## 5. Specialist

> Agents that need TARGETED tool access — broad read, domain-scoped bash.

### Permission Map (Base)

| Permission | Action | Rationale |
|---|---|---|
| read | allow | — |
| write | **allow** | Domain outputs (IaC, configs, schemas, docs) |
| edit | **allow** | Modify domain-specific files |
| bash | **domain patterns** | See sub-profiles below |
| glob | allow | — |
| grep | allow | — |
| webfetch | allow | Fetch domain documentation |
| task | **allow** | Delegate to other specialists |
| mcp | ask | External integrations with consent |
| todoread | allow | Read project context |
| todowrite | allow | Track domain work |
| distill | allow | — |
| prune | allow | — |
| sequentialthinking | allow | — |
| memory | allow | Remember domain decisions |
| browsermcp | deny | See exceptions below |
| skill | allow | — |

### Bash Sub-Profiles

The key insight for Specialists: bash permissions are **domain-scoped**. Each sub-profile defines what commands that domain legitimately needs.

#### 5a. Infra Specialist (7 agents)

```yaml
bash:
  "*": ask
  # --- Infrastructure tools ---
  "terraform *": allow
  "tf *": allow
  "kubectl *": allow
  "helm *": allow
  "docker *": allow
  "docker-compose *": allow
  "aws *": allow
  "gcloud *": allow
  "az *": allow
  "ansible*": allow
  "systemctl *": ask    # system services — ask
  "journalctl *": allow
  "ss *": allow
  "ip *": allow
  "dig *": allow
  "nslookup *": allow
  "ping *": allow
  "traceroute *": allow
  "curl *": ask         # network requests — ask
  "wget *": ask
  # --- Git ---
  "git *": allow
  # --- Safe reads ---
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "wc *": allow
  "which *": allow
  "echo *": allow
  "mkdir *": allow
  "pwd": allow
  "env": allow
  "printenv*": allow
  # --- Config ---
  "ssh *": ask          # remote access — ask
  "scp *": ask
```

**Agents:** aws-specialist, cloud-architect, devops-engineer, kubernetes-specialist, linux-admin, sre-engineer, platform-engineer

#### 5b. Data Specialist (5 agents)

```yaml
bash:
  "*": ask
  # --- Database clients ---
  "psql *": allow
  "pg_dump*": ask       # data export — ask
  "pg_restore*": ask
  "redis-cli *": allow
  "mysql *": allow
  "mongosh *": allow
  "sqlite3 *": allow
  # --- API testing ---
  "curl *": ask
  "httpie *": ask
  "grpcurl *": allow
  # --- Git ---
  "git *": allow
  # --- Safe reads ---
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "jq *": allow
  "wc *": allow
  "echo *": allow
  "mkdir *": allow
  "pwd": allow
```

**Agents:** database-architect, postgres-pro, redis-specialist, graphql-architect, api-architect

#### 5c. Security Specialist (2 agents)

```yaml
bash:
  "*": ask              # EVERYTHING asks by default — pentest tools are dangerous
  # --- Passive reconnaissance ---
  "nmap *": ask         # even scanning asks — legal implications
  "nikto *": ask
  "dig *": allow
  "whois *": allow
  "nslookup *": allow
  "ping *": allow
  "traceroute *": allow
  "curl *": ask
  # --- Git ---
  "git log*": allow
  "git status*": allow
  "git diff*": allow
  "git show*": allow
  # --- Safe reads ---
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "which *": allow
  "echo *": allow
  "pwd": allow
```

**Note:** Security specialist bash is deliberately more restrictive than infra. Pentest tools (`sqlmap`, `hydra`, `metasploit`, etc.) all fall to `*: ask`. This is intentional — running offensive security tools without explicit consent is a liability.

**Agents:** security-engineer, penetration-tester

**Exception for penetration-tester:** `browsermcp: ask` (may need browser for web app testing)

#### 5d. Docs Specialist (5 agents)

```yaml
bash:
  "*": deny
```

Docs specialists don't run commands. They write markdown, Mermaid diagrams, and OpenAPI specs. `write: allow` + `edit: allow` + `bash: deny` is the right profile.

**Exception for diagram-architect:** `bash` pattern override:
```yaml
bash:
  "*": deny
  "mmdc *": allow       # Mermaid CLI for diagram rendering
  "plantuml *": allow   # PlantUML rendering
```

**Agents:** technical-writer, documentation-engineer, api-documenter, diagram-architect, ui-designer

#### 5e. AI/ML Infrastructure Specialist (2 agents)

```yaml
bash:
  "*": ask
  # --- ML tooling ---
  "python *": allow
  "python3 *": allow
  "pip *": allow
  "pip3 *": allow
  "uv *": allow
  # --- Containers (model serving) ---
  "docker *": allow
  "kubectl *": allow
  # --- ML-specific ---
  "mlflow *": allow
  "wandb *": allow
  "dvc *": allow
  "bentoml *": allow
  "triton*": allow
  # --- Git ---
  "git *": allow
  # --- Safe reads ---
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "wc *": allow
  "echo *": allow
  "mkdir *": allow
  "pwd": allow
  "nvidia-smi*": allow
```

**Agents:** llm-architect, mlops-engineer

#### 5f. Architecture Specialist (1 agent)

```yaml
bash:
  "*": ask
  "docker *": allow
  "docker-compose *": allow
  "kubectl *": allow
  "curl *": ask
  "git *": allow
  "ls*": allow
  "cat *": allow
  "head *": allow
  "tail *": allow
  "echo *": allow
  "pwd": allow
```

**Agents:** microservices-architect

### Specialist Exceptions

| Agent | Exception | Reason |
|---|---|---|
| penetration-tester | `browsermcp: ask` | Web application testing requires browser |
| ui-designer | `browsermcp: ask` | Visual design verification |
| diagram-architect | bash: `mmdc`, `plantuml` allowed | Diagram rendering tools |

### Rationale

Specialists are the most nuanced archetype. They share the same base permissions (broad read, write+edit for their domain, task for delegation), but diverge sharply on bash. An infra specialist running `terraform apply` is routine; a docs writer running `terraform apply` is a disaster. The sub-profile system ensures each domain gets exactly the commands it needs, nothing more. Security specialists are the most restricted sub-profile despite being "specialists" — the principle is that offensive tools carry legal and operational risk that warrants human supervision on every invocation.

### Agent List (22)

| Category | Agent | Sub-profile |
|---|---|---|
| devops | aws-specialist | infra |
| devops | cloud-architect | infra |
| devops | devops-engineer | infra |
| devops | kubernetes-specialist | infra |
| devops | linux-admin | infra |
| devops | sre-engineer | infra |
| devops | platform-engineer | infra |
| data-api | database-architect | data |
| data-api | postgres-pro | data |
| data-api | redis-specialist | data |
| data-api | graphql-architect | data |
| data-api | api-architect | data |
| security | security-engineer | security |
| security | penetration-tester | security |
| ai | llm-architect | ai-infra |
| ai | mlops-engineer | ai-infra |
| devtools | microservices-architect | architecture |
| docs | technical-writer | docs |
| docs | documentation-engineer | docs |
| docs | api-documenter | docs |
| docs | diagram-architect | docs |
| web | ui-designer | docs |

---

## Full Agent-to-Archetype Mapping (70 agents)

Sorted alphabetically for lookup.

| Agent | Category | Mode | Archetype | Sub-profile |
|---|---|---|---|---|
| accessibility | web | subagent | **Auditor** | — |
| ai-engineer | ai | subagent | **Builder** | — |
| angular-architect | web | subagent | **Builder** | — |
| api-architect | data-api | subagent | **Specialist** | data |
| api-documenter | docs | subagent | **Specialist** | docs |
| aws-specialist | devops | subagent | **Specialist** | infra |
| business-analyst | business | subagent | **Analyst** | — |
| ci-cd-engineer | devops | subagent | **Builder** | — |
| cloud-architect | devops | primary | **Specialist** | infra |
| code-reviewer | devtools | subagent | **Auditor** | — |
| cpp-pro | languages | subagent | **Builder** | — |
| csharp-developer | languages | subagent | **Builder** | — |
| data-analyst | ai | subagent | **Analyst** | — |
| data-engineer | ai | subagent | **Builder** | — |
| data-scientist | ai | subagent | **Analyst** | — |
| database-architect | data-api | subagent | **Specialist** | data |
| debugger | devtools | subagent | **Builder** | — |
| devops-engineer | devops | primary | **Specialist** | infra |
| diagram-architect | docs | subagent | **Specialist** | docs |
| docker-specialist | devops | subagent | **Builder** | — |
| documentation-engineer | docs | subagent | **Specialist** | docs |
| episode-orchestrator | devtools | primary | **Orchestrator** | — |
| expert-nextjs-developer | web | subagent | **Builder** | — |
| expert-react-frontend-engineer | web | subagent | **Builder** | — |
| fullstack-developer | web | primary | **Builder** | — |
| golang-pro | languages | subagent | **Builder** | — |
| graphql-architect | data-api | subagent | **Specialist** | data |
| java-architect | languages | subagent | **Builder** | — |
| kotlin-specialist | languages | subagent | **Builder** | — |
| kubernetes-specialist | devops | subagent | **Specialist** | infra |
| linux-admin | devops | subagent | **Specialist** | infra |
| llm-architect | ai | subagent | **Specialist** | ai-infra |
| mcp-developer | mcp | subagent | **Builder** | — |
| mcp-protocol-specialist | mcp | subagent | **Auditor** | — |
| mcp-security-auditor | mcp | subagent | **Auditor** | — |
| mcp-server-architect | mcp | subagent | **Builder** | — |
| microservices-architect | devtools | subagent | **Specialist** | architecture |
| ml-engineer | ai | subagent | **Builder** | — |
| mlops-engineer | ai | subagent | **Specialist** | ai-infra |
| mobile-developer | web | subagent | **Builder** | — |
| penetration-tester | security | subagent | **Specialist** | security |
| performance-engineer | devtools | subagent | **Auditor** | — |
| php-pro | languages | subagent | **Builder** | — |
| platform-engineer | devops | subagent | **Specialist** | infra |
| postgres-pro | data-api | subagent | **Specialist** | data |
| prd | business | all | **Orchestrator** | — |
| product-manager | business | subagent | **Orchestrator** | — |
| project-manager | business | subagent | **Orchestrator** | — |
| prompt-engineer | ai | subagent | **Analyst** | — |
| python-pro | languages | subagent | **Builder** | — |
| qa-expert | devtools | subagent | **Auditor** | — |
| rails-expert | languages | subagent | **Builder** | — |
| redis-specialist | data-api | subagent | **Specialist** | data |
| refactoring-specialist | devtools | subagent | **Builder** | — |
| rust-pro | languages | subagent | **Builder** | — |
| screenshot-ui-analyzer | web | subagent | **Auditor** | — |
| scrum-master | business | subagent | **Orchestrator** | — |
| search-specialist | ai | subagent | **Analyst** | — |
| security-auditor | security | subagent | **Auditor** | — |
| security-engineer | security | subagent | **Specialist** | security |
| smart-contract-auditor | security | subagent | **Auditor** | — |
| sre-engineer | devops | subagent | **Specialist** | infra |
| swift-expert | languages | subagent | **Builder** | — |
| technical-writer | docs | subagent | **Specialist** | docs |
| terraform-specialist | devops | subagent | **Builder** | — |
| test-automator | devtools | subagent | **Builder** | — |
| typescript-pro | languages | subagent | **Builder** | — |
| ui-designer | web | subagent | **Specialist** | docs |
| ux-researcher | business | subagent | **Analyst** | — |
| vue-expert | web | subagent | **Builder** | — |

---

## Archetype Distribution by Category

| Category | Builder | Auditor | Analyst | Orchestrator | Specialist |
|---|---|---|---|---|---|
| languages (11) | **11** | — | — | — | — |
| devops (10) | 3 | — | — | — | **7** |
| web (9) | **6** | 2 | — | — | 1 |
| ai (9) | 3 | — | **4** | — | 2 |
| devtools (8) | 3 | **3** | — | 1 | 1 |
| business (6) | — | — | 2 | **4** | — |
| data-api (5) | — | — | — | — | **5** |
| docs (4) | — | — | — | — | **4** |
| mcp (4) | 2 | **2** | — | — | — |
| security (4) | — | 2 | — | — | **2** |
| **Total** | **28** | **9** | **6** | **5** | **22** |

---

## Migration Notes: What Changes

### Before (current state)

65/70 agents share the `balanced` preset:
- write: allow, edit: allow, bash: `{ "*": ask, "git status*": allow, "git diff*": allow, "git log*": allow }`, task: allow
- Only `security-auditor` has different permissions (deny-all)

### After (archetype system)

| Change | Impact | Agents affected |
|---|---|---|
| **Auditors lose write/edit/bash** | Breaking — auditors can no longer modify files | 8 agents (code-reviewer, qa-expert, performance-engineer, smart-contract-auditor, mcp-security-auditor, mcp-protocol-specialist, accessibility, screenshot-ui-analyzer) |
| **Orchestrators lose write/edit/bash** | Breaking — orchestrators must delegate all changes | 5 agents (episode-orchestrator, project-manager, scrum-master, product-manager, prd) |
| **Analysts get scoped bash** | Enhancement — data tools allowed without asking | 6 agents |
| **Builders get rich bash patterns** | Enhancement — build/test commands auto-approved | 28 agents |
| **Specialists get domain-scoped bash** | Enhancement — domain tools auto-approved | 22 agents |
| **security-auditor moves from deny-all to Auditor** | Upgrade — gains read/glob/grep/task/memory | 1 agent |
| **browsermcp: deny** for most agents | Restriction — was `ask` in balanced, now `deny` except 2 specialists | 68 agents |
| **mcp: ask** for builders/analysts | No change — was `ask` in balanced | 34 agents |
| **todowrite: deny** for auditors | Restriction — auditors don't manage tasks | 9 agents |

### Key Security Improvements

1. **Attack surface reduction:** 14 agents (auditors + orchestrators) lose write/edit/bash access entirely. A confused or prompt-injected auditor can no longer `rm -rf /`.

2. **Bash command scoping:** Instead of `*: ask` for everything, builders get 40+ safe patterns auto-approved. This reduces prompt fatigue (fewer "allow this?" dialogs) while keeping dangerous commands gated.

3. **Specialist isolation:** A postgres-pro agent can run `psql` but not `terraform apply`. A terraform-specialist can run `terraform` but not `psql`. Domain boundaries are enforced.

4. **No silent escalation:** The `*: ask` fallback on every bash-enabled archetype means ANY command not explicitly whitelisted still requires user approval.

### Implementation Strategy

1. Add archetype definitions to `src/permissions/presets.mjs` alongside existing 4 presets
2. Map each agent to its archetype in manifest.json (new `archetype` field)
3. During `scripts/sync-agents.py`, resolve archetype → permission set + bash patterns
4. Write resolved permissions into each agent's frontmatter during install
5. Specialist sub-profiles can be stored as archetype variants: `specialist-infra`, `specialist-data`, etc.

### Backward Compatibility

- Users with `--permissions balanced` override keep their current behavior
- The archetype is the **new default** — replaces the current "everyone gets balanced"
- `--permissions yolo` still sets all 17 to allow (unchanged)
- Custom per-agent overrides via `--permission-override` still layer on top
