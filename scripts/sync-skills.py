#!/usr/bin/env python3
"""
sync-skills.py - Fetch skill definitions from davila7/claude-code-templates
and convert them to OpenCode skill format.

Skills are directory-based (unlike agents which are single files) and include:
- SKILL.md: Main skill definition with frontmatter
- Companion files: scripts/*.py, scripts/*.xml, templates/*, reference/*, *.md

Usage:
    python scripts/sync-skills.py [options]
    python scripts/sync-skills.py --list
    python scripts/sync-skills.py --filter development
    python scripts/sync-skills.py --all
    python scripts/sync-skills.py --dry-run --verbose
    python scripts/sync-skills.py --clean --force

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
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sync_common import (
    DEFAULT_REPO,
    DEFAULT_BRANCH,
    GITHUB_API,
    RAW_BASE,
    SYNC_CACHE_FILENAME,
    MAX_RATE_LIMIT_WAIT,
    MAX_BACKOFF_WAIT,
    logger,
    HttpResult,
    SafeRedirectHandler,
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
    _parse_retry_after,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SKILLS_BASE_PATH = "cli-tool/components/skills"

# Maximum total size for a skill (5MB)
MAX_SKILL_SIZE_BYTES = 5 * 1024 * 1024

# Delay between files within a skill (milliseconds)
INTER_FILE_DELAY_MS = 100

# Delay between skills (milliseconds)
INTER_SKILL_DELAY_MS = 300

# Marker file for hand-written skills
HANDWRITTEN_MARKER = ".hand-written"

# ---------------------------------------------------------------------------
# Curated skills list
# ---------------------------------------------------------------------------

CURATED_SKILLS: Dict[str, Dict[str, str]] = {
    # Development skills
    "clean-code": {
        "category": "development",
        "upstream_path": "development/clean-code",
    },
    "mcp-builder": {
        "category": "development",
        "upstream_path": "development/mcp-builder",
    },
    "task-execution-engine": {
        "category": "development",
        "upstream_path": "development/task-execution-engine",
    },
    "code-reviewer": {
        "category": "development",
        "upstream_path": "development/code-reviewer",
    },
    "systematic-debugging": {
        "category": "development",
        "upstream_path": "development/systematic-debugging",
    },
    "react-best-practices": {
        "category": "development",
        "upstream_path": "development/react-best-practices",
    },
    "python-patterns": {
        "category": "development",
        "upstream_path": "development/python-patterns",
    },
    # AI/Research skills
    "rag-engineer": {
        "category": "ai-research",
        "upstream_path": "ai-research/rag-engineer",
    },
    "prompt-engineer": {
        "category": "ai-research",
        "upstream_path": "ai-research/prompt-engineer",
    },
    # Database skills
    "using-neon": {
        "category": "database",
        "upstream_path": "database/using-neon",
    },
    # Security skills
    "security-best-practices": {
        "category": "security",
        "upstream_path": "security/security-best-practices",
    },
    # Productivity skills
    "brainstorming": {
        "category": "productivity",
        "upstream_path": "productivity/brainstorming",
    },
}

# ---------------------------------------------------------------------------
# Skill tree fetching
# ---------------------------------------------------------------------------


def fetch_skill_tree(skill_path: str, repo: str, branch: str) -> List[Dict[str, Any]]:
    """
    List all files in a skill directory from the upstream repository.

    Uses the GitHub API to recursively fetch the directory tree.

    Args:
        skill_path: Path to the skill directory relative to SKILLS_BASE_PATH
        repo: Repository in format "owner/repo"
        branch: Git branch name

    Returns:
        List of file info dicts with keys: path, name, type, size, download_url
    """
    files: List[Dict[str, Any]] = []
    api_url = f"{GITHUB_API}/repos/{repo}/contents/{SKILLS_BASE_PATH}/{skill_path}"

    def fetch_directory(url: str, rel_path: str = "") -> None:
        entries = _api_get(url)
        if not entries:
            return

        if isinstance(entries, dict):
            # Single file case
            entries = [entries]

        for entry in entries:
            entry_type = entry.get("type")
            entry_name = entry.get("name", "")
            entry_path = entry.get("path", "")

            if entry_type == "dir":
                # Recurse into subdirectory
                sub_url = entry.get("url", f"{api_url}/{entry_name}")
                fetch_directory(sub_url, f"{rel_path}/{entry_name}".strip("/"))
            elif entry_type == "file":
                # Add file to list
                file_info = {
                    "path": entry_path,
                    "name": entry_name,
                    "rel_path": f"{rel_path}/{entry_name}".strip("/")
                    if rel_path
                    else entry_name,
                    "type": "file",
                    "size": entry.get("size", 0),
                    "download_url": entry.get("download_url", ""),
                    "sha": entry.get("sha", ""),
                }
                files.append(file_info)

    fetch_directory(api_url)
    return files


# ---------------------------------------------------------------------------
# Content transformation
# ---------------------------------------------------------------------------


def transform_skill_md(content: str, skill_name: str, category: str) -> str:
    """
    Transform skill markdown content from upstream to OpenCode format.

    Transformations applied:
    - Parse and clean frontmatter (keep name, description; remove allowed-tools, version, priority, license)
    - Add metadata.category to frontmatter
    - Add provenance header after frontmatter
    - Rewrite paths: ~/.claude/skills/{name}/ → .opencode/skills/{name}/
    - Convert @[skills/other-skill] references to "Requires skill: other-skill"

    Args:
        content: Raw markdown content from upstream
        skill_name: Name of the skill
        category: Category for the skill

    Returns:
        Transformed markdown content
    """
    meta, body = parse_frontmatter(content)

    # Build new frontmatter
    new_meta: Dict[str, str] = {}

    # Keep name (must match skill_name)
    new_meta["name"] = skill_name

    # Keep description (truncate to 150 chars)
    desc = meta.get("description", "").strip()
    if len(desc) > 150:
        desc = desc[:147] + "..."
    new_meta["description"] = desc

    # Add metadata category
    new_meta["metadata.category"] = category

    # Build frontmatter lines
    lines: List[str] = ["---"]
    for key, value in new_meta.items():
        if "\n" in value:
            # Multi-line value - use folded scalar
            lines.append(f"{key}: >")
            for line in value.split("\n"):
                lines.append(f"  {line}")
        else:
            lines.append(f'{key}: "{value}"')
    lines.append("---")

    # Provenance header
    header = f"<!-- Synced from aitmpl.com | source: {DEFAULT_REPO} | category: {category} -->"

    # Transform body
    transformed_body = _transform_skill_body(body, skill_name)

    return f"{chr(10).join(lines)}\n\n{header}\n\n{transformed_body}\n"


def _transform_skill_body(body: str, skill_name: str) -> str:
    """
    Apply transformations to skill body content.

    - ~/.claude/skills/{name}/ → .opencode/skills/{name}/
    - @[skills/other-skill] → `Requires skill: other-skill`
    """
    # Rewrite paths
    body = re.sub(r"~/.claude/skills/([^/\s]+)/", r".opencode/skills/\1/", body)

    # Convert skill references
    body = re.sub(r"@\[skills/([^\]]+)\]", r"Requires skill: \1", body)

    return body.strip()


# ---------------------------------------------------------------------------
# Companion file handling
# ---------------------------------------------------------------------------


def _is_valid_filename(filename: str) -> bool:
    """Check if filename is valid (no path traversal, special chars)."""
    # Reject names with path separators or parent directory references
    if ".." in filename or "/" in filename or "\\" in filename:
        return False
    # Reject hidden files except .hand-written marker
    if filename.startswith(".") and filename != HANDWRITTEN_MARKER:
        return False
    return True


def _check_symlink(file_path: Path) -> None:
    """Raise ValueError if path or any parent is a symlink."""
    current = file_path
    while current != current.parent:
        if current.is_symlink():
            raise ValueError(f"[SECURITY] Symlink detected: {file_path}")
        current = current.parent


def process_companion_file(
    file_info: Dict[str, Any],
    skill_dir: Path,
    repo: str,
    branch: str,
    verbose: bool,
) -> int:
    """
    Download and process a companion file for a skill.

    File handling:
    - SKILL.md: transform frontmatter + paths, add provenance header
    - *.md: copy as-is
    - scripts/*.py: copy with warning header as first line
    - scripts/*.xml: copy with warning header
    - templates/*, reference/*: copy as-is
    - Other files: copy as-is

    Args:
        file_info: Dict with file metadata from fetch_skill_tree
        skill_dir: Local directory for the skill
        repo: Repository name
        branch: Git branch
        verbose: Enable verbose logging

    Returns:
        Size of the file in bytes

    Raises:
        ValueError: If security check fails
    """
    rel_path = file_info["rel_path"]
    filename = file_info["name"]

    # Security: validate filename
    if not _is_valid_filename(filename):
        raise ValueError(f"[SECURITY] Invalid filename: {filename}")

    # Determine output path
    output_path = skill_dir / rel_path

    # Security: path traversal check
    validate_output_path(output_path, skill_dir)

    # Security: symlink check
    _check_symlink(output_path)

    # Download content
    download_url = file_info.get("download_url", "")
    if not download_url:
        # Construct raw URL
        download_url = f"{RAW_BASE}/{repo}/{branch}/{file_info['path']}"

    content = _raw_get(download_url)
    if content is None:
        raise ValueError(f"Failed to download: {download_url}")

    content_bytes = content.encode("utf-8")

    # Apply transformations based on file type
    final_content: str

    if filename == "SKILL.md":
        # Extract skill name from directory
        skill_name = skill_dir.name
        category = _extract_category_from_path(file_info["path"])
        final_content = transform_skill_md(content, skill_name, category)

    elif filename.endswith(".md"):
        # Copy as-is
        final_content = content

    elif rel_path.startswith("scripts/") and filename.endswith(".py"):
        # Add warning header for Python scripts
        warning = "# ⚠️ AUTO-SYNCED from aitmpl.com — Review before executing\n"
        if not content.startswith(warning):
            final_content = warning + content
        else:
            final_content = content

    elif rel_path.startswith("scripts/") and filename.endswith(".xml"):
        # Add warning header for XML scripts
        warning = "<!-- ⚠️ AUTO-SYNCED from aitmpl.com -->\n"
        if not content.startswith(warning):
            final_content = warning + content
        else:
            final_content = content

    else:
        # Copy as-is (templates/*, reference/*, other files)
        final_content = content

    # Ensure parent directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    output_path.write_text(final_content, encoding="utf-8")

    if verbose:
        logger.debug(
            "  [wrote] %s (%d bytes)", rel_path, len(final_content.encode("utf-8"))
        )

    return len(final_content.encode("utf-8"))


def _extract_category_from_path(path: str) -> str:
    """Extract category from upstream file path."""
    # Path format: cli-tool/components/skills/{category}/{skill_name}/...
    parts = path.split("/")
    if len(parts) >= 5:
        return parts[3]  # Category is at index 3
    return "unknown"


# ---------------------------------------------------------------------------
# Main sync logic
# ---------------------------------------------------------------------------


def is_handwritten_skill(skill_dir: Path) -> bool:
    """
    Check if a skill directory contains hand-written (non-synced) content.

    A skill is considered hand-written if:
    - It exists and is_synced_file() returns False for SKILL.md
    - It contains a .hand-written marker file
    """
    if not skill_dir.exists():
        return False

    # Check for marker file
    marker_file = skill_dir / HANDWRITTEN_MARKER
    if marker_file.exists():
        return True

    # Check if SKILL.md exists and is not synced
    skill_md = skill_dir / "SKILL.md"
    if skill_md.exists() and not is_synced_file(skill_md):
        return True

    return False


def sync_skill(
    skill_name: str,
    config: Dict[str, str],
    output_dir: str,
    repo: str,
    branch: str,
    verbose: bool,
    dry_run: bool,
    force: bool = False,
) -> bool:
    """
    Sync a single skill from upstream repository.

    Args:
        skill_name: Name of the skill
        config: Dict with 'category' and 'upstream_path' keys
        output_dir: Base output directory for skills
        repo: Repository in format "owner/repo"
        branch: Git branch name
        verbose: Enable verbose output
        dry_run: If True, don't actually write files
        force: If True, overwrite existing hand-written skills

    Returns:
        True if successful, False otherwise
    """
    upstream_path = config["upstream_path"]
    category = config["category"]

    skill_dir = Path(output_dir) / skill_name

    # Check for hand-written skill protection
    if not force and is_handwritten_skill(skill_dir):
        logger.warning(
            "  [skip] %s: hand-written skill (use --force to overwrite)", skill_name
        )
        return False

    if verbose:
        logger.debug("  Fetching skill tree: %s/%s", SKILLS_BASE_PATH, upstream_path)

    # Fetch file tree
    try:
        files = fetch_skill_tree(upstream_path, repo, branch)
    except Exception as exc:
        logger.error("  [error] %s: failed to fetch tree: %s", skill_name, exc)
        return False

    if not files:
        logger.warning("  [skip] %s: no files found", skill_name)
        return False

    # Calculate total size
    total_size = sum(f.get("size", 0) for f in files)
    if total_size > MAX_SKILL_SIZE_BYTES:
        logger.error(
            "  [error] %s: size %d bytes exceeds limit of %d bytes",
            skill_name,
            total_size,
            MAX_SKILL_SIZE_BYTES,
        )
        return False

    if verbose:
        logger.debug("  Found %d files (%d bytes)", len(files), total_size)

    if dry_run:
        logger.info("  [dry-run] Would sync %s: %d files", skill_name, len(files))
        return True

    # Create skill directory
    skill_dir.mkdir(parents=True, exist_ok=True)

    # Process each file
    processed_size = 0
    for i, file_info in enumerate(files):
        try:
            file_size = process_companion_file(
                file_info, skill_dir, repo, branch, verbose
            )
            processed_size += file_size

            # Rate limiting: delay between files
            if i < len(files) - 1:
                time.sleep(INTER_FILE_DELAY_MS / 1000.0)

        except ValueError as exc:
            logger.error(
                "  [error] %s/%s: %s", skill_name, file_info.get("rel_path", ""), exc
            )
            return False
        except Exception as exc:
            logger.error(
                "  [error] %s/%s: unexpected error: %s",
                skill_name,
                file_info.get("rel_path", ""),
                exc,
            )
            return False

    if verbose:
        logger.debug(
            "  [synced] %s: %d files, %d bytes", skill_name, len(files), processed_size
        )

    return True


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------


def discover_all_skills(repo: str) -> Dict[str, Dict[str, str]]:
    """
    Discover all skills in the upstream repository.

    Walks the SKILLS_BASE_PATH directory and returns all skill directories.

    Args:
        repo: Repository in format "owner/repo"

    Returns:
        Dict mapping skill_name -> config dict
    """
    skills: Dict[str, Dict[str, str]] = {}

    url = f"{GITHUB_API}/repos/{repo}/contents/{SKILLS_BASE_PATH}"
    categories = _api_get(url)

    if not categories:
        logger.error("Error: Could not list skill categories from repo.")
        return skills

    for cat_entry in categories:
        if cat_entry.get("type") != "dir":
            continue
        category = cat_entry["name"]

        cat_url = f"{GITHUB_API}/repos/{repo}/contents/{SKILLS_BASE_PATH}/{category}"
        skill_dirs = _api_get(cat_url)

        if not skill_dirs:
            continue

        for skill_entry in skill_dirs:
            if skill_entry.get("type") != "dir":
                continue
            skill_name = skill_entry["name"]

            # Security: reject suspicious names
            if ".." in skill_name or "/" in skill_name or "\\" in skill_name:
                logger.warning(
                    "  [SECURITY] Skipping suspicious skill name: %s", skill_name
                )
                continue

            skills[skill_name] = {
                "category": category,
                "upstream_path": f"{category}/{skill_name}",
            }

    return skills


# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------


def clean_synced_skills(
    output_dir: Path,
    *,
    dry_run: bool = False,
    verbose: bool = False,
) -> int:
    """
    Remove all previously synced skill directories.

    Non-synced skills (those without the sync header in SKILL.md)
    are preserved.

    Args:
        output_dir: Base directory containing skills
        dry_run: If True, don't actually remove anything
        verbose: Enable verbose output

    Returns:
        Number of skills removed
    """
    if not output_dir.exists():
        return 0

    removed = 0

    for skill_dir in sorted(output_dir.iterdir()):
        if not skill_dir.is_dir():
            continue

        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            # Not a skill directory
            continue

        if not is_synced_file(skill_md):
            if verbose:
                logger.debug("  [keep] %s (not a synced skill)", skill_dir.name)
            continue

        if dry_run:
            logger.info("  [dry-run] Would remove: %s/", skill_dir.name)
        else:
            # Remove entire skill directory
            import shutil

            shutil.rmtree(skill_dir)
            if verbose:
                logger.debug("  [removed] %s/", skill_dir.name)
        removed += 1

    return removed


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------


def write_manifest(
    output_dir: Path,
    skills: Dict[str, Dict[str, str]],
    *,
    dry_run: bool = False,
) -> None:
    """Write manifest.json with skill metadata."""
    manifest = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "source_repo": DEFAULT_REPO,
        "skill_count": len(skills),
        "skills": sorted(skills.keys()),
    }

    manifest_path = output_dir / "manifest.json"

    if dry_run:
        logger.info("  [dry-run] Would write manifest: %s", manifest_path)
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    logger.info("Manifest written: %s", manifest_path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Sync skill definitions from davila7/claude-code-templates "
            "and convert them to OpenCode skill format."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/sync-skills.py                  # Sync curated skills\n"
            "  python scripts/sync-skills.py --list           # List available skills\n"
            "  python scripts/sync-skills.py --filter development  # Sync one category\n"
            "  python scripts/sync-skills.py --all            # Sync ALL skills\n"
            "  python scripts/sync-skills.py --dry-run -v     # Preview without writing\n"
            "  python scripts/sync-skills.py --clean --force  # Clean + re-sync\n"
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=".opencode/skills",
        help="Output directory for skill files (default: .opencode/skills)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available skills without downloading",
    )
    parser.add_argument(
        "--filter",
        type=str,
        metavar="CATEGORY",
        help="Only sync skills from a specific category (e.g. development, ai)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Sync ALL skills from the repo (not just the curated list)",
    )
    parser.add_argument(
        "--repo",
        type=str,
        default=DEFAULT_REPO,
        metavar="OWNER/REPO",
        help=f"Override source repository (default: {DEFAULT_REPO})",
    )
    parser.add_argument(
        "--branch",
        type=str,
        default=DEFAULT_BRANCH,
        help=f"Override git branch (default: {DEFAULT_BRANCH})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without writing files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing skill files (including hand-written)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help=(
            "Remove all previously synced skill directories "
            "before syncing. Preserves non-synced skills."
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

    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(message)s", stream=sys.stderr)

    repo = args.repo
    branch = args.branch
    output_dir = Path(args.output_dir)

    # Check rate limit
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

    # Clean mode
    if args.clean:
        logger.info("Cleaning previously synced skills from %s/...", output_dir)
        removed = clean_synced_skills(
            output_dir, dry_run=args.dry_run, verbose=args.verbose
        )
        action = "Would remove" if args.dry_run else "Removed"
        logger.info("  %s %d synced skill(s).", action, removed)
        if not args.dry_run:
            _remove_sync_cache(output_dir, verbose=args.verbose)

    # Determine skill set
    if args.all:
        logger.info("Discovering all skills in %s...", repo)
        skills = discover_all_skills(repo)
        if not skills:
            logger.error("No skills found.")
            return 1
        logger.info("Found %d skills across all categories.", len(skills))
    else:
        skills = dict(CURATED_SKILLS)
        logger.info("Syncing %d curated skills...", len(skills))

    # Apply category filter
    if args.filter:
        cat = args.filter.lower().strip()
        skills = {
            name: config for name, config in skills.items() if config["category"] == cat
        }
        if not skills:
            logger.error("No skills found matching category '%s'.", args.filter)
            # List available categories
            all_skills = discover_all_skills(repo) if args.all else CURATED_SKILLS
            categories = sorted({c["category"] for c in all_skills.values()})
            logger.info("Available categories: %s", ", ".join(categories))
            return 1

    # List mode
    if args.list:
        by_category: Dict[str, List[str]] = {}
        for name, config in sorted(skills.items()):
            cat = config["category"]
            by_category.setdefault(cat, []).append(name)

        total = len(skills)
        print(f"Listing {total} skills:\n")
        for cat in sorted(by_category.keys()):
            print(f"  {cat}/")
            for skill_name in sorted(by_category[cat]):
                print(f"    {skill_name}")
            print()
        return 0

    # Sync
    logger.info("Syncing %d skills from %s -> %s/", len(skills), repo, output_dir)
    if args.dry_run:
        logger.info("  (dry-run mode: no files will be written)")

    success = 0
    skipped = 0
    failed = 0

    for i, (name, config) in enumerate(sorted(skills.items()), 1):
        label = f"[{i}/{len(skills)}]"
        print(f"  {label} {name}...", end="", flush=True)

        try:
            result = sync_skill(
                name,
                config,
                str(output_dir),
                repo,
                branch,
                verbose=args.verbose,
                dry_run=args.dry_run,
                force=args.force,
            )
            if result:
                success += 1
                print(" done")
            else:
                skipped += 1
                print(" skipped")
        except Exception as exc:
            failed += 1
            logger.error(" error: %s", exc)
            if args.verbose:
                import traceback

                traceback.print_exc()

        # Rate limiting: delay between skills
        if i < len(skills):
            time.sleep(INTER_SKILL_DELAY_MS / 1000.0)

    # Write manifest
    if success > 0 and not args.dry_run:
        write_manifest(output_dir, skills, dry_run=args.dry_run)

    # Summary
    parts = [f"{success} synced", f"{skipped} skipped", f"{failed} failed"]
    logger.info("Sync complete: %s", ", ".join(parts))

    if not os.environ.get("GITHUB_TOKEN") and len(skills) > 20:
        logger.info(
            "Tip: Set GITHUB_TOKEN env var for higher rate limits "
            "(5000 req/hr vs 60 req/hr)."
        )

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
