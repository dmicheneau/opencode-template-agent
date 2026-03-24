#!/usr/bin/env python3
"""Tests for scripts/assign-tags.py.

Tests:
- load_csv: basic loading, malformed rows (warning, no crash), missing columns
- compute_changes: known agents get changes, unknown agents warn + skip
- apply_changes: fields added correctly
- Dry-run: manifest.json not modified
- Apply: manifest updated with ecosystem/intent/related_agents
- Idempotency: applying twice yields no further changes
- CSV agent not in manifest: warning, no crash
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup — import the module under test
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

_spec = importlib.util.spec_from_file_location(
    "assign_tags",
    SCRIPTS_DIR / "assign-tags.py",
)
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]

load_csv = _mod.load_csv
load_manifest = _mod.load_manifest
compute_changes = _mod.compute_changes
apply_changes = _mod.apply_changes
write_manifest_atomic = _mod.write_manifest_atomic


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_MANIFEST = {
    "version": "1.0.0",
    "repo": "test/repo",
    "branch": "main",
    "base_path": ".opencode/agents",
    "agent_count": 3,
    "categories": {},
    "agents": [
        {
            "name": "typescript-pro",
            "category": "languages",
            "path": "languages/typescript-pro",
            "mode": "subagent",
            "description": "TypeScript expert",
            "tags": ["typescript"],
        },
        {
            "name": "python-pro",
            "category": "languages",
            "path": "languages/python-pro",
            "mode": "subagent",
            "description": "Python expert",
            "tags": ["python"],
        },
        {
            "name": "docker-specialist",
            "category": "devops",
            "path": "devops/docker-specialist",
            "mode": "subagent",
            "description": "Docker expert",
            "tags": ["docker"],
        },
    ],
    "packs": {},
}

SAMPLE_CSV = """\
agent_name,ecosystem,intent,related_agents
typescript-pro,javascript,"build,review","code-reviewer,refactoring-specialist"
python-pro,python,build,"data-scientist,ai-engineer"
docker-specialist,devops,deploy,"kubernetes-specialist,ci-cd-engineer"
"""


def _write_temp_csv(content: str) -> Path:
    fd, path = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    Path(path).write_text(content, encoding="utf-8")
    return Path(path)


def _write_temp_manifest(data: dict) -> Path:
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    Path(path).write_text(json.dumps(data, indent=2), encoding="utf-8")
    return Path(path)


# ---------------------------------------------------------------------------
# Tests — load_csv
# ---------------------------------------------------------------------------


class TestLoadCsv(unittest.TestCase):
    def test_basic_load(self):
        csv_path = _write_temp_csv(SAMPLE_CSV)
        try:
            records = load_csv(csv_path)
            self.assertEqual(len(records), 3)
            self.assertIn("typescript-pro", records)
            self.assertEqual(records["typescript-pro"]["ecosystem"], ["javascript"])
            self.assertEqual(records["typescript-pro"]["intent"], ["build", "review"])
            self.assertEqual(
                records["typescript-pro"]["related_agents"],
                ["code-reviewer", "refactoring-specialist"],
            )
        finally:
            csv_path.unlink(missing_ok=True)

    def test_malformed_row_skipped_no_crash(self):
        """A row with an empty agent_name is skipped with a warning."""
        csv = "agent_name,ecosystem,intent,related_agents\n,web,build,\n"
        csv_path = _write_temp_csv(csv)
        try:
            import io
            from contextlib import redirect_stderr

            buf = io.StringIO()
            with redirect_stderr(buf):
                records = load_csv(csv_path)
            stderr_output = buf.getvalue()
            self.assertIn("empty agent_name", stderr_output)
            self.assertEqual(len(records), 0)
        finally:
            csv_path.unlink(missing_ok=True)

    def test_missing_columns_warning(self):
        """CSV missing columns warns but doesn't crash."""
        csv = "agent_name,ecosystem\ntest-agent,web\n"
        csv_path = _write_temp_csv(csv)
        try:
            import io
            from contextlib import redirect_stderr

            buf = io.StringIO()
            with redirect_stderr(buf):
                records = load_csv(csv_path)
            stderr_output = buf.getvalue()
            self.assertIn("missing columns", stderr_output)
            # Still loads the record
            self.assertIn("test-agent", records)
            self.assertEqual(records["test-agent"]["ecosystem"], ["web"])
        finally:
            csv_path.unlink(missing_ok=True)

    def test_empty_related_agents(self):
        csv = "agent_name,ecosystem,intent,related_agents\ntest-agent,web,build,\n"
        csv_path = _write_temp_csv(csv)
        try:
            records = load_csv(csv_path)
            self.assertEqual(records["test-agent"]["related_agents"], [])
        finally:
            csv_path.unlink(missing_ok=True)

    def test_nonexistent_file_returns_empty(self):
        records = load_csv(Path("/nonexistent/path/file.csv"))
        self.assertEqual(records, {})


