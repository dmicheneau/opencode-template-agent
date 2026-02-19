# V6 Tasks

**Plan:** [00-plan-v6.md](00-plan-v6.md)
**Created:** 2026-02-18
**Updated:** 2026-02-19 (post-review revision: release split + new tasks from 4 reviews)

---

## V6.0 — MVP (S1 + S5 + S3 core)

### S1: TUI Anti-Flicker ✅

- [x] **S1.1** Add SYNC_START/SYNC_END constants to `src/tui/ansi.mjs` (`\x1b[?2026h` / `\x1b[?2026l`)
- [x] **S1.2** Wrap flush() output with sync markers in `src/tui/screen.mjs`
- [x] **S1.3** Add prevLines[] cache and line-level diffing to flush() in `src/tui/screen.mjs`
- [x] **S1.4** Add `moveTo(row, col)` helper to `src/tui/ansi.mjs` (already existed)
- [x] **S1.5** Export invalidate() from screen.mjs — call on resize AND frame height changes (W-10)
- [x] **S1.6** Call invalidate() in onResize and enter() in `src/tui/index.mjs`
- [x] **S1.7** Add queueMicrotask-based deferred redraw() in `src/tui/index.mjs`
- [x] **S1.8** Extract `SPINNER_INTERVAL_MS = 120` shared constant in `src/tui/ansi.mjs` (W-04)
- [x] **S1.9** Use SPINNER_INTERVAL_MS in `src/tui/index.mjs` (setInterval) and `src/tui/renderer.mjs` (divisor)
- [x] **S1.10** Run all 250 JS tests — verify no regressions
- [ ] **S1.11** Visual testing: run TUI, navigate, install, verify no flicker

### S5: Pack Installation Fix + Flash Messages ✅

- [x] **S5.1** In `src/tui/state.mjs` updatePackDetail(): when CONFIRM + selection.size===0, auto-select all uninstalled agents
- [x] **S5.2** Add `confirmContext` field to state (pack name, agent count) for confirm dialog
- [x] **S5.3** Update `src/tui/renderer.mjs` renderConfirm() to show pack context when available
- [x] **S5.4** Handle edge case: all agents in pack already installed → show flash message
- [x] **S5.5** Add `flash` state field (message string + timestamp) to state (F-01)
- [x] **S5.6** Add flash rendering in `src/tui/renderer.mjs` info bar area (F-01)
- [x] **S5.7** Add flash timer management in `src/tui/index.mjs` — auto-clear after 3 seconds (F-01)
- [x] **S5.8** Write tests for pack auto-select behavior
- [x] **S5.9** Write tests for flash message display + auto-dismiss
- [x] **S5.10** Run all tests — verify no regressions

### S3 core: Hash-Based Detection (foundation) — partial ✅

- [x] **S3.1** Create `src/lock.mjs` — computeHash(), computeFileHash(), readLockFile(), writeLockFile()
- [x] **S3.2** Add upsertLockEntry(), removeLockEntry(), createEmptyLock() to lock.mjs
- [ ] **S3.3** Implement atomic write (tmp+rename) in writeLockFile()
- [ ] **S3.4** Implement corrupted JSON recovery: display warning + backup to .bak + return empty lock (MF-4)
- [ ] **S3.5** Add **optional** `sha256` and `size` fields to manifest.json agent entries (W-02: optional to not break makeManifest test fixtures)
- [ ] **S3.6** Update `scripts/update-manifest.py` to compute SHA-256 hashes during sync
- [x] **S3.7** Add `detectAgentStates()` returning Map<id, state> in `src/lock.mjs` (W-08)
- [x] **S3.8** Wrap `detectInstalled()` as backward-compatible Set<id> using detectInstalledSet() (W-08)
- [ ] **S3.9** Update `src/tui/renderer.mjs` to display state indicators (checkmark green, up-arrow yellow, ? gray)
- [ ] **S3.10** Update `src/tui/ansi.mjs` with state indicator colors
- [x] **S3.11** Modify `src/installer.mjs` installAgent() to compute hash + write lock entry on install
- [ ] **S3.12** Invalidate registry.mjs singleton cache when manifest version changes (M-05)
- [x] **S3.13** Add migration: detect installed agents without lock file, bootstrap "unknown" state entries (F-03)
- [x] **S3.14** Write tests for lock.mjs (read/write/corrupt/missing/atomic)
- [x] **S3.15** Write tests for 4-state detection logic + migration bootstrap
- [ ] **S3.16** Write tests for manifest hash computation in Python sync
- [x] **S3.17** Run all 427 tests — verify no regressions

