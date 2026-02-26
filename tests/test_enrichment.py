#!/usr/bin/env python3
"""
test_enrichment.py — Tests for S2 Agent Enrichment features.

Covers:
- get_archetype() and AGENT_ARCHETYPE_MAP
- build_archetype_permissions() (all archetypes, sub-profiles, exceptions)
- validate_agent_schema()
- check_template_conformance()
- score_agent()
- Archetype integration in build_opencode_agent()
"""

from __future__ import annotations

import importlib
import json
import sys
import unittest
from pathlib import Path

# Ensure scripts/ is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# sync-agents has a hyphen — use importlib
sync_agents = importlib.import_module("sync-agents")

from sync_common import (
    check_template_conformance,
    parse_nested_frontmatter,
    validate_agent_schema,
)
from quality_scorer import score_agent


# ---------------------------------------------------------------------------
# Helper: build a minimal valid agent markdown string
# ---------------------------------------------------------------------------


def _make_agent(
    *,
    description: str = "A test agent. Use when testing.",
    mode: str = "subagent",
    permission: str = "  read: allow\n  write: deny",
    body: str = "",
) -> str:
    """Build a minimal agent markdown file for testing."""
    return (
        f"---\n"
        f"description: >\n  {description}\n"
        f"mode: {mode}\n"
        f"permission:\n{permission}\n"
        f"---\n\n"
        f"{body}"
    )


_GOOD_BODY = """\
You are the test agent. You specialize in verifying things work correctly.
Call this agent when you need automated validation of code changes.
Your bias: fail fast, report clearly. Targets Python 3.12+ and Node 20.x (2024).

## Decisions

**Test scope**
- IF change touches only tests → run affected test files only
- ELIF change touches source → run full suite
- ELSE → run smoke tests

**Flaky test handling**
- IF test fails intermittently → retry 2x, then flag as flaky
- ELSE → report as genuine failure

**Coverage threshold**
- IF coverage < 60% → block merge
- ELIF coverage < 80% → warn
- ELSE → pass

## Examples

```bash
pytest --cov=src --cov-report=term-missing tests/
```

```python
import subprocess
result = subprocess.run(["pytest", "tests/test_core.py", "-v"], capture_output=True)
assert result.returncode == 0
```

## Quality Gate

- All test commands completed — fails if any command timed out
- Coverage numbers are from the current run — fails if stale
- No test was silently skipped — fails if skip count > 0 unexpectedly
- Report includes pass/fail count and coverage percentage
- No new regressions compared to baseline
"""


# ===================================================================
# Test: get_archetype()
# ===================================================================


