#!/usr/bin/env python3
"""
generate_readme_scores.py — Auto-generate agent quality score tables in READMEs.

Reads manifest.json, scores each agent with quality_scorer.score_agent(),
and updates the markdown tables in README.md (French) and README.en.md (English)
between <!-- SCORES:BEGIN --> and <!-- SCORES:END --> markers.

Usage:
    python3 scripts/generate_readme_scores.py           # Update READMEs in place
    python3 scripts/generate_readme_scores.py --check   # Exit 1 if out of date (CI)

Requires: Python 3.10+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List, NamedTuple

# ---------------------------------------------------------------------------
# Path setup — allow importing quality_scorer from the scripts/ directory
# ---------------------------------------------------------------------------

_SCRIPTS_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPTS_DIR.parent

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from quality_scorer import score_agent  # noqa: E402


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MARKER_BEGIN = "<!-- SCORES:BEGIN -->"
MARKER_END = "<!-- SCORES:END -->"

README_FR = _PROJECT_ROOT / "README.md"
README_EN = _PROJECT_ROOT / "README.en.md"
MANIFEST_PATH = _PROJECT_ROOT / "manifest.json"
AGENTS_DIR = _PROJECT_ROOT / "agents"


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


class AgentScore(NamedTuple):
    """Scored agent ready for table rendering."""

    category: str
    name: str
    overall: float
    label: str
    tokens: int
    lines: int


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def load_manifest() -> List[Dict[str, Any]]:
    """Load and return the agents list from manifest.json."""
    if not MANIFEST_PATH.exists():
        print(
            f"ERROR: {MANIFEST_PATH} not found. Run from the project root.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(MANIFEST_PATH, encoding="utf-8") as f:
        data = json.load(f)

    agents = data.get("agents")
    if agents is None:
        print(
            f"ERROR: {MANIFEST_PATH} is missing the 'agents' key.",
            file=sys.stderr,
        )
        sys.exit(1)

    return agents


def score_all_agents(agents: List[Dict[str, Any]]) -> List[AgentScore]:
    """Score every agent from the manifest, skipping missing files."""
    results: List[AgentScore] = []

    for entry in agents:
        agent_path = AGENTS_DIR / f"{entry['path']}.md"
        if not agent_path.exists():
            print(
                f"WARNING: {agent_path} not found, skipping {entry['name']}",
                file=sys.stderr,
            )
            continue

        try:
            content = agent_path.read_text(encoding="utf-8")
            file_size = agent_path.stat().st_size
            line_count = len(content.splitlines())
            tokens = file_size // 4

            result = score_agent(content)
        except Exception as exc:
            print(
                f"WARNING: scoring failed for {entry['name']}: {exc}",
                file=sys.stderr,
            )
            continue

        results.append(
            AgentScore(
                category=entry["category"],
                name=entry["name"],
                overall=result["overall"],
                label=result["label"],
                tokens=tokens,
                lines=line_count,
            )
        )

    # Sort by category, then by name within category
    results.sort(key=lambda a: (a.category, a.name))
    return results


def _fmt_number(n: int, locale: str) -> str:
    """Format an integer with locale-appropriate thousands separator."""
    if locale == "fr":
        # French: regular space U+0020 separator (intentionally NOT non-breaking
        # space U+00A0) — matches existing README convention and avoids encoding
        # surprises in markdown / CI diffs.
        return f"{n:,}".replace(",", " ")
    # English: comma separator
    return f"{n:,}"


def build_summary(scores: List[AgentScore]) -> tuple[int, float, float, str]:
    """Compute summary statistics: count, mean, pass_rate, label_breakdown."""
    if not scores:
        return 0, 0.0, 0, "No agents scored"

    count = len(scores)
    avg = round(mean(s.overall for s in scores), 2)
    # Pass rate: all agents pass (overall >= 3.5 and no dim < 2) but we
    # approximate from labels — Excellent and Good both pass.
    pass_count = sum(1 for s in scores if s.label in ("Excellent", "Good"))
    pass_rate = round(100 * pass_count / count) if count else 0

    label_counts = Counter(s.label for s in scores)
    # Build label breakdown string in priority order
    breakdown_parts: List[str] = []
    for lbl in ("Excellent", "Good", "Needs improvement", "Poor"):
        if label_counts[lbl] > 0:
            breakdown_parts.append(f"{label_counts[lbl]} {lbl}")

    return count, avg, pass_rate, ", ".join(breakdown_parts)


def generate_table_fr(scores: List[AgentScore]) -> str:
    """Generate the French markdown table content (between markers)."""
    count, avg, pass_rate, breakdown = build_summary(scores)

    lines: List[str] = [
        "",
        f"**{count} agents** · Score moyen : **{avg:.2f}/5** · {pass_rate}% pass rate · {breakdown}",
        "",
        "> Coût token estimé : `taille en bytes / 4` (approximation pour contenu anglais + code).",
        "",
        "| Catégorie | Agent | Score | Label | ~Tokens | Lignes |",
        "|-----------|-------|-------|-------|---------|--------|",
    ]

    for s in scores:
        tokens_str = _fmt_number(s.tokens, "fr")
        lines_str = _fmt_number(s.lines, "fr")
        lines.append(
            f"| {s.category} | {s.name} | {s.overall:.2f} | {s.label} | {tokens_str} | {lines_str} |"
        )

    lines.append("")
    return "\n".join(lines)


def generate_table_en(scores: List[AgentScore]) -> str:
    """Generate the English markdown table content (between markers)."""
    count, avg, pass_rate, breakdown = build_summary(scores)

    lines: List[str] = [
        "",
        f"**{count} agents** · Average score: **{avg:.2f}/5** · {pass_rate}% pass rate · {breakdown}",
        "",
        "> Estimated token cost: `size in bytes / 4` (approximation for English + code content).",
        "",
        "| Category | Agent | Score | Label | ~Tokens | Lines |",
        "|----------|-------|-------|-------|---------|-------|",
    ]

    for s in scores:
        tokens_str = _fmt_number(s.tokens, "en")
        lines_str = _fmt_number(s.lines, "en")
        lines.append(
            f"| {s.category} | {s.name} | {s.overall:.2f} | {s.label} | {tokens_str} | {lines_str} |"
        )

    lines.append("")
    return "\n".join(lines)


def replace_between_markers(content: str, new_section: str, filepath: Path) -> str:
    """Replace content between SCORES:BEGIN and SCORES:END markers.

    Raises SystemExit if markers are missing.
    """
    begin_idx = content.find(MARKER_BEGIN)
    end_idx = content.find(MARKER_END)

    if begin_idx == -1 or end_idx == -1:
        missing = []
        if begin_idx == -1:
            missing.append(MARKER_BEGIN)
        if end_idx == -1:
            missing.append(MARKER_END)
        print(
            f"ERROR: Missing marker(s) in {filepath}: {', '.join(missing)}\n"
            f"Add {MARKER_BEGIN} and {MARKER_END} around the scores table.",
            file=sys.stderr,
        )
        sys.exit(1)

    if begin_idx >= end_idx:
        print(
            f"ERROR: {MARKER_BEGIN} appears after {MARKER_END} in {filepath}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Keep the markers themselves, replace only what's between them
    before = content[: begin_idx + len(MARKER_BEGIN)]
    after = content[end_idx:]

    return before + new_section + "\n" + after


def update_readmes(check: bool = False) -> int:
    """Main entry point: score agents and update (or check) both READMEs.

    Args:
        check: If True, don't write — just verify content matches.

    Returns:
        0 if everything is up to date (or was updated), 1 if check failed.
    """
    agents = load_manifest()
    scores = score_all_agents(agents)

    table_fr = generate_table_fr(scores)
    table_en = generate_table_en(scores)

    updates = [
        (README_FR, table_fr),
        (README_EN, table_en),
    ]

    if check:
        all_ok = True
        for readme_path, table_content in updates:
            if not readme_path.exists():
                print(
                    f"ERROR: {readme_path} not found.",
                    file=sys.stderr,
                )
                sys.exit(1)
            current = readme_path.read_text(encoding="utf-8")
            expected = replace_between_markers(current, table_content, readme_path)
            if current != expected:
                print(
                    f"MISMATCH: {readme_path.name} scores are out of date. "
                    f"Run: python3 scripts/generate_readme_scores.py",
                    file=sys.stderr,
                )
                all_ok = False

        if all_ok:
            print("README scores are up to date")
            return 0
        return 1

    for readme_path, table_content in updates:
        if not readme_path.exists():
            print(
                f"ERROR: {readme_path} not found.",
                file=sys.stderr,
            )
            sys.exit(1)
        current = readme_path.read_text(encoding="utf-8")
        updated = replace_between_markers(current, table_content, readme_path)
        readme_path.write_text(updated, encoding="utf-8")
        print(f"Updated {readme_path.name}")

    # Print summary
    count, avg, pass_rate, breakdown = build_summary(scores)
    print(f"\n{count} agents scored · Average: {avg:.2f}/5 · {breakdown}")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    """Parse CLI args and run."""
    check = "--check" in sys.argv[1:]
    return update_readmes(check=check)


if __name__ == "__main__":
    raise SystemExit(main())
