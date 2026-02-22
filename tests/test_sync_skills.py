#!/usr/bin/env python3
"""
test_sync_skills.py - Unit tests for sync-skills.py functions.

Tests pure functions for parsing, transformation, and generation without
making network calls.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Import the module sync-skills.py (name with hyphen -> dynamic import)
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import importlib

sync_skills = importlib.import_module("sync-skills")

# Functions to test
transform_skill_md = sync_skills.transform_skill_md
_transform_skill_body = sync_skills._transform_skill_body
_is_valid_filename = sync_skills._is_valid_filename
_check_symlink = sync_skills._check_symlink
_extract_category_from_path = sync_skills._extract_category_from_path
is_handwritten_skill = sync_skills.is_handwritten_skill
clean_synced_skills = sync_skills.clean_synced_skills
process_companion_file = sync_skills.process_companion_file
fetch_skill_tree = sync_skills.fetch_skill_tree
discover_all_skills = sync_skills.discover_all_skills
sync_skill = sync_skills.sync_skill
build_parser = sync_skills.build_parser
CURATED_SKILLS = sync_skills.CURATED_SKILLS
MAX_SKILL_SIZE_BYTES = sync_skills.MAX_SKILL_SIZE_BYTES
HANDWRITTEN_MARKER = sync_skills.HANDWRITTEN_MARKER

# Import from sync_common for testing
sys.path.insert(0, str(SCRIPTS_DIR))
sync_common = importlib.import_module("sync_common")
parse_frontmatter = sync_common.parse_frontmatter
is_synced_file = sync_common.is_synced_file


def _safe_tmpdir(prefix: str) -> str:
    """Create a temp dir safe for symlink checks on macOS.

    On macOS, /tmp -> /private/tmp which triggers symlink detection.
    Use /private/tmp directly to get a resolved physical path.
    """
    base = (
        "/private/tmp"
        if sys.platform == "darwin" and os.path.isdir("/private/tmp")
        else None
    )
    return tempfile.mkdtemp(prefix=prefix, dir=base)


# ---------------------------------------------------------------------------
# Tests transform_skill_md() - Frontmatter parsing and transformation
# ---------------------------------------------------------------------------


class TestTransformSkillMd(unittest.TestCase):
    """Tests for transform_skill_md(): frontmatter parsing and transformation."""

    def test_keeps_only_name_and_description(self):
        """Verify that transform keeps only name and description fields."""
        content = """---
name: test-skill
description: A test skill description
allowed-tools: [bash, read]
version: "1.0"
priority: high
---

# Test Skill

This is the body.
"""
        result = transform_skill_md(content, "test-skill", "development")
        # Should have name
        self.assertIn('name: "test-skill"', result)
        # Should have description
        self.assertIn('description: "A test skill description"', result)
        # Should NOT have allowed-tools
        self.assertNotIn("allowed-tools", result)
        # Should NOT have version
        self.assertNotIn("version", result)
        # Should NOT have priority
        self.assertNotIn("priority", result)

    def test_removes_license_field(self):
        """Verify that license field is removed from frontmatter."""
        content = """---
name: test-skill
description: A test skill
license: MIT
---

Body content.
"""
        result = transform_skill_md(content, "test-skill", "development")
        self.assertNotIn("license", result)

    def test_adds_metadata_category(self):
        """Verify that metadata.category is added to frontmatter."""
        content = """---
name: test-skill
description: A test skill
---

Body content.
"""
        result = transform_skill_md(content, "test-skill", "ai")
        self.assertIn('metadata.category: "ai"', result)

    def test_description_truncation_to_150_chars(self):
        """Verify that descriptions longer than 150 chars are truncated."""
        long_desc = "A" * 200
        content = f"""---
name: test-skill
description: {long_desc}
---

Body.
"""
        result = transform_skill_md(content, "test-skill", "development")
        # Extract description from result
        match = result.split('description: "')[1].split('"')[0]
        self.assertLessEqual(len(match), 150)
        self.assertTrue(match.endswith("..."))

    def test_name_must_match_skill_name_parameter(self):
        """Verify that the name field always matches the skill_name parameter."""
        content = """---
name: different-name
description: A test skill
---

