# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
