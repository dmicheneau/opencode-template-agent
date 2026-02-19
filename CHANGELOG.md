# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [6.0.0] - 2026-02-19

### Added
- **Agent Uninstall** — Full uninstall support in TUI (`[x]` key) and CLI (`uninstall`/`remove`/`rm` commands)
  - Symlink protection (SEC-04): lstat check prevents malicious symlink traversal
  - Batch uninstall with `--all`, `--pack`, `--category`, `--dry-run` flags
  - TUI confirmation dialog with danger chrome, flash message feedback
  - Browse footer updated with `[x] Uninstall` hint
- **Lock Integrity Tools** — Three new CLI commands for lock file management:
  - `update` / `--update`: Detect and reinstall outdated agents (hash mismatch)
  - `verify` / `--verify`: Validate installed files against lock hashes (exit 1 on mismatch)
  - `rehash` / `--rehash`: Rebuild lock file from disk state
- 64 new tests (40 uninstall + 24 lock integrity)
- 537 tests total (360 JS + 177 Python), all passing

## [5.0.0] - 2026-02-19

### Added
- **S1 Anti-Flicker**: DEC 2026 synchronized output, line-diffing flush (only repaints changed lines), microtask-coalesced redraw, shared `SPINNER_INTERVAL_MS` constant
- **S5 Pack Fix**: auto-select uninstalled agents when pressing Enter in pack detail with no selection
- **S5 Flash Messages**: yellow ⚠ flash messages with 3-second auto-dismiss, pack context in confirm dialog
- **S3 Hash-Based Lock**: `lock.mjs` module with SHA-256 tracking, `.manifest-lock.json` lock file, 4 agent states (`installed`/`outdated`/`new`/`unknown`), `bootstrapLock()` migration for existing installations
- 473 tests (296 JS + 177 Python), all passing

### Changed
- `screen.mjs` flush() now uses line diffing + SYNC_START/SYNC_END markers instead of full repaints
- Spinner interval 80ms → 120ms via shared constant
- `detectInstalled()` now delegates to lock-based `detectInstalledSet()`
- `installer.mjs` records SHA-256 in lock file on every install

## [4.0.0] - 2026-02-18

### Added
- TUI visual redesign with colored tabs, category colors, and full-width highlight bar
- Automated sync pipeline (weekly cron, `sync-agents.yml` workflow)
- `update-manifest.py` script for manifest generation
- Expansion to 70 agents across 10 categories with 15 packs
- Curation process with 6 criteria (C1–C6) and permission mapping
- 427 tests (250 JS + 177 Python), all passing

### Fixed
- TUI bugs (`--help`, display glitches, packs Space key, highlight gaps)
- Color collision between packs and mobile tabs

### Changed
- Replaced `highlight` with `bgRow` for cursor styling
- Extracted `nameStyle` helper to reduce duplication

### Removed
- Dead `highlight` export from `ansi.mjs`

## [3.0.0] - 2026-02-15

### Added
- Extended from 43 to 56+ agents
- Pack system (curated agent groups)
- `sync-agents.py` and `sync_common.py` for upstream sync

## [2.0.0] - 2026-02-13

### Added
- Interactive TUI with raw-mode terminal (zero dependencies)
- Tab navigation, search mode, multi-select, confirmation flow
- Pack browsing and installation
- Installed agent detection, `--help` and `--list` flags

## [1.0.0] - 2026-02-12

### Added
- Agent manifest with categorized agents
- OpenCode-compatible agent format (YAML front matter + markdown)
- CLI entry point (`bin/cli.mjs`), zero npm dependencies
