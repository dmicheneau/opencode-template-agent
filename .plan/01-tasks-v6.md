# V6 Tasks

**Plan:** [00-plan-v6.md](00-plan-v6.md)
**Created:** 2026-02-18

---

## Phase A — Quick Wins

### S1: TUI Anti-Flicker

- [ ] **S1.1** Add SYNC_START/SYNC_END constants to `src/tui/ansi.mjs` (`\x1b[?2026h` / `\x1b[?2026l`)
- [ ] **S1.2** Wrap flush() output with sync markers in `src/tui/screen.mjs`
- [ ] **S1.3** Add prevLines[] cache and line-level diffing to flush() in `src/tui/screen.mjs`
- [ ] **S1.4** Add `moveTo(row, col)` helper to `src/tui/ansi.mjs` (if not exists)
- [ ] **S1.5** Export invalidate() from screen.mjs, call it in onResize and enter() in `src/tui/index.mjs`
- [ ] **S1.6** Add queueMicrotask-based deferred redraw() in `src/tui/index.mjs`
- [ ] **S1.7** Change spinner interval from 80ms to 120ms in `src/tui/index.mjs`
- [ ] **S1.8** Update spinner divisor from 80 to 120 in `src/tui/renderer.mjs`
- [ ] **S1.9** Run all 250 JS tests — verify no regressions
- [ ] **S1.10** Visual testing: run TUI, navigate, install, verify no flicker

### S5: Pack Installation Fix

- [ ] **S5.1** In `src/tui/state.mjs` updatePackDetail(): when CONFIRM + selection.size===0, auto-select all uninstalled agents
- [ ] **S5.2** Add `confirmContext` field to state (pack name, agent count) for confirm dialog
- [ ] **S5.3** Update `src/tui/renderer.mjs` renderConfirm() to show pack context when available
- [ ] **S5.4** Handle edge case: all agents in pack already installed → show info message
- [ ] **S5.5** Write tests for pack auto-select behavior
- [ ] **S5.6** Run all tests — verify no regressions

---

## Phase B — Core Features

### S3: Hash-Based Update Detection

- [ ] **S3.1** Create `src/lock.mjs` — computeHash(), computeFileHash(), readLockFile(), writeLockFile()
- [ ] **S3.2** Add upsertLockEntry(), removeLockEntry(), createEmptyLock() to lock.mjs
- [ ] **S3.3** Implement atomic write (tmp+rename) in writeLockFile()
- [ ] **S3.4** Implement corrupted JSON recovery (backup to .bak, return empty lock)
- [ ] **S3.5** Add `sha256` and `size` fields to manifest.json agent entries
- [ ] **S3.6** Update `scripts/update-manifest.py` to compute SHA-256 hashes during sync
- [ ] **S3.7** Update `src/tui/state.mjs` detectInstalled() to return 4 states (current/outdated/not-installed/unknown)
- [ ] **S3.8** Update `src/tui/renderer.mjs` to display state indicators (✓ green, ↑ yellow, ? gray)
- [ ] **S3.9** Update `src/tui/ansi.mjs` with state indicator colors
- [ ] **S3.10** Modify `src/installer.mjs` installAgent() to compute hash + write lock entry on install
- [ ] **S3.11** Add `--update` flag to CLI: reinstall only outdated agents
- [ ] **S3.12** Add `--rehash` flag to CLI: rebuild lock file from disk
- [ ] **S3.13** Add `--verify` flag to CLI: verify installed files match lock hashes
- [ ] **S3.14** Update lock file on uninstall (removeLockEntry)
- [ ] **S3.15** Write tests for lock.mjs (read/write/corrupt/missing/atomic)
- [ ] **S3.16** Write tests for 4-state detection logic
- [ ] **S3.17** Write tests for manifest hash computation in Python sync
- [ ] **S3.18** Run all 427 tests — verify no regressions

### S6: Agent Uninstall