class TestGetArchetype(unittest.TestCase):
    """Tests for get_archetype() lookup."""

    def test_known_builder(self):
        arch, sub = sync_agents.get_archetype("typescript-pro")
        self.assertEqual(arch, "Builder")
        self.assertIsNone(sub)

    def test_known_auditor(self):
        arch, sub = sync_agents.get_archetype("code-reviewer")
        self.assertEqual(arch, "Auditor")
        self.assertIsNone(sub)

    def test_known_analyst(self):
        arch, sub = sync_agents.get_archetype("data-analyst")
        self.assertEqual(arch, "Analyst")
        self.assertIsNone(sub)

    def test_known_orchestrator(self):
        arch, sub = sync_agents.get_archetype("product-manager")
        self.assertEqual(arch, "Orchestrator")
        self.assertIsNone(sub)

    def test_known_specialist_with_subprofile(self):
        arch, sub = sync_agents.get_archetype("kubernetes-specialist")
        self.assertEqual(arch, "Specialist")
        self.assertEqual(sub, "infra")

    def test_local_agent_resolved(self):
        """Agents in LOCAL_AGENT_ARCHETYPES are found by get_archetype."""
        arch, sub = sync_agents.get_archetype("prd")
        self.assertEqual(arch, "Orchestrator")
        self.assertIsNone(sub)

    def test_local_agent_specialist(self):
        """LOCAL_AGENT_ARCHETYPES specialist is resolved correctly."""
        arch, sub = sync_agents.get_archetype("aws-specialist")
        self.assertEqual(arch, "Specialist")
        self.assertEqual(sub, "infra")

    def test_category_inference_fallback(self):
        """Extended agents not in explicit maps use category inference."""
        # django-developer is in EXTENDED_AGENTS (programming-languages)
        # but not in AGENT_ARCHETYPE_MAP — should infer Builder from languages
        arch, sub = sync_agents.get_archetype("django-developer")
        self.assertEqual(arch, "Builder")
        self.assertIsNone(sub)

    def test_unknown_agent(self):
        arch, sub = sync_agents.get_archetype("nonexistent-agent-xyz")
        self.assertIsNone(arch)
        self.assertIsNone(sub)

    def test_archetype_map_has_no_phantom_agents(self):
        """AGENT_ARCHETYPE_MAP only contains agents in CURATED or EXTENDED lists."""
        synced = set(sync_agents.CURATED_AGENTS) | set(sync_agents.EXTENDED_AGENTS)
        phantoms = set(sync_agents.AGENT_ARCHETYPE_MAP) - synced
        self.assertEqual(
            phantoms, set(), f"Phantom agents in AGENT_ARCHETYPE_MAP: {phantoms}"
        )

    def test_all_synced_agents_have_archetype_coverage(self):
        """Every agent in CURATED + EXTENDED resolves to an archetype
        (either via explicit map or category inference)."""
        all_synced = set(sync_agents.CURATED_AGENTS) | set(sync_agents.EXTENDED_AGENTS)
        missing = []
        for name in all_synced:
            arch, _ = sync_agents.get_archetype(name)
            if arch is None:
                missing.append(name)
        self.assertEqual(missing, [], f"Agents with no archetype coverage: {missing}")

    def test_manifest_agents_have_archetype_coverage(self):
        """Every agent in the sync manifest has archetype coverage
        (explicit map, local archetypes, or category inference)."""
        manifest_path = PROJECT_ROOT / ".opencode" / "agents" / "manifest.json"
        if not manifest_path.is_file():
            self.skipTest("Sync manifest not found")
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)
        manifest_names = {a["name"] for a in manifest.get("agents", [])}
        all_covered = (
            set(sync_agents.AGENT_ARCHETYPE_MAP)
            | set(sync_agents.LOCAL_AGENT_ARCHETYPES)
            | set(sync_agents.CURATED_AGENTS)
            | set(sync_agents.EXTENDED_AGENTS)
        )
        uncovered = manifest_names - all_covered
        # Agents discovered via --all but not in any curated list are expected
        # to be uncovered — that's fine, they get UNKNOWN_PERMISSIONS.
        # We only check that agents we DO ship have coverage.
        shipped = manifest_names & (
            set(sync_agents.CURATED_AGENTS)
            | set(sync_agents.EXTENDED_AGENTS)
            | set(sync_agents.LOCAL_AGENT_ARCHETYPES)
        )
        missing = []
        for name in shipped:
            arch, _ = sync_agents.get_archetype(name)
            if arch is None:
                missing.append(name)
        self.assertEqual(missing, [], f"Shipped agents with no archetype: {missing}")

    def test_all_archetypes_represented(self):
        archetypes = {v[0] for v in sync_agents.AGENT_ARCHETYPE_MAP.values()}
        expected = {"Builder", "Auditor", "Analyst", "Orchestrator", "Specialist"}
        self.assertEqual(archetypes, expected)


# ===================================================================
# Test: build_archetype_permissions()
# ===================================================================


