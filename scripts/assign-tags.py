#!/usr/bin/env python3
"""Apply ecosystem/intent/related_agents tags from CSV to manifest.json.

Reads data/ecosystem-intent-tags.csv and applies the tags to manifest.json.

Modes:
  --dry-run  Print what would be changed without modifying any files (default)
  --apply    Actually modify manifest.json in place

CSV format:
  agent_name,ecosystem,intent,related_agents
  typescript-pro,"javascript,typescript","build,review","code-reviewer,refactoring-specialist"

Fields:
  ecosystem       comma-separated ecosystem tags (e.g. "javascript,typescript")
  intent          comma-separated intent tags (e.g. "build,review")
  related_agents  comma-separated agent names (e.g. "code-reviewer,react-specialist")

Behavior:
  - Unknown agent names in CSV → warning, skip (no crash)
  - Malformed CSV rows → warning, skip
  - Idempotent: applying twice gives the same result
  - Preserves all existing manifest fields unchanged
  - Writes manifest atomically via temp file + os.replace

Requires: Python 3.8+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "manifest.json"
CSV_PATH = REPO_ROOT / "data" / "ecosystem-intent-tags.csv"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_csv_field(value: str) -> list[str]:
    """Split a comma-separated field, strip whitespace, drop empty strings."""
    if not value or not value.strip():
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def load_csv(csv_path: Path) -> dict[str, dict[str, list[str]]]:
    """Load the tags CSV into a dict keyed by agent_name.

    Returns:
        { agent_name: { "ecosystem": [...], "intent": [...], "related_agents": [...] } }

    Warnings are printed to stderr for malformed rows; they are skipped, not raised.
    """
    records: dict[str, dict[str, list[str]]] = {}

    try:
        content = csv_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        print(f"ERROR: Cannot read CSV file {csv_path}: {exc}", file=sys.stderr)
        return records

    reader = csv.DictReader(io.StringIO(content))

    expected_fields = {"agent_name", "ecosystem", "intent", "related_agents"}
    if reader.fieldnames is None:
        print("ERROR: CSV has no header row", file=sys.stderr)
        return records

    actual_fields = set(reader.fieldnames)
    missing = expected_fields - actual_fields
    if missing:
        print(
            f"WARN: CSV missing columns: {sorted(missing)} — "
            f"present: {sorted(actual_fields)}",
            file=sys.stderr,
        )

    for row_num, row in enumerate(reader, start=2):
        try:
            agent_name = (row.get("agent_name") or "").strip()
            if not agent_name:
                print(
                    f"WARN: row {row_num}: empty agent_name — skipping", file=sys.stderr
                )
                continue

            ecosystem = _parse_csv_field(row.get("ecosystem") or "")
            intent = _parse_csv_field(row.get("intent") or "")
            related = _parse_csv_field(row.get("related_agents") or "")

            records[agent_name] = {
                "ecosystem": ecosystem,
                "intent": intent,
                "related_agents": related,
            }
        except Exception as exc:
            print(
                f"WARN: row {row_num}: unexpected error: {exc} — skipping",
                file=sys.stderr,
            )
            continue

    return records


def load_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load manifest.json and return parsed dict."""
    try:
        raw = manifest_path.read_text(encoding="utf-8")
        return json.loads(raw)
    except (OSError, UnicodeDecodeError) as exc:
        print(f"ERROR: Cannot read manifest {manifest_path}: {exc}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(
            f"ERROR: Invalid JSON in manifest {manifest_path}: {exc}", file=sys.stderr
        )
        sys.exit(1)


def write_manifest_atomic(manifest_path: Path, data: dict[str, Any]) -> None:
    """Write manifest.json atomically via temp file + os.replace."""
    json_str = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(manifest_path.parent), suffix=".tmp", prefix=".manifest-"
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp:
            tmp.write(json_str)
        os.replace(tmp_path, str(manifest_path))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def _same_list(a: list[str] | None, b: list[str] | None) -> bool:
    """Order-insensitive list comparison for idempotence checks."""
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return sorted(a) == sorted(b)


