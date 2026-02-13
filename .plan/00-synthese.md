# 🤖 Synthèse — OpenCode Agent Template v2

## Vision

Transformer le registre aitmpl.com (399 agents Claude Code) en une collection curée et directement utilisable dans OpenCode, accessible via une simple URL Git.

## Ce qui existe

| Composant | État | Détails |
|-----------|------|---------|
| Registre d'agents | ✅ Fait | 134 agents (4 primary + 130 subagents) — 133 synchronisés (43 core + 90 extended) + 1 custom |
| Format moderne | ✅ Fait | `permission:` uniquement (pas `tools:` déprécié) |
| Organisation par catégorie | ✅ Fait | 13 sous-répertoires (nested agents) |
| Script de synchronisation | ✅ Fait | `sync-agents.py` — fetch GitHub → convert → write |
| Système de tiers | ✅ Fait | `--tier core\|extended\|all` — synchronisation sélective |
| Documentation | ✅ Fait | README.md (FR) + README.en.md (EN) |
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
- **Curés** : 134 agents dans 13 catégories (133 synchronisés + 1 custom)
  - **Tier 1 (Core)** : 43 agents — sélection originale
  - **Tier 2 (Extended)** : 90 agents — ajoutés en Phase 1.5a
- **Taux de couverture** : ~33% des agents source
- **Catégories source mappées** : 27 → 13 catégories OpenCode
- **Profils de permissions** : 5 (full-access, read-only, analysis, content, primary)
- **Format** : Markdown + YAML frontmatter, pur OpenCode natif