class TestBuildArchetypePermissions(unittest.TestCase):
    """Tests for build_archetype_permissions() assembly."""

    def test_builder_has_bash_patterns(self):
        perms = sync_agents.build_archetype_permissions("typescript-pro")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("git *", perms["bash"])
        self.assertEqual(perms["write"], "allow")
        self.assertEqual(perms["edit"], "allow")

    def test_auditor_has_no_bash(self):
        perms = sync_agents.build_archetype_permissions("code-reviewer")
        self.assertIsNotNone(perms)
        self.assertEqual(perms["bash"], "deny")
        self.assertEqual(perms["write"], "deny")
        self.assertEqual(perms["edit"], "deny")

    def test_analyst_has_bash_patterns(self):
        perms = sync_agents.build_archetype_permissions("data-analyst")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("python *", perms["bash"])

    def test_orchestrator_no_bash(self):
        perms = sync_agents.build_archetype_permissions("product-manager")
        self.assertIsNotNone(perms)
        self.assertEqual(perms["bash"], "deny")
        self.assertEqual(perms["task"], "allow")

    def test_specialist_infra_subprofile(self):
        perms = sync_agents.build_archetype_permissions("kubernetes-specialist")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("terraform *", perms["bash"])
        self.assertIn("kubectl *", perms["bash"])

    def test_specialist_data_subprofile(self):
        perms = sync_agents.build_archetype_permissions("postgres-pro")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("psql *", perms["bash"])

    def test_specialist_security_subprofile(self):
        perms = sync_agents.build_archetype_permissions("security-engineer")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("nmap *", perms["bash"])

    def test_specialist_docs_subprofile(self):
        perms = sync_agents.build_archetype_permissions("technical-writer")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertEqual(perms["bash"]["*"], "deny")

    def test_specialist_ai_infra_subprofile(self):
        perms = sync_agents.build_archetype_permissions("llm-architect")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("docker *", perms["bash"])
        self.assertIn("nvidia-smi*", perms["bash"])

    def test_specialist_architecture_subprofile(self):
        perms = sync_agents.build_archetype_permissions("microservices-architect")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertIn("docker *", perms["bash"])

    def test_exception_penetration_tester_browsermcp(self):
        perms = sync_agents.build_archetype_permissions("penetration-tester")
        self.assertIsNotNone(perms)
        self.assertEqual(perms["browsermcp"], "ask")

    def test_exception_ui_designer_browsermcp(self):
        perms = sync_agents.build_archetype_permissions("ui-designer")
        self.assertIsNotNone(perms)
        self.assertEqual(perms["browsermcp"], "ask")

    def test_exception_diagram_architect_bash(self):
        perms = sync_agents.build_archetype_permissions("diagram-architect")
        self.assertIsNotNone(perms)
        self.assertIsInstance(perms["bash"], dict)
        self.assertEqual(perms["bash"].get("mmdc *"), "allow")
        self.assertEqual(perms["bash"].get("plantuml *"), "allow")
        self.assertEqual(perms["bash"].get("*"), "deny")

    def test_unknown_returns_none(self):
        perms = sync_agents.build_archetype_permissions("nonexistent-xyz")
        self.assertIsNone(perms)

    def test_universal_safe_always_present(self):
        """Every archetype includes the universal safe permissions."""
        for agent_name in [
            "typescript-pro",
            "code-reviewer",
            "data-analyst",
            "product-manager",
            "kubernetes-specialist",
        ]:
            perms = sync_agents.build_archetype_permissions(agent_name)
            self.assertIsNotNone(perms, f"None for {agent_name}")
            self.assertEqual(perms["read"], "allow", agent_name)
            self.assertEqual(perms["glob"], "allow", agent_name)
            self.assertEqual(perms["grep"], "allow", agent_name)
            self.assertEqual(perms["distill"], "allow", agent_name)
            self.assertEqual(perms["prune"], "allow", agent_name)
            self.assertEqual(perms["sequentialthinking"], "allow", agent_name)
            self.assertEqual(perms["skill"], "allow", agent_name)

    def test_all_mapped_agents_produce_valid_permissions(self):
        """Every agent in the archetype map produces a non-None permission dict."""
        for name in sync_agents.AGENT_ARCHETYPE_MAP:
            perms = sync_agents.build_archetype_permissions(name)
            self.assertIsNotNone(perms, f"None for {name}")
            self.assertIsInstance(perms, dict, name)
            # Must have at least the universal safe keys
            self.assertIn("read", perms, name)


# ===================================================================
# Test: parse_nested_frontmatter()
# ===================================================================


class TestParseNestedFrontmatter(unittest.TestCase):
    """Tests for parse_nested_frontmatter()."""

    def test_flat_values(self):
        content = "---\nmode: subagent\ndescription: hello\n---\nBody"
        meta, body = parse_nested_frontmatter(content)
        self.assertEqual(meta["mode"], "subagent")
        self.assertEqual(meta["description"], "hello")
        self.assertEqual(body, "Body")

    def test_nested_dict(self):
        content = "---\npermission:\n  read: allow\n  write: deny\n---\nBody"
        meta, body = parse_nested_frontmatter(content)
        self.assertIsInstance(meta["permission"], dict)
        self.assertEqual(meta["permission"]["read"], "allow")
        self.assertEqual(meta["permission"]["write"], "deny")

    def test_three_level_nesting(self):
        content = (
            '---\npermission:\n  bash:\n    "*": ask\n    "git *": allow\n---\nBody'
        )
        meta, body = parse_nested_frontmatter(content)
        bash = meta["permission"]["bash"]
        self.assertIsInstance(bash, dict)
        self.assertEqual(bash["*"], "ask")
        self.assertEqual(bash["git *"], "allow")

    def test_folded_scalar(self):
        content = "---\ndescription: >\n  First line\n  second line\n---\nBody"
        meta, body = parse_nested_frontmatter(content)
        self.assertEqual(meta["description"], "First line second line")

    def test_no_frontmatter(self):
        content = "Just body text"
        meta, body = parse_nested_frontmatter(content)
        self.assertEqual(meta, {})
        self.assertEqual(body, "Just body text")

    def test_missing_closing_delimiter(self):
        content = "---\nmode: subagent\nSome body"
        meta, body = parse_nested_frontmatter(content)
        self.assertEqual(meta, {})


