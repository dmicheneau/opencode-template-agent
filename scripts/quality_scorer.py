#!/usr/bin/env python3
"""
quality_scorer.py — 8-dimension quality scorer for AI agent markdown files.

Scores agent files across: Specificity, Decision Density, Workflow Clarity,
Permission Alignment, Density, Tool Awareness, Anti-pattern Coverage,
Collaboration Clarity.

Pass criteria: overall mean >= 3.5 AND no dimension < 2.

Standalone: python3 scripts/quality_scorer.py path/to/agent.md
Importable: from quality_scorer import score_agent

Requires: Python 3.10+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import json
import re
import sys
from statistics import mean
from typing import Any, Dict

# Import the nested frontmatter parser from sync_common (same package dir)
from sync_common import parse_nested_frontmatter


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

_RE_DECISION = re.compile(r"(?i)\b(if|when|unless|otherwise|else|in case|fallback)\b")
_RE_NUMBERED_STEP = re.compile(r"^\s*\d+\.\s+")
_RE_VERB_FIRST = re.compile(
    r"^\s*\d+\.\s+\**(?:Run|Check|Validate|Create|Review|Parse|Extract|Send|"
    r"Update|Delete|Read|Write|Execute|Deploy|Test|Build|Scan|Notify|Open|"
    r"Close|Merge|Reject|Approve|Generate|Analyze|Compare|Resolve|Identify|"
    r"Configure|Set|Install|Verify|Inspect|Apply|Document|Map|Assess|Audit|"
    r"Measure|Monitor|Profile|Refactor|Migrate|Draft|Prioritize|Evaluate|"
    r"Define|Gather|Estimate|Plan|Investigate|Diagnose|Fix|Implement|Search|"
    r"Fetch|Navigate|Capture|Annotate|Propose|Recommend|Score|Rate)\b",
    re.IGNORECASE,
)
_RE_FILLER = re.compile(
    r"(?i)(it is important|note that|please ensure|keep in mind|"
    r"remember to|as mentioned|in order to)"
)
_RE_GENERIC = re.compile(
    r"(?i)(be thorough|follow best practices|ensure quality|be careful|"
    r"do a good job|pay attention|strive for|aim for excellence)"
)
_RE_TOOL_REF = re.compile(r"`([a-zA-Z_][\w-]*)`")
_RE_CONDITIONAL_TOOL = re.compile(
    r"(?:use|prefer|run)\s+`\w+`\s+(?:when|if|for)", re.IGNORECASE
)

# Known tools that agents can reference — only these are counted for scoring
KNOWN_TOOLS: frozenset[str] = frozenset(
    {
        "Read",
        "Edit",
        "Write",
        "Bash",
        "Glob",
        "Grep",
        "Task",
        "Fetch",
        "WebFetch",
        "Search",
        "Diff",
        "Notebook",
        "MCP",
        "Browser",
        "Think",
        "TodoWrite",
        "Architect",
    }
)
_RE_ANTIPATTERN = re.compile(
    r"(?i)\b(do not|don't|never|avoid|anti-pattern|mistake|pitfall|trap)\b"
)
_RE_HANDOFF = re.compile(
    r"(?i)(?:delegate|hand off|handoff|escalate|forward|consult|notify|"
    r"defer to|invoke|call)\s+(?:to\s+)?`?\w+[\w-]*`?"
)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def score_agent(content: str) -> Dict[str, Any]:
    """Score an agent markdown file across 8 quality dimensions.

    Args:
        content: Raw markdown string of the agent file.

    Returns:
        Dict with ``dimensions`` (name→int), ``overall`` (float),
        ``min_dimension`` (int), ``passed`` (bool), ``label`` (str).
    """
    lines = content.strip().split("\n")
    total_lines = len(lines)

    meta, body = parse_nested_frontmatter(content)

    # Extract permission keys from nested frontmatter
    perm_block = meta.get("permission", {})
    permission_keys: set = set()
    if isinstance(perm_block, dict):
        permission_keys = set(perm_block.keys())

    scores: Dict[str, int] = {}

    # 1. Specificity
    generic_count = sum(1 for ln in lines if _RE_GENERIC.search(ln))
    specificity_ratio = 1 - (generic_count / max(total_lines, 1))
    if specificity_ratio >= 0.95:
        scores["specificity"] = 5
    elif specificity_ratio >= 0.80:
        scores["specificity"] = 3
    else:
        scores["specificity"] = 1

    # 2. Decision Density
    decision_count = sum(1 for ln in lines if _RE_DECISION.search(ln))
    if decision_count >= 7:
        scores["decision_density"] = 5
    elif decision_count >= 3:
        scores["decision_density"] = 3
    else:
        scores["decision_density"] = 1

    # 3. Workflow Clarity
    numbered_steps = [ln for ln in lines if _RE_NUMBERED_STEP.match(ln)]
    verb_first = [ln for ln in numbered_steps if _RE_VERB_FIRST.match(ln)]
    step_count = len(numbered_steps)
    vf_ratio = len(verb_first) / max(step_count, 1)
    if 4 <= step_count <= 10 and vf_ratio >= 0.8:
        scores["workflow_clarity"] = 5
    elif step_count >= 3:
        scores["workflow_clarity"] = 3
    else:
        scores["workflow_clarity"] = 1

    # 4. Permission Alignment
    # Check if the body mentions the tools enabled by the permissions.
    # Map permission keys to the tool names that an agent would reference.
    _PERM_TO_TOOLS: Dict[str, set[str]] = {
        "read": {"Read"},
        "write": {"Write"},
        "edit": {"Edit"},
        "bash": {"Bash"},
        "glob": {"Glob"},
        "grep": {"Grep"},
        "task": {"Task"},
        "webfetch": {"WebFetch", "Fetch"},
        "browsermcp": {"Browser"},
        "mcp": {"MCP"},
        "todowrite": {"TodoWrite"},
        "todoread": {"TodoWrite"},  # often mentioned together
    }
    expected_tools: set[str] = set()
    for pkey in permission_keys:
        expected_tools |= _PERM_TO_TOOLS.get(pkey, set())
    # Find which known tools are actually mentioned in the body
    all_refs = set(_RE_TOOL_REF.findall(body))
    mentioned_tools = all_refs & (expected_tools | KNOWN_TOOLS)
    if len(permission_keys) > 0 and len(expected_tools) > 0:
        coverage = len(mentioned_tools & expected_tools) / len(expected_tools)
        if coverage >= 0.6:
            scores["permission_alignment"] = 5
        elif coverage >= 0.3:
            scores["permission_alignment"] = 3
        else:
            scores["permission_alignment"] = 2
    elif len(permission_keys) > 0:
        scores["permission_alignment"] = 2
    else:
        scores["permission_alignment"] = 1

    # 5. Density
    filler_count = sum(1 for ln in lines if _RE_FILLER.search(ln))
    filler_ratio = filler_count / max(total_lines, 1)
    if filler_ratio <= 0.05 and 30 <= total_lines <= 120:
        scores["density"] = 5
    elif filler_ratio <= 0.15 and total_lines <= 140:
        scores["density"] = 3
    else:
        scores["density"] = 1

    # 6. Tool Awareness
    all_tool_refs = set(_RE_TOOL_REF.findall(body))
    unique_tools = all_tool_refs & KNOWN_TOOLS
    conditional_refs = len(_RE_CONDITIONAL_TOOL.findall(body))
    if len(unique_tools) >= 4 and conditional_refs >= 2:
        scores["tool_awareness"] = 5
    elif len(unique_tools) >= 2:
        scores["tool_awareness"] = 3
    else:
        scores["tool_awareness"] = 1

    # 7. Anti-pattern Coverage
    ap_count = sum(1 for ln in lines if _RE_ANTIPATTERN.search(ln))
    if ap_count >= 5:
        scores["antipattern_coverage"] = 5
    elif ap_count >= 2:
        scores["antipattern_coverage"] = 3
    else:
        scores["antipattern_coverage"] = 1

    # 8. Collaboration Clarity
    handoff_count = len(_RE_HANDOFF.findall(body))
    if handoff_count >= 3:
        scores["collaboration_clarity"] = 5
    elif handoff_count >= 1:
        scores["collaboration_clarity"] = 3
    else:
        scores["collaboration_clarity"] = 1

    # Overall
    all_scores = list(scores.values())
    overall = round(mean(all_scores), 2)
    min_score = min(all_scores)
    passed = overall >= 3.5 and min_score >= 2

    if overall >= 4.5:
        label = "Excellent"
    elif overall >= 3.5:
        label = "Good"
    elif overall >= 2.5:
        label = "Needs improvement"
    else:
        label = "Poor"

    return {
        "dimensions": scores,
        "overall": overall,
        "min_dimension": min_score,
        "passed": passed,
        "label": label,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    """Score one or more agent files from the command line."""
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <agent.md> [agent2.md ...]", file=sys.stderr)
        return 1

    exit_code = 0
    for path in sys.argv[1:]:
        try:
            with open(path, encoding="utf-8") as f:
                content = f.read()
        except OSError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        result = score_agent(content)
        print(f"\n{'=' * 60}")
        print(f"  {path}")
        print(f"{'=' * 60}")
        for dim, val in result["dimensions"].items():
            bar = "#" * val + "." * (5 - val)
            print(f"  {dim:30s} [{bar}] {val}/5")
        print(f"  {'':30s} --------")
        print(f"  {'overall':30s} {result['overall']:.2f}/5.00")
        print(f"  {'label':30s} {result['label']}")
        print(f"  {'passed':30s} {'YES' if result['passed'] else 'NO'}")

        if not result["passed"]:
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
