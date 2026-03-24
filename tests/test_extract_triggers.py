#!/usr/bin/env python3
"""Tests for scripts/extract-triggers.py.

Tests:
- extract_decisions_section: basic extraction, French heading, multi-section
- extract_triggers: basic IF/ELIF/ELSE IF conditions, limit, dedup
- Stopwords / short conditions filtered
- is_safe_path: symlink guard, traversal guard
- Integration: agent with no Decisions section → empty list
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Path setup — import the module under test
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# Rename module for import (hyphen in filename)
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "extract_triggers",
    SCRIPTS_DIR / "extract-triggers.py",
)
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]

extract_decisions_section = _mod.extract_decisions_section
extract_triggers = _mod.extract_triggers
is_safe_path = _mod.is_safe_path
MAX_TRIGGERS_PER_AGENT = _mod.MAX_TRIGGERS_PER_AGENT
MAX_TRIGGER_CHARS = _mod.MAX_TRIGGER_CHARS


# ---------------------------------------------------------------------------
# Tests — extract_decisions_section
# ---------------------------------------------------------------------------


class TestExtractDecisionsSection(unittest.TestCase):
    def test_basic_extraction(self):
        content = (
            "# Title\n\n"
            "## Decisions\n\n"
            "- IF foo → bar\n"
            "- ELIF baz → qux\n\n"
            "## Examples\n\n"
            "some example\n"
        )
        section = extract_decisions_section(content)
        self.assertIn("IF foo", section)
        self.assertNotIn("Examples", section)
        self.assertNotIn("some example", section)

    def test_french_heading(self):
        """## Décisions (with accent) should also be found."""
        content = (
            "# Agent\n\n## Décisions\n\n- IF condition → result\n\n## Quality Gate\n\n"
        )
        section = extract_decisions_section(content)
        self.assertIn("IF condition", section)

    def test_no_section_returns_empty(self):
        content = (
            "# Title\n\nSome content without decisions.\n\n## Examples\n\n- item\n"
        )
        section = extract_decisions_section(content)
        self.assertEqual(section, "")

    def test_section_at_end_of_file(self):
        """Section with no following ## heading should capture until EOF."""
        content = "# Title\n\n## Decisions\n\n- IF last condition → do something\n"
        section = extract_decisions_section(content)
        self.assertIn("IF last condition", section)

    def test_section_stops_at_next_heading(self):
        content = "## Decisions\n\n- IF a → b\n\n## Quality Gate\n\n- IF c → d\n"
        section = extract_decisions_section(content)
        self.assertIn("IF a", section)
        self.assertNotIn("IF c", section)


# ---------------------------------------------------------------------------
# Tests — extract_triggers
# ---------------------------------------------------------------------------


class TestExtractTriggers(unittest.TestCase):
    def test_basic_if_elif(self):
        text = (
            "- IF pure function with no overloads → const arrow\n"
            "- ELIF overloads or uses this → function declaration\n"
        )
        triggers = extract_triggers(text)
        self.assertIn("pure function with no overloads", triggers)
        self.assertIn("overloads or uses this", triggers)

    def test_else_if_captured(self):
        text = "- ELSE IF some edge case → special handling\n"
        triggers = extract_triggers(text)
        self.assertIn("some edge case", triggers)

    def test_else_alone_not_captured(self):
        """Bare ELSE (no condition text) should not produce a trigger."""
        text = "- ELSE → fallback behavior\n"
        triggers = extract_triggers(text)
        # ELSE alone has no condition to extract
        self.assertEqual(len(triggers), 0)

    def test_deduplication(self):
        text = "- IF same condition → action 1\n- IF same condition → action 2\n"
        triggers = extract_triggers(text)
        count = triggers.count("same condition")
        self.assertEqual(count, 1)

    def test_lowercased(self):
        text = "- IF TypeScript project → use typescript-pro\n"
        triggers = extract_triggers(text)
        self.assertTrue(all(t == t.lower() for t in triggers))

    def test_truncation_at_max_chars(self):
        long_condition = "x" * (MAX_TRIGGER_CHARS + 50)
        text = f"- IF {long_condition} → action\n"
        triggers = extract_triggers(text)
        self.assertTrue(len(triggers) > 0)
        for t in triggers:
            self.assertLessEqual(len(t), MAX_TRIGGER_CHARS)

    def test_max_triggers_limit(self):
        """Extract triggers respects MAX_TRIGGERS_PER_AGENT limit."""
        lines = [f"- IF condition number {i} → do action {i}\n" for i in range(100)]
        text = "".join(lines)
        triggers = extract_triggers(text)
        self.assertLessEqual(len(triggers), MAX_TRIGGERS_PER_AGENT)

    def test_empty_decisions_section(self):
        triggers = extract_triggers("")
        self.assertEqual(triggers, [])

    def test_no_if_lines(self):
        text = "Some text without any IF/ELIF conditions\nJust prose.\n"
        triggers = extract_triggers(text)
        self.assertEqual(triggers, [])

    def test_real_typescript_format(self):
        """Match the actual format used in agent files."""
        text = (
            "**Function style**\n"
            "- IF pure function with no overloads → const arrow\n"
            "- ELIF overloads or uses `this` → function declaration\n"
            "**Error handling**\n"
            "- IF errors are part of the API contract → discriminated union\n"
        )
        triggers = extract_triggers(text)
        self.assertIn("pure function with no overloads", triggers)
        self.assertIn("overloads or uses `this`", triggers)
        self.assertIn("errors are part of the api contract", triggers)