# ===================================================================
# Test: validate_agent_schema()
# ===================================================================


class TestValidateAgentSchema(unittest.TestCase):
    """Tests for validate_agent_schema() schema validation."""

    def test_valid_agent(self):
        content = _make_agent()
        warnings = validate_agent_schema(content)
        self.assertEqual(warnings, [])

    def test_missing_description(self):
        content = "---\nmode: subagent\npermission:\n  read: allow\n---\nBody"
        warnings = validate_agent_schema(content)
        self.assertTrue(any("description" in w for w in warnings))

    def test_missing_mode(self):
        content = "---\ndescription: hello\npermission:\n  read: allow\n---\nBody"
        warnings = validate_agent_schema(content)
        self.assertTrue(any("mode" in w for w in warnings))

    def test_invalid_mode(self):
        content = _make_agent(mode="foobar")
        warnings = validate_agent_schema(content)
        self.assertTrue(any("invalid mode" in w for w in warnings))

    def test_valid_mode_all(self):
        content = _make_agent(mode="all")
        warnings = validate_agent_schema(content)
        self.assertEqual(warnings, [])

    def test_valid_mode_primary(self):
        content = _make_agent(mode="primary")
        warnings = validate_agent_schema(content)
        self.assertEqual(warnings, [])

    def test_missing_permission(self):
        content = "---\ndescription: hello\nmode: subagent\n---\nBody"
        warnings = validate_agent_schema(content)
        self.assertTrue(any("permission" in w for w in warnings))

    def test_no_frontmatter(self):
        content = "Just body text"
        warnings = validate_agent_schema(content)
        self.assertTrue(any("frontmatter" in w for w in warnings))


# ===================================================================
# Test: check_template_conformance()
# ===================================================================


class TestCheckTemplateConformance(unittest.TestCase):
    """Tests for check_template_conformance() section checks."""

    def test_full_template_conformant(self):
        content = _make_agent(body=_GOOD_BODY)
        warnings = check_template_conformance(content)
        self.assertEqual(warnings, [], f"Unexpected warnings: {warnings}")

    def test_missing_decisions(self):
        body = "Some identity text here about this agent.\n\n## Examples\n\nStuff\n\n## Quality Gate\n\nStuff"
        content = _make_agent(body=body)
        warnings = check_template_conformance(content)
        self.assertTrue(any("Decisions" in w for w in warnings))

    def test_missing_examples(self):
        body = "Some identity text here about this agent.\n\n## Decisions\n\nStuff\n\n## Quality Gate\n\nStuff"
        content = _make_agent(body=body)
        warnings = check_template_conformance(content)
        self.assertTrue(any("Examples" in w for w in warnings))

    def test_missing_quality_gate(self):
        body = "Some identity text here about this agent.\n\n## Decisions\n\nStuff\n\n## Examples\n\nStuff"
        content = _make_agent(body=body)
        warnings = check_template_conformance(content)
        self.assertTrue(any("Quality Gate" in w for w in warnings))

    def test_missing_identity_prose(self):
        body = (
            "## Decisions\n\nStuff\n\n## Examples\n\nStuff\n\n## Quality Gate\n\nStuff"
        )
        content = _make_agent(body=body)
        warnings = check_template_conformance(content)
        self.assertTrue(any("identity" in w.lower() for w in warnings))

    def test_empty_body(self):
        content = _make_agent(body="")
        warnings = check_template_conformance(content)
        self.assertTrue(any("empty body" in w for w in warnings))

    def test_no_headings_at_all(self):
        content = _make_agent(body="Just some prose with no headings at all.")
        warnings = check_template_conformance(content)
        self.assertTrue(any("no ## headings" in w for w in warnings))


