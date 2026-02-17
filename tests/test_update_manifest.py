#!/usr/bin/env python3
"""Tests for scripts/update-manifest.py.

Covers:
- Category mapping (known, unknown, edge cases)
- JSON I/O (load, save, atomic writes)
- Manifest merging (new agents, preservation, staleness detection)
- Full pipeline (update_manifest orchestrator)
- CLI invocation
"""

from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Import the module (name contains a hyphen)
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

update_manifest_mod = importlib.import_module("update-manifest")

# Convenience aliases
CATEGORY_MAP = update_manifest_mod.CATEGORY_MAP
NEEDS_REVIEW_PREFIX = update_manifest_mod.NEEDS_REVIEW_PREFIX
load_json = update_manifest_mod.load_json
save_json = update_manifest_mod.save_json
map_category = update_manifest_mod.map_category
merge_manifests = update_manifest_mod.merge_manifests
update_manifest = update_manifest_mod.update_manifest
main = update_manifest_mod.main


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_root_manifest(agents=None, **kwargs):
    """Build a minimal root manifest dict."""
    base = {
        "version": "1.0.0",
        "repo": "dmicheneau/opencode-template-agent",
        "branch": "main",
        "base_path": ".opencode/agents",
        "agent_count": 0,
        "categories": {},
        "agents": [],
    }
    if agents:
        base["agents"] = agents
        base["agent_count"] = len(agents)
    base.update(kwargs)
    return base


def make_sync_manifest(agents=None):
    """Build a minimal sync manifest dict."""
    return {"agents": agents or []}


def make_agent(name, category="devtools", **kwargs):
    """Build a minimal agent entry."""
    entry = {
        "name": name,
        "category": category,
        "path": f".opencode/agents/{category}/{name}.md",
        "mode": "byline",
        "description": f"A {name} agent",
    }
    entry.update(kwargs)
    return entry


def write_json(path, data):
    """Write JSON to a file (non-atomic, for test setup)."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


# =====================================================================
# Test: Category Mapping
# =====================================================================


class TestCategoryMap(unittest.TestCase):
    """Tests for CATEGORY_MAP and map_category()."""

    def test_direct_mappings(self):
        """Known categories map to themselves."""
        direct = [
            "languages",
            "ai",
            "web",
            "devops",
            "devtools",
            "security",
            "mcp",
            "business",
            "docs",
        ]
        for cat in direct:
            self.assertEqual(map_category(cat), cat, f"Direct map failed: {cat}")

    def test_remapped_categories(self):
        """Remapped categories resolve correctly."""
        self.assertEqual(map_category("team"), "web")
        self.assertEqual(map_category("database"), "data-api")
        self.assertEqual(map_category("api"), "data-api")
        self.assertEqual(map_category("specialist"), "devtools")
        self.assertEqual(map_category("media"), "devtools")

    def test_unknown_category_defaults_to_devtools(self):
        """Unknown categories fall back to devtools."""
        self.assertEqual(map_category("foobar"), "devtools")
        self.assertEqual(map_category(""), "devtools")

    def test_category_map_completeness(self):
        """All 14 entries in CATEGORY_MAP are present."""
        self.assertEqual(len(CATEGORY_MAP), 14)

    def test_unknown_category_logs_warning(self):
        """Unknown categories trigger a warning log."""
        with self.assertLogs("update-manifest", level="WARNING") as cm:
            map_category("nonexistent")
        self.assertTrue(any("Unknown upstream category" in msg for msg in cm.output))


# =====================================================================
# Test: JSON I/O
# =====================================================================


class TestJsonIO(unittest.TestCase):
    """Tests for load_json() and save_json()."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil

        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_load_json_valid(self):
        """load_json reads valid JSON."""
        path = os.path.join(self.tmpdir, "test.json")
        write_json(path, {"key": "value"})
        result = load_json(path)
        self.assertEqual(result, {"key": "value"})

    def test_load_json_file_not_found(self):
        """load_json raises FileNotFoundError for missing files."""
        with self.assertRaises(FileNotFoundError):
            load_json(os.path.join(self.tmpdir, "nonexistent.json"))

    def test_load_json_invalid_json(self):
        """load_json raises JSONDecodeError for invalid JSON."""
        path = os.path.join(self.tmpdir, "bad.json")
        with open(path, "w") as f:
            f.write("not json {{{")
        with self.assertRaises(json.JSONDecodeError):
            load_json(path)

    def test_save_json_creates_file(self):
        """save_json creates a valid JSON file."""
        path = os.path.join(self.tmpdir, "out.json")
        save_json(path, {"hello": "world"})
        result = load_json(path)
        self.assertEqual(result, {"hello": "world"})

    def test_save_json_trailing_newline(self):
        """save_json writes a trailing newline."""
        path = os.path.join(self.tmpdir, "out.json")
        save_json(path, {"a": 1})
        with open(path) as f:
            content = f.read()
        self.assertTrue(content.endswith("\n"))

    def test_save_json_creates_directories(self):
        """save_json creates parent directories if needed."""
        path = os.path.join(self.tmpdir, "sub", "dir", "out.json")
        save_json(path, {"nested": True})
        result = load_json(path)
        self.assertEqual(result, {"nested": True})

    def test_save_json_preserves_unicode(self):
        """save_json preserves Unicode characters without escaping."""
        path = os.path.join(self.tmpdir, "unicode.json")
        save_json(path, {"text": "Développeur réseau — été"})
        with open(path, encoding="utf-8") as f:
            content = f.read()
        self.assertIn("Développeur", content)
        self.assertNotIn("\\u", content)

    def test_save_json_atomic_no_partial_writes(self):
        """save_json doesn't leave partial files on error."""
        path = os.path.join(self.tmpdir, "atomic.json")
        # Write initial content
        save_json(path, {"initial": True})

        # Try to save non-serializable data — should fail
        class NotSerializable:
            pass

        with self.assertRaises(TypeError):
            save_json(path, {"bad": NotSerializable()})

        # Original file should be intact
        result = load_json(path)
        self.assertEqual(result, {"initial": True})