Body.
"""
        result = transform_skill_md(content, "correct-name", "development")
        # Should use the skill_name parameter, not the frontmatter value
        self.assertIn('name: "correct-name"', result)
        self.assertNotIn('name: "different-name"', result)

    def test_provenance_header_present(self):
        """Verify that the sync provenance header is present after frontmatter."""
        content = """---
name: test-skill
description: A test skill
---

Body content.
"""
        result = transform_skill_md(content, "test-skill", "development")
        # Should contain the provenance header
        self.assertIn("<!-- Synced from aitmpl.com", result)
        self.assertIn("source: davila7/claude-code-templates", result)
        self.assertIn("category: development", result)


# ---------------------------------------------------------------------------
# Tests _transform_skill_body() - Path rewriting
# ---------------------------------------------------------------------------


class TestTransformSkillBody(unittest.TestCase):
    """Tests for _transform_skill_body(): path rewriting and transformations."""

    def test_rewrite_claude_skills_path(self):
        """Verify ~/.claude/skills/{name}/ → .opencode/skills/{name}/"""
        body = "See ~/.claude/skills/my-skill/SKILL.md for details."
        result = _transform_skill_body(body, "test-skill")
        self.assertIn(".opencode/skills/my-skill/", result)
        self.assertNotIn("~/.claude/skills/", result)

    def test_rewrite_multiple_claude_paths(self):
        """Verify multiple path rewrites in same body."""
        body = """Check ~/.claude/skills/skill1/guide.md
