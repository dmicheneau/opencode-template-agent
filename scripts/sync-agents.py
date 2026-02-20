#!/usr/bin/env python3
"""
sync-agents.py - Fetch agent definitions from davila7/claude-code-templates
and convert them to OpenCode agent markdown format.

Usage:
    python scripts/sync-agents.py [options]
    python scripts/sync-agents.py --list
    python scripts/sync-agents.py --filter programming-languages
    python scripts/sync-agents.py --all
    python scripts/sync-agents.py --dry-run --verbose
    python scripts/sync-agents.py --clean --force

Requires: Python 3.8+ (stdlib only, no pip dependencies)
Supports: GITHUB_TOKEN env var for higher rate limits (5000 req/hr vs 60 req/hr)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from sync_common import (
    DEFAULT_REPO,
    DEFAULT_BRANCH,
    GITHUB_API,
    RAW_BASE,
    SYNC_CACHE_FILENAME,
    _get_headers,
    _http_request,
    _api_get,
    _raw_get,
    _cached_get,
    check_rate_limit,
    _load_sync_cache,
    _save_sync_cache,
    _remove_sync_cache,
    parse_frontmatter,
    validate_output_path,
    is_synced_file,
    clean_synced_files,
    validate_agent_schema,
    check_template_conformance,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

AGENTS_BASE_PATH = "cli-tool/components/agents"

logger = logging.getLogger("sync-agents")


# Agents that should run as primary (directly selectable) rather than subagent
PRIMARY_AGENTS = frozenset(
    {
        "fullstack-developer",
        "devops-engineer",
        "cloud-architect",
    }
)

# Source category -> OpenCode subdirectory for nested agent organization
CATEGORY_MAPPING: Dict[str, str] = {
    "programming-languages": "languages",
    "development-tools": "devtools",
    "data-ai": "ai",
    "ai-specialists": "ai",
    "devops-infrastructure": "devops",
    "security": "security",
    "blockchain-web3": "security",
    "database": "data-api",
    "web-tools": "web",
    "api-graphql": "data-api",
    "documentation": "docs",
    "business-marketing": "business",
    "development-team": "web",
    "expert-advisors": "devtools",
    # Phase 1.5 — Tier 2 source categories
    "game-development": "specialist",
    "mcp-dev-team": "mcp",
    "modernization": "devops",
    "realtime": "web",
    "finance": "business",
    "git": "devtools",
    "performance-testing": "devtools",
    "ui-analysis": "web",
    "deep-research-team": "web",
    "ffmpeg-clip-team": "media",
    "obsidian-ops-team": "specialist",
    "ocr-extraction-team": "specialist",
    "podcast-creator-team": "media",
}

# ---------------------------------------------------------------------------
# Curated agent list: OpenCode name -> source path (relative to AGENTS_BASE_PATH)
# ---------------------------------------------------------------------------

CURATED_AGENTS: Dict[str, str] = {
    # Programming Languages
    "typescript-pro": "programming-languages/typescript-pro",
    "python-pro": "programming-languages/python-pro",
    "golang-pro": "programming-languages/golang-pro",
    "rust-pro": "programming-languages/rust-pro",
    "java-architect": "programming-languages/java-architect",
    "cpp-pro": "programming-languages/cpp-pro",
    "php-pro": "programming-languages/php-pro",
    "kotlin-specialist": "programming-languages/kotlin-specialist",
    "csharp-developer": "programming-languages/csharp-developer",
    "rails-expert": "programming-languages/rails-expert",
    # Development Tools
    "code-reviewer": "development-tools/code-reviewer",
    "test-automator": "development-tools/test-automator",
    "refactoring-specialist": "development-tools/refactoring-specialist",
    "debugger": "development-tools/debugger",
    "performance-engineer": "development-tools/performance-engineer",
    # Data & AI
    "ai-engineer": "data-ai/ai-engineer",
    "prompt-engineer": "data-ai/prompt-engineer",
    "data-scientist": "data-ai/data-scientist",
    "ml-engineer": "data-ai/ml-engineer",
    "llm-architect": "ai-specialists/llm-architect",
    "search-specialist": "ai-specialists/search-specialist",
    # DevOps & Infrastructure
    "kubernetes-specialist": "devops-infrastructure/kubernetes-specialist",
    "terraform-specialist": "devops-infrastructure/terraform-specialist",
    "devops-engineer": "devops-infrastructure/devops-engineer",
    "cloud-architect": "devops-infrastructure/cloud-architect",
    # Security
    "security-auditor": "security/security-auditor",
    "penetration-tester": "security/penetration-tester",
    "smart-contract-auditor": "blockchain-web3/smart-contract-auditor",
    # Database
    "database-architect": "database/database-architect",
    "postgres-pro": "database/postgres-pro",
    # Web & Frontend
    "expert-nextjs-developer": "web-tools/expert-nextjs-developer",
    "expert-react-frontend-engineer": "web-tools/expert-react-frontend-engineer",
    # API & GraphQL
    "api-architect": "api-graphql/api-architect",
    "graphql-architect": "api-graphql/graphql-architect",
    # Documentation
    "documentation-engineer": "documentation/documentation-engineer",
    "api-documenter": "documentation/api-documenter",
    "technical-writer": "documentation/technical-writer",
    # Business
    "product-manager": "business-marketing/product-manager",
    "scrum-master": "business-marketing/scrum-master",
    "project-manager": "business-marketing/project-manager",
    # Full-stack & Design
    "fullstack-developer": "development-team/fullstack-developer",
    "ui-designer": "development-team/ui-designer",
    "mobile-developer": "development-team/mobile-developer",
}

# ---------------------------------------------------------------------------
# Extended agent list (Phase 1.5 — Tier 2): additional ~90 agents
# Same format as CURATED_AGENTS: 'agent-name': 'source-category/agent-name'
# ---------------------------------------------------------------------------

EXTENDED_AGENTS: Dict[str, str] = {
    # Programming Languages (languages/)
    "angular-architect": "programming-languages/angular-architect",
    "c-pro": "programming-languages/c-pro",
    "django-developer": "programming-languages/django-developer",
    "dotnet-core-expert": "programming-languages/dotnet-core-expert",
    "elixir-expert": "programming-languages/elixir-expert",
    "embedded-systems": "programming-languages/embedded-systems",
    "flutter-expert": "programming-languages/flutter-expert",
    "javascript-pro": "programming-languages/javascript-pro",
    "laravel-specialist": "programming-languages/laravel-specialist",
    "nextjs-developer": "programming-languages/nextjs-developer",
    "powershell-7-expert": "programming-languages/powershell-7-expert",
    "react-specialist": "programming-languages/react-specialist",
    "rust-engineer": "programming-languages/rust-engineer",
    "shell-scripting-pro": "programming-languages/shell-scripting-pro",
    "spring-boot-engineer": "programming-languages/spring-boot-engineer",
    "swift-expert": "programming-languages/swift-expert",
    "vue-expert": "programming-languages/vue-expert",
    "ruby-mcp-expert": "programming-languages/ruby-mcp-expert",
    # DevOps & Infrastructure (devops/)
    "deployment-engineer": "devops-infrastructure/deployment-engineer",
    "devops-expert": "devops-infrastructure/devops-expert",
    "devops-troubleshooter": "devops-infrastructure/devops-troubleshooter",
    "microservices-architect": "devops-infrastructure/microservices-architect",
    "monitoring-specialist": "devops-infrastructure/monitoring-specialist",
    "network-engineer": "devops-infrastructure/network-engineer",
    "platform-engineer": "devops-infrastructure/platform-engineer",
    "sre-engineer": "devops-infrastructure/sre-engineer",
    "terraform-engineer": "devops-infrastructure/terraform-engineer",
    "vercel-deployment-specialist": "devops-infrastructure/vercel-deployment-specialist",
    "cloud-migration-specialist": "modernization/cloud-migration-specialist",
    "legacy-modernizer": "modernization/legacy-modernizer",
    # Data & AI (ai/)
    "ai-ethics-advisor": "ai-specialists/ai-ethics-advisor",
    "computer-vision-engineer": "data-ai/computer-vision-engineer",
    "data-analyst": "data-ai/data-analyst",
    "data-engineer": "data-ai/data-engineer",
    "mlops-engineer": "data-ai/mlops-engineer",
    "nlp-engineer": "data-ai/nlp-engineer",
    "machine-learning-engineer": "data-ai/machine-learning-engineer",
    "task-decomposition-expert": "ai-specialists/task-decomposition-expert",
    "llms-maintainer": "ai-specialists/llms-maintainer",
    "model-evaluator": "ai-specialists/model-evaluator",
    # Development Tools (devtools/)
    "build-engineer": "development-tools/build-engineer",
    "chaos-engineer": "development-tools/chaos-engineer",
    "codebase-pattern-finder": "development-tools/codebase-pattern-finder",
    "dependency-manager": "development-tools/dependency-manager",
    "dx-optimizer": "development-tools/dx-optimizer",
    "error-detective": "development-tools/error-detective",
    "general-purpose": "development-tools/general-purpose",
    "mcp-expert": "development-tools/mcp-expert",
    "performance-profiler": "development-tools/performance-profiler",
    "qa-expert": "development-tools/qa-expert",
    "technical-debt-manager": "development-tools/technical-debt-manager",
    "test-engineer": "development-tools/test-engineer",
    # Security (security/)
    "compliance-auditor": "security/compliance-auditor",
    "compliance-specialist": "security/compliance-specialist",
    "incident-responder": "security/incident-responder",
    "security-engineer": "security/security-engineer",
    "se-security-reviewer": "security/se-security-reviewer",
    "github-actions-expert": "security/github-actions-expert",
    # Database (database/)
    "database-admin": "database/database-admin",
    "database-optimizer": "database/database-optimizer",
    "nosql-specialist": "database/nosql-specialist",
    "supabase-schema-architect": "database/supabase-schema-architect",
    # Web & Frontend (web/)
    "accessibility": "web-tools/accessibility",
    "nextjs-architecture-expert": "web-tools/nextjs-architecture-expert",
    "react-performance-optimizer": "web-tools/react-performance-optimizer",
    "seo-analyzer": "web-tools/seo-analyzer",
    "web-accessibility-checker": "web-tools/web-accessibility-checker",
    "websocket-engineer": "realtime/websocket-engineer",
    # Documentation (docs/)
    "changelog-generator": "documentation/changelog-generator",
    "diagram-architect": "documentation/diagram-architect",
    "docusaurus-expert": "documentation/docusaurus-expert",
    "arch": "documentation/arch",
    # Business & Marketing (business/)
    "business-analyst": "business-marketing/business-analyst",
    "competitive-analyst": "business-marketing/competitive-analyst",
    "ux-researcher": "business-marketing/ux-researcher",
    "market-researcher": "business-marketing/market-researcher",
    "sales-engineer": "business-marketing/sales-engineer",
    "fintech-engineer": "finance/fintech-engineer",
    # API & GraphQL (api/)
    "api-designer": "api-graphql/api-designer",
    "graphql-performance-optimizer": "api-graphql/graphql-performance-optimizer",
    # Development Team (team/)
    "backend-architect": "development-team/backend-architect",
    "code-architect": "development-team/code-architect",
    "code-explorer": "development-team/code-explorer",
    # Specialist (specialist/)
    "game-developer": "game-development/game-developer",
    "unity-game-developer": "game-development/unity-game-developer",
    "blockchain-developer": "blockchain-web3/blockchain-developer",
    # MCP (mcp/)
    "mcp-server-architect": "mcp-dev-team/mcp-server-architect",
    "mcp-developer": "mcp-dev-team/mcp-developer",
    "mcp-integration-engineer": "mcp-dev-team/mcp-integration-engineer",
    "mcp-protocol-specialist": "mcp-dev-team/mcp-protocol-specialist",
}

# ---------------------------------------------------------------------------
# Permission types
# ---------------------------------------------------------------------------

# Type alias for permission values: either a simple string or a nested dict
PermissionValue = Union[str, Dict[str, str]]

# Read-only permission profile for uncurated (discovered-only) agents.
# Unknown agents must not get write/edit/bash access automatically.
UNKNOWN_PERMISSIONS: Dict[str, PermissionValue] = {
    "write": "deny",
    "edit": "deny",
    "bash": "deny",
    "mcp": "deny",
    "task": "deny",
}


# ---------------------------------------------------------------------------
# Archetype system (S2 — Agent Enrichment)
# ---------------------------------------------------------------------------

# 5 archetypes: Builder, Auditor, Analyst, Orchestrator, Specialist
# Each maps to a full 17-permission set + optional bash patterns.

# Universal safe set — allow for ALL archetypes (read-only / reasoning tools)
_UNIVERSAL_SAFE: Dict[str, str] = {
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "distill": "allow",
    "prune": "allow",
    "sequentialthinking": "allow",
    "skill": "allow",
}

# Full 17-permission maps per archetype (excluding bash patterns, handled separately)
ARCHETYPE_PERMISSIONS: Dict[str, Dict[str, PermissionValue]] = {
    "Builder": {
        **_UNIVERSAL_SAFE,
        "write": "allow",
        "edit": "allow",
        "bash": "patterns",  # placeholder — replaced by bash pattern map
        "webfetch": "allow",
        "task": "allow",
        "mcp": "ask",
        "todoread": "allow",
        "todowrite": "allow",
        "memory": "allow",
        "browsermcp": "deny",
    },
    "Auditor": {
        **_UNIVERSAL_SAFE,
        "write": "deny",
        "edit": "deny",
        "bash": "deny",
        "webfetch": "ask",
        "task": "allow",
        "mcp": "deny",
        "todoread": "allow",
        "todowrite": "deny",
        "memory": "allow",
        "browsermcp": "deny",
    },
    "Analyst": {
        **_UNIVERSAL_SAFE,
        "write": "allow",
        "edit": "ask",
        "bash": "patterns",  # placeholder
        "webfetch": "allow",
        "task": "allow",
        "mcp": "ask",
        "todoread": "allow",
        "todowrite": "allow",
        "memory": "allow",
        "browsermcp": "deny",
    },
    "Orchestrator": {
        **_UNIVERSAL_SAFE,
        "write": "deny",
        "edit": "deny",
        "bash": "deny",
        "webfetch": "ask",
        "task": "allow",
        "mcp": "deny",
        "todoread": "allow",
        "todowrite": "allow",
        "memory": "allow",
        "browsermcp": "deny",
    },
    "Specialist": {
        **_UNIVERSAL_SAFE,
        "write": "allow",
        "edit": "allow",
        "bash": "patterns",  # placeholder — replaced by sub-profile
        "webfetch": "allow",
        "task": "allow",
        "mcp": "ask",
        "todoread": "allow",
        "todowrite": "allow",
        "memory": "allow",
        "browsermcp": "deny",
    },
}

# Builder bash patterns (broad language ecosystem coverage)
BUILDER_BASH_PATTERNS: Dict[str, str] = {
    "*": "ask",
    # Git
    "git *": "allow",
    # JS/TS
    "npm *": "allow",
    "npx *": "allow",
    "yarn *": "allow",
    "pnpm *": "allow",
    "node *": "allow",
    "bun *": "allow",
    "deno *": "allow",
    "tsc *": "allow",
    # Python
    "pytest*": "allow",
    "python -m pytest*": "allow",
    "python *": "allow",
    "python3 *": "allow",
    "pip *": "allow",
    "pip3 *": "allow",
    "uv *": "allow",
    "ruff *": "allow",
    "mypy *": "allow",
    # Go
    "go test*": "allow",
    "go build*": "allow",
    "go run*": "allow",
    "go mod*": "allow",
    "go vet*": "allow",
    "golangci-lint*": "allow",
    # Rust
    "cargo test*": "allow",
    "cargo build*": "allow",
    "cargo run*": "allow",
    "cargo clippy*": "allow",
    "cargo fmt*": "allow",
    # JVM
    "mvn *": "allow",
    "gradle *": "allow",
    "gradlew *": "allow",
    # .NET
    "dotnet *": "allow",
    # C/C++
    "make*": "allow",
    "cmake*": "allow",
    "gcc *": "allow",
    "g++ *": "allow",
    "clang*": "allow",
    # General build tools
    "just *": "allow",
    "task *": "allow",
    # Safe read commands
    "ls*": "allow",
    "cat *": "allow",
    "head *": "allow",
    "tail *": "allow",
    "wc *": "allow",
    "which *": "allow",
    "echo *": "allow",
    "mkdir *": "allow",
    "pwd": "allow",
    "env": "allow",
    "printenv*": "allow",
}

# Analyst bash patterns (data tools + read-only git)
ANALYST_BASH_PATTERNS: Dict[str, str] = {
    "*": "ask",
    # Python data stack
    "python *": "allow",
    "python3 *": "allow",
    "pip *": "allow",
    "pip3 *": "allow",
    "uv *": "allow",
    "jupyter *": "allow",
    "ipython*": "allow",
    # R
    "Rscript *": "allow",
    # Data tools
    "sqlite3 *": "allow",
    "jq *": "allow",
    "csvkit*": "allow",
    "csvtool*": "allow",
    # Safe read commands
    "cat *": "allow",
    "head *": "allow",
    "tail *": "allow",
    "wc *": "allow",
    "sort *": "allow",
    "uniq *": "allow",
    "cut *": "allow",
    "ls*": "allow",
    "pwd": "allow",
    "echo *": "allow",
    # Git (read-only)
    "git log*": "allow",
    "git status*": "allow",
    "git diff*": "allow",
    "git show*": "allow",
}

# Specialist sub-profile bash patterns (domain-scoped)
SPECIALIST_BASH_PATTERNS: Dict[str, Dict[str, str]] = {
    "infra": {
        "*": "ask",
        "terraform *": "allow",
        "tf *": "allow",
        "kubectl *": "allow",
        "helm *": "allow",
        "docker *": "allow",
        "docker-compose *": "allow",
        "aws *": "allow",
        "gcloud *": "allow",
        "az *": "allow",
        "ansible*": "allow",
        "systemctl *": "ask",
        "journalctl *": "allow",
        "ss *": "allow",
        "ip *": "allow",
        "dig *": "allow",
        "nslookup *": "allow",
        "ping *": "allow",
        "traceroute *": "allow",
        "curl *": "ask",
        "wget *": "ask",
        "git *": "allow",
        "ls*": "allow",
        "cat *": "allow",
        "head *": "allow",
        "tail *": "allow",
        "wc *": "allow",
        "which *": "allow",
        "echo *": "allow",
        "mkdir *": "allow",
        "pwd": "allow",
        "env": "allow",
        "printenv*": "allow",
        "ssh *": "ask",
        "scp *": "ask",
    },
    "data": {
        "*": "ask",
        "psql *": "allow",
        "pg_dump*": "ask",
        "pg_restore*": "ask",
        "redis-cli *": "allow",
        "mysql *": "allow",
        "mongosh *": "allow",
        "sqlite3 *": "allow",
        "curl *": "ask",
        "httpie *": "ask",
        "grpcurl *": "allow",
        "git *": "allow",
        "ls*": "allow",
        "cat *": "allow",
        "head *": "allow",
        "tail *": "allow",
        "jq *": "allow",
        "wc *": "allow",
        "echo *": "allow",
        "mkdir *": "allow",
        "pwd": "allow",
    },
    "security": {
        "*": "ask",
        "nmap *": "ask",
        "nikto *": "ask",
        "dig *": "allow",
        "whois *": "allow",
        "nslookup *": "allow",
        "ping *": "allow",
        "traceroute *": "allow",
        "curl *": "ask",
        "git log*": "allow",
        "git status*": "allow",
        "git diff*": "allow",
        "git show*": "allow",
        "ls*": "allow",
        "cat *": "allow",
        "head *": "allow",
        "tail *": "allow",
        "which *": "allow",
        "echo *": "allow",
        "pwd": "allow",
    },
    "docs": {
        "*": "deny",
    },
    "ai-infra": {
        "*": "ask",
        "python *": "allow",
        "python3 *": "allow",
        "pip *": "allow",
        "pip3 *": "allow",
        "uv *": "allow",
        "docker *": "allow",
        "kubectl *": "allow",
        "mlflow *": "allow",
        "wandb *": "allow",
        "dvc *": "allow",
        "bentoml *": "allow",
        "triton*": "allow",
        "git *": "allow",
        "ls*": "allow",
        "cat *": "allow",
        "head *": "allow",
        "tail *": "allow",
        "wc *": "allow",
        "echo *": "allow",
        "mkdir *": "allow",
        "pwd": "allow",
        "nvidia-smi*": "allow",
    },
    "architecture": {
        "*": "ask",
        "docker *": "allow",
        "docker-compose *": "allow",
        "kubectl *": "allow",
        "curl *": "ask",
        "git *": "allow",
        "ls*": "allow",
        "cat *": "allow",
        "head *": "allow",
        "tail *": "allow",
        "echo *": "allow",
        "pwd": "allow",
    },
}

# Per-agent exceptions that override archetype defaults
SPECIALIST_EXCEPTIONS: Dict[str, Dict[str, PermissionValue]] = {
    "penetration-tester": {"browsermcp": "ask"},
    "ui-designer": {"browsermcp": "ask"},
    "diagram-architect": {
        "bash": {
            "*": "deny",
            "mmdc *": "allow",
            "plantuml *": "allow",
        },
    },
}

# Agent-to-archetype mapping for agents that go through the sync pipeline
# (present in CURATED_AGENTS or EXTENDED_AGENTS).
#
# Agents that exist in the manifest but are NOT synced (hand-written or added
# via other pipelines) belong in LOCAL_AGENT_ARCHETYPES below.
AGENT_ARCHETYPE_MAP: Dict[str, tuple[str, str | None]] = {
    "accessibility": ("Auditor", None),
    "ai-engineer": ("Builder", None),
    "angular-architect": ("Builder", None),
    "api-architect": ("Specialist", "data"),
    "api-documenter": ("Specialist", "docs"),
    "business-analyst": ("Analyst", None),
    "cloud-architect": ("Specialist", "infra"),
    "code-reviewer": ("Auditor", None),
    "cpp-pro": ("Builder", None),
    "csharp-developer": ("Builder", None),
    "data-analyst": ("Analyst", None),
    "data-engineer": ("Builder", None),
    "data-scientist": ("Analyst", None),
    "database-architect": ("Specialist", "data"),
    "debugger": ("Builder", None),
    "devops-engineer": ("Specialist", "infra"),
    "diagram-architect": ("Specialist", "docs"),
    "documentation-engineer": ("Specialist", "docs"),
    "expert-nextjs-developer": ("Builder", None),
    "expert-react-frontend-engineer": ("Builder", None),
    "fullstack-developer": ("Builder", None),
    "golang-pro": ("Builder", None),
    "graphql-architect": ("Specialist", "data"),
    "java-architect": ("Builder", None),
    "kotlin-specialist": ("Builder", None),
    "kubernetes-specialist": ("Specialist", "infra"),
    "llm-architect": ("Specialist", "ai-infra"),
    "mcp-developer": ("Builder", None),
    "mcp-protocol-specialist": ("Auditor", None),
    "mcp-server-architect": ("Builder", None),
    "microservices-architect": ("Specialist", "architecture"),
    "ml-engineer": ("Builder", None),
    "mlops-engineer": ("Specialist", "ai-infra"),
    "mobile-developer": ("Builder", None),
    "penetration-tester": ("Specialist", "security"),
    "performance-engineer": ("Auditor", None),
    "php-pro": ("Builder", None),
    "platform-engineer": ("Specialist", "infra"),
    "postgres-pro": ("Specialist", "data"),
    "product-manager": ("Orchestrator", None),
    "project-manager": ("Orchestrator", None),
    "prompt-engineer": ("Analyst", None),
    "python-pro": ("Builder", None),
    "qa-expert": ("Auditor", None),
    "rails-expert": ("Builder", None),
    "refactoring-specialist": ("Builder", None),
    "rust-pro": ("Builder", None),
    "scrum-master": ("Orchestrator", None),
    "search-specialist": ("Analyst", None),
    "security-auditor": ("Auditor", None),
    "security-engineer": ("Specialist", "security"),
    "smart-contract-auditor": ("Auditor", None),
    "sre-engineer": ("Specialist", "infra"),
    "swift-expert": ("Builder", None),
    "technical-writer": ("Specialist", "docs"),
    "terraform-specialist": ("Builder", None),
    "test-automator": ("Builder", None),
    "typescript-pro": ("Builder", None),
    "ui-designer": ("Specialist", "docs"),
    "ux-researcher": ("Analyst", None),
    "vue-expert": ("Builder", None),
}

# Archetype data for agents that exist in the manifest but are NOT part of
# the sync pipeline (hand-written, added via other tools, etc.).
# The quality scorer and other tools can use this for archetype lookups.
LOCAL_AGENT_ARCHETYPES: Dict[str, tuple[str, str | None]] = {
    "aws-specialist": ("Specialist", "infra"),
    "ci-cd-engineer": ("Builder", None),
    "docker-specialist": ("Builder", None),
    "episode-orchestrator": ("Orchestrator", None),
    "linux-admin": ("Specialist", "infra"),
    "mcp-security-auditor": ("Auditor", None),
    "prd": ("Orchestrator", None),
    "redis-specialist": ("Specialist", "data"),
    "screenshot-ui-analyzer": ("Auditor", None),
}

# Default archetype inference by OpenCode category — used as a fallback
# when an agent isn't in AGENT_ARCHETYPE_MAP or LOCAL_AGENT_ARCHETYPES.
_CATEGORY_ARCHETYPE_DEFAULTS: Dict[str, tuple[str, str | None]] = {
    "languages": ("Builder", None),
    "devtools": ("Builder", None),
    "web": ("Builder", None),
    "ai": ("Specialist", "ai-infra"),
    "security": ("Auditor", None),
    "devops": ("Specialist", "infra"),
    "data-api": ("Specialist", "data"),
    "docs": ("Specialist", "docs"),
    "business": ("Orchestrator", None),
    "mcp": ("Builder", None),
    "specialist": ("Builder", None),
    "media": ("Builder", None),
}


def infer_archetype_from_category(agent_name: str) -> tuple[str | None, str | None]:
    """Infer an archetype from the agent's OpenCode category.

    Looks up the agent in CURATED_AGENTS / EXTENDED_AGENTS, maps the source
    category to an OpenCode category, then returns a default archetype for
    that category.

    Returns:
        ``(archetype, sub_profile)`` or ``(None, None)`` if the agent isn't
        in the curated/extended lists or the category isn't mapped.
    """
    source_path = CURATED_AGENTS.get(agent_name) or EXTENDED_AGENTS.get(agent_name)
    if not source_path:
        return (None, None)
    source_category = source_path.split("/")[0] if "/" in source_path else "unknown"
    oc_category = _get_opencode_category(source_category)
    return _CATEGORY_ARCHETYPE_DEFAULTS.get(oc_category, (None, None))


def get_archetype(agent_name: str) -> tuple[str | None, str | None]:
    """Look up an agent's archetype and sub-profile.

    Resolution order:
    1. Explicit ``AGENT_ARCHETYPE_MAP`` (synced agents)
    2. ``LOCAL_AGENT_ARCHETYPES`` (hand-written / non-synced agents)
    3. ``infer_archetype_from_category()`` (fallback by category)

    Returns:
        ``(archetype, sub_profile)`` for known agents, e.g.
        ``("Builder", None)`` or ``("Specialist", "infra")``.
        ``(None, None)`` for agents not resolvable.
    """
    result = AGENT_ARCHETYPE_MAP.get(agent_name)
    if result is not None:
        return result
    result = LOCAL_AGENT_ARCHETYPES.get(agent_name)
    if result is not None:
        return result
    return infer_archetype_from_category(agent_name)


def build_archetype_permissions(
    agent_name: str,
) -> Optional[Dict[str, PermissionValue]]:
    """Assemble a full permission dict from archetype + bash patterns + exceptions.

    Returns ``None`` for agents not in the archetype map (caller should
    fall back to :func:`build_permissions`).
    """
    archetype, sub_profile = get_archetype(agent_name)
    if archetype is None:
        return None

    # Start with a copy of the archetype base permissions
    perms: Dict[str, PermissionValue] = dict(ARCHETYPE_PERMISSIONS[archetype])

    # Resolve bash patterns for archetypes that use them
    if perms.get("bash") == "patterns":
        if archetype == "Builder":
            perms["bash"] = dict(BUILDER_BASH_PATTERNS)
        elif archetype == "Analyst":
            perms["bash"] = dict(ANALYST_BASH_PATTERNS)
        elif archetype == "Specialist" and sub_profile:
            bash_patterns = SPECIALIST_BASH_PATTERNS.get(sub_profile)
            if bash_patterns:
                perms["bash"] = dict(bash_patterns)
            else:
                logger.warning(
                    "Unknown sub-profile '%s' for %s, using fallback bash patterns",
                    sub_profile,
                    agent_name,
                )
                perms["bash"] = {"*": "ask"}
        else:
            # Fallback — should not happen with well-formed data
            perms["bash"] = {"*": "ask"}

    # Apply per-agent exceptions (overrides archetype defaults)
    exceptions = SPECIALIST_EXCEPTIONS.get(agent_name)
    if exceptions:
        for key, value in exceptions.items():
            perms[key] = value if isinstance(value, str) else dict(value)

    return perms


# ---------------------------------------------------------------------------
# Permission building (legacy — used for agents not in archetype map)
# ---------------------------------------------------------------------------


def build_permissions(tools_str: str) -> Dict[str, PermissionValue]:
    """Convert source tools string to OpenCode permission dict.

    Maps the source ``tools:`` field values to the modern OpenCode
    ``permission:`` format with granular, security-aware defaults.

    Args:
        tools_str: Comma-separated tool names from the source frontmatter
            (e.g. ``"Read, Write, Edit, Bash, Glob, Grep"``).

    Returns:
        A dict suitable for serializing into the ``permission:`` frontmatter
        block.  Values are either simple strings (``"allow"``, ``"ask"``,
        ``"deny"``) or nested dicts for granular control.
    """
    tools_list = [t.strip().lower() for t in tools_str.split(",")]

    # Detect capabilities — handles both OpenCode-style ("Write", "Edit",
    # "Bash") and VS Code-style ("new", "edit/editFiles", "runCommands").
    has_write = any("write" in t or t in ("new", "changes") for t in tools_list)
    has_edit = any("edit" in t for t in tools_list)
    has_bash = any("bash" in t or t.startswith("run") for t in tools_list)
    has_webfetch = any(
        "webfetch" in t or "websearch" in t or "fetch" in t or "opensimplebrowser" in t
        for t in tools_list
    )

    perms: Dict[str, PermissionValue] = {}

    # Write permission
    if has_write:
        perms["write"] = "allow"
    else:
        perms["write"] = "deny"

    # Edit permission - always ask for edits for safety
    if has_edit:
        perms["edit"] = "ask"
    else:
        perms["edit"] = "deny"

    # Bash permission - granular
    if has_bash:
        perms["bash"] = {
            "*": "ask",
            "git status": "allow",
            "git diff*": "allow",
            "git log*": "allow",
        }
    else:
        perms["bash"] = "deny"

    # Webfetch
    if has_webfetch:
        perms["webfetch"] = "allow"

    # Task (subagents can invoke other subagents)
    perms["task"] = "allow"

    # Normalize: if a permission is {"*": "allow"} with only one key, simplify
    for key, val in list(perms.items()):
        if isinstance(val, dict) and val == {"*": "allow"}:
            perms[key] = "allow"

    return perms


def _get_opencode_category(source_category: str) -> str:
    """Map a source category to an OpenCode subdirectory name.

    Falls back to the source category name (lowercased, stripped of common
    suffixes) when there is no explicit mapping.
    """
    return CATEGORY_MAPPING.get(source_category, source_category)


def _get_agent_relative_path(name: str, source_category: str) -> str:
    """Return the relative path (within output_dir) for an agent file.

    Primary agents are placed at the root; subagents go into their
    OpenCode category subdirectory.

    Examples:
        - ``fullstack-developer`` (primary) -> ``"fullstack-developer"``
        - ``typescript-pro`` (subagent, languages) -> ``"languages/typescript-pro"``
    """
    if name in PRIMARY_AGENTS:
        return name
    oc_cat = _get_opencode_category(source_category)
    return f"{oc_cat}/{name}"


# ---------------------------------------------------------------------------
# Conversion logic
# ---------------------------------------------------------------------------


def extract_short_description(long_desc: str, name: str) -> str:
    """
    Extract a short 1-2 sentence description from the verbose source
    description. Removes XML example blocks and Claude Code references.
    """
    if not long_desc:
        # Fallback based on the agent name
        return f"Specialized agent for {name.replace('-', ' ')} tasks."

    # Take text before the first <example> block
    before_example = re.split(r"<example>", long_desc, maxsplit=1)[0].strip()

    # Also handle "Use when..." / "Use this agent when..." patterns
    if before_example.startswith("Use "):
        # Already a good short description; just clean it up
        desc = before_example
    elif before_example:
        desc = before_example
    else:
        # No text before examples; try to extract from commentary blocks
        commentaries = re.findall(
            r"<commentary>\s*(.*?)\s*</commentary>", long_desc, re.DOTALL
        )
        if commentaries:
            desc = commentaries[0]
        else:
            desc = f"Specialized agent for {name.replace('-', ' ')} tasks."

    # Clean up
    desc = re.sub(r"<[^>]+>", "", desc)  # Remove XML tags
    desc = re.sub(r"\\n", " ", desc)  # Replace literal \n
    desc = re.sub(r"\s+", " ", desc).strip()  # Normalize whitespace

    # Replace Claude-specific references
    desc = desc.replace("Claude Code", "OpenCode")
    desc = desc.replace("Claude", "the AI agent")

    # Truncate to ~2 sentences if too long
    sentences = re.split(r"(?<=[.!?])\s+", desc)
    if len(sentences) > 2:
        desc = " ".join(sentences[:2])

    # Remove "Specifically:" trailing text BEFORE ensuring period
    # (otherwise "Specifically:" gets a "." appended first, breaking the regex)
    desc = re.sub(r"\s*Specifically:[\s\\.]*$", "", desc)
    # Clean trailing backslashes, dots, and whitespace
    desc = re.sub(r"[\s\\.]+$", "", desc)

    # Ensure it ends with a period
    if desc and not desc.endswith((".", "!", "?")):
        desc += "."

    return desc


def clean_body(body: str) -> str:
    """
    Clean the system prompt body:
    - Remove <example> blocks with user/assistant dialogue
    - Replace Claude Code-specific references
    """
    # Remove complete <example>...</example> blocks that contain user/assistant dialogue
    body = re.sub(
        r"<example>\s*.*?</example>\s*",
        "",
        body,
        flags=re.DOTALL,
    )

    # Remove orphaned <commentary>...</commentary> blocks
    body = re.sub(
        r"<commentary>\s*.*?</commentary>\s*",
        "",
        body,
        flags=re.DOTALL,
    )

    # Replace Claude-specific references
    body = body.replace("Claude Code", "OpenCode")
    # Be careful not to replace "Claude" inside model names or proper nouns
    # Only replace standalone "Claude" that clearly refers to the assistant
    body = re.sub(
        r"(?<![/\w])Claude(?!\s*(Code|Sonnet|Opus|Haiku|3|4|\.))",
        "the AI assistant",
        body,
    )

    # Clean up multiple blank lines (max 2 consecutive)
    body = re.sub(r"\n{4,}", "\n\n\n", body)

    return body.strip()


# ---------------------------------------------------------------------------
# YAML serialization helpers (stdlib only — no PyYAML)
# ---------------------------------------------------------------------------


def _yaml_serialize_permission(
    perms: Dict[str, PermissionValue], indent: int = 0
) -> List[str]:
    """Serialize a permission dict into YAML lines.

    Handles both simple string values and one level of nested dicts.
    Keys that contain special YAML characters (like ``*``) are quoted.

    Args:
        perms: The permission dict to serialize.
        indent: Number of leading spaces for the top-level keys.

    Returns:
        A list of YAML lines (without trailing newlines).
    """
    lines: List[str] = []
    prefix = " " * indent

    for key, value in perms.items():
        if isinstance(value, str):
            lines.append(f"{prefix}{key}: {value}")
        elif isinstance(value, dict):
            lines.append(f"{prefix}{key}:")
            for sub_key, sub_val in value.items():
                # Quote keys that contain special characters
                if any(c in sub_key for c in "*{}[]|>&!%@`"):
                    quoted_key = f'"{sub_key}"'
                else:
                    quoted_key = sub_key
                lines.append(f"{prefix}  {quoted_key}: {sub_val}")

    return lines


# ---------------------------------------------------------------------------
# Agent file builder
# ---------------------------------------------------------------------------


def build_opencode_agent(
    name: str,
    meta: Dict[str, str],
    body: str,
    category: str,
    permissions: Optional[Dict[str, PermissionValue]] = None,
) -> str:
    """
    Build an OpenCode agent markdown file from parsed source data.

    Generates the modern OpenCode frontmatter format using ``permission:``
    only (no deprecated ``tools:`` block).
    """
    # --- Description ---
    short_desc = extract_short_description(meta.get("description", ""), name)

    # --- Mode ---
    mode = "primary" if name in PRIMARY_AGENTS else "subagent"

    # --- Permissions ---
    perms = (
        permissions
        if permissions is not None
        else build_permissions(meta.get("tools", ""))
    )

    # --- Build frontmatter ---
    lines: List[str] = []
    lines.append("---")

    # Description (use > for multiline folded scalar if needed)
    if "\n" in short_desc or len(short_desc) > 80:
        lines.append("description: >")
        # Wrap at ~78 chars with 2-space indent
        words = short_desc.split()
        current_line = "  "
        for word in words:
            if len(current_line) + len(word) + 1 > 80:
                lines.append(current_line.rstrip())
                current_line = "  " + word
            else:
                current_line += (" " if current_line.strip() else "") + word
        if current_line.strip():
            lines.append(current_line.rstrip())
    else:
        escaped_desc = short_desc.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'description: "{escaped_desc}"')

    lines.append(f"mode: {mode}")

    # Permission block (replaces the old tools: + permission: combo)
    lines.append("permission:")
    lines.extend(_yaml_serialize_permission(perms, indent=2))

    lines.append("---")

    # --- Header comment ---
    header = (
        f"<!-- Synced from aitmpl.com | source: {DEFAULT_REPO} "
        f"| category: {category} -->"
    )

    # --- Body ---
    cleaned_body = clean_body(body)

    return f"{chr(10).join(lines)}\n\n{header}\n\n{cleaned_body}\n"


# ---------------------------------------------------------------------------
# Discovery: list all agents in the repo (for --all mode)
# ---------------------------------------------------------------------------


def discover_all_agents(repo: str) -> Dict[str, str]:
    """
    Walk all subdirectories under AGENTS_BASE_PATH and return a dict
    mapping agent_name -> category/agent_name for every .md file found.
    Excludes README.md files.
    """
    all_agents: Dict[str, str] = {}

    url = f"{GITHUB_API}/repos/{repo}/contents/{AGENTS_BASE_PATH}"
    categories = _api_get(url)
    if not categories:
        logger.error("Error: Could not list agent categories from repo.")
        return all_agents

    for entry in categories:
        if entry.get("type") != "dir":
            continue
        cat_name = entry["name"]

        cat_url = f"{GITHUB_API}/repos/{repo}/contents/{AGENTS_BASE_PATH}/{cat_name}"
        files = _api_get(cat_url)
        if not files:
            continue

        for f in files:
            fname = f.get("name", "")
            if (
                f.get("type") == "file"
                and fname.endswith(".md")
                and fname.lower() != "readme.md"
            ):
                agent_name = fname[:-3]  # strip .md
                # Security: reject suspicious agent names (path traversal)
                if ".." in agent_name or "/" in agent_name or "\\" in agent_name:
                    logger.warning(
                        "  [SECURITY] Skipping suspicious agent name: %s",
                        agent_name,
                    )
                    continue
                all_agents[agent_name] = f"{cat_name}/{agent_name}"

    return all_agents


# ---------------------------------------------------------------------------
# Clean: remove previously synced agent files
# ---------------------------------------------------------------------------


def clean_synced_agents(
    output_dir: Path,
    *,
    dry_run: bool = False,
    verbose: bool = False,
) -> int:
    """Remove all previously synced agent files from output_dir.

    Non-synced agent files (e.g. hand-written agents like
    ``episode-orchestrator.md``) are preserved.

    Returns the number of files removed.
    """
    return clean_synced_files(output_dir, dry_run=dry_run, verbose=verbose)


# ---------------------------------------------------------------------------
# Main sync logic
# ---------------------------------------------------------------------------


def sync_agent(
    name: str,
    source_path: str,
    repo: str,
    output_dir: Path,
    *,
    dry_run: bool = False,
    force: bool = False,
    verbose: bool = False,
    permissions: Optional[Dict[str, PermissionValue]] = None,
    incremental: bool = False,
    sync_cache: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Fetch, convert, and write a single agent. Returns manifest entry or None.

    Args:
        permissions: Optional permission dict override. When provided, this
            is used instead of auto-detecting permissions from the source
            ``tools:`` field.  Pass :data:`UNKNOWN_PERMISSIONS` for
            uncurated agents.
        incremental: When True and *sync_cache* is provided, use conditional
            HTTP requests (ETag / If-Modified-Since) and skip unchanged
            agents.
        sync_cache: Mutable cache dict — updated in-place by
            :func:`_cached_get`.  Ignored when *force* is True.
    """
    category = source_path.split("/")[0] if "/" in source_path else "unknown"
    raw_url = f"{RAW_BASE}/{repo}/{DEFAULT_BRANCH}/{AGENTS_BASE_PATH}/{source_path}.md"

    if verbose:
        logger.debug("  Fetching: %s", raw_url)

    # Use incremental (cached) GET when possible
    use_cache = incremental and sync_cache is not None and not force
    if use_cache:
        assert sync_cache is not None  # narrowing for type checker
        content = _cached_get(raw_url, name, sync_cache)
        if content is None and name in sync_cache:
            # Could be 304 Not Modified or a 404 for a deleted agent.
            # Verify the agent file actually exists on disk — if it doesn't,
            # this isn't a valid 304 scenario (the agent was likely deleted
            # upstream and we just have stale cache metadata).
            relative_path = _get_agent_relative_path(name, category)
            expected_file = output_dir / f"{relative_path}.md"
            if not expected_file.is_file():
                logger.warning(
                    "  [skip] %s: cached but file missing on disk — treating as 404",
                    name,
                )
                return None
            # 304 Not Modified — agent unchanged
            if verbose:
                logger.debug("  [cached] %s: unchanged (304 Not Modified)", name)
            # Build a minimal manifest entry from previous data
            oc_category = _get_opencode_category(category)
            relative_path = _get_agent_relative_path(name, category)
            mode = "primary" if name in PRIMARY_AGENTS else "subagent"
            return {
                "name": name,
                "path": relative_path,
                "category": category,
                "opencode_category": oc_category,
                "mode": mode,
                "source": f"{AGENTS_BASE_PATH}/{source_path}.md",
                "status": "unchanged",
            }
        elif content is None:
            # Truly not found (404)
            logger.warning("  [skip] %s: not found at %s.md", name, source_path)
            return None
    else:
        content = _raw_get(raw_url)
        if content is None:
            logger.warning("  [skip] %s: not found at %s.md", name, source_path)
            return None

    meta, body = parse_frontmatter(content)
    if not body.strip():
        logger.warning("  [skip] %s: empty body after parsing", name)
        return None

    # Build permission dict (used for both the agent file and the manifest)
    #
    # Priority: explicit override > archetype system > legacy tool-based detection
    if permissions is not None:
        perms = permissions
    else:
        perms = build_archetype_permissions(name)
        if perms is None:
            perms = build_permissions(meta.get("tools", ""))

    # Build OpenCode agent
    agent_md = build_opencode_agent(name, meta, body, category, permissions=perms)

    # S2 validation — log warnings, never block sync
    schema_warnings = validate_agent_schema(agent_md)
    for w in schema_warnings:
        logger.debug("  [schema] %s: %s", name, w)
    conformance_warnings = check_template_conformance(agent_md)
    for w in conformance_warnings:
        logger.debug("  [template] %s: %s", name, w)

    # Determine output path using category subdirectories
    relative_path = _get_agent_relative_path(name, category)
    oc_category = _get_opencode_category(category)
    mode = "primary" if name in PRIMARY_AGENTS else "subagent"
    out_path = output_dir / f"{relative_path}.md"

    # Security: ensure the resolved path stays under the output directory
    validate_output_path(out_path, output_dir)

    if dry_run:
        logger.info("  [dry-run] Would write: %s (%d bytes)", out_path, len(agent_md))
        if verbose:
            logger.debug(
                "  Description: %s",
                extract_short_description(meta.get("description", ""), name),
            )
            logger.debug("  Path: %s", relative_path)
        return {
            "name": name,
            "path": relative_path,
            "category": category,
            "opencode_category": oc_category,
            "mode": mode,
            "permission": perms,
            "source": f"{AGENTS_BASE_PATH}/{source_path}.md",
        }

    # Check existing
    if out_path.exists() and not force:
        logger.info("  [skip] %s: already exists (use --force to overwrite)", name)
        return {
            "name": name,
            "path": relative_path,
            "category": category,
            "opencode_category": oc_category,
            "mode": mode,
            "permission": perms,
            "source": f"{AGENTS_BASE_PATH}/{source_path}.md",
            "status": "skipped",
        }

    # Ensure parent directory exists (handles category subdirs)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(out_path.parent), suffix=".tmp", prefix=".sync-"
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp:
            tmp.write(agent_md)
        os.replace(tmp_path, str(out_path))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    if verbose:
        logger.debug("  [wrote] %s (%d bytes)", out_path, len(agent_md))

    return {
        "name": name,
        "path": relative_path,
        "category": category,
        "opencode_category": oc_category,
        "mode": mode,
        "permission": perms,
        "source": f"{AGENTS_BASE_PATH}/{source_path}.md",
        "status": "synced",
    }