# ===================================================================
# Test: score_agent()
# ===================================================================


class TestScoreAgent(unittest.TestCase):
    """Tests for the quality scorer."""

    def test_good_agent_scores_above_threshold(self):
        content = _make_agent(body=_GOOD_BODY)
        result = score_agent(content)
        self.assertIn("dimensions", result)
        self.assertIn("overall", result)
        self.assertIn("passed", result)
        self.assertIn("label", result)
        # The good body has decisions with IF/THEN and examples with code blocks
        self.assertGreaterEqual(result["dimensions"]["decisions"], 3)
        self.assertGreaterEqual(result["dimensions"]["examples"], 3)

    def test_empty_agent_scores_poorly(self):
        content = _make_agent(body="Be thorough. Follow best practices.")
        result = score_agent(content)
        self.assertFalse(result["passed"])
        self.assertEqual(result["dimensions"]["decisions"], 1)
        self.assertEqual(result["dimensions"]["examples"], 1)

    def test_score_dimensions_complete(self):
        content = _make_agent(body=_GOOD_BODY)
        result = score_agent(content)
        expected_dims = {
            "frontmatter",
            "identity",
            "decisions",
            "examples",
            "quality_gate",
            "conciseness",
            "no_banned_sections",
            "version_pinning",
        }
        self.assertEqual(set(result["dimensions"].keys()), expected_dims)

    def test_all_scores_between_1_and_5(self):
        content = _make_agent(body=_GOOD_BODY)
        result = score_agent(content)
        for dim, val in result["dimensions"].items():
            self.assertGreaterEqual(val, 1, f"{dim} below 1")
            self.assertLessEqual(val, 5, f"{dim} above 5")

    def test_pass_criteria_overall_and_min(self):
        """If overall < 3.5 or any dim < 2, passed must be False."""
        content = _make_agent(body="Be thorough.")
        result = score_agent(content)
        if result["overall"] < 3.5 or result["min_dimension"] < 2:
            self.assertFalse(result["passed"])

    def test_label_mapping(self):
        content = _make_agent(body=_GOOD_BODY)
        result = score_agent(content)
        overall = result["overall"]
        label = result["label"]
        if overall >= 4.5:
            self.assertEqual(label, "Excellent")
        elif overall >= 3.5:
            self.assertEqual(label, "Good")
        elif overall >= 2.5:
            self.assertEqual(label, "Needs improvement")
        else:
            self.assertEqual(label, "Poor")

    def test_score_handles_no_frontmatter(self):
        content = "Just raw markdown without frontmatter"
        result = score_agent(content)
        self.assertIn("overall", result)
        # No frontmatter → frontmatter dimension should be 1
        self.assertEqual(result["dimensions"]["frontmatter"], 1)


# ===================================================================
# Test: Archetype integration in build_opencode_agent()
# ===================================================================


class TestArchetypeIntegration(unittest.TestCase):
    """Test that archetype permissions appear in build_opencode_agent output."""

    def test_builder_permissions_in_output(self):
        """A builder agent should have write: allow in the generated markdown."""
        perms = sync_agents.build_archetype_permissions("typescript-pro")
        self.assertIsNotNone(perms)
        md = sync_agents.build_opencode_agent(
            "typescript-pro",
            {"description": "Test agent", "tools": "Read,Write,Edit,Bash"},
            "Body content here",
            "programming-languages",
            permissions=perms,
        )
        self.assertIn("write: allow", md)
        self.assertIn("edit: allow", md)

    def test_auditor_permissions_in_output(self):
        """An auditor agent should have write: deny in the generated markdown."""
        perms = sync_agents.build_archetype_permissions("code-reviewer")
        self.assertIsNotNone(perms)
        md = sync_agents.build_opencode_agent(
            "code-reviewer",
            {"description": "Test agent", "tools": "Read,Glob,Grep"},
            "Body content here",
            "development-tools",
            permissions=perms,
        )
        self.assertIn("write: deny", md)
        self.assertIn("bash: deny", md)

    def test_fallback_to_legacy_for_unknown_agent(self):
        """An agent not in the archetype map falls back to legacy build_permissions."""
        perms = sync_agents.build_archetype_permissions("nonexistent-agent-abc")
        self.assertIsNone(perms)
        # Legacy path
        legacy = sync_agents.build_permissions("Read,Write,Edit,Bash")
        self.assertIn("write", legacy)


if __name__ == "__main__":
    unittest.main()
