# 🤖 OpenCode Agent Template

> 🇬🇧 **English version**: [README.en.md](README.en.md)

![Agents](https://img.shields.io/badge/agents-44-blue)
![Primary](https://img.shields.io/badge/primary-4-green)
![Subagents](https://img.shields.io/badge/subagents-40-orange)
![OpenCode](https://img.shields.io/badge/OpenCode-compatible-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

> Collection curée de **44 agents IA** (43 synchronisés depuis [aitmpl.com](https://www.aitmpl.com/agents) + 1 custom) pour [OpenCode](https://opencode.ai), convertis et adaptés depuis le registre source (399+ agents disponibles).

## 📑 Table des matières

- [Qu'est-ce que c'est ?](#quest-ce-que-cest-)
- [Installation rapide](#installation-rapide)
- [Utilisation](#utilisation)
- [Agents disponibles](#agents-disponibles)
- [Architecture](#architecture)
- [Système de permissions](#système-de-permissions)
- [Synchronisation](#synchronisation)
- [Personnalisation](#personnalisation)
- [Sources et références](#sources-et-références)
- [Licence](#licence)

## 🎯 Qu'est-ce que c'est ?

Ce dépôt est un **registre d'agents** pour OpenCode. Il fournit :

- **4 agents principaux** (primary) — navigables avec `Tab`
- **40 sous-agents** (subagents) — invocables via `@catégorie/nom` ou le tool `Task`
- **Organisation par catégorie** via les [nested agents](https://deepwiki.com/anomalyco/opencode/3.3-agent-system) d'OpenCode
- **Format `permission:` moderne** (pas le champ `tools:` déprécié)
- **Script de synchronisation** pour récupérer les agents depuis une URL (GitHub)

### Sources

Les agents proviennent du projet [claude-code-templates](https://github.com/davila7/claude-code-templates) (20k+ ⭐) et sont **automatiquement convertis** du format Claude Code vers le format OpenCode par le script `sync-agents.py`.

## 🚀 Installation rapide

### Méthode 1 : Clone + `OPENCODE_CONFIG_DIR` (recommandé)

```bash
# Cloner le registre d'agents
git clone https://github.com/dmicheneau/opencode-template-agent.git ~/.opencode-agents

# Ajouter à votre profil shell (.bashrc / .zshrc)
echo 'export OPENCODE_CONFIG_DIR=~/.opencode-agents' >> ~/.zshrc
source ~/.zshrc

# OpenCode charge automatiquement les agents au démarrage
opencode
```

### Méthode 2 : Copier dans votre projet

```bash
# Copier les agents dans votre projet existant
cp -r ~/.opencode-agents/.opencode/agents/* .opencode/agents/
```

### Méthode 3 : Lien symbolique global

```bash
# Lien symbolique vers la config globale OpenCode
ln -s ~/.opencode-agents/.opencode/agents ~/.config/opencode/agents
```

### Méthode 4 : One-liner dans le shell profile

```bash
# Téléchargement automatique au lancement du terminal
export OPENCODE_CONFIG_DIR=$(git clone --depth 1 -q https://github.com/dmicheneau/opencode-template-agent.git /tmp/oc-agents 2>/dev/null || true; echo /tmp/oc-agents)
```

## 💡 Utilisation

### Agents principaux (Primary)

Naviguez entre les agents principaux avec **`Tab`** dans OpenCode :

| Agent | Description |
|-------|-------------|
| `episode-orchestrator` | Orchestrateur de workflow pour pipelines épisodiques |
| `fullstack-developer` | Développeur full-stack généraliste |
| `devops-engineer` | Ingénieur DevOps et infrastructure |
| `cloud-architect` | Architecte cloud et systèmes distribués |

### Sous-agents (Subagents)

Invoquez les sous-agents avec **`@catégorie/nom`** :

```
@languages/typescript-pro    → Expert TypeScript
@devtools/code-reviewer      → Revue de code
@ai/ai-engineer              → Ingénieur IA
@security/security-auditor   → Audit de sécurité
@database/postgres-pro       → Expert PostgreSQL
@docs/technical-writer       → Rédacteur technique
```

Ou via le **tool Task** depuis un agent principal :

```
Task(subagent_type="languages/typescript-pro", prompt="Refactore ce module...")
Task(subagent_type="devtools/code-reviewer", prompt="Revue de ce PR...")
```

## 📋 Agents disponibles

### 🖥️ Langages de programmation — `@languages/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| TypeScript Pro | `@languages/typescript-pro` | TypeScript avancé, strict mode, type-level programming |
| Python Pro | `@languages/python-pro` | Python 3.11+, async, type-safe, FastAPI/Django |
| Golang Pro | `@languages/golang-pro` | Go idiomatique, concurrence, microservices |
| Rust Pro | `@languages/rust-pro` | Rust, ownership, lifetimes, async/await |
| Java Architect | `@languages/java-architect` | Java enterprise, Spring Boot, microservices |
| C++ Pro | `@languages/cpp-pro` | C++20/23, templates, zero-overhead abstractions |
| PHP Pro | `@languages/php-pro` | PHP 8.3+, Laravel/Symfony, strict typing |
| Kotlin Specialist | `@languages/kotlin-specialist` | Kotlin, coroutines, multiplatform |
| C# Developer | `@languages/csharp-developer` | ASP.NET Core, C# moderne, Entity Framework |
| Rails Expert | `@languages/rails-expert` | Ruby on Rails, Hotwire, conventions Rails |

### 🛠️ Outils de développement — `@devtools/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Code Reviewer | `@devtools/code-reviewer` | Revue de code, qualité, sécurité |
| Test Automator | `@devtools/test-automator` | Frameworks de test, CI/CD testing |
| Refactoring Specialist | `@devtools/refactoring-specialist` | Refactoring, clean code, patterns |
| Debugger | `@devtools/debugger` | Diagnostic de bugs, analyse de stack traces |
| Performance Engineer | `@devtools/performance-engineer` | Optimisation de performance, profiling |

### 🤖 IA & Data — `@ai/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| AI Engineer | `@ai/ai-engineer` | Systèmes IA end-to-end, MLOps |
| Prompt Engineer | `@ai/prompt-engineer` | Conception et optimisation de prompts |
| Data Scientist | `@ai/data-scientist` | Analyse de données, ML, statistiques |
| ML Engineer | `@ai/ml-engineer` | Pipelines ML, serving, optimisation |
| LLM Architect | `@ai/llm-architect` | Architecture LLM, RAG, fine-tuning |
| Search Specialist | `@ai/search-specialist` | Recherche web avancée, synthèse multi-sources |

### ☁️ DevOps & Infrastructure — `@devops/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Kubernetes Specialist | `@devops/kubernetes-specialist` | K8s, déploiement, troubleshooting |
| Terraform Specialist | `@devops/terraform-specialist` | IaC, modules Terraform, state management |

### 🔒 Sécurité — `@security/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Security Auditor | `@security/security-auditor` | Audits de sécurité, conformité (SOC2, ISO27001) |
| Penetration Tester | `@security/penetration-tester` | Tests d'intrusion, exploitation de vulnérabilités |
| Smart Contract Auditor | `@security/smart-contract-auditor` | Audit de smart contracts, sécurité blockchain |

### 🗄️ Bases de données — `@database/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Database Architect | `@database/database-architect` | Modélisation, scalabilité, choix technologiques |
| PostgreSQL Pro | `@database/postgres-pro` | Optimisation PostgreSQL, réplication, tuning |

### 🌐 Web & Frontend — `@web/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Next.js Developer | `@web/expert-nextjs-developer` | Next.js 16, App Router, Server Components |
| React Engineer | `@web/expert-react-frontend-engineer` | React 19, hooks, TypeScript, performance |

### 🔌 API & GraphQL — `@api/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| API Architect | `@api/api-architect` | Design d'API REST, patterns, mentoring |
| GraphQL Architect | `@api/graphql-architect` | Schémas GraphQL, fédération, performance |

### 📝 Documentation — `@docs/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Documentation Engineer | `@docs/documentation-engineer` | Systèmes de documentation, architecture d'information |
| API Documenter | `@docs/api-documenter` | Documentation API, OpenAPI, portails interactifs |
| Technical Writer | `@docs/technical-writer` | Rédaction technique, guides, tutoriels |

### 💼 Business — `@business/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| Product Manager | `@business/product-manager` | Stratégie produit, roadmap, priorisation |
| Project Manager | `@business/project-manager` | Gestion de projet, risques, planning |
| Scrum Master | `@business/scrum-master` | Agilité, sprints, rétrospectives |

### 🏗️ Équipe — `@team/`

| Agent | Invocation | Description |
|-------|-----------|-------------|
| UI Designer | `@team/ui-designer` | Design UI/UX, design systems, accessibilité |
| Mobile Developer | `@team/mobile-developer` | React Native, Flutter, cross-platform |

## 🏗️ Architecture

```
opencode-template-agent/
├── .opencode/
│   ├── opencode.json                        # Configuration OpenCode
│   ├── agents/
│   │   ├── episode-orchestrator.md          # ⭐ Primary — orchestrateur
│   │   ├── fullstack-developer.md           # ⭐ Primary — full-stack
│   │   ├── devops-engineer.md               # ⭐ Primary — DevOps
│   │   ├── cloud-architect.md               # ⭐ Primary — Cloud
│   │   ├── ai/                              # 🤖 6 sous-agents IA
│   │   ├── api/                             # 🔌 2 sous-agents API
│   │   ├── business/                        # 💼 3 sous-agents Business
│   │   ├── database/                        # 🗄️ 2 sous-agents BDD
│   │   ├── devops/                          # ☁️ 2 sous-agents DevOps
│   │   ├── devtools/                        # 🛠️ 5 sous-agents Dev
│   │   ├── docs/                            # 📝 3 sous-agents Docs
│   │   ├── languages/                       # 🖥️ 10 sous-agents Langages
│   │   ├── security/                        # 🔒 3 sous-agents Sécurité
│   │   ├── team/                            # 🏗️ 2 sous-agents Équipe
│   │   ├── web/                             # 🌐 2 sous-agents Web
│   │   └── manifest.json                    # Métadonnées de synchronisation
│   ├── skills/
│   │   ├── brainstormai/
│   │   ├── browser-mcp/
│   │   ├── memory/
│   │   └── sequential-thinking/
│   └── package.json
├── scripts/
│   └── sync-agents.py                       # Script de synchronisation
└── README.md
```

## 🔐 Système de permissions

Les agents utilisent le format **`permission:`** moderne d'OpenCode (le champ `tools:` est déprécié).

### Format dans le frontmatter YAML

```yaml
---
description: "Description de l'agent"
mode: subagent
permission:
  write: allow          # allow | ask | deny
  edit: ask             # toujours ask pour sécurité
  bash:
    "*": ask            # demande par défaut
    "git status": allow # commandes git pré-approuvées
    "git diff*": allow
    "git log*": allow
  task:
    "*": allow          # peut invoquer d'autres sous-agents
---
```

### Profils de permissions

| Profil | write | edit | bash | Autres | Exemple |
|--------|-------|------|------|--------|---------|
| **full-access** | `allow` | `ask` | `{*: ask, git: allow}` | `task: {*: allow}` | `typescript-pro`, `python-pro` |
| **read-only** | `deny` | `deny` | `deny` | `task: {*: allow}` | `security-auditor` |
| **analysis** | `deny` | `deny` | `{git: allow, *: ask}` | `task: {*: allow}` | `penetration-tester` |
| **content** | `allow` | `ask` | `deny` | `webfetch: allow`, `task: {*: allow}` | `product-manager`, `technical-writer` |
| **primary** | `allow` | `ask` | `{git: allow, *: ask}` | `task: {*: allow}` | `fullstack-developer`, `cloud-architect` |

### Ordre de fusion des permissions

```
Config Globale → Config Agent → Override Session → Flag Runtime
```

## 🔄 Synchronisation

Le script `sync-agents.py` récupère les agents depuis GitHub et les convertit au format OpenCode.

> **Prérequis** : Python 3.8+ (stdlib uniquement, aucune dépendance externe).

### Commandes

```bash
# Lister les agents disponibles
python3 scripts/sync-agents.py --list

# Synchroniser les 43 agents curés
python3 scripts/sync-agents.py --force

# Nettoyer et re-synchroniser
python3 scripts/sync-agents.py --clean --force

# Synchroniser TOUS les 399+ agents
python3 scripts/sync-agents.py --all --force

# Filtrer par catégorie
python3 scripts/sync-agents.py --filter security

# Aperçu sans écriture
python3 scripts/sync-agents.py --dry-run

# Mode verbeux
python3 scripts/sync-agents.py --verbose --force
```

### Authentification GitHub

```bash
# Sans token : 60 requêtes/heure (suffisant pour les 43 curés)
python3 scripts/sync-agents.py --force

# Avec token : 5000 requêtes/heure (nécessaire pour --all)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
python3 scripts/sync-agents.py --all --force
```

### Mise à jour automatique

```bash
# Dans un cron (mise à jour quotidienne)
0 6 * * * cd ~/.opencode-agents && git pull && python3 scripts/sync-agents.py --force

# Dans un pipeline CI/CD
- run: |
    git clone --depth 1 https://github.com/dmicheneau/opencode-template-agent.git /tmp/agents
    python3 /tmp/agents/scripts/sync-agents.py --output-dir .opencode/agents --force
```

## ✏️ Personnalisation

### Ajouter un agent personnalisé

Créez un fichier `.md` dans `.opencode/agents/` :

```bash
# Agent à la racine (sera primary ou all)
cat > .opencode/agents/mon-agent.md << 'EOF'
---
description: "Mon agent personnalisé"
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
  task:
    "*": allow
---
Tu es un expert en...
EOF

# Agent dans une catégorie existante
cat > .opencode/agents/languages/zig-pro.md << 'EOF'
---
description: "Expert Zig, systèmes haute performance"
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
  task:
    "*": allow
---
Tu es un expert en Zig...
EOF
```

### Modifier un agent synchronisé

Éditez directement le fichier `.md`. Le script `--clean` ne supprime que les fichiers avec le header `<!-- Synced from aitmpl.com -->`. Retirez ce header pour protéger vos modifications.

### Exclure des agents

Supprimez simplement le fichier `.md` ou ajoutez `disable: true` dans le frontmatter :

```yaml
---
description: "Agent désactivé"
disable: true
---
```

### Changer le modèle par défaut

```yaml
---
description: "Agent avec modèle spécifique"
mode: subagent
model: anthropic/claude-sonnet-4-20250514
---
```

## 📚 Sources et références

| Ressource | Lien |
|-----------|------|
| aitmpl.com | [https://www.aitmpl.com/agents](https://www.aitmpl.com/agents) |
| claude-code-templates | [https://github.com/davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) |
| OpenCode — Agents | [https://opencode.ai/docs/agents/](https://opencode.ai/docs/agents/) |
| OpenCode — Configuration | [https://opencode.ai/docs/config/](https://opencode.ai/docs/config/) |
| DeepWiki — Agent System | [https://deepwiki.com/anomalyco/opencode/3.3-agent-system](https://deepwiki.com/anomalyco/opencode/3.3-agent-system) |

## 📄 Licence

MIT
