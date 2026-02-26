#!/usr/bin/env python3
"""
quality_scorer.py — 8-dimension quality scorer for AI agent markdown files.

Validates the NEW optimized agent format with sections:
Identity (unheaded paragraph), ## Decisions, ## Examples, ## Quality Gate.

Scoring dimensions: Frontmatter, Identity, Decisions, Examples,
Quality Gate, Conciseness, No Banned Sections, Version Pinning.

Pass criteria: overall mean >= 3.5 AND no dimension < 2.

Standalone: python3 scripts/quality_scorer.py path/to/agent.md
Importable: from quality_scorer import score_agent

Requires: Python 3.10+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import re
import sys
from statistics import mean
from typing import Any, Dict

from sync_common import parse_nested_frontmatter


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# IF/THEN/ELIF/ELSE decision tree keywords (case-insensitive, whole words)
_RE_DECISION_TREE = re.compile(r"(?i)^\s*[-*]?\s*\b(IF|THEN|ELIF|ELSE)\b")

# Fenced code block opener (``` with optional language tag)
_RE_CODE_FENCE = re.compile(r"^```")

# Bullet point (- or * at start of line, possibly indented)
_RE_BULLET = re.compile(r"^\s*[-*]\s+\S")

# Version numbers: 5.x, 3.11+, v2, >=4.0, ~=1.2, etc.
_RE_VERSION = re.compile(r"\b(?:v?\d+\.\d+[\w.*+-]*|\bv\d+\b|\b\d+\.x\b)")

# Year references: 2020-2029
_RE_YEAR = re.compile(r"\b20[2-3]\d\b")

# Banned section headings from the old format (any heading level)
_RE_BANNED_SECTION = re.compile(
    r"^#{1,3}\s+(Workflow|Tools|Anti-patterns|Collaboration)\s*$",
    re.MULTILINE | re.IGNORECASE,
)

# Section heading detector
_RE_SECTION_HEADING = re.compile(r"^##\s+(.+)", re.MULTILINE)

# Generic filler phrases (kept from old scorer for density check)
_RE_FILLER = re.compile(
    r"(?i)(it is important|note that|please ensure|keep in mind|"
    r"remember to|as mentioned|in order to)"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extract_identity_paragraph(body: str) -> str:
    """Extract text between the end of frontmatter and the first ## heading.

    Returns the identity paragraph text (may be empty).
    """
    match = re.search(r"^##\s", body, re.MULTILINE)
    if match:
        return body[: match.start()].strip()
    # No ## heading found — entire body is "identity" (unlikely but handle it)
    return body.strip()


def _extract_section(body: str, heading: str) -> str:
    """Extract content under a specific ## heading until the next ## or end.

    Args:
        body: The markdown body (after frontmatter).
        heading: The heading text to find (e.g., "Decisions").

    Returns:
        Section content (empty string if heading not found).
    """
    pattern = re.compile(
        r"^##\s+" + re.escape(heading) + r"\s*$",
        re.MULTILINE,
    )
    match = pattern.search(body)
    if not match:
        return ""

    start = match.end()
    # Find the next ## heading
    next_heading = re.search(r"^##\s+", body[start:], re.MULTILINE)
    if next_heading:
        return body[start : start + next_heading.start()].strip()
    return body[start:].strip()


def _count_code_fences(text: str) -> int:
    """Count the number of fenced code blocks (``` pairs) in text."""
    fences = [ln for ln in text.split("\n") if _RE_CODE_FENCE.match(ln.strip())]
    return len(fences) // 2  # opening + closing = 1 block


def _count_bullets(text: str) -> int:
    """Count bullet-point lines in text."""
    return sum(1 for ln in text.split("\n") if _RE_BULLET.match(ln))


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def score_agent(content: str) -> Dict[str, Any]:
    """Score an agent markdown file across 8 quality dimensions.

    Dimensions:
        frontmatter — description, mode, permission block present
        identity — unheaded paragraph between frontmatter and first ##
        decisions — ## Decisions with IF/THEN/ELIF patterns
        examples — ## Examples with 2+ fenced code blocks
        quality_gate — ## Quality Gate with 3+ bullet points
        conciseness — line count in the 50-150 range
        no_banned_sections — no Workflow/Tools/Anti-patterns/Collaboration
        version_pinning — identity contains version numbers or year refs

    Args:
        content: Raw markdown string of the agent file.

    Returns:
        Dict with ``dimensions`` (name→int), ``overall`` (float),
        ``min_dimension`` (int), ``passed`` (bool), ``label`` (str).
    """
    meta, body = parse_nested_frontmatter(content)

    # Count body lines only (excludes frontmatter YAML) for conciseness scoring
    body_lines = body.strip().split("\n")
    body_line_count = len(body_lines)

    scores: Dict[str, int] = {}

    # ---------------------------------------------------------------
    # 1. Frontmatter — description, mode, permission block
    # ---------------------------------------------------------------
    fm_checks = 0
    if meta.get("description") and str(meta["description"]).strip():
        fm_checks += 1
    if meta.get("mode") and str(meta["mode"]).strip():
        fm_checks += 1
    perm = meta.get("permission")
    if isinstance(perm, dict) and len(perm) > 0:
        fm_checks += 1

    if fm_checks == 3:
        scores["frontmatter"] = 5
    elif fm_checks >= 2:
        scores["frontmatter"] = 3
    else:
        scores["frontmatter"] = 1

    # ---------------------------------------------------------------
    # 2. Identity — paragraph before first ##, 50-300 words
    # ---------------------------------------------------------------
    identity_text = _extract_identity_paragraph(body)
    # Strip any `# Identity` heading if present (old format compat)
    identity_text = re.sub(r"^#\s+Identity\s*\n+", "", identity_text).strip()
    identity_words = len(identity_text.split()) if identity_text else 0

    if 50 <= identity_words <= 300:
        scores["identity"] = 5
    elif 30 <= identity_words <= 400:
        scores["identity"] = 3
    elif identity_words > 0:
        scores["identity"] = 2
    else:
        scores["identity"] = 1

    # ---------------------------------------------------------------
    # 3. Decisions — ## Decisions with IF/THEN/ELIF/ELSE patterns
    # ---------------------------------------------------------------
    decisions_section = _extract_section(body, "Decisions")
    if decisions_section:
        decision_keywords = sum(
            1 for ln in decisions_section.split("\n") if _RE_DECISION_TREE.search(ln)
        )
        # Also count inline IF...THEN patterns (e.g., "IF x → THEN y")
        inline_patterns = len(re.findall(r"(?i)\bIF\b.*?\bTHEN\b", decisions_section))
        total_decision_signals = max(decision_keywords, inline_patterns)

        if total_decision_signals >= 5:
            scores["decisions"] = 5
        elif total_decision_signals >= 2:
            scores["decisions"] = 3
        else:
            scores["decisions"] = 2
    else:
        scores["decisions"] = 1

    # ---------------------------------------------------------------
    # 4. Examples — ## Examples with 2+ fenced code blocks
    # ---------------------------------------------------------------
    examples_section = _extract_section(body, "Examples")
    if examples_section:
        code_blocks = _count_code_fences(examples_section)
        if code_blocks >= 3:
            scores["examples"] = 5
        elif code_blocks >= 2:
            scores["examples"] = 4
        elif code_blocks >= 1:
            scores["examples"] = 3
        else:
            scores["examples"] = 2
    else:
        scores["examples"] = 1

    # ---------------------------------------------------------------
    # 5. Quality Gate — ## Quality Gate with 3+ bullet points
    # ---------------------------------------------------------------
    qg_section = _extract_section(body, "Quality Gate")
    if qg_section:
        bullet_count = _count_bullets(qg_section)
        if bullet_count >= 5:
            scores["quality_gate"] = 5
        elif bullet_count >= 3:
            scores["quality_gate"] = 4
        elif bullet_count >= 1:
            scores["quality_gate"] = 3
        else:
            scores["quality_gate"] = 2
    else:
        scores["quality_gate"] = 1

    # ---------------------------------------------------------------
    # 6. Conciseness — body line count sweet spot 70-120, acceptable 50-150
    # ---------------------------------------------------------------
    filler_count = sum(1 for ln in body_lines if _RE_FILLER.search(ln))
    filler_ratio = filler_count / max(body_line_count, 1)

    if 70 <= body_line_count <= 120 and filler_ratio <= 0.03:
        scores["conciseness"] = 5
    elif 50 <= body_line_count <= 150 and filler_ratio <= 0.08:
        scores["conciseness"] = 4
    elif 40 <= body_line_count <= 200 and filler_ratio <= 0.15:
        scores["conciseness"] = 3
    elif body_line_count < 30:
        scores["conciseness"] = 1
    else:
        scores["conciseness"] = 2

    # ---------------------------------------------------------------
    # 7. No Banned Sections — old format headings must be absent
    # ---------------------------------------------------------------
    banned_matches = _RE_BANNED_SECTION.findall(body)
    if len(banned_matches) == 0:
        scores["no_banned_sections"] = 5
    elif len(banned_matches) == 1:
        scores["no_banned_sections"] = 3
    else:
        scores["no_banned_sections"] = 1

    # ---------------------------------------------------------------
    # 8. Version Pinning — identity mentions versions or years
    # ---------------------------------------------------------------
    has_version = bool(_RE_VERSION.search(identity_text))
    has_year = bool(_RE_YEAR.search(identity_text))
    if has_version and has_year:
        scores["version_pinning"] = 5
    elif has_version or has_year:
        scores["version_pinning"] = 4
    else:
        # Not all agents need version pinning (e.g., prd, scrum-master)
        # so absence is a 2, not a 1
        scores["version_pinning"] = 2

    # ---------------------------------------------------------------
    # Overall
    # ---------------------------------------------------------------
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