def compute_changes(
    manifest: dict[str, Any],
    csv_records: dict[str, dict[str, list[str]]],
) -> list[dict[str, Any]]:
    """Compute the list of changes to apply to manifest agents.

    Returns a list of change dicts:
    { "agent": <agent_dict>, "agent_name": str,
      "ecosystem": [...], "intent": [...], "related_agents": [...] }

    Warnings are printed for CSV agents not found in manifest.
    """
    known_agents = {a["name"]: a for a in manifest.get("agents", [])}
    changes = []

    for agent_name, tags in csv_records.items():
        if agent_name not in known_agents:
            print(
                f"WARN: agent '{agent_name}' in CSV not found in manifest — skipping",
                file=sys.stderr,
            )
            continue

        agent = known_agents[agent_name]

        # Check if this would actually change anything
        current_eco = agent.get("ecosystem", None)
        current_intent = agent.get("intent", None)
        current_related = agent.get("related_agents", None)

        new_eco = tags["ecosystem"] if tags["ecosystem"] else None
        new_intent = tags["intent"] if tags["intent"] else None
        new_related = tags["related_agents"] if tags["related_agents"] else None

        if (
            _same_list(current_eco, new_eco)
            and _same_list(current_intent, new_intent)
            and _same_list(current_related, new_related)
        ):
            continue  # No change needed

        changes.append(
            {
                "agent": agent,
                "agent_name": agent_name,
                "ecosystem": new_eco,
                "intent": new_intent,
                "related_agents": new_related,
                "prev_ecosystem": current_eco,
                "prev_intent": current_intent,
                "prev_related": current_related,
            }
        )

    return changes


def apply_changes(
    manifest: dict[str, Any],
    changes: list[dict[str, Any]],
) -> dict[str, Any]:
    """Apply computed changes to manifest agents in-place.

    Returns the modified manifest (also mutates in-place for efficiency).
    """
    for change in changes:
        agent = change["agent"]
        if change["ecosystem"] is not None:
            agent["ecosystem"] = change["ecosystem"]
        elif "ecosystem" in agent:
            del agent["ecosystem"]

        if change["intent"] is not None:
            agent["intent"] = change["intent"]
        elif "intent" in agent:
            del agent["intent"]

        if change["related_agents"] is not None:
            agent["related_agents"] = change["related_agents"]
        elif "related_agents" in agent:
            del agent["related_agents"]

    return manifest


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        "--dry-run",
        action="store_true",
        help="Print changes without modifying files",
    )
    mode_group.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to manifest.json",
    )

    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help=f"Path to manifest.json (default: {MANIFEST_PATH})",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=CSV_PATH,
        help=f"Path to ecosystem-intent-tags.csv (default: {CSV_PATH})",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Print per-agent details",
    )

    args = parser.parse_args(argv)

    # Load inputs
    manifest = load_manifest(args.manifest)
    csv_records = load_csv(args.csv)

    if not csv_records:
        print("ERROR: No valid records loaded from CSV", file=sys.stderr)
        return 1

    print(f"Loaded {len(csv_records)} records from CSV")
    print(f"Manifest has {len(manifest.get('agents', []))} agents")

    # Compute changes
    changes = compute_changes(manifest, csv_records)

    if not changes:
        print("No changes needed — manifest already up to date.")
        return 0

    print(f"\n{len(changes)} agent(s) to update:")
    for change in changes:
        name = change["agent_name"]
        if args.verbose:
            prev_eco = change["prev_ecosystem"]
            prev_int = change["prev_intent"]
            prev_rel = change["prev_related"]
            print(f"\n  {name}:")
            print(f"    ecosystem:      {prev_eco!r:40s} → {change['ecosystem']!r}")
            print(f"    intent:         {prev_int!r:40s} → {change['intent']!r}")
            print(
                f"    related_agents: {prev_rel!r:40s} → {change['related_agents']!r}"
            )
        else:
            print(
                f"  {name}: ecosystem={change['ecosystem']}, "
                f"intent={change['intent']}, related={change['related_agents']}"
            )

    if args.dry_run:
        print("\n[dry-run] No files modified.")
        return 0

    # Apply
    updated_manifest = apply_changes(manifest, changes)
    write_manifest_atomic(args.manifest, updated_manifest)
    print(f"\nWrote updated manifest to {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
