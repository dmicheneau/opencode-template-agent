# 🤖 Synthèse — OpenCode Agent Template v2

## Vision

Transformer le registre aitmpl.com (399 agents Claude Code) en une collection curée et directement utilisable dans OpenCode, accessible via une simple URL Git.

## Ce qui existe

| Composant | État | Détails |
|-----------|------|---------|
| Registre d'agents | ✅ Fait | 44 agents (4 primary + 40 subagents) — 43 synchronisés + 1 custom |
| Format moderne | ✅ Fait | `permission:` uniquement (pas `tools:` déprécié) |
| Organisation par catégorie | ✅ Fait | 11 sous-répertoires (nested agents) |
| Script de synchronisation | ✅ Fait | `sync-agents.py` — fetch GitHub → convert → write |
| Documentation | ✅ Fait | README.md complet en français |
| Skills intégrés | ✅ Fait | brainstormai, browser-mcp, memory, sequential-thinking |

## Flux de fonctionnement

```
aitmpl.com (399 agents)
    │
    ▼ sync-agents.py
    │
    ├── Parse YAML frontmatter (name, description, tools, model)
    ├── Convert tools → permission (allow/ask/deny)
    ├── Assign mode (primary vs subagent)
    ├── Route vers sous-répertoire de catégorie
    │
    ▼
.opencode/agents/
    ├── ⭐ primary agents (racine)
    └── 📁 category/ → subagents
```

## Comment c'est utilisé

```bash
# Installation
git clone <repo> ~/.opencode-agents
export OPENCODE_CONFIG_DIR=~/.opencode-agents

# Utilisation dans OpenCode
Tab                          → Naviguer entre les 4 agents principaux
@languages/typescript-pro    → Invoquer un sous-agent spécifique
@devtools/code-reviewer      → Revue de code
@ai/ai-engineer              → Ingénieur IA
```

## Chiffres clés

- **Source** : 399 agents dans 27 catégories (davila7/claude-code-templates, 20k+ ⭐)
- **Curés** : 44 agents dans 11 catégories (43 synchronisés + 1 custom)
- **Taux de couverture** : ~11% des agents source (les plus pertinents pour le dev)
- **Profils de permissions** : 5 (full-access, read-only, analysis, content, primary)
- **Format** : Markdown + YAML frontmatter, pur OpenCode natif