# ---------------------------------------------------------------------------
# Tests — is_safe_path
# ---------------------------------------------------------------------------


class TestIsSafePath(unittest.TestCase):
    def test_normal_file_is_safe(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            target = base / "subdir" / "agent.md"
            target.parent.mkdir()
            target.touch()
            self.assertTrue(is_safe_path(target, base))

    def test_symlink_is_unsafe(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            real_file = base / "real.md"
            real_file.touch()
            link = base / "link.md"
            link.symlink_to(real_file)
            self.assertFalse(is_safe_path(link, base))

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir) / "agents"
            base.mkdir()
            # Path that resolves outside base_dir
            outside = Path(tmpdir) / "outside.md"
            outside.touch()
            self.assertFalse(is_safe_path(outside, base))

    def test_null_byte_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            # Path with null byte — can't actually create such a file on most OS,
            # so we test the string check directly
            malicious = Path(str(base / "file\x00.md"))
            self.assertFalse(is_safe_path(malicious, base))


# ---------------------------------------------------------------------------
# Integration test — main() writes triggers.json
# ---------------------------------------------------------------------------


class TestMainIntegration(unittest.TestCase):
    def test_main_creates_output(self):
        """main() should create triggers.json from a temp agents directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            agents_dir = tmppath / "agents" / "languages"
            agents_dir.mkdir(parents=True)
            output_file = tmppath / "data" / "triggers.json"

            # Create a synthetic agent with Decisions
            agent_content = (
                "---\ndescription: Test\nmode: subagent\n---\n\n"
                "Identity prose.\n\n"
                "## Decisions\n\n"
                "- IF static typing required → typescript\n"
                "- ELIF scripting only → python\n\n"
                "## Examples\n"
            )
            (agents_dir / "test-agent.md").write_text(agent_content, encoding="utf-8")

            # Run main()
            exit_code = _mod.main(
                [
                    "--agents-dir",
                    str(agents_dir),
                    "--output",
                    str(output_file),
                ]
            )

            self.assertEqual(exit_code, 0)
            self.assertTrue(output_file.exists())

            import json

            data = json.loads(output_file.read_text(encoding="utf-8"))
            self.assertIn("test-agent", data)
            self.assertIn("static typing required", data["test-agent"])
            self.assertIn("scripting only", data["test-agent"])

    def test_agent_without_decisions_gets_empty_list(self):
        """Agents without ## Decisions section get an empty list, not missing key."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            agents_dir = tmppath / "agents"
            agents_dir.mkdir()
            output_file = tmppath / "data" / "triggers.json"

            agent_content = (
                "---\ndescription: No decisions\nmode: subagent\n---\n\n"
                "Just some prose, no decisions section.\n\n"
                "## Examples\n\n"
                "```\ncode\n```\n"
            )
            (agents_dir / "nodecisions.md").write_text(agent_content, encoding="utf-8")

            exit_code = _mod.main(
                [
                    "--agents-dir",
                    str(agents_dir),
                    "--output",
                    str(output_file),
                ]
            )

            self.assertEqual(exit_code, 0)
            import json

            data = json.loads(output_file.read_text(encoding="utf-8"))
            self.assertIn("nodecisions", data)
            self.assertEqual(data["nodecisions"], [])

    def test_symlink_is_skipped(self):
        """Symlinked .md files are skipped and not included in output."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            agents_dir = tmppath / "agents"
            agents_dir.mkdir()
            output_file = tmppath / "data" / "triggers.json"

            real_content = (
                "---\ndescription: Real\nmode: subagent\n---\n\n"
                "## Decisions\n\n"
                "- IF real condition → real action\n"
            )
            real_file = agents_dir / "real-agent.md"
            real_file.write_text(real_content, encoding="utf-8")

            # Create a symlink
            link_file = agents_dir / "symlink-agent.md"
            link_file.symlink_to(real_file)

            exit_code = _mod.main(
                [
                    "--agents-dir",
                    str(agents_dir),
                    "--output",
                    str(output_file),
                ]
            )

            self.assertEqual(exit_code, 0)
            import json

            data = json.loads(output_file.read_text(encoding="utf-8"))

            # The symlink should not appear
            self.assertNotIn("symlink-agent", data)
            # The real file should be present
            self.assertIn("real-agent", data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
