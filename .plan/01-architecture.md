# 🏗️ Architecture technique

## Arborescence du projet

```
opencode-template-agent/
├── .opencode/
│   ├── opencode.json                    # Config MCP, permissions globales
│   ├── agents/
│   │   ├── episode-orchestrator.md      # ⭐ Primary — orchestrateur de workflow
│   │   ├── fullstack-developer.md       # ⭐ Primary — développeur full-stack
│   │   ├── devops-engineer.md           # ⭐ Primary — ingénieur DevOps
│   │   ├── cloud-architect.md           # ⭐ Primary — architecte cloud
│   │   │
│   │   ├── ai/                          # 🤖 Intelligence artificielle
│   │   │   ├── ai-engineer.md
│   │   │   ├── data-scientist.md
│   │   │   ├── llm-architect.md
│   │   │   ├── ml-engineer.md
│   │   │   ├── prompt-engineer.md
│   │   │   └── search-specialist.md
│   │   │
│   │   ├── api/                         # 🔌 API & GraphQL
│   │   │   ├── api-architect.md
│   │   │   └── graphql-architect.md
│   │   │
│   │   ├── business/                    # 💼 Business & gestion
│   │   │   ├── product-manager.md
│   │   │   ├── project-manager.md
│   │   │   └── scrum-master.md
│   │   │
│   │   ├── database/                    # 🗄️ Bases de données
│   │   │   ├── database-architect.md
│   │   │   └── postgres-pro.md
│   │   │
│   │   ├── devops/                      # ☁️ Infrastructure
│   │   │   ├── kubernetes-specialist.md
│   │   │   └── terraform-specialist.md
│   │   │
│   │   ├── devtools/                    # 🛠️ Outils de développement
│   │   │   ├── code-reviewer.md
│   │   │   ├── debugger.md
│   │   │   ├── performance-engineer.md
│   │   │   ├── refactoring-specialist.md
│   │   │   └── test-automator.md
│   │   │
│   │   ├── docs/                        # 📝 Documentation
│   │   │   ├── api-documenter.md
│   │   │   ├── documentation-engineer.md
│   │   │   └── technical-writer.md
│   │   │
│   │   ├── languages/                   # 🖥️ Langages de programmation
│   │   │   ├── cpp-pro.md
│   │   │   ├── csharp-developer.md
│   │   │   ├── golang-pro.md
│   │   │   ├── java-architect.md
│   │   │   ├── kotlin-specialist.md
│   │   │   ├── php-pro.md
│   │   │   ├── python-pro.md
│   │   │   ├── rails-expert.md
│   │   │   ├── rust-pro.md
│   │   │   └── typescript-pro.md
│   │   │
│   │   ├── security/                    # 🔒 Sécurité
│   │   │   ├── penetration-tester.md
│   │   │   ├── security-auditor.md
│   │   │   └── smart-contract-auditor.md
│   │   │
│   │   ├── team/                        # 🏗️ Équipe
│   │   │   ├── mobile-developer.md
│   │   │   └── ui-designer.md
│   │   │
│   │   ├── web/                         # 🌐 Web & Frontend
│   │   │   ├── expert-nextjs-developer.md
│   │   │   └── expert-react-frontend-engineer.md
│   │   │
│   │   └── manifest.json               # Métadonnées de sync
│   │
│   ├── skills/                          # Skills OpenCode
│   │   ├── brainstormai/
│   │   ├── browser-mcp/
│   │   ├── memory/
│   │   └── sequential-thinking/
│   │
│   └── package.json
│
├── scripts/
│   └── sync-agents.py                   # Script de synchronisation
│
├── .plan/                               # Plans du projet
├── README.md                            # Documentation
└── .gitignore
```

## Flux de données

```
┌─────────────────────────────────────────────────────┐
│                  GitHub (source)                      │
│  davila7/claude-code-templates                        │
│  cli-tool/components/agents/{category}/{name}.md      │
│                                                       │
│  Format Claude Code:                                  │
│  ---                                                  │
│  name: typescript-pro                                 │
│  description: "Use when..."                           │
│  tools: Read, Write, Edit, Bash, Glob, Grep           │
│  model: sonnet                                        │
│  ---                                                  │
│  System prompt...                                     │
└──────────────────────┬──────────────────────────────┘
                       │ GitHub API (raw content)
                       ▼
┌─────────────────────────────────────────────────────┐
│              sync-agents.py                           │
│                                                       │
│  1. Fetch via GitHub API                              │
│  2. Parse YAML frontmatter                            │
│  3. Extract description (1ère phrase)                 │
│  4. Map tools → permission:                           │
│     Write → write: allow/deny                         │
│     Edit  → edit: ask/deny                            │
│     Bash  → bash: {*:ask, git:allow}/deny             │
│  5. Assign mode (primary/subagent)                    │
│  6. Route to category subdirectory                    │
│  7. Clean body (remove <example> tags)                │
│  8. Write .md + manifest.json                         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           .opencode/agents/ (output)                  │
│                                                       │
│  Format OpenCode:                                     │
│  <!-- Synced from aitmpl.com | ... -->                │
│  ---                                                  │
│  description: "Expert TypeScript..."                  │
│  mode: subagent                                       │
│  permission:                                          │
│    write: allow                                       │
│    edit: ask                                           │
│    bash:                                              │
│      "*": ask                                         │
│      "git status": allow                              │
│    task:                                              │
│      "*": allow                                       │
│  ---                                                  │
│  System prompt (cleaned)...                           │
└──────────────────────┬──────────────────────────────┘
                       │ OPENCODE_CONFIG_DIR
                       ▼
┌─────────────────────────────────────────────────────┐
│               OpenCode Runtime                        │
│                                                       │
│  Primary agents : Tab pour naviguer                   │
│  Subagents : @category/name ou Task tool              │
│  Permission merge : Global → Agent → Session → CLI    │
└─────────────────────────────────────────────────────┘
```

## Système de permissions

### Profils appliqués automatiquement

| Profil | Condition source | Permission générée |
|--------|-----------------|-------------------|
| **full-access** | Write + Edit + Bash dans source | write:allow, edit:ask, bash:{*:ask, git:allow}, task:{*:allow} |
| **read-only** | Aucun Write/Edit/Bash | write:deny, edit:deny, bash:deny, task:{*:allow} |
| **analysis** | Bash mais pas Write/Edit | write:deny, edit:deny, bash:{git:allow, *:ask}, task:{*:allow} |
| **content** | Write + Edit + WebFetch, pas Bash | write:allow, edit:ask, bash:deny, webfetch:allow, task:{*:allow} |
| **primary** | Agent dans PRIMARY_AGENTS set | write:allow, edit:ask, bash:{git:allow, *:ask}, task:{*:allow} |

### Ordre de fusion

```
opencode.json (global)
    ↓ override
agent.md frontmatter (agent-specific)
    ↓ override
Session override (runtime)
    ↓ override
CLI flags (--yolo, etc.)
```
