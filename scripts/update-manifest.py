#!/usr/bin/env python3
"""Update the root manifest.json with new agents from the sync manifest.

Merges agent entries from the sync-generated manifest (.opencode/agents/manifest.json)
into the root project manifest (manifest.json). New agents are added with a
[NEEDS_REVIEW] marker so humans can curate them before release.

Existing agents are preserved — their curated metadata (description, tags, packs)
is never overwritten.

Usage:
    # Standard usage (from project root):
    python3 scripts/update-manifest.py

    # Custom paths:
    python3 scripts/update-manifest.py \\
        --root-manifest manifest.json \\
        --sync-manifest .opencode/agents/manifest.json \\
        --metadata-output /tmp/sync-metadata.json

    # Dry run (no writes):
    python3 scripts/update-manifest.py --dry-run

Exit codes:
    0 — success (manifest updated or no changes needed)
    1 — error (invalid JSON, I/O failure, etc.)
    2 — sync manifest not found (nothing to merge)

Requires Python 3.8+ (stdlib only).
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("update-manifest")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

__all__ = [
    "CATEGORY_MAP",
    "ManifestError",
    "ManifestNotFoundError",
    "SyncManifestNotFoundError",
    "load_json",
    "save_json",
    "map_category",
    "merge_manifests",
    "update_manifest",
    "main",
]


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ManifestError(Exception):
    """Base exception for manifest processing errors."""


class ManifestNotFoundError(ManifestError):
    """Root manifest not found."""


class SyncManifestNotFoundError(ManifestError):
    """Sync manifest not found (nothing to merge)."""


CATEGORY_MAP: Dict[str, str] = {
    # Direct mappings (upstream category == our category)
    "languages": "languages",
    "ai": "ai",
    "web": "web",
    "devops": "devops",
    "devtools": "devtools",
    "security": "security",
    "mcp": "mcp",
    "business": "business",
    "docs": "docs",
    "data-api": "data-api",
    # Remapped categories — upstream source categories from aitmpl
    "programming-languages": "languages",
    "development-tools": "devtools",
    "data-ai": "ai",
    "ai-specialists": "ai",
    "devops-infrastructure": "devops",
    "blockchain-web3": "security",  # smart contracts & audit focus
    "database": "data-api",
    "web-tools": "web",
    "api-graphql": "data-api",
    "api": "data-api",
    "documentation": "docs",
    "business-marketing": "business",
    "development-team": "web",  # full-stack team workflows
    "team": "web",  # multi-agent team patterns
    "expert-advisors": "devtools",
    "specialist": "devtools",
    "media": "devtools",  # A/V processing tools
    # Tier 2 source categories
    "game-development": "specialist",  # game engines & tooling
    "mcp-dev-team": "mcp",
    "modernization": "devops",
    "realtime": "web",
    "finance": "business",
    "git": "devtools",
    "performance-testing": "devtools",
    "ui-analysis": "web",
    "deep-research-team": "web",  # web research & scraping workflows
    "ffmpeg-clip-team": "media",
    "obsidian-ops-team": "specialist",
    "ocr-extraction-team": "specialist",
    "podcast-creator-team": "media",
}
"""Maps upstream sync categories to our curated category names."""

DEFAULT_ROOT_MANIFEST = "manifest.json"
DEFAULT_SYNC_MANIFEST = ".opencode/agents/manifest.json"
DEFAULT_METADATA_OUTPUT = os.path.join(tempfile.gettempdir(), "sync-metadata.json")

NEEDS_REVIEW_PREFIX = "[NEEDS_REVIEW]"
"""Prefix added to descriptions of auto-synced agents pending human review."""

# ---------------------------------------------------------------------------
# JSON I/O
# ---------------------------------------------------------------------------


def load_json(path: str | Path) -> Dict[str, Any]:
    """Load and parse a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        Parsed JSON as a dictionary.

    Raises:
        FileNotFoundError: If the file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
    """
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: str | Path, data: Dict[str, Any]) -> None:
    """Atomically write data to a JSON file.

    Uses tempfile + os.replace to ensure the file is never left in a
    partial-write state.

    Args:
        path: Destination file path.
        data: Dictionary to serialize as JSON.
    """
    target = Path(path)
    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)

    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(parent),
        suffix=".tmp",
        prefix=f".{target.name}-",
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp_path, str(target))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Category mapping
# ---------------------------------------------------------------------------


def map_category(sync_category: str) -> str:
    """Map an upstream sync category to our curated category name.

    Args:
        sync_category: Category name from the sync manifest.

    Returns:
        Mapped category name. Falls back to ``"devtools"`` for unknown
        categories.
    """
    mapped = CATEGORY_MAP.get(sync_category, "devtools")
    if sync_category not in CATEGORY_MAP:
        logger.warning(
            "Unknown upstream category %r, mapping to %r",
            sync_category,
            mapped,
        )
    return mapped


# ---------------------------------------------------------------------------
# Core merge logic
# ---------------------------------------------------------------------------


def merge_manifests(
    root: Dict[str, Any],
    sync: Dict[str, Any],
    *,
    project_root: str | Path = ".",
) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """Merge sync manifest entries into the root manifest.

    New agents (present in *sync* but not in *root*) are added with a
    ``[NEEDS_REVIEW]`` prefix in their description. Existing agents are
    left untouched to preserve curated metadata.

    Agents in *root* with ``source="aitmpl"`` that are **not** present in
    *sync* are flagged as potentially stale (returned in *stale_names*).

    Args:
        root: Parsed root manifest dictionary (will be mutated).
        sync: Parsed sync manifest dictionary.
        project_root: Project root path for verifying agent .md files.

    Returns:
        A 3-tuple of ``(updated_root, added_names, stale_names)`` where:
        - *updated_root* is the mutated root manifest.
        - *added_names* is a list of newly added agent names.
        - *stale_names* is a list of agents in root (source=aitmpl) not
          found in the sync manifest.
    """
    project_root = Path(project_root)
    base_path = root.get("base_path", ".opencode/agents")

    # Build lookup of existing agents by name
    existing: Dict[str, Dict[str, Any]] = {}
    for a in root.get("agents", []):
        name = a.get("name")
        if not name:
            logger.warning("Skipping agent entry with no name: %s", a)
            continue
        if name in existing:
            logger.warning("Duplicate agent name in root manifest: %r", name)
        existing[name] = a

    # Track sync agent names for staleness detection
    sync_names: Set[str] = set()
    added: List[str] = []

    for agent in sync.get("agents", []):
        name = agent.get("name")
        if not name:
            logger.warning("Skipping sync agent entry with no name: %s", agent)
            continue
        sync_names.add(name)

        if name in existing:
            # Already in root manifest — preserve curated metadata,
            # but update quality_score if the sync manifest has one
            sync_score = agent.get("quality_score")
            if sync_score is not None:
                existing[name]["quality_score"] = sync_score
            continue

        # New agent — map category and build entry
        sync_category = agent.get("category", "devtools")
        our_category = map_category(sync_category)

        # Path is relative to base_path, without .md extension
        agent_path = agent.get("path", f"{our_category}/{name}")

        # Verify the .md file exists on disk
        full_path = project_root / base_path / f"{agent_path}.md"
        if not full_path.is_file():
            logger.warning(
                "Agent file not found at %s (may be staged but not on disk)",
                full_path,
            )

        new_entry: Dict[str, Any] = {
            "name": name,
            "category": our_category,
            "path": agent_path,
            "mode": agent.get("mode", "subagent"),
            "description": (
                f"{NEEDS_REVIEW_PREFIX} {agent.get('description', 'Auto-synced agent')}"
            ),
            "tags": [],
            "source": "aitmpl",
        }
        # Preserve quality_score if present in sync manifest
        sync_score = agent.get("quality_score")
        if sync_score is not None:
            new_entry["quality_score"] = sync_score
        existing[name] = new_entry
        added.append(name)
        logger.info("Added new agent: %s (category: %s)", name, our_category)

    # Detect stale agents (in root with source=aitmpl but not in sync)
    stale: List[str] = []
    for name, entry in existing.items():
        if entry.get("source") == "aitmpl" and name not in sync_names:
            stale.append(name)
            logger.warning(
                "Stale agent %r: present in root (source=aitmpl) but absent "
                "from sync manifest — may need removal",
                name,
            )

    # Sort agents by name and update counts
    root["agents"] = sorted(existing.values(), key=lambda a: a["name"])
    root["agent_count"] = len(root["agents"])

    return root, added, stale


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def update_manifest(
    root_path: str = DEFAULT_ROOT_MANIFEST,
    sync_path: str = DEFAULT_SYNC_MANIFEST,
    metadata_path: Optional[str] = DEFAULT_METADATA_OUTPUT,
    *,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Run the full manifest update pipeline.

    Args:
        root_path: Path to the root project manifest.
        sync_path: Path to the sync-generated manifest.
        metadata_path: Where to write sync metadata JSON (set to ``None``
            to skip metadata output).
        dry_run: If ``True``, log what would change without writing files.

    Returns:
        Metadata dictionary with keys: ``added``, ``stale``,
        ``total_synced``, ``tier``, ``dry_run``.

    Raises:
        ManifestNotFoundError: If root manifest does not exist.
        ManifestError: On JSON parse errors or I/O failures.
        SyncManifestNotFoundError: If sync manifest is not found.
    """
    # Validate root manifest exists
    if not os.path.isfile(root_path):
        raise ManifestNotFoundError(f"Root manifest not found: {root_path}")

    # Check sync manifest exists
    if not os.path.isfile(sync_path):
        raise SyncManifestNotFoundError(
            f"No sync manifest found at {sync_path}, nothing to merge"
        )

    # Load manifests
    try:
        root = load_json(root_path)
    except (json.JSONDecodeError, OSError) as exc:
        raise ManifestError(f"Failed to load root manifest {root_path}: {exc}") from exc

    if not isinstance(root, dict):
        raise ManifestError(f"Root manifest is not a JSON object: {root_path}")

    try:
        sync = load_json(sync_path)
    except (json.JSONDecodeError, OSError) as exc:
        raise ManifestError(f"Failed to load sync manifest {sync_path}: {exc}") from exc

    if not isinstance(sync, dict):
        raise ManifestError(f"Sync manifest is not a JSON object: {sync_path}")

    # Determine project root from root manifest location
    project_root = Path(root_path).parent

    # Merge
    root, added, stale = merge_manifests(root, sync, project_root=project_root)

    # Build metadata
    metadata: Dict[str, Any] = {
        "added": added,
        "stale": stale,
        "total_synced": len(sync.get("agents", [])),
        "tier": os.environ.get("SYNC_TIER", "core"),
        "dry_run": dry_run,
    }

    if dry_run:
        logger.info("DRY RUN — no files written")
        logger.info(
            "Would add %d new agent(s): %s",
            len(added),
            ", ".join(added) if added else "(none)",
        )
        if stale:
            logger.info("Stale agent(s) detected: %s", ", ".join(stale))
        logger.info("Total synced: %d", metadata["total_synced"])
        return metadata

    # Write updated manifest
    prev_count = root["agent_count"] - len(added)
    save_json(root_path, root)
    logger.info(
        "Manifest updated: %d → %d agents (%d added)",
        prev_count,
        root["agent_count"],
        len(added),
    )

    for name in added:
        logger.info("  + %s", name)

    if stale:
        logger.warning(
            "%d stale agent(s) detected (review needed): %s",
            len(stale),
            ", ".join(stale),
        )

    # Write metadata (for CI / PR description)
    if metadata_path:
        try:
            save_json(metadata_path, metadata)
            logger.debug("Metadata written to %s", metadata_path)
        except OSError as exc:
            logger.warning("Failed to write metadata to %s: %s", metadata_path, exc)

    return metadata


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    """CLI entry point for update-manifest."""
    parser = argparse.ArgumentParser(
        description="Update root manifest.json with agents from sync manifest.",
        epilog="Exit codes: 0=success, 1=error, 2=sync manifest not found",
    )
    parser.add_argument(
        "--root-manifest",
        default=DEFAULT_ROOT_MANIFEST,
        help=f"Path to the root project manifest (default: {DEFAULT_ROOT_MANIFEST})",
    )
    parser.add_argument(
        "--sync-manifest",
        default=DEFAULT_SYNC_MANIFEST,
        help=f"Path to the sync-generated manifest (default: {DEFAULT_SYNC_MANIFEST})",
    )
    parser.add_argument(
        "--metadata-output",
        default=DEFAULT_METADATA_OUTPUT,
        help=f"Path to write sync metadata JSON (default: {DEFAULT_METADATA_OUTPUT})",
    )
    parser.add_argument(
        "--no-metadata",
        action="store_true",
        help="Skip writing metadata output file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing any files",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose (DEBUG) logging",
    )

    args = parser.parse_args()

    # Configure logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(name)s: %(levelname)s: %(message)s",
    )

    metadata_path = None if args.no_metadata else args.metadata_output

    try:
        update_manifest(
            root_path=args.root_manifest,
            sync_path=args.sync_manifest,
            metadata_path=metadata_path,
            dry_run=args.dry_run,
        )
    except SyncManifestNotFoundError as exc:
        logger.info("%s", exc)
        sys.exit(2)
    except ManifestError as exc:
        logger.error("%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