and ~/.claude/skills/skill2/README.md"""
        result = _transform_skill_body(body, "test-skill")
        self.assertIn(".opencode/skills/skill1/", result)
        self.assertIn(".opencode/skills/skill2/", result)
        self.assertNotIn("~/.claude/skills/", result)

    def test_convert_skill_references(self):
        """Verify @[skills/other-skill] → Requires skill: other-skill"""
        body = "This skill @[skills/helper-skill] is required."
        result = _transform_skill_body(body, "test-skill")
        self.assertIn("Requires skill: helper-skill", result)
        self.assertNotIn("@[skills/", result)

    def test_convert_multiple_skill_references(self):
        """Verify multiple skill references are converted."""
        body = "Needs @[skills/skill-a] and @[skills/skill-b]."
        result = _transform_skill_body(body, "test-skill")
        self.assertIn("Requires skill: skill-a", result)
        self.assertIn("Requires skill: skill-b", result)

    def test_body_is_stripped(self):
        """Verify body is stripped of leading/trailing whitespace."""
        body = "\n\n  Content here  \n\n"
        result = _transform_skill_body(body, "test-skill")
        self.assertFalse(result.startswith("\n"))
        self.assertFalse(result.endswith("\n"))
        self.assertEqual(result, "Content here")


# ---------------------------------------------------------------------------
# Tests _is_valid_filename() - Security guards
# ---------------------------------------------------------------------------


class TestIsValidFilename(unittest.TestCase):
    """Tests for _is_valid_filename(): filename validation."""

    def test_valid_simple_filename(self):
        """Accept simple valid filenames."""
        self.assertTrue(_is_valid_filename("SKILL.md"))
        self.assertTrue(_is_valid_filename("helper.py"))
        self.assertTrue(_is_valid_filename("README.md"))

    def test_valid_filename_with_dash(self):
        """Accept filenames with dashes."""
        self.assertTrue(_is_valid_filename("my-file.txt"))
        self.assertTrue(_is_valid_filename("test-file-name.md"))

    def test_valid_filename_with_underscore(self):
        """Accept filenames with underscores."""
        self.assertTrue(_is_valid_filename("my_file.py"))

    def test_rejects_path_traversal_dotdot(self):
        """Reject filenames with path traversal (..)."""
        self.assertFalse(_is_valid_filename("../../../etc/passwd"))
        self.assertFalse(_is_valid_filename("scripts/../../malicious.sh"))
        self.assertFalse(_is_valid_filename(".."))

    def test_rejects_forward_slash(self):
        """Reject filenames with forward slash."""
        self.assertFalse(_is_valid_filename("path/to/file.txt"))
        self.assertFalse(_is_valid_filename("/absolute/path.txt"))

    def test_rejects_backslash(self):
        """Reject filenames with backslash."""
        self.assertFalse(_is_valid_filename("path\\to\\file.txt"))

    def test_rejects_hidden_files(self):
        """Reject hidden files (starting with .)."""
        self.assertFalse(_is_valid_filename(".hidden"))
        self.assertFalse(_is_valid_filename(".env"))

    def test_allows_handwritten_marker(self):
        """Allow the .hand-written marker file."""
        self.assertTrue(_is_valid_filename(".hand-written"))


# ---------------------------------------------------------------------------
# Tests _check_symlink() - Security guards
# ---------------------------------------------------------------------------


class TestCheckSymlink(unittest.TestCase):
    """Tests for _check_symlink(): symlink detection and rejection."""

    def setUp(self):
        """Create temporary directory for tests."""
        self.tmpdir = _safe_tmpdir(prefix="test_symlink_")

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_no_symlink_ok(self):
        """Normal file should not raise."""
        # Create the file first
        test_file = Path(self.tmpdir) / "test.txt"
        test_file.write_text("content")
        # Verify file exists before testing
        self.assertTrue(test_file.exists())
        # Should not raise
        try:
            _check_symlink(test_file)
        except ValueError:
            self.fail("_check_symlink() raised ValueError for a normal file")

    @unittest.skipIf(os.name == "nt", "Symlink test skipped on Windows")
    def test_symlink_detection(self):
        """Symlink should raise ValueError."""
        real_file = Path(self.tmpdir) / "real.txt"
        real_file.write_text("content")
        symlink_file = Path(self.tmpdir) / "link.txt"
        symlink_file.symlink_to(real_file)

        with self.assertRaises(ValueError) as ctx:
            _check_symlink(symlink_file)
        self.assertIn("Symlink detected", str(ctx.exception))

    @unittest.skipIf(os.name == "nt", "Symlink test skipped on Windows")
    def test_symlink_in_parent_path(self):
        """Symlink in parent path should raise ValueError."""
        real_dir = Path(self.tmpdir) / "realdir"
        real_dir.mkdir()
        symlink_dir = Path(self.tmpdir) / "linkdir"
        symlink_dir.symlink_to(real_dir)
        test_file = symlink_dir / "test.txt"

        with self.assertRaises(ValueError) as ctx:
            _check_symlink(test_file)
        self.assertIn("Symlink detected", str(ctx.exception))


# ---------------------------------------------------------------------------
# Tests _extract_category_from_path()
# ---------------------------------------------------------------------------


class TestExtractCategoryFromPath(unittest.TestCase):
    """Tests for _extract_category_from_path(): category extraction."""

    def test_extracts_category_from_standard_path(self):
        """Extract category (at index 3) from standard GitHub content path."""
        path = "cli-tool/components/skills/development/clean-code/SKILL.md"
        result = _extract_category_from_path(path)
        self.assertEqual(result, "development")

    def test_extracts_different_categories(self):
        """Extract different categories correctly."""
        test_cases = [
            ("cli-tool/components/skills/ai/ml-expert/guide.md", "ai"),
            ("cli-tool/components/skills/security/audit-tool/SKILL.md", "security"),
            (
                "cli-tool/components/skills/database/postgres-utils/helper.py",
                "database",
            ),
        ]
        for path, expected in test_cases:
            with self.subTest(path=path):
                result = _extract_category_from_path(path)
                self.assertEqual(result, expected)

    def test_returns_unknown_for_short_path(self):
        """Return 'unknown' for paths that are too short."""
        path = "short/path"
        result = _extract_category_from_path(path)
        self.assertEqual(result, "unknown")

    def test_returns_unknown_for_empty_path(self):
        """Return 'unknown' for empty path."""
        result = _extract_category_from_path("")
        self.assertEqual(result, "unknown")


# ---------------------------------------------------------------------------
# Tests CURATED_SKILLS filtering
# ---------------------------------------------------------------------------


class TestCuratedSkills(unittest.TestCase):
    """Tests for CURATED_SKILLS filtering and structure."""

    def test_curated_skills_is_dict(self):
        """CURATED_SKILLS should be a non-empty dictionary."""
        self.assertIsInstance(CURATED_SKILLS, dict)
        self.assertGreater(len(CURATED_SKILLS), 0)

    def test_each_skill_has_required_fields(self):
        """Each skill should have category and upstream_path."""
        for name, config in CURATED_SKILLS.items():
            with self.subTest(skill=name):
                self.assertIsInstance(config, dict)
                self.assertIn("category", config)
                self.assertIn("upstream_path", config)
                self.assertIsInstance(config["category"], str)
                self.assertIsInstance(config["upstream_path"], str)

    def test_clean_code_in_curated(self):
        """clean-code skill should be in curated list."""
        self.assertIn("clean-code", CURATED_SKILLS)
        self.assertEqual(CURATED_SKILLS["clean-code"]["category"], "development")


# ---------------------------------------------------------------------------
# Tests is_handwritten_skill()
# ---------------------------------------------------------------------------


class TestIsHandwrittenSkill(unittest.TestCase):
    """Tests for is_handwritten_skill(): hand-written skill detection."""

    SYNCED_CONTENT = (
        "---\n"
        'name: "synced-skill"\n'
        'description: "A synced skill."\n'
        "---\n\n"
        "<!-- Synced from aitmpl.com | source: davila7/claude-code-templates | category: dev -->\n\n"
        "Content.\n"
    )

    CUSTOM_CONTENT = (
        "---\n"
        'name: "custom-skill"\n'
        'description: "A custom skill."\n'
        "---\n\n"
        "Custom content without sync header.\n"
    )

    def setUp(self):
        """Create temporary directory for tests."""
        self.tmpdir = _safe_tmpdir(prefix="test_handwritten_")

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_nonexistent_directory(self):
        """Non-existent directory should return False."""
        skill_dir = Path(self.tmpdir) / "nonexistent"
        self.assertFalse(is_handwritten_skill(skill_dir))

    def test_directory_with_handwritten_marker(self):
        """Directory with .hand-written marker should be hand-written."""
        skill_dir = Path(self.tmpdir) / "handwritten"
        skill_dir.mkdir()
        marker = skill_dir / ".hand-written"
        marker.write_text("marker")
        self.assertTrue(is_handwritten_skill(skill_dir))

    def test_directory_with_synced_skill_md(self):
        """Directory with synced SKILL.md should not be hand-written."""
        skill_dir = Path(self.tmpdir) / "synced"
        skill_dir.mkdir()
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(self.SYNCED_CONTENT)
        self.assertFalse(is_handwritten_skill(skill_dir))

    def test_directory_with_custom_skill_md(self):
        """Directory with custom SKILL.md should be hand-written."""
        skill_dir = Path(self.tmpdir) / "custom"
        skill_dir.mkdir()
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(self.CUSTOM_CONTENT)
        self.assertTrue(is_handwritten_skill(skill_dir))

    def test_empty_directory(self):
        """Empty directory (no SKILL.md) should not be hand-written."""
        skill_dir = Path(self.tmpdir) / "empty"
        skill_dir.mkdir()
        self.assertFalse(is_handwritten_skill(skill_dir))


# ---------------------------------------------------------------------------
# Tests clean_synced_skills() - Clean mode
# ---------------------------------------------------------------------------


class TestCleanSyncedSkills(unittest.TestCase):
    """Tests for clean_synced_skills(): clean mode functionality."""

    SYNCED_CONTENT = (
        "---\n"
        'name: "synced-skill"\n'
        'description: "A synced skill."\n'
        "---\n\n"
        "<!-- Synced from aitmpl.com | source: davila7/claude-code-templates | category: dev -->\n\n"
        "Content.\n"
    )

    CUSTOM_CONTENT = (
        "---\n"
        'name: "custom-skill"\n'
        'description: "A custom skill."\n'
        "---\n\n"
        "Custom content.\n"
    )

    def setUp(self):
        """Create temporary directory for tests."""
        self.tmpdir = _safe_tmpdir(prefix="test_clean_")
        self.output_dir = Path(self.tmpdir)

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_removes_synced_skills(self):
        """Should remove skills with sync header."""
        skill_dir = self.output_dir / "synced-skill"
        skill_dir.mkdir()
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(self.SYNCED_CONTENT)

        removed = clean_synced_skills(self.output_dir)
        self.assertEqual(removed, 1)
        self.assertFalse(skill_dir.exists())

    def test_preserves_handwritten_skills(self):
        """Should preserve skills without sync header."""
        synced_dir = self.output_dir / "synced-skill"
        synced_dir.mkdir()
        (synced_dir / "SKILL.md").write_text(self.SYNCED_CONTENT)

        custom_dir = self.output_dir / "custom-skill"
        custom_dir.mkdir()
        (custom_dir / "SKILL.md").write_text(self.CUSTOM_CONTENT)

        removed = clean_synced_skills(self.output_dir)
        self.assertEqual(removed, 1)
        self.assertFalse(synced_dir.exists())
        self.assertTrue(custom_dir.exists())

    def test_handles_empty_directory(self):
        """Empty directory should return 0."""
        removed = clean_synced_skills(self.output_dir)
        self.assertEqual(removed, 0)

    def test_handles_nonexistent_directory(self):
        """Non-existent directory should return 0."""
        nonexistent = Path(self.tmpdir) / "does-not-exist"
        removed = clean_synced_skills(nonexistent)
        self.assertEqual(removed, 0)

    def test_dry_run_does_not_remove(self):
        """Dry run should not actually remove files."""
        skill_dir = self.output_dir / "synced-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(self.SYNCED_CONTENT)

        removed = clean_synced_skills(self.output_dir, dry_run=True)
        self.assertEqual(removed, 1)
        self.assertTrue(skill_dir.exists())


# ---------------------------------------------------------------------------
# Tests process_companion_file() - with mocking
# ---------------------------------------------------------------------------


class TestProcessCompanionFile(unittest.TestCase):
    """Tests for process_companion_file(): companion file handling."""

    def setUp(self):
        """Create temporary directory for tests."""
        self.tmpdir = _safe_tmpdir(prefix="test_process_")
        self.skill_dir = Path(self.tmpdir) / "test-skill"
        self.skill_dir.mkdir()

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    @patch.object(sync_skills, "_raw_get")
    def test_processes_skill_md_with_transformation(self, mock_raw_get):
        """SKILL.md should be transformed with frontmatter changes."""
        mock_raw_get.return_value = """---
