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
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_REPO = "davila7/claude-code-templates"
DEFAULT_BRANCH = "main"
AGENTS_BASE_PATH = "cli-tool/components/agents"
GITHUB_API = "https://api.github.com"
RAW_BASE = "https://raw.githubusercontent.com"

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
    "database": "database",
    "web-tools": "web",
    "api-graphql": "api",
    "documentation": "docs",
    "business-marketing": "business",
    "development-team": "team",
    "expert-advisors": "devtools",
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
    # Architecture
    "architect-reviewer": "expert-advisors/architect-reviewer",
}

# ---------------------------------------------------------------------------
# Permission types
# ---------------------------------------------------------------------------

# Type alias for permission values: either a simple string or a nested dict
PermissionValue = Union[str, Dict[str, str]]


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------


def _get_headers() -> Dict[str, str]:
    """Build HTTP headers, including auth token if available."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "opencode-sync-agents/2.0",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def _api_get(url: str, *, retries: int = 3, backoff: float = 2.0) -> Any:
    """
    GET a URL and return parsed JSON. Handles rate limiting with retries.
    """
    headers = _get_headers()
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 403:
                # Rate limit - check reset header
                reset = exc.headers.get("X-RateLimit-Reset")
                remaining = exc.headers.get("X-RateLimit-Remaining", "?")
                if reset:
                    wait = max(int(reset) - int(time.time()), 1)
                    print(
                        f"  [rate-limit] Remaining: {remaining}. "
                        f"Waiting {wait}s until reset...",
                        file=sys.stderr,
                    )
                    time.sleep(wait + 1)
                    continue
            if exc.code == 404:
                return None
            if attempt < retries:
                wait = backoff * attempt
                print(
                    f"  [retry] HTTP {exc.code} on attempt {attempt}/{retries}, "
                    f"waiting {wait}s...",
                    file=sys.stderr,
                )
                time.sleep(wait)
                continue
            raise
        except urllib.error.URLError as exc:
            if attempt < retries:
                wait = backoff * attempt
                print(
                    f"  [retry] Network error on attempt {attempt}/{retries}: {exc.reason}, "
                    f"waiting {wait}s...",
                    file=sys.stderr,
                )
                time.sleep(wait)
                continue
            raise
    return None


def _raw_get(url: str) -> Optional[str]:
    """GET raw text content from a URL."""
    headers = _get_headers()
    # Raw content uses a different Accept header
    headers["Accept"] = "text/plain"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def check_rate_limit() -> Tuple[int, int, int]:
    """Return (limit, remaining, reset_timestamp)."""
    data = _api_get(f"{GITHUB_API}/rate_limit")
    if data:
        core = data.get("resources", {}).get("core", {})
        return (
            core.get("limit", 0),
            core.get("remaining", 0),
            core.get("reset", 0),
        )
    return (0, 0, 0)


# ---------------------------------------------------------------------------
# Markdown / YAML frontmatter parsing (stdlib only, no PyYAML)
# ---------------------------------------------------------------------------


def parse_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    """
    Parse YAML-like frontmatter from markdown content.

    Returns (metadata_dict, body) where body is the markdown after the
    closing '---'. The parser handles the simple key-value YAML used
    in the source repo (no nested structures, just string values).
    """
    content = content.strip()
    if not content.startswith("---"):
        return {}, content

    # Find closing ---
    end_idx = content.find("\n---", 3)
    if end_idx == -1:
        return {}, content

    frontmatter_raw = content[3:end_idx].strip()
    body = content[end_idx + 4 :].strip()

    meta: Dict[str, str] = {}
    current_key: Optional[str] = None
    current_value_lines: List[str] = []

    for line in frontmatter_raw.split("\n"):
        # Check if this is a new key: value pair
        match = re.match(r"^(\w[\w-]*)\s*:\s*(.*)", line)
        if match:
            # Save previous key if any
            if current_key is not None:
                meta[current_key] = "\n".join(current_value_lines).strip()
            current_key = match.group(1)
            current_value_lines = [match.group(2)]
        else:
            # Continuation line
            if current_key is not None:
                current_value_lines.append(line)

    # Save last key
    if current_key is not None:
        meta[current_key] = "\n".join(current_value_lines).strip()

    # Clean up quoted values
    for key in meta:
        val = meta[key]
        if val.startswith('"') and val.endswith('"'):
            # Handle escaped sequences in the quoted string
            val = val[1:-1]
            val = val.replace('\\"', '"').replace("\\n", "\n")
            meta[key] = val

    return meta, body


# ---------------------------------------------------------------------------
# Permission building
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

    has_write = "write" in tools_list
    has_edit = "edit" in tools_list
    has_bash = "bash" in tools_list
    has_webfetch = "webfetch" in tools_list or "websearch" in tools_list

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
    perms["task"] = {"*": "allow"}

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
    source_path: str,
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
    perms = build_permissions(meta.get("tools", ""))

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
        lines.append(f'description: "{short_desc}"')

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
        print("Error: Could not list agent categories from repo.", file=sys.stderr)
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
                    print(
                        f"  [SECURITY] Skipping suspicious agent name: {agent_name}",
                        file=sys.stderr,
                    )
                    continue
                all_agents[agent_name] = f"{cat_name}/{agent_name}"

    return all_agents


# ---------------------------------------------------------------------------
# Clean: remove previously synced agent files
# ---------------------------------------------------------------------------

_SYNC_HEADER_PATTERN = re.compile(r"<!--\s*Synced from aitmpl\.com\b")


def _is_synced_agent(file_path: Path) -> bool:
    """Return True if the file was generated by this sync script.

    Detection is based on the presence of the sync header comment that
    every generated agent file contains.
    """
    try:
        # Read just the first 1024 bytes — the header is near the top
        with open(file_path, "r", encoding="utf-8") as fh:
            head = fh.read(1024)
        return bool(_SYNC_HEADER_PATTERN.search(head))
    except (OSError, UnicodeDecodeError):
        return False


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
    if not output_dir.exists():
        return 0

    removed = 0

    # Walk all .md files in output_dir and its subdirectories
    for md_file in sorted(output_dir.rglob("*.md")):
        if not md_file.is_file():
            continue
        if not _is_synced_agent(md_file):
            if verbose:
                print(
                    f"  [keep] {md_file.relative_to(output_dir)} (not a synced agent)"
                )
            continue

        if dry_run:
            print(f"  [dry-run] Would remove: {md_file.relative_to(output_dir)}")
        else:
            md_file.unlink()
            if verbose:
                print(f"  [removed] {md_file.relative_to(output_dir)}")
        removed += 1

    # Remove the manifest too
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists():
        if dry_run:
            print(f"  [dry-run] Would remove: manifest.json")
        else:
            manifest_path.unlink()
            if verbose:
                print("  [removed] manifest.json")

    # Clean up empty subdirectories
    if not dry_run:
        for subdir in sorted(output_dir.rglob("*"), reverse=True):
            if subdir.is_dir() and not any(subdir.iterdir()):
                subdir.rmdir()
                if verbose:
                    print(f"  [removed] empty dir: {subdir.relative_to(output_dir)}/")

    return removed


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
) -> Optional[Dict[str, Any]]:
    """
    Fetch, convert, and write a single agent. Returns manifest entry or None.
    """
    category = source_path.split("/")[0] if "/" in source_path else "unknown"
    raw_url = f"{RAW_BASE}/{repo}/{DEFAULT_BRANCH}/{AGENTS_BASE_PATH}/{source_path}.md"

    if verbose:
        print(f"  Fetching: {raw_url}")

    content = _raw_get(raw_url)
    if content is None:
        print(f"  [skip] {name}: not found at {source_path}.md", file=sys.stderr)
        return None

    meta, body = parse_frontmatter(content)
    if not body.strip():
        print(f"  [skip] {name}: empty body after parsing", file=sys.stderr)
        return None

    # Build OpenCode agent
    agent_md = build_opencode_agent(name, meta, body, category, source_path)

    # Determine output path using category subdirectories
    relative_path = _get_agent_relative_path(name, category)
    oc_category = _get_opencode_category(category)
    mode = "primary" if name in PRIMARY_AGENTS else "subagent"
    out_path = output_dir / f"{relative_path}.md"

    # Security: ensure the resolved path stays under the output directory
    resolved_out = out_path.resolve()
    resolved_base = output_dir.resolve()
    if not str(resolved_out).startswith(str(resolved_base) + "/") and resolved_out != resolved_base:
        raise ValueError(
            f"[SECURITY] Path traversal detected: {out_path} resolves to "
            f"{resolved_out}, which is outside {resolved_base}"
        )

    # Build permission dict for manifest
    perms = build_permissions(meta.get("tools", ""))

    if dry_run:
        print(f"  [dry-run] Would write: {out_path} ({len(agent_md)} bytes)")
        if verbose:
            print(
                f"  Description: {extract_short_description(meta.get('description', ''), name)}"
            )
            print(f"  Path: {relative_path}")
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
        print(f"  [skip] {name}: already exists (use --force to overwrite)")
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
    out_path.write_text(agent_md, encoding="utf-8")
    if verbose:
        print(f"  [wrote] {out_path} ({len(agent_md)} bytes)")

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
        print(f"\n  [dry-run] Would write manifest: {manifest_path}")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nManifest written: {manifest_path}")


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
        default=".opencode/agents",
        help="Output directory for agent files (default: .opencode/agents)",
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
        help="Overwrite existing agent files",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help=(
            "Remove all previously synced agent files before syncing. "
            "Preserves non-synced agents (e.g. episode-orchestrator.md)."
        ),
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose output",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    repo = args.source
    output_dir = Path(args.output_dir)

    # --- Check rate limit ---
    if args.verbose:
        limit, remaining, reset_ts = check_rate_limit()
        token_status = (
            "authenticated" if os.environ.get("GITHUB_TOKEN") else "unauthenticated"
        )
        print(f"GitHub API ({token_status}): {remaining}/{limit} requests remaining")
        if remaining < 10:
            reset_dt = datetime.fromtimestamp(reset_ts, tz=timezone.utc)
            print(f"  Rate limit resets at: {reset_dt.isoformat()}")

    # --- Clean mode ---
    if args.clean:
        print(f"Cleaning previously synced agents from {output_dir}/...")
        removed = clean_synced_agents(
            output_dir, dry_run=args.dry_run, verbose=args.verbose
        )
        action = "Would remove" if args.dry_run else "Removed"
        print(f"  {action} {removed} synced agent file(s).\n")

    # --- Determine agent set ---
    if args.all:
        print(f"Discovering all agents in {repo}...")
        agents = discover_all_agents(repo)
        if not agents:
            print("No agents found.", file=sys.stderr)
            return 1
        print(f"Found {len(agents)} agents across all categories.\n")
    else:
        agents = dict(CURATED_AGENTS)

    # --- Apply category filter ---
    if args.filter:
        cat = args.filter.lower().strip()
        agents = {
            name: path
            for name, path in agents.items()
            if path.startswith(cat + "/") or path.split("/")[0] == cat
        }
        if not agents:
            print(
                f"No agents found matching category '{args.filter}'.",
                file=sys.stderr,
            )
            # List available categories
            if args.all:
                all_agents = discover_all_agents(repo)
            else:
                all_agents = CURATED_AGENTS
            categories = sorted({p.split("/")[0] for p in all_agents.values()})
            print(f"Available categories: {', '.join(categories)}", file=sys.stderr)
            return 1

    # --- List mode ---
    if args.list:
        # Group by category
        by_category: Dict[str, List[str]] = {}
        for name, path in sorted(agents.items()):
            cat = path.split("/")[0] if "/" in path else "uncategorized"
            by_category.setdefault(cat, []).append(name)

        total = len(agents)
        print(f"{'Curated' if not args.all else 'All'} agents ({total} total):\n")
        for cat in sorted(by_category.keys()):
            oc_cat = _get_opencode_category(cat)
            print(f"  {cat}/ -> @{oc_cat}/")
            for agent_name in sorted(by_category[cat]):
                mode_tag = "[primary]" if agent_name in PRIMARY_AGENTS else "[subagent]"
                rel_path = _get_agent_relative_path(agent_name, cat)
                print(f"    {agent_name:40s} {mode_tag}  @{rel_path}")
            print()
        return 0

    # --- Sync ---
    print(f"Syncing {len(agents)} agents from {repo} -> {output_dir}/")
    if args.dry_run:
        print("  (dry-run mode: no files will be written)\n")
    else:
        print()

    manifest_entries: List[Dict[str, Any]] = []
    success = 0
    skipped = 0
    failed = 0

    for i, (name, path) in enumerate(sorted(agents.items()), 1):
        label = f"[{i}/{len(agents)}]"
        print(f"  {label} {name}...", end="", flush=True)

        try:
            entry = sync_agent(
                name,
                path,
                repo,
                output_dir,
                dry_run=args.dry_run,
                force=args.force,
                verbose=args.verbose,
            )
            if entry:
                manifest_entries.append(entry)
                status = entry.get("status", "synced")
                if status == "skipped":
                    skipped += 1
                    print(" skipped")
                else:
                    success += 1
                    print(" done")
            else:
                failed += 1
                print(" not found")
        except Exception as exc:
            failed += 1
            print(f" error: {exc}", file=sys.stderr)
            if args.verbose:
                import traceback

                traceback.print_exc()

        # Polite delay to avoid hammering the API
        if i < len(agents):
            time.sleep(0.3)

    # --- Write manifest ---
    if manifest_entries:
        write_manifest(output_dir, manifest_entries, dry_run=args.dry_run)

    # --- Summary ---
    print(f"\nSync complete: {success} synced, {skipped} skipped, {failed} failed")

    if not os.environ.get("GITHUB_TOKEN") and len(agents) > 30:
        print(
            "\nTip: Set GITHUB_TOKEN env var for higher rate limits "
            "(5000 req/hr vs 60 req/hr).",
            file=sys.stderr,
        )

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