# =====================================================================
# Test: Merge Logic
# =====================================================================


class TestMergeManifests(unittest.TestCase):
    """Tests for merge_manifests()."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil

        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_empty_sync_no_changes(self):
        """Empty sync manifest produces no changes."""
        root = make_root_manifest(agents=[make_agent("existing")])
        sync = make_sync_manifest(agents=[])
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(len(added), 0)
        self.assertEqual(len(result["agents"]), 1)

    def test_new_agent_added(self):
        """New agents from sync are added with NEEDS_REVIEW."""
        root = make_root_manifest(agents=[])
        sync = make_sync_manifest(
            agents=[
                make_agent("new-agent", category="ai"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(added, ["new-agent"])
        self.assertEqual(len(result["agents"]), 1)
        agent = result["agents"][0]
        self.assertEqual(agent["name"], "new-agent")
        self.assertEqual(agent["category"], "ai")
        self.assertTrue(agent["description"].startswith(NEEDS_REVIEW_PREFIX))
        self.assertEqual(agent["tags"], [])
        self.assertEqual(agent["source"], "aitmpl")

    def test_existing_agent_preserved(self):
        """Existing agents are not overwritten by sync data."""
        curated = make_agent(
            "my-agent",
            category="web",
            description="Curated description",
            tags=["frontend", "react"],
        )
        root = make_root_manifest(agents=[curated])
        sync = make_sync_manifest(
            agents=[
                make_agent(
                    "my-agent", category="team", description="Upstream description"
                ),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(len(added), 0)
        agent = result["agents"][0]
        self.assertEqual(agent["description"], "Curated description")
        self.assertEqual(agent["tags"], ["frontend", "react"])
        self.assertEqual(agent["category"], "web")  # NOT remapped

    def test_category_remapping_for_new_agents(self):
        """New agents get their category remapped."""
        root = make_root_manifest(agents=[])
        sync = make_sync_manifest(
            agents=[
                make_agent("db-agent", category="database"),
                make_agent("api-agent", category="api"),
                make_agent("team-agent", category="team"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(len(added), 3)
        by_name = {a["name"]: a for a in result["agents"]}
        self.assertEqual(by_name["db-agent"]["category"], "data-api")
        self.assertEqual(by_name["api-agent"]["category"], "data-api")
        self.assertEqual(by_name["team-agent"]["category"], "web")

    def test_agents_sorted_by_name(self):
        """Result agents are sorted alphabetically by name."""
        root = make_root_manifest(agents=[make_agent("zebra")])
        sync = make_sync_manifest(
            agents=[
                make_agent("alpha"),
                make_agent("middle"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        names = [a["name"] for a in result["agents"]]
        self.assertEqual(names, ["alpha", "middle", "zebra"])

    def test_agent_count_updated(self):
        """agent_count reflects the actual number of agents."""
        root = make_root_manifest(agents=[make_agent("a")])
        sync = make_sync_manifest(agents=[make_agent("b"), make_agent("c")])
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(result["agent_count"], 3)

    def test_stale_agents_detected(self):
        """Agents with source=aitmpl not in sync are flagged as stale."""
        root = make_root_manifest(
            agents=[
                make_agent("active", source="aitmpl"),
                make_agent("stale-one", source="aitmpl"),
                make_agent("manual", description="Hand-curated"),
            ]
        )
        sync = make_sync_manifest(
            agents=[
                make_agent("active"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(stale, ["stale-one"])
        self.assertEqual(len(added), 0)

    def test_manual_agents_not_flagged_stale(self):
        """Agents without source=aitmpl are never flagged as stale."""
        root = make_root_manifest(
            agents=[
                make_agent("manual"),  # no source field
            ]
        )
        sync = make_sync_manifest(agents=[])
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(stale, [])

    def test_mixed_add_and_preserve(self):
        """Mix of new and existing agents handled correctly."""
        existing = make_agent("old", description="Curated", tags=["good"])
        root = make_root_manifest(agents=[existing])
        sync = make_sync_manifest(
            agents=[
                make_agent("old", description="Upstream"),
                make_agent("new", category="security"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(added, ["new"])
        by_name = {a["name"]: a for a in result["agents"]}
        self.assertEqual(by_name["old"]["description"], "Curated")
        self.assertTrue(by_name["new"]["description"].startswith(NEEDS_REVIEW_PREFIX))

    def test_unknown_category_defaults_to_devtools(self):
        """New agents with unknown categories get devtools."""
        root = make_root_manifest()
        sync = make_sync_manifest(
            agents=[
                make_agent("mystery", category="xyzzy"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(result["agents"][0]["category"], "devtools")

    def test_path_computed_from_mapped_category(self):
        """Agent path uses the mapped category, not the upstream one."""
        root = make_root_manifest()
        sync = make_sync_manifest(
            agents=[
                {
                    "name": "db-tool",
                    "category": "database",
                    "mode": "byline",
                    "description": "A database tool",
                },
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        agent = result["agents"][0]
        # Path should use data-api (mapped) not database (upstream)
        self.assertIn("data-api", agent["path"])

    def test_sync_path_preserved_if_provided(self):
        """If sync agent has a path, it is used as-is."""
        root = make_root_manifest()
        sync = make_sync_manifest(
            agents=[
                make_agent("custom", path=".opencode/agents/custom-path.md"),
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(
            result["agents"][0]["path"],
            ".opencode/agents/custom-path.md",
        )

    def test_default_mode_is_byline(self):
        """Agents without a mode field get 'byline' by default."""
        root = make_root_manifest()
        sync = make_sync_manifest(
            agents=[
                {"name": "no-mode", "category": "ai", "description": "Test"},
            ]
        )
        result, added, stale = merge_manifests(root, sync)
        self.assertEqual(result["agents"][0]["mode"], "byline")


# =====================================================================
# Test: Full Pipeline (update_manifest)
# =====================================================================


class TestUpdateManifest(unittest.TestCase):
    """Tests for update_manifest() orchestrator."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.root_path = os.path.join(self.tmpdir, "manifest.json")
        self.sync_path = os.path.join(self.tmpdir, "sync-manifest.json")
        self.metadata_path = os.path.join(self.tmpdir, "metadata.json")

    def tearDown(self):
        import shutil

        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_basic_update(self):
        """Full pipeline: adds new agent and writes files."""
        write_json(self.root_path, make_root_manifest())
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("new-one", category="ai"),
                ]
            ),
        )

        result = update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=self.metadata_path,
        )

        # Check metadata
        self.assertEqual(result["added"], ["new-one"])
        self.assertEqual(result["total_synced"], 1)

        # Check manifest was written
        manifest = load_json(self.root_path)
        self.assertEqual(manifest["agent_count"], 1)
        self.assertEqual(manifest["agents"][0]["name"], "new-one")

        # Check metadata file was written
        meta = load_json(self.metadata_path)
        self.assertEqual(meta["added"], ["new-one"])

    def test_no_sync_manifest_exits_2(self):
        """Missing sync manifest exits with code 2."""
        write_json(self.root_path, make_root_manifest())
        with self.assertRaises(SystemExit) as ctx:
            update_manifest(
                root_path=self.root_path,
                sync_path="/nonexistent/sync.json",
                metadata_path=self.metadata_path,
            )
        self.assertEqual(ctx.exception.code, 2)

    def test_no_root_manifest_exits_1(self):
        """Missing root manifest exits with code 1."""
        write_json(self.sync_path, make_sync_manifest())
        with self.assertRaises(SystemExit) as ctx:
            update_manifest(
                root_path="/nonexistent/root.json",
                sync_path=self.sync_path,
                metadata_path=self.metadata_path,
            )
        self.assertEqual(ctx.exception.code, 1)

    def test_dry_run_no_writes(self):
        """Dry run does not modify the root manifest."""
        original = make_root_manifest()
        write_json(self.root_path, original)
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("would-be-new"),
                ]
            ),
        )

        result = update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=self.metadata_path,
            dry_run=True,
        )

        self.assertEqual(result["added"], ["would-be-new"])
        self.assertTrue(result["dry_run"])

        # Root manifest should be unchanged
        manifest = load_json(self.root_path)
        self.assertEqual(manifest["agent_count"], 0)
        self.assertEqual(manifest["agents"], [])

    def test_no_metadata_flag(self):
        """metadata_path=None skips metadata file creation."""
        write_json(self.root_path, make_root_manifest())
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("test"),
                ]
            ),
        )

        update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=None,
        )

        self.assertFalse(os.path.exists(self.metadata_path))

    def test_idempotent_runs(self):
        """Running twice with same data produces same result."""
        write_json(self.root_path, make_root_manifest())
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("agent-x"),
                ]
            ),
        )

        # First run — adds agent
        r1 = update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=self.metadata_path,
        )
        self.assertEqual(len(r1["added"]), 1)

        # Second run — no new agents
        r2 = update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=self.metadata_path,
        )
        self.assertEqual(len(r2["added"]), 0)

        # Still 1 agent total
        manifest = load_json(self.root_path)
        self.assertEqual(manifest["agent_count"], 1)

    def test_preserves_root_metadata(self):
        """Root manifest non-agent fields are preserved."""
        root = make_root_manifest(
            version="2.0.0",
            categories={"ai": {"label": "AI", "icon": "🤖"}},
        )
        write_json(self.root_path, root)
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("bot"),
                ]
            ),
        )

        update_manifest(
            root_path=self.root_path,
            sync_path=self.sync_path,
            metadata_path=self.metadata_path,
        )

        manifest = load_json(self.root_path)
        self.assertEqual(manifest["version"], "2.0.0")
        self.assertEqual(manifest["categories"]["ai"]["label"], "AI")

    def test_tier_from_env(self):
        """SYNC_TIER environment variable is captured in metadata."""
        write_json(self.root_path, make_root_manifest())
        write_json(self.sync_path, make_sync_manifest())

        with patch.dict(os.environ, {"SYNC_TIER": "extended"}):
            result = update_manifest(
                root_path=self.root_path,
                sync_path=self.sync_path,
                metadata_path=self.metadata_path,
            )

        self.assertEqual(result["tier"], "extended")