name: test-skill
description: Test skill
allowed-tools: [bash]
---

# Test Skill

Content here.
"""
        file_info = {
            "path": "cli-tool/components/skills/dev/test-skill/SKILL.md",
            "name": "SKILL.md",
            "rel_path": "SKILL.md",
            "size": 100,
            "download_url": "https://example.com/test.md",
            "sha": "abc123",
        }

        result = process_companion_file(
            file_info, self.skill_dir, "owner/repo", "main", verbose=False
        )

        # Check file was written
        output_file = self.skill_dir / "SKILL.md"
        self.assertTrue(output_file.exists())

        # Check content has transformations
        content = output_file.read_text()
        self.assertIn("metadata.category:", content)
        self.assertNotIn("allowed-tools", content)

    @patch.object(sync_skills, "_raw_get")
    def test_processes_markdown_as_is(self, mock_raw_get):
        """Regular markdown files should be copied as-is."""
        original_content = "# Guide\n\nThis is a guide."
        mock_raw_get.return_value = original_content

        file_info = {
            "path": "cli-tool/components/skills/dev/test-skill/guide.md",
            "name": "guide.md",
            "rel_path": "guide.md",
            "size": 50,
            "download_url": "https://example.com/guide.md",
            "sha": "def456",
        }

        process_companion_file(
            file_info, self.skill_dir, "owner/repo", "main", verbose=False
        )

        output_file = self.skill_dir / "guide.md"
        self.assertEqual(output_file.read_text(), original_content)

    @patch.object(sync_skills, "_raw_get")
    def test_processes_python_script_with_warning(self, mock_raw_get):
        """Python scripts should get warning header."""
        mock_raw_get.return_value = "print('hello')"

        file_info = {
            "path": "cli-tool/components/skills/dev/test-skill/scripts/helper.py",
            "name": "helper.py",
            "rel_path": "scripts/helper.py",
            "size": 20,
            "download_url": "https://example.com/helper.py",
            "sha": "ghi789",
        }

        process_companion_file(
            file_info, self.skill_dir, "owner/repo", "main", verbose=False
        )

        output_file = self.skill_dir / "scripts" / "helper.py"
        self.assertTrue(output_file.exists())
        content = output_file.read_text()
        self.assertIn("AUTO-SYNCED", content)
        self.assertIn("Review before executing", content)

    @patch.object(sync_skills, "_raw_get")
    def test_processes_xml_script_with_warning(self, mock_raw_get):
        """XML scripts should get warning header."""
        mock_raw_get.return_value = "<xml></xml>"

        file_info = {
            "path": "cli-tool/components/skills/dev/test-skill/scripts/config.xml",
            "name": "config.xml",
            "rel_path": "scripts/config.xml",
            "size": 15,
            "download_url": "https://example.com/config.xml",
            "sha": "jkl012",
        }

        process_companion_file(
            file_info, self.skill_dir, "owner/repo", "main", verbose=False
        )

        output_file = self.skill_dir / "scripts" / "config.xml"
        self.assertTrue(output_file.exists())
        content = output_file.read_text()
        self.assertIn("AUTO-SYNCED", content)

    def test_rejects_invalid_filename(self):
        """Invalid filenames should raise ValueError."""
        file_info = {
            "path": "cli-tool/components/skills/dev/test-skill/../../../etc/passwd",
            "name": "../../../etc/passwd",
            "rel_path": "../../../etc/passwd",
            "size": 100,
        }

        with self.assertRaises(ValueError) as ctx:
            process_companion_file(
                file_info, self.skill_dir, "owner/repo", "main", verbose=False
            )
        self.assertIn("Invalid filename", str(ctx.exception))


# ---------------------------------------------------------------------------
# Tests sync_skill() - Main sync logic with mocking
# ---------------------------------------------------------------------------


class TestSyncSkill(unittest.TestCase):
    """Tests for sync_skill(): main sync logic."""

    def setUp(self):
        """Create temporary directory for tests."""
        self.tmpdir = _safe_tmpdir(prefix="test_sync_skill_")
        self.output_dir = Path(self.tmpdir) / "skills"

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    @patch.object(sync_skills, "fetch_skill_tree")
    @patch.object(sync_skills, "process_companion_file")
    def test_syncs_skill_successfully(self, mock_process, mock_fetch):
        """Successful sync should return True."""
        mock_fetch.return_value = [
            {
                "path": "skills/dev/test/SKILL.md",
                "name": "SKILL.md",
                "rel_path": "SKILL.md",
                "size": 100,
            }
        ]
        mock_process.return_value = 100

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=False,
        )

        self.assertTrue(result)
        mock_process.assert_called_once()

    @patch.object(sync_skills, "fetch_skill_tree")
    def test_skips_handwritten_without_force(self, mock_fetch):
        """Should skip hand-written skills without --force."""
        # Create hand-written skill
        skill_dir = self.output_dir / "test"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("---\nname: test\n---\n\nCustom content.\n")
        (skill_dir / ".hand-written").write_text("marker")

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=False,
            force=False,
        )

        self.assertFalse(result)
        mock_fetch.assert_not_called()

    @patch.object(sync_skills, "fetch_skill_tree")
    @patch.object(sync_skills, "process_companion_file")
    def test_overwrites_with_force(self, mock_process, mock_fetch):
        """Should overwrite hand-written skills with --force."""
        # Create hand-written skill
        skill_dir = self.output_dir / "test"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("---\nname: test\n---\n\nCustom content.\n")

        mock_fetch.return_value = [
            {
                "path": "skills/dev/test/SKILL.md",
                "name": "SKILL.md",
                "rel_path": "SKILL.md",
                "size": 100,
            }
        ]
        mock_process.return_value = 100

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=False,
            force=True,
        )

        self.assertTrue(result)
        mock_process.assert_called_once()

    @patch.object(sync_skills, "fetch_skill_tree")
    def test_skips_if_no_files(self, mock_fetch):
        """Should return False if no files found."""
        mock_fetch.return_value = []

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=False,
        )

        self.assertFalse(result)

    @patch.object(sync_skills, "fetch_skill_tree")
    def test_rejects_oversized_skill(self, mock_fetch):
        """Should reject skills exceeding size limit."""
        # Create files that exceed limit
        large_files = [
            {
                "path": f"skills/dev/test/file{i}.txt",
                "name": f"file{i}.txt",
                "rel_path": f"file{i}.txt",
                "size": MAX_SKILL_SIZE_BYTES // 2,  # Each file is half the limit
            }
            for i in range(3)  # 3 files = 1.5x the limit
        ]
        mock_fetch.return_value = large_files

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=False,
        )

        self.assertFalse(result)

    @patch.object(sync_skills, "fetch_skill_tree")
    def test_dry_run_does_not_write(self, mock_fetch):
        """Dry run should not write files."""
        mock_fetch.return_value = [
            {
                "path": "skills/dev/test/SKILL.md",
                "name": "SKILL.md",
                "rel_path": "SKILL.md",
                "size": 100,
            }
        ]

        config = {"category": "development", "upstream_path": "development/test"}
        result = sync_skill(
            "test",
            config,
            str(self.output_dir),
            "owner/repo",
            "main",
            verbose=False,
            dry_run=True,
        )

        self.assertTrue(result)
        # Directory should not be created
        self.assertFalse((self.output_dir / "test").exists())


# ---------------------------------------------------------------------------
# Tests fetch_skill_tree() - with mocking
# ---------------------------------------------------------------------------


class TestFetchSkillTree(unittest.TestCase):
    """Tests for fetch_skill_tree(): skill tree fetching."""

    @patch.object(sync_skills, "_api_get")
    def test_fetches_single_level_directory(self, mock_api_get):
        """Should fetch files from a single-level directory."""
        mock_api_get.return_value = [
            {
                "type": "file",
                "name": "SKILL.md",
                "path": "cli-tool/components/skills/dev/test/SKILL.md",
                "size": 100,
                "download_url": "https://example.com/SKILL.md",
                "sha": "abc123",
            }
        ]

        result = fetch_skill_tree("development/test", "owner/repo", "main")

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "SKILL.md")

    @patch.object(sync_skills, "_api_get")
    def test_recurses_into_subdirectories(self, mock_api_get):
        """Should recursively fetch files from subdirectories."""

        def mock_api_side_effect(url):
            if url.endswith("/skills/development/test"):
                return [
                    {
                        "type": "dir",
                        "name": "scripts",
                        "url": "https://api.github.com/scripts",
                    },
                    {
                        "type": "file",
                        "name": "SKILL.md",
                        "path": "skills/dev/test/SKILL.md",
                        "size": 100,
                        "download_url": "https://example.com/SKILL.md",
                        "sha": "abc123",
                    },
                ]
            elif "scripts" in url:
                return [
                    {
                        "type": "file",
                        "name": "helper.py",
                        "path": "skills/dev/test/scripts/helper.py",
                        "size": 50,
                        "download_url": "https://example.com/helper.py",
                        "sha": "def456",
                    },
                ]
            return []

        mock_api_get.side_effect = mock_api_side_effect

        result = fetch_skill_tree("development/test", "owner/repo", "main")

        # Should have 2 files: SKILL.md and scripts/helper.py
        self.assertEqual(len(result), 2)
        names = [f["name"] for f in result]
        self.assertIn("SKILL.md", names)
        self.assertIn("helper.py", names)

    @patch.object(sync_skills, "_api_get")
    def test_handles_empty_directory(self, mock_api_get):
        """Should return empty list for empty directory."""
        mock_api_get.return_value = []

        result = fetch_skill_tree("development/empty", "owner/repo", "main")

        self.assertEqual(result, [])

    @patch.object(sync_skills, "_api_get")
    def test_handles_api_failure(self, mock_api_get):
        """Should return empty list on API failure."""
        mock_api_get.return_value = None

        result = fetch_skill_tree("development/test", "owner/repo", "main")

        self.assertEqual(result, [])


# ---------------------------------------------------------------------------
# Tests discover_all_skills() - with mocking
# ---------------------------------------------------------------------------


class TestDiscoverAllSkills(unittest.TestCase):
    """Tests for discover_all_skills(): skill discovery."""

    @patch.object(sync_skills, "_api_get")
    def test_discovers_all_skills(self, mock_api_get):
        """Should discover all skills from repo."""

        def mock_api_side_effect(url):
            if url.endswith("/contents/cli-tool/components/skills"):
                # Categories
                return [
                    {"type": "dir", "name": "development"},
                    {"type": "dir", "name": "ai"},
                ]
            elif url.endswith("/skills/development"):
                return [
                    {"type": "dir", "name": "clean-code"},
                    {"type": "dir", "name": "debugger"},
                ]
            elif url.endswith("/skills/ai"):
                return [
                    {"type": "dir", "name": "ml-expert"},
                ]
            return []

        mock_api_get.side_effect = mock_api_side_effect

        result = discover_all_skills("owner/repo")

        self.assertEqual(len(result), 3)
        self.assertIn("clean-code", result)
        self.assertIn("debugger", result)
        self.assertIn("ml-expert", result)
        self.assertEqual(result["clean-code"]["category"], "development")
        self.assertEqual(
            result["clean-code"]["upstream_path"], "development/clean-code"
        )

    @patch.object(sync_skills, "_api_get")
    def test_skips_suspicious_skill_names(self, mock_api_get):
        """Should skip skills with suspicious names (path traversal)."""

        def mock_api_side_effect(url):
            if url.endswith("/contents/cli-tool/components/skills"):
                return [{"type": "dir", "name": "development"}]
            elif url.endswith("/skills/development"):
                return [
                    {"type": "dir", "name": "valid-skill"},
                    {"type": "dir", "name": "../../../etc/passwd"},
                    {"type": "dir", "name": "bad/path"},
                ]
            return []

        mock_api_get.side_effect = mock_api_side_effect

        result = discover_all_skills("owner/repo")

        # Should only have the valid skill
        self.assertEqual(len(result), 1)
        self.assertIn("valid-skill", result)

    @patch.object(sync_skills, "_api_get")
    def test_handles_api_failure(self, mock_api_get):
        """Should return empty dict on API failure."""
        mock_api_get.return_value = None

        result = discover_all_skills("owner/repo")

        self.assertEqual(result, {})


# ---------------------------------------------------------------------------
# Tests build_parser() - CLI
# ---------------------------------------------------------------------------


class TestBuildParser(unittest.TestCase):
    """Tests for build_parser(): CLI argument parsing."""

    def test_default_output_dir(self):
        """Default output directory should be .opencode/skills."""
        parser = build_parser()
        args = parser.parse_args([])
        self.assertEqual(args.output_dir, ".opencode/skills")

    def test_custom_output_dir(self):
        """Should accept custom output directory."""
        parser = build_parser()
        args = parser.parse_args(["--output-dir", "/custom/path"])
        self.assertEqual(args.output_dir, "/custom/path")

    def test_list_flag(self):
        """Should accept --list flag."""
        parser = build_parser()
        args = parser.parse_args(["--list"])
        self.assertTrue(args.list)

    def test_filter_option(self):
        """Should accept --filter option."""
        parser = build_parser()
        args = parser.parse_args(["--filter", "development"])
        self.assertEqual(args.filter, "development")

    def test_all_flag(self):
        """Should accept --all flag."""
        parser = build_parser()
        args = parser.parse_args(["--all"])
        self.assertTrue(args.all)

    def test_dry_run_flag(self):
        """Should accept --dry-run flag."""
        parser = build_parser()
        args = parser.parse_args(["--dry-run"])
        self.assertTrue(args.dry_run)

    def test_force_flag(self):
        """Should accept --force flag."""
        parser = build_parser()
        args = parser.parse_args(["--force"])
        self.assertTrue(args.force)

    def test_clean_flag(self):
        """Should accept --clean flag."""
        parser = build_parser()
        args = parser.parse_args(["--clean"])
        self.assertTrue(args.clean)

    def test_verbose_flag(self):
        """Should accept --verbose flag."""
        parser = build_parser()
        args = parser.parse_args(["--verbose"])
        self.assertTrue(args.verbose)


if __name__ == "__main__":
    unittest.main(verbosity=2)