### V6.0 Release Tasks

- [ ] **V6.0-R1** Version bump in package.json + install.sh (M-01)
- [ ] **V6.0-R2** Update CHANGELOG.md
- [ ] **V6.0-R3** Final full test run (JS + Python)

---

## V6.1 — Lifecycle Management (S6 + S3 extras)

### S6: Agent Uninstall

- [x] **S6.1** Add uninstallAgent() to `src/installer.mjs` — delete file, clean empty dirs, ENOENT handling, **symlink protection: lstat() + realpath() + reject symlinks** (MF-2)
- [x] **S6.2** Add uninstallAgents() batch function to `src/installer.mjs`
- [x] **S6.3** Add path traversal security check on delete paths (verify target inside agents directory)
- [x] **S6.4** Add uninstall display helpers to `src/display.mjs`
- [x] **S6.5** Add `UNINSTALL` to Action enum in `src/tui/input.mjs` (F-02)
- [x] **S6.6** Add `x` key → UNINSTALL action mapping in `src/tui/input.mjs` (F-02)
- [x] **S6.7** Add `uninstall_confirm`, `uninstalling` modes to `src/tui/state.mjs` (W-06: no separate uninstall_browse, reuse browse with filter)
- [x] **S6.8** Add mode transitions: browse → (x) → filter installed → select → uninstall_confirm → uninstalling → done
- [x] **S6.9** Filter to show only installed agents when in uninstall mode
- [x] **S6.10** Add renderUninstallConfirm() to `src/tui/renderer.mjs` — red chrome for danger (R6)
- [x] **S6.11** Add **footer hints** for uninstall modes (R2 mandatory, M-06)
- [x] **S6.12** Add performUninstall() orchestrator to `src/tui/index.mjs` — uses flash for "N agents uninstalled"
- [x] **S6.13** Add `uninstall` command to `bin/cli.mjs` with flags: --pack, --category, --dry-run, --force
- [x] **S6.14** Add `--all` flag requiring `--force` for safety (R7)
- [x] **S6.15** Add aliases: `rm`, `remove` for uninstall command
- [x] **S6.16** Update --help output with uninstall documentation
- [x] **S6.17** Write tests for uninstallAgent/uninstallAgents (including symlink rejection)
- [x] **S6.18** Write tests for TUI uninstall mode (state machine transitions)
- [x] **S6.19** Write tests for CLI uninstall command parsing
- [x] **S6.20** Run all tests — verify no regressions

### S3 extras: CLI Flags

- [x] **S3.18** Add `--update` flag to CLI: reinstall only outdated agents
- [x] **S3.19** Add `--rehash` flag to CLI: rebuild lock file from disk (skip agents not in manifest — M-07)
- [x] **S3.20** Add `--verify` flag to CLI: verify installed files match lock hashes
- [x] **S3.21** Update lock file on uninstall (removeLockEntry) — integration with S6
- [x] **S3.22** Write tests for CLI hash flags
- [x] **S3.23** Run all tests — verify no regressions

### V6.1 Release Tasks

- [x] **V6.1-R1** Version bump in package.json + install.sh (M-01)
- [x] **V6.1-R2** Update CHANGELOG.md
- [x] **V6.1-R3** Final full test run (JS + Python)

---

## V7.0 — Full Permissions (S4)

### C1 — Foundation (no UI, no integration)