# ---------------------------------------------------------------------------
# Tests — compute_changes
# ---------------------------------------------------------------------------


class TestComputeChanges(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(json.dumps(SAMPLE_MANIFEST))  # deep copy
        self.csv_path = _write_temp_csv(SAMPLE_CSV)
        self.csv_records = load_csv(self.csv_path)

    def tearDown(self):
        self.csv_path.unlink(missing_ok=True)

    def test_all_known_agents_produce_changes(self):
        changes = compute_changes(self.manifest, self.csv_records)
        changed_names = {c["agent_name"] for c in changes}
        self.assertIn("typescript-pro", changed_names)
        self.assertIn("python-pro", changed_names)
        self.assertIn("docker-specialist", changed_names)

    def test_unknown_agent_warns_no_crash(self):
        csv_with_unknown = SAMPLE_CSV + "unknown-agent,web,build,\n"
        csv_path2 = _write_temp_csv(csv_with_unknown)
        try:
            records = load_csv(csv_path2)
            import io
            from contextlib import redirect_stderr

            buf = io.StringIO()
            with redirect_stderr(buf):
                changes = compute_changes(self.manifest, records)
            stderr_output = buf.getvalue()
            self.assertIn("unknown-agent", stderr_output)
            # Only 3 known agents change
            self.assertEqual(len(changes), 3)
        finally:
            csv_path2.unlink(missing_ok=True)

    def test_no_change_when_already_applied(self):
        """If manifest already has the correct values, no changes are reported."""
        # Pre-apply the tags to the manifest
        ts = next(a for a in self.manifest["agents"] if a["name"] == "typescript-pro")
        ts["ecosystem"] = ["javascript"]
        ts["intent"] = ["build", "review"]
        ts["related_agents"] = ["code-reviewer", "refactoring-specialist"]

        changes = compute_changes(self.manifest, self.csv_records)
        changed_names = {c["agent_name"] for c in changes}
        # typescript-pro should no longer be in the changes
        self.assertNotIn("typescript-pro", changed_names)


# ---------------------------------------------------------------------------
# Tests — apply_changes
# ---------------------------------------------------------------------------


class TestApplyChanges(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(json.dumps(SAMPLE_MANIFEST))
        self.csv_path = _write_temp_csv(SAMPLE_CSV)
        self.csv_records = load_csv(self.csv_path)

    def tearDown(self):
        self.csv_path.unlink(missing_ok=True)

    def test_fields_added_correctly(self):
        changes = compute_changes(self.manifest, self.csv_records)
        apply_changes(self.manifest, changes)

        ts = next(a for a in self.manifest["agents"] if a["name"] == "typescript-pro")
        self.assertEqual(ts["ecosystem"], ["javascript"])
        self.assertEqual(ts["intent"], ["build", "review"])
        self.assertEqual(
            ts["related_agents"], ["code-reviewer", "refactoring-specialist"]
        )

    def test_idempotent_apply(self):
        """Applying twice produces the same result."""
        # First apply
        changes1 = compute_changes(self.manifest, self.csv_records)
        apply_changes(self.manifest, changes1)
        snapshot1 = json.dumps(self.manifest, sort_keys=True)

        # Second apply
        changes2 = compute_changes(self.manifest, self.csv_records)
        self.assertEqual(len(changes2), 0, "Second apply should produce no changes")
        apply_changes(self.manifest, changes2)
        snapshot2 = json.dumps(self.manifest, sort_keys=True)

        self.assertEqual(snapshot1, snapshot2)

    def test_existing_fields_preserved(self):
        """Original manifest fields (sha256, size, etc.) are preserved."""
        # Add extra field to simulate existing data
        docker = next(
            a for a in self.manifest["agents"] if a["name"] == "docker-specialist"
        )
        docker["sha256"] = "abc123"
        docker["size"] = 9999

        changes = compute_changes(self.manifest, self.csv_records)
        apply_changes(self.manifest, changes)

        docker_after = next(
            a for a in self.manifest["agents"] if a["name"] == "docker-specialist"
        )
        self.assertEqual(docker_after["sha256"], "abc123")
        self.assertEqual(docker_after["size"], 9999)


# ---------------------------------------------------------------------------
# Tests — dry-run via main()
# ---------------------------------------------------------------------------


class TestDryRun(unittest.TestCase):
    def test_dry_run_does_not_modify_manifest(self):
        """--dry-run must not write to manifest.json."""
        manifest_path = _write_temp_manifest(SAMPLE_MANIFEST)
        csv_path = _write_temp_csv(SAMPLE_CSV)
        original_mtime = manifest_path.stat().st_mtime

        try:
            exit_code = _mod.main(
                [
                    "--dry-run",
                    "--manifest",
                    str(manifest_path),
                    "--csv",
                    str(csv_path),
                ]
            )
            self.assertEqual(exit_code, 0)
            # Verify file was not touched
            self.assertEqual(manifest_path.stat().st_mtime, original_mtime)
            # Verify content is unchanged
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            ts = next(a for a in data["agents"] if a["name"] == "typescript-pro")
            self.assertNotIn("ecosystem", ts)
        finally:
            manifest_path.unlink(missing_ok=True)
            csv_path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Tests — apply via main()
# ---------------------------------------------------------------------------


class TestApplyViaMain(unittest.TestCase):
    def test_apply_adds_fields(self):
        manifest_path = _write_temp_manifest(SAMPLE_MANIFEST)
        csv_path = _write_temp_csv(SAMPLE_CSV)

        try:
            exit_code = _mod.main(
                [
                    "--apply",
                    "--manifest",
                    str(manifest_path),
                    "--csv",
                    str(csv_path),
                ]
            )
            self.assertEqual(exit_code, 0)

            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            ts = next(a for a in data["agents"] if a["name"] == "typescript-pro")
            self.assertEqual(ts["ecosystem"], ["javascript"])
            self.assertEqual(ts["intent"], ["build", "review"])
            self.assertIn("code-reviewer", ts["related_agents"])
        finally:
            manifest_path.unlink(missing_ok=True)
            csv_path.unlink(missing_ok=True)

    def test_apply_idempotent_via_main(self):
        """Running --apply twice produces identical manifest."""
        manifest_path = _write_temp_manifest(SAMPLE_MANIFEST)
        csv_path = _write_temp_csv(SAMPLE_CSV)

        try:
            _mod.main(
                ["--apply", "--manifest", str(manifest_path), "--csv", str(csv_path)]
            )
            content1 = manifest_path.read_text(encoding="utf-8")

            _mod.main(
                ["--apply", "--manifest", str(manifest_path), "--csv", str(csv_path)]
            )
            content2 = manifest_path.read_text(encoding="utf-8")

            self.assertEqual(json.loads(content1), json.loads(content2))
        finally:
            manifest_path.unlink(missing_ok=True)
            csv_path.unlink(missing_ok=True)

    def test_malformed_csv_no_crash(self):
        """A completely malformed CSV should warn and exit cleanly."""
        manifest_path = _write_temp_manifest(SAMPLE_MANIFEST)
        # Write a CSV with no valid rows
        bad_csv_path = _write_temp_csv("not,a,valid,csv,at,all\n\n\n")

        try:
            import io
            from contextlib import redirect_stderr

            buf = io.StringIO()
            with redirect_stderr(buf):
                exit_code = _mod.main(
                    [
                        "--apply",
                        "--manifest",
                        str(manifest_path),
                        "--csv",
                        str(bad_csv_path),
                    ]
                )
            # Script should exit with error (no valid records)
            self.assertNotEqual(exit_code, 0)
        finally:
            manifest_path.unlink(missing_ok=True)
            bad_csv_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