# =====================================================================
# Test: CLI
# =====================================================================


class TestCLI(unittest.TestCase):
    """Tests for CLI entry point."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.root_path = os.path.join(self.tmpdir, "manifest.json")
        self.sync_path = os.path.join(self.tmpdir, "sync.json")
        self.metadata_path = os.path.join(self.tmpdir, "meta.json")

    def tearDown(self):
        import shutil

        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_cli_dry_run(self):
        """CLI --dry-run works end-to-end."""
        write_json(self.root_path, make_root_manifest())
        write_json(
            self.sync_path,
            make_sync_manifest(
                agents=[
                    make_agent("cli-test"),
                ]
            ),
        )

        with patch(
            "sys.argv",
            [
                "update-manifest.py",
                "--root-manifest",
                self.root_path,
                "--sync-manifest",
                self.sync_path,
                "--metadata-output",
                self.metadata_path,
                "--dry-run",
            ],
        ):
            main()

        # Root should be unchanged (dry run)
        manifest = load_json(self.root_path)
        self.assertEqual(manifest["agent_count"], 0)

    def test_cli_no_metadata(self):
        """CLI --no-metadata skips metadata output."""
        write_json(self.root_path, make_root_manifest())
        write_json(self.sync_path, make_sync_manifest())

        with patch(
            "sys.argv",
            [
                "update-manifest.py",
                "--root-manifest",
                self.root_path,
                "--sync-manifest",
                self.sync_path,
                "--no-metadata",
            ],
        ):
            main()

        self.assertFalse(os.path.exists(self.metadata_path))

    def test_cli_missing_sync_exits_2(self):
        """CLI exits with code 2 when sync manifest is missing."""
        write_json(self.root_path, make_root_manifest())

        with patch(
            "sys.argv",
            [
                "update-manifest.py",
                "--root-manifest",
                self.root_path,
                "--sync-manifest",
                "/nonexistent/sync.json",
            ],
        ):
            with self.assertRaises(SystemExit) as ctx:
                main()
            self.assertEqual(ctx.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