- [ ] **S4.1** Create `src/permissions/presets.mjs` — PERMISSION_NAMES (17), PRESETS (strict/balanced/permissive/yolo), ACTION_ALLOWLIST (allow/ask/deny)
- [ ] **S4.2** Create `src/permissions/writer.mjs` — readFrontmatterBoundaries() to find `---` markers (SEC-01: write-only, no YAML parsing)
- [ ] **S4.3** Add buildPermissionYaml() to writer.mjs — generate permission block from JSON permission set
- [ ] **S4.4** Add spliceFrontmatter() to writer.mjs — replace permission section between boundaries, preserve all other content
- [ ] **S4.5** Create `src/permissions/warnings.mjs` — warning definitions (4 levels), displayWarning(), requireConfirmation()
- [ ] **S4.6** Write round-trip tests for writer (read boundaries → build YAML → splice → verify)
- [ ] **S4.7** Write edge case tests: no permission block, empty frontmatter, CRLF, UTF-8 BOM
- [ ] **S4.8** Write tests for all 4 presets (verify all 17 permissions set correctly)

### C2 — CLI & Resolution

- [ ] **S4.9** Create `src/permissions/cli.mjs` — parsePermissionFlags(), parseOverrideSpec()
- [ ] **S4.10** Create `src/permissions/resolve.mjs` — resolvePermissions() with layered precedence
- [ ] **S4.11** Create `src/permissions/persistence.mjs` — loadPreferences(), savePreferences() using `${XDG_CONFIG_HOME || '~/.config'}/opencode/` (W-09)
- [ ] **S4.12** Implement 0o600 file permissions for preferences file
- [ ] **S4.13** Implement atomic write for preferences file
- [ ] **S4.14** Refuse to persist yolo as default preset
- [ ] **S4.15** Add --yolo, --permissions, --permission-override flags to `bin/cli.mjs`
- [ ] **S4.16** Add --save-permissions, --no-saved-permissions, --no-interactive flags
- [ ] **S4.17** Validate all permission override inputs against SAFE_NAME_RE + ACTION_ALLOWLIST (MF-5)
- [ ] **S4.18** Write CLI flag parsing tests
- [ ] **S4.19** Write resolution precedence tests
- [ ] **S4.20** Write persistence tests (save/load/corrupt/missing/permissions)

### C3 — TUI Permission Editor

- [ ] **S4.21** Create permission state with `createPermissionState()` + `updatePermission()` pure reducer (W-03: state+reducer, no class)
- [ ] **S4.22** Implement preset selector screen — skip (default) / strict / balanced / permissive / yolo / custom (R1: opt-in)
- [ ] **S4.23** Implement per-agent permission editor (up/down navigate, left/right cycle) — only shown when "custom" selected
- [ ] **S4.24** Implement bash pattern sub-editor (add/delete/cycle patterns)
- [ ] **S4.25** Implement security warnings inline in editor
- [ ] **S4.26** Implement "Apply to all agents" feature
- [ ] **S4.27** Add **footer hints** for all permission modes (R2 mandatory)
- [ ] **S4.28** Write editor state machine tests

### C4 — Integration

- [ ] **S4.29** Integrate permission configuration step into install flow — **opt-in only** (R1: default = skip, only "custom" opens editor)
- [ ] **S4.30** Modify installAgent() to apply permission modifications before writing files
- [ ] **S4.31** Show permission summary in TUI confirm dialog
- [ ] **S4.32** Gate YOLO mode: require typing `CONFIRM` to activate (sets all 17 permissions to allow)
- [ ] **S4.33** Document: S3 hashes are for change detection, NOT supply chain security (MF-6)
- [ ] **S4.34** Run all tests — verify no regressions
- [ ] **S4.35** Manual test: install with each preset, verify frontmatter output

### V7.0 Release Tasks

- [ ] **V7.0-R1** Version bump in package.json + install.sh (M-01)
- [ ] **V7.0-R2** Update CHANGELOG.md
- [ ] **V7.0-R3** Final full test run (JS + Python)

---

## S2 — Content Enrichment (continuous, parallel)

### D1 — Template & Infrastructure

- [ ] **S2.1** Design universal agent template structure (Identity, Workflow, Decision, Tools, Quality)
- [ ] **S2.2** Define 5 permission archetypes (Builder, Auditor, Analyst, Orchestrator, Specialist)
- [ ] **S2.3** Define 10 category colors (WCAG AA, semantically grouped)
- [ ] **S2.4** Design quality scoring rubric (8-10 dimensions, 1-5 scale)
- [ ] **S2.5** Update `scripts/sync-agents.py` to support richer agent generation
- [ ] **S2.6** Add YAML schema validation to sync pipeline
- [ ] **S2.7** Add template conformance checks to sync pipeline
- [ ] **S2.8** Add quality score computation to sync pipeline
- [ ] **S2.9** Write tests for sync pipeline changes

