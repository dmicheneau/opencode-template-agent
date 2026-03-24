#!/usr/bin/env python3
"""Extract trigger conditions from agent Decisions sections.

Reads agents/**/*.md, parses ## Decisions (or ## Décisions),
extracts IF/ELIF/ELSE/SI/SINON SI/SINON conditions.
Outputs a JSON mapping: { "agent-name": ["condition 1", ...] }.

Guards:
- Skips symlinks (anti-loop)
- Rejects paths containing '..' or null bytes (anti-traversal)
- Max 50 triggers per agent, 200 chars per trigger

Requires: Python 3.8+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "triggers.json"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_TRIGGERS_PER_AGENT = 50
MAX_TRIGGER_CHARS = 200

# Regex: match lines starting with IF/ELIF/ELSE IF/When (EN) or SI/SINON SI (FR)
# These are conditional forms that carry a testable condition after the keyword.
# ELSE / SINON alone are fallbacks (no condition text) — handled separately.
CONDITION_RE = re.compile(
    r"^\s*[-*]?\s*"
    r"(?:ELIF|ELSE\s+IF|SINON\s+SI|IF|When|SI)\s+"
    r"(.+?)(?:\s*(?:→|—|-{2,})\s*.*)?$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Core extraction functions (importable for tests)
# ---------------------------------------------------------------------------


def extract_decisions_section(content: str) -> str:
    """Extract text between ## Decisions/Décisions and the next ## heading.

    Returns empty string if no such section is found.
    """
    match = re.search(
        r"^##\s+D[eé]cisions\s*\n(.*?)(?=^##\s|\Z)",
        content,
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    return match.group(1) if match else ""


def extract_triggers(decisions_text: str) -> list[str]:
    """Extract and normalize trigger conditions from a Decisions section.

    Each returned string is:
    - The condition text (after the IF/ELIF/ELSE keyword)
    - Stripped of leading/trailing whitespace
    - Lowercased
    - Truncated to MAX_TRIGGER_CHARS
    - Non-empty

    At most MAX_TRIGGERS_PER_AGENT results are returned.
    """
    triggers: list[str] = []
    seen: set[str] = set()

    for line in decisions_text.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue

        # Try to match the condition pattern
        m = CONDITION_RE.match(line)
        if m:
            condition = m.group(1).strip()
        else:
            continue

        # Normalize
        condition = condition.lower().strip()

        # Remove trailing punctuation artifacts
        condition = condition.rstrip(" .-:→")

        if not condition:
            continue

        # Truncate
        condition = condition[:MAX_TRIGGER_CHARS]

        # Deduplicate
        if condition in seen:
            continue
        seen.add(condition)

        triggers.append(condition)

        if len(triggers) >= MAX_TRIGGERS_PER_AGENT:
            break

    return triggers


def is_safe_path(path: Path, base_dir: Path) -> bool:
    """Return True if path is safe (no traversal, no null bytes, not a symlink).

    Guards:
    - Rejects symlinks
    - Rejects paths whose string representation contains '..' or '\\0'
    - Ensures resolved path is under base_dir
    """
    # Guard: symlinks
    if path.is_symlink():
        return False

    # Guard: null bytes
    path_str = str(path)
    if "\0" in path_str:
        return False

    # Guard: path traversal via '..' component
    try:
        resolved = path.resolve()
        resolved_base = base_dir.resolve()
        # Must be under base_dir
        resolved.relative_to(resolved_base)
    except ValueError:
        return False

    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--agents-dir",
        type=Path,
        default=AGENTS_DIR,
        help=f"Directory containing agent .md files (default: {AGENTS_DIR})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
        help=f"Output JSON file (default: {OUTPUT_FILE})",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Print per-agent status",
    )
    args = parser.parse_args(argv)

    agents_dir: Path = args.agents_dir
    output_file: Path = args.output

    if not agents_dir.exists() or not agents_dir.is_dir():
        print(f"ERROR: agents directory not found: {agents_dir}", file=sys.stderr)
        return 1

    results: dict[str, list[str]] = {}
    freq: dict[str, int] = {}
    skipped = 0
    no_decisions = 0

    for md_file in sorted(agents_dir.rglob("*.md")):
        # Guard: path safety (symlink, traversal, null byte)
        if not is_safe_path(md_file, agents_dir):
            print(
                f"  SKIP: {md_file} — unsafe path (symlink or traversal)",
                file=sys.stderr,
            )
            skipped += 1
            continue

        agent_name = md_file.stem

        try:
            content = md_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            print(f"  WARN: {agent_name} — cannot read: {exc}", file=sys.stderr)
            skipped += 1
            continue

        decisions = extract_decisions_section(content)
        if not decisions:
            if args.verbose:
                print(f"  WARN: {agent_name} — no ## Decisions section")
            no_decisions += 1
            results[agent_name] = []
            continue

        triggers = extract_triggers(decisions)
        results[agent_name] = triggers

        if args.verbose:
            print(f"  OK:   {agent_name} — {len(triggers)} triggers")

        for t in triggers:
            # Track frequency of first word (key signal)
            first_word = t.split()[0] if t.split() else t
            freq[first_word] = freq.get(first_word, 0) + 1

    # Write output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    agents_with_triggers = sum(1 for v in results.values() if v)
    print(
        f"\nExtracted triggers for {agents_with_triggers}/{len(results)} agents "
        f"(skipped: {skipped}, no Decisions: {no_decisions}) → {output_file}"
    )

    if freq:
        print("\nTop 20 trigger first-words by frequency:")
        for word, count in sorted(freq.items(), key=lambda x: -x[1])[:20]:
            print(f"  {count:3d}× {word}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