- [ ] **S6.1** Add uninstallAgent() to `src/installer.mjs` — delete file, clean empty dirs, ENOENT handling
- [ ] **S6.2** Add uninstallAgents() batch function to `src/installer.mjs`
- [ ] **S6.3** Add path traversal security check on delete paths
- [ ] **S6.4** Add uninstall display helpers to `src/display.mjs`
- [ ] **S6.5** Add `x` key binding to `src/tui/input.mjs` for uninstall mode
- [ ] **S6.6** Add `uninstall_browse`, `uninstall_confirm`, `uninstalling` modes to `src/tui/state.mjs`
- [ ] **S6.7** Add mode transitions: browse→uninstall_browse→uninstall_confirm→uninstalling→done
- [ ] **S6.8** Filter to show only installed agents in uninstall_browse mode
- [ ] **S6.9** Add renderUninstallBrowse(), renderUninstallConfirm() to `src/tui/renderer.mjs`
- [ ] **S6.10** Add performUninstall() orchestrator to `src/tui/index.mjs`
- [ ] **S6.11** Add `uninstall` command to `bin/cli.mjs` with flags: --pack, --category, --all, --dry-run, --force
- [ ] **S6.12** Add aliases: `rm`, `remove` for uninstall command
- [ ] **S6.13** Update --help output with uninstall documentation
- [ ] **S6.14** Write tests for uninstallAgent/uninstallAgents
- [ ] **S6.15** Write tests for TUI uninstall mode (state machine transitions)
- [ ] **S6.16** Write tests for CLI uninstall command parsing
- [ ] **S6.17** Run all tests — verify no regressions

---

## Phase C — Full Permissions

### S4: Permission Modification + YOLO Mode

#### C1 — Foundation (no UI, no integration)

- [ ] **S4.1** Create `src/permissions/presets.mjs` — PERMISSION_NAMES, PRESETS (strict/balanced/permissive/yolo)
- [ ] **S4.2** Create `src/permissions/parser.mjs` — parseFrontmatter(), parseYamlLines()
- [ ] **S4.3** Add modifyPermissions() with surgical line-based splice to parser.mjs
- [ ] **S4.4** Add serializePermissionBlock() to parser.mjs
- [ ] **S4.5** Create `src/permissions/warnings.mjs` — warning definitions, displayWarning(), requireConfirmation()
- [ ] **S4.6** Write round-trip tests for parser (parse→modify→serialize→parse)
- [ ] **S4.7** Write edge case tests: no permission block, empty frontmatter, CRLF, UTF-8 BOM, comments
- [ ] **S4.8** Write tests for all 4 presets (verify all 17 permissions set correctly)

#### C2 — CLI & Resolution

- [ ] **S4.9** Create `src/permissions/cli.mjs` — parsePermissionFlags(), parseOverrideSpec()
- [ ] **S4.10** Create `src/permissions/resolve.mjs` — resolvePermissions() with layered precedence
- [ ] **S4.11** Create `src/permissions/persistence.mjs` — loadPreferences(), savePreferences()
- [ ] **S4.12** Implement 0o600 file permissions for preferences file
- [ ] **S4.13** Implement atomic write for preferences file
- [ ] **S4.14** Refuse to persist yolo as default preset
- [ ] **S4.15** Add --yolo, --permissions, --permission-override flags to `bin/cli.mjs`
- [ ] **S4.16** Add --save-permissions, --no-saved-permissions, --no-interactive flags
- [ ] **S4.17** Write CLI flag parsing tests
- [ ] **S4.18** Write resolution precedence tests
- [ ] **S4.19** Write persistence tests (save/load/corrupt/missing/permissions)

#### C3 — TUI Permission Editor

- [ ] **S4.20** Create `src/permissions/editor.mjs` — PermissionEditor class
- [ ] **S4.21** Implement preset selector screen (radio buttons)
- [ ] **S4.22** Implement per-agent permission editor (↑↓ navigate, ←→ cycle)
- [ ] **S4.23** Implement bash pattern sub-editor (add/delete/cycle patterns)
- [ ] **S4.24** Implement security warnings inline in editor
- [ ] **S4.25** Implement "Apply to all agents" feature
- [ ] **S4.26** Write editor state machine tests

#### C4 — Integration

- [ ] **S4.27** Integrate permission configuration step into install flow (after selection, before confirm)
- [ ] **S4.28** Modify installAgent() to apply permission modifications before writing files
- [ ] **S4.29** Show permission summary in TUI confirm dialog
- [ ] **S4.30** Gate YOLO mode with warning + 'yolo' confirmation string
- [ ] **S4.31** Run all 427 tests — verify no regressions
- [ ] **S4.32** Manual test: install with each preset, verify frontmatter output