def write_manifest(
    output_dir: Path,
    entries: List[Dict[str, Any]],
    *,
    dry_run: bool = False,
) -> None:
    """Write manifest.json alongside the agent files."""
    manifest = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "source_repo": DEFAULT_REPO,
        "agent_count": len(entries),
        "agents": sorted(entries, key=lambda e: e["name"]),
    }

    manifest_path = output_dir / "manifest.json"

    if dry_run:
        logger.info("  [dry-run] Would write manifest: %s", manifest_path)
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(manifest_path.parent), suffix=".tmp", prefix=".manifest-"
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp_path, str(manifest_path))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    logger.info("Manifest written: %s", manifest_path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Sync agent definitions from davila7/claude-code-templates "
            "and convert them to OpenCode agent format."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/sync-agents.py                  # Sync curated agents\n"
            "  python scripts/sync-agents.py --list           # List available agents\n"
            "  python scripts/sync-agents.py --filter security # Sync one category\n"
            "  python scripts/sync-agents.py --all            # Sync ALL agents\n"
            "  python scripts/sync-agents.py --dry-run -v     # Preview without writing\n"
            "  python scripts/sync-agents.py --clean --force  # Clean + re-sync\n"
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="agents",
        help="Output directory for agent files (default: agents)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available agents without downloading",
    )
    parser.add_argument(
        "--filter",
        type=str,
        metavar="CATEGORY",
        help="Only sync agents from a specific category (e.g. security, data-ai)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Sync ALL agents from the repo (not just the curated list)",
    )
    parser.add_argument(
        "--tier",
        choices=["core", "extended", "all"],
        default="core",
        help=(
            "Agent tier: core (curated), extended (core + additional), "
            "all (every agent from source)"
        ),
    )
    parser.add_argument(
        "--source",
        type=str,
        default=DEFAULT_REPO,
        metavar="OWNER/REPO",
        help=f"Override source repository (default: {DEFAULT_REPO})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without writing files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing agent files (ignores incremental cache)",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help=(
            "Only re-download agents whose source has changed "
            "(uses ETag/If-Modified-Since). Enabled by default when "
            "the cache exists."
        ),
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help=(
            "Remove all previously synced agent files and the sync cache "
            "before syncing. Preserves non-synced agents "
            "(e.g. episode-orchestrator.md)."
        ),
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose output",
    )
    parser.add_argument(
        "--score",
        action="store_true",
        help="Run quality scorer on each synced agent and include scores in the manifest",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    # --all is a shorthand for --tier=all
    if args.all:
        args.tier = "all"

    # Configure logging level based on verbosity
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(message)s", stream=sys.stderr)

    repo = args.source
    output_dir = Path(args.output_dir)

    # --- Check rate limit ---
    if args.verbose:
        limit, remaining, reset_ts = check_rate_limit()
        token_status = (
            "authenticated" if os.environ.get("GITHUB_TOKEN") else "unauthenticated"
        )
        logger.debug(
            "GitHub API (%s): %d/%d requests remaining",
            token_status,
            remaining,
            limit,
        )
        if remaining < 10:
            reset_dt = datetime.fromtimestamp(reset_ts, tz=timezone.utc)
            logger.warning("  Rate limit resets at: %s", reset_dt.isoformat())

    # --- Clean mode ---
    if args.clean:
        logger.info("Cleaning previously synced agents from %s/...", output_dir)
        removed = clean_synced_agents(
            output_dir, dry_run=args.dry_run, verbose=args.verbose
        )
        action = "Would remove" if args.dry_run else "Removed"
        logger.info("  %s %d synced agent file(s).", action, removed)
        # Also remove the incremental sync cache
        if not args.dry_run:
            _remove_sync_cache(output_dir, verbose=args.verbose)
        else:
            cache_path = output_dir / SYNC_CACHE_FILENAME
            if cache_path.exists():
                logger.info("  [dry-run] Would remove: %s", SYNC_CACHE_FILENAME)

    # --- Determine agent set ---
    if args.tier == "all":
        logger.info("Discovering all agents in %s...", repo)
        agents = discover_all_agents(repo)
        if not agents:
            logger.error("No agents found.")
            return 1
        logger.info("Found %d agents across all categories.", len(agents))
        logger.warning(
            "⚠️  --all/--tier=all: syncing ALL agents with default "
            "permissions for uncurated ones"
        )
    elif args.tier == "extended":
        agents = {**CURATED_AGENTS, **EXTENDED_AGENTS}
        logger.info("📦 Tier extended: %d agents (core + extended)", len(agents))
    else:
        agents = dict(CURATED_AGENTS)
        logger.info("📦 Tier core: %d agents", len(agents))

    # --- Apply category filter ---
    if args.filter:
        cat = args.filter.lower().strip()
        agents = {
            name: path
            for name, path in agents.items()
            if path.startswith(cat + "/") or path.split("/")[0] == cat
        }
        if not agents:
            logger.error("No agents found matching category '%s'.", args.filter)
            # List available categories
            if args.tier == "all":
                all_agents = discover_all_agents(repo)
            else:
                all_agents = CURATED_AGENTS
            categories = sorted({p.split("/")[0] for p in all_agents.values()})
            logger.info("Available categories: %s", ", ".join(categories))
            return 1

    # --- List mode ---
    if args.list:
        # Tier summary header
        core_count = len(CURATED_AGENTS)
        extended_count = len(EXTENDED_AGENTS)
        combined_count = len({**CURATED_AGENTS, **EXTENDED_AGENTS})
        tier_label = {
            "core": "Core",
            "extended": "Extended (core + extended)",
            "all": "All (discovered)",
        }.get(args.tier, args.tier)

        print(f"Agent tier: {tier_label}")
        print(f"  Core agents:     {core_count}")
        print(f"  Extended agents: {extended_count}")
        print(f"  Combined total:  {combined_count}")
        if args.tier == "all":
            print(f"  Discovered:      {len(agents)}")
        print()

        # Build sets for tier tagging
        core_set = frozenset(CURATED_AGENTS.keys())
        extended_set = frozenset(EXTENDED_AGENTS.keys())

        # Group by category
        by_category: Dict[str, List[str]] = {}
        for name, path in sorted(agents.items()):
            cat = path.split("/")[0] if "/" in path else "uncategorized"
            by_category.setdefault(cat, []).append(name)

        total = len(agents)
        print(f"Listing {total} agents ({tier_label}):\n")
        for cat in sorted(by_category.keys()):
            oc_cat = _get_opencode_category(cat)
            print(f"  {cat}/ -> @{oc_cat}/")
            for agent_name in sorted(by_category[cat]):
                mode_tag = "[primary]" if agent_name in PRIMARY_AGENTS else "[subagent]"
                if agent_name in core_set:
                    tier_tag = "[core]"
                elif agent_name in extended_set:
                    tier_tag = "[ext] "
                else:
                    tier_tag = "[disc]"
                rel_path = _get_agent_relative_path(agent_name, cat)
                print(f"    {agent_name:40s} {mode_tag}  {tier_tag}  @{rel_path}")
            print()
        return 0

    # --- Sync ---
    logger.info("Syncing %d agents from %s -> %s/", len(agents), repo, output_dir)
    if args.dry_run:
        logger.info("  (dry-run mode: no files will be written)")

    # --- Incremental cache ---
    # Load the cache unless --force is used.  When --incremental is set or
    # the cache file already exists, conditional HTTP requests are used.
    sync_cache: Optional[Dict[str, Any]] = None
    use_incremental = False
    if not args.force:
        sync_cache = _load_sync_cache(output_dir)
        use_incremental = args.incremental or bool(sync_cache)
        if use_incremental and args.verbose:
            cached_count = len(sync_cache) if sync_cache else 0
            logger.debug("  Incremental mode: %d agents in cache", cached_count)
    elif args.verbose:
        logger.debug("  Force mode: ignoring incremental cache")

    # Determine which agents are curated vs discovered-only
    curated_names = set(CURATED_AGENTS.keys()) | set(EXTENDED_AGENTS.keys())

    manifest_entries: List[Dict[str, Any]] = []
    success = 0
    skipped = 0
    failed = 0
    unchanged = 0
    uncurated_count = 0

    for i, (name, path) in enumerate(sorted(agents.items()), 1):
        label = f"[{i}/{len(agents)}]"
        print(f"  {label} {name}...", end="", flush=True)

        # Uncurated agents get locked-down read-only permissions
        if name not in curated_names:
            agent_permissions: Optional[Dict[str, PermissionValue]] = (
                UNKNOWN_PERMISSIONS
            )
        else:
            # Try archetype system first; fall back to legacy auto-detection
            agent_permissions = build_archetype_permissions(name)

        try:
            entry = sync_agent(
                name,
                path,
                repo,
                output_dir,
                dry_run=args.dry_run,
                force=args.force,
                verbose=args.verbose,
                permissions=agent_permissions,
                incremental=use_incremental,
                sync_cache=sync_cache,
            )
            if entry:
                manifest_entries.append(entry)
                status = entry.get("status", "synced")
                if status == "skipped":
                    skipped += 1
                    print(" skipped")
                elif status == "unchanged":
                    unchanged += 1
                    print(" unchanged")
                else:
                    success += 1
                    if name not in curated_names:
                        uncurated_count += 1
                    print(" done")

                # Quality scoring (optional, --score flag)
                if args.score and status == "synced":
                    rel = entry.get("path", "")
                    agent_file = output_dir / f"{rel}.md"
                    if agent_file.is_file():
                        from quality_scorer import score_agent

                        agent_content = agent_file.read_text(encoding="utf-8")
                        result = score_agent(agent_content)
                        entry["quality_score"] = result
                        if args.verbose:
                            logger.debug(
                                "  [score] %s: %.2f (%s)",
                                name,
                                result["overall"],
                                result["label"],
                            )
            else:
                failed += 1
                print(" not found")
        except Exception as exc:
            failed += 1
            logger.error(" error: %s", exc)
            if args.verbose:
                import traceback

                traceback.print_exc()

        # Polite delay to avoid hammering the API
        if i < len(agents):
            time.sleep(0.3)

    # --- Persist incremental cache ---
    if sync_cache is not None and not args.dry_run:
        _save_sync_cache(output_dir, sync_cache)

    # --- Write manifest ---
    if manifest_entries:
        write_manifest(output_dir, manifest_entries, dry_run=args.dry_run)

    # --- Summary ---
    parts = [f"{success} synced"]
    if unchanged > 0:
        parts.append(f"{unchanged} unchanged")
    parts.extend([f"{skipped} skipped", f"{failed} failed"])
    logger.info("Sync complete: %s", ", ".join(parts))

    if uncurated_count > 0:
        logger.warning(
            "%d agents synced with read-only permissions (uncurated)",
            uncurated_count,
        )

    if not os.environ.get("GITHUB_TOKEN") and len(agents) > 30:
        logger.info(
            "Tip: Set GITHUB_TOKEN env var for higher rate limits "
            "(5000 req/hr vs 60 req/hr)."
        )

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