### D2 — Languages & DevTools (20 agents)

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
- [ ] **S2.28** Run quality scoring on all Phase D2 agents — verify >=3.5 average
- [ ] **S2.29** Update manifest.json with enriched hashes

### D3 — AI, Security, DevOps (18 agents)

- [ ] **S2.30** Enrich all `ai/*.md` agents (6)
- [ ] **S2.31** Enrich all `security/*.md` agents (4)
- [ ] **S2.32** Enrich all `devops/*.md` agents (8)
- [ ] **S2.33** Run quality scoring on Phase D3 — verify >=3.5 average
- [ ] **S2.34** Update manifest.json with enriched hashes

### D4 — Web, Data-API, Docs (16 agents)

- [ ] **S2.35** Enrich all `web/*.md` agents (7)
- [ ] **S2.36** Enrich all `data-api/*.md` agents (5)
- [ ] **S2.37** Enrich all `docs/*.md` agents (4)
- [ ] **S2.38** Run quality scoring on Phase D4 — verify >=3.5 average
- [ ] **S2.39** Update manifest.json with enriched hashes

### D5 — Business, MCP, Primary (16 agents)

- [ ] **S2.40** Enrich all `business/*.md` agents (6)
- [ ] **S2.41** Enrich all `mcp/*.md` agents (4)
- [ ] **S2.42** Enrich primary agents: `cloud-architect.md`, `devops-engineer.md`, `fullstack-developer.md`, `episode-orchestrator.md`
- [ ] **S2.43** Enrich all-mode agent: `business/prd.md`
- [ ] **S2.44** Run quality scoring on ALL 70 agents — verify >=3.5 average
- [ ] **S2.45** Final manifest.json update with all enriched hashes

---

## Summary

| Release | Tasks | Estimated Effort |
|---------|-------|------------------|
| V6.0 — MVP | 39 tasks | 3-4 days |
| V6.1 — Lifecycle | 26 tasks | 3-4 days |
| V7.0 — Permissions | 38 tasks | 5-7 days |
| S2 — Enrichment | 45 tasks | 10-14 weeks |
| **Total** | **148 tasks** | — |

### Key Review Findings Incorporated

| ID | Finding | Resolution | Tasks Added/Modified |
|----|---------|------------|---------------------|
| F-01 | Flash message mechanism | Flash state + timer + rendering | S5.5, S5.6, S5.7 |
| F-02 | Action enum for uninstall | UNINSTALL in enum + x mapping | S6.5, S6.6 |
| F-03 | Migration for existing users | Bootstrap lock from installed agents | S3.13, S3.15 |
| SEC-01 | Write-only frontmatter | No YAML parser, regenerate from JSON | S4.2-S4.4 rewritten |
| MF-2 | Symlink protection | lstat+realpath+reject in uninstall | S6.1 modified |
| MF-3 | YOLO confirmation | Type CONFIRM (all perms → allow) | S4.32 modified |
| MF-5 | Input validation | SAFE_NAME_RE + action allowlist | S4.17 added |
| W-03 | State+reducer pattern | No PermissionEditor class | S4.21 rewritten |
| W-04 | Shared spinner constant | SPINNER_INTERVAL_MS in ansi.mjs | S1.8, S1.9 |
| W-08 | detectAgentStates() API | Map<id,state> + Set wrapper | S3.7, S3.8 |
| W-09 | XDG_CONFIG_HOME | Env-aware config path | S4.11 modified |
| R1 | Opt-in permissions | Default=skip, custom opens editor | S4.22, S4.29 modified |
| R2 | Footer hints mandatory | All new modes need hints | S6.11, S4.27 added |
| R7 | --all requires --force | Safety gate for bulk uninstall | S6.14 added |
| M-01 | Version bump per release | Release tasks added | V6.0-R1, V6.1-R1, V7.0-R1 |