---

## Phase D — Content Enrichment

### S2: Agent Content Enrichment

#### D1 — Template & Infrastructure

- [ ] **S2.1** Design universal agent template structure (Identity, Workflow, Decision, Tools, Quality)
- [ ] **S2.2** Define 5 permission archetypes (Builder, Auditor, Analyst, Orchestrator, Specialist)
- [ ] **S2.3** Define 10 category colors (WCAG AA, semantically grouped)
- [ ] **S2.4** Design quality scoring rubric (8-10 dimensions, 1-5 scale)
- [ ] **S2.5** Update `scripts/sync-agents.py` to support richer agent generation
- [ ] **S2.6** Add YAML schema validation to sync pipeline
- [ ] **S2.7** Add template conformance checks to sync pipeline
- [ ] **S2.8** Add quality score computation to sync pipeline
- [ ] **S2.9** Write tests for sync pipeline changes

#### D2 — Languages & DevTools (20 agents)

- [ ] **S2.10** Enrich `languages/typescript-pro.md`
- [ ] **S2.11** Enrich `languages/golang-pro.md`
- [ ] **S2.12** Enrich `languages/python-pro.md`
- [ ] **S2.13** Enrich `languages/java-architect.md`
- [ ] **S2.14** Enrich `languages/rust-pro.md`
- [ ] **S2.15** Enrich `languages/kotlin-specialist.md`
- [ ] **S2.16** Enrich `languages/csharp-developer.md`
- [ ] **S2.17** Enrich `languages/php-pro.md`
- [ ] **S2.18** Enrich `languages/cpp-pro.md`
- [ ] **S2.19** Enrich `languages/swift-expert.md`
- [ ] **S2.20** Enrich `languages/rails-expert.md`
- [ ] **S2.21** Enrich `devtools/code-reviewer.md`
- [ ] **S2.22** Enrich `devtools/test-automator.md`
- [ ] **S2.23** Enrich `devtools/debugger.md`
- [ ] **S2.24** Enrich `devtools/performance-engineer.md`
- [ ] **S2.25** Enrich `devtools/refactoring-specialist.md`
- [ ] **S2.26** Enrich `devtools/qa-expert.md`
- [ ] **S2.27** Enrich `devtools/microservices-architect.md`
- [ ] **S2.28** Run quality scoring on all Phase D2 agents — verify ≥3.5 average
- [ ] **S2.29** Update manifest.json with enriched hashes

#### D3 — AI, Security, DevOps (18 agents)

- [ ] **S2.30** Enrich all `ai/*.md` agents (6)
- [ ] **S2.31** Enrich all `security/*.md` agents (4)
- [ ] **S2.32** Enrich all `devops/*.md` agents (8)
- [ ] **S2.33** Run quality scoring on Phase D3 — verify ≥3.5 average
- [ ] **S2.34** Update manifest.json with enriched hashes

#### D4 — Web, Data-API, Docs (16 agents)

- [ ] **S2.35** Enrich all `web/*.md` agents (7)
- [ ] **S2.36** Enrich all `data-api/*.md` agents (5)
- [ ] **S2.37** Enrich all `docs/*.md` agents (4)
- [ ] **S2.38** Run quality scoring on Phase D4 — verify ≥3.5 average
- [ ] **S2.39** Update manifest.json with enriched hashes

#### D5 — Business, MCP, Primary (16 agents)

- [ ] **S2.40** Enrich all `business/*.md` agents (6)
- [ ] **S2.41** Enrich all `mcp/*.md` agents (4)
- [ ] **S2.42** Enrich primary agents: `cloud-architect.md`, `devops-engineer.md`, `fullstack-developer.md`, `episode-orchestrator.md`
- [ ] **S2.43** Enrich all-mode agent: `business/prd.md`
- [ ] **S2.44** Run quality scoring on ALL 70 agents — verify ≥3.5 average
- [ ] **S2.45** Final manifest.json update with all enriched hashes

---

## Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| A — Quick Wins | 16 tasks | 1 day |
| B — Core Features | 35 tasks | 2-3 days |
| C — Full Permissions | 32 tasks | 2-3 days |
| D — Content Enrichment | 45 tasks | 10-14 weeks |
| **Total** | **128 tasks** | — |
