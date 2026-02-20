# V6 Progress

**Plan:** [00-plan-v6.md](00-plan-v6.md)
**Tasks:** [01-tasks-v6.md](01-tasks-v6.md)
**Updated:** 2026-02-20 (S7 agent separation plan finalized v2.1, ready for execution)

---

## Release Progress

### S7 — Agent Separation (2026-02-20)
- Migrated 72 agent files from `.opencode/agents/` to `agents/` (68 category + 4 root)
- Added `source_path: "agents"` to manifest.json with fallback `source_path || base_path`
- Updated src/, scripts/, CI/CD, install.sh, tests
- 7 new tests for source_path behavior (635 JS + 238 Python = 873 total)

### V6.0 — MVP (S1 + S5 + S3 core)

| Section | Done | Total | % |
|---------|------|-------|---|
| S1: TUI Anti-Flicker | 10 | 11 | 91% |
| S5: Pack Fix + Flash | 10 | 10 | 100% |
| S3 core: Hash Detection | 10 | 17 | 59% |
| V6.0 Release Tasks | 0 | 3 | 0% |
| **V6.0 Total** | **30** | **39** | **77%** |

### V6.1 — Lifecycle (S6 + S3 extras)

| Section | Done | Total | % |
|---------|------|-------|---|
| S6: Agent Uninstall | 20 | 20 | 100% |
| S3 extras: CLI Flags | 6 | 6 | 100% |
| V6.1 Release Tasks | 3 | 3 | 100% |
| Post-release CR Hardening | 4 | 4 | 100% |
| Code Review Major Fixes | 8 | 8 | 100% |
| Code Review Minor/Low Fixes | 5 | 5 | 100% |
| **V6.1 Total** | **46** | **46** | **100%** |

### V7.0 — Permissions (S4) ✅

| Section | Done | Total | % |
|---------|------|-------|---|
| C1: Foundation | 8 | 8 | 100% |
| C2: CLI & Resolution | 12 | 12 | 100% |
| C3: TUI Editor | 8 | 8 | 100% |
| C4: Integration | 7 | 7 | 100% |
| V7.0 Release Tasks | 3 | 3 | 100% |
| Post-release CR2 (16 issues) | 16 | 16 | 100% |
| **V7.0 Total** | **54** | **54** | **100%** |

### S2 — Content Enrichment (continuous)

| Section | Done | Total | % |
|---------|------|-------|---|
| D1: Template & Infrastructure | 9 | 9 | 100% |
| D1: Post-D1 Code Review (CR3) | 1 | 1 | 100% |
| D2: Languages & DevTools | 0 | 20 | 0% |
| D3: AI, Security, DevOps | 0 | 5 | 0% |
| D4: Web, Data-API, Docs | 0 | 5 | 0% |
| D5: Business, MCP, Primary | 0 | 6 | 0% |
| **S2 Total** | **10** | **46** | **22%** |

### S7 — Agent Separation

| Section | Done | Total | % |
|---------|------|-------|---|
| S7: Agent Separation | 6 | 6 | 100% |
| **S7 Total** | **6** | **6** | **100%** |

---

## Overall

| Release | Done | Total | % | Status |
|---------|------|-------|---|--------|
| V6.0 MVP | 30 | 39 | 77% | **In Progress** |
| V6.1 Lifecycle | 46 | 46 | 100% | **Done** |
| V7.0 Permissions | 54 | 54 | 100% | **Done** |
| S2 Enrichment | 10 | 46 | 22% | **In Progress — D2 next** |
| S7 Agent Separation | 6 | 6 | 100% | **Done** |
| **Total** | **146** | **191** | **76%** | |

## Review Integration

- [x] Plan revised with 4 review findings (2026-02-19)
- [x] Release split V6.0/V6.1/V7.0 adopted (PM recommendation)
- [x] 12 new tasks added from reviews (F-01, F-02, F-03, MF-2, W-04, etc.)
- [x] 8 tasks modified based on review feedback (SEC-01, W-03, W-08, R1, etc.)
- [x] Begin V6.0 Phase A implementation
- [x] S1: TUI Anti-Flicker — DEC 2026 sync markers, line diffing, coalesced redraw, shared SPINNER_INTERVAL_MS
- [x] S5: Pack Fix + Flash — auto-select uninstalled, flash messages, confirmContext, 3s auto-dismiss
- [x] S3 core (partial): lock.mjs module, SHA-256 hashing, 4-state detection, lock I/O, migration bootstrap, 42 tests
- [x] S6: Agent Uninstall — TUI + CLI + symlink protection, 40 new tests
- [x] S3 extras: --update, --verify, --rehash CLI commands, 24 new tests
- [x] V6.1 Release: version bump 6.0.0, CHANGELOG, 537 tests passing
- [x] Post-release code review hardening (commit 127e098): C-1 atomic lock writes, C-2 download destroyed flag, C-3 scoped CLI flags, SEC-01 TOCTOU minimization — 544 tests passing (367 JS + 177 Python)
- [x] Code review Major fixes (commit 8470601): M-1/M-5/M-6 lock hardening (getLockPath base_path, readLock corruption warning, isValidLockEntry), M-2/M-4 installer isolation (removeLockEntry failure, batch uninstall per-agent), M-1/M-2/M-5 TUI fixes (renderDone viewport scroll, dynamic import try block, paste multi-chars in search) — 562 tests passing (385 JS + 177 Python)
- [x] Code review Minor/Low fixes (commit e18d2d5): TUI M-3 dead imports in state.mjs, TUI M-4 JSDoc on parseKey, CLI M-1 --flag=value normalization, CLI M-2 unknown flag warnings, CLI M-3 resolveAgentOrExit() DRY helper — 571 tests passing (394 JS + 177 Python). **ALL 21 code review issues now resolved** (3 Critical, 1 High, 12 Major, 5 Minor).
- [x] V7.0 C1 Foundation: presets.mjs (17 permissions, 4 presets, ACTION_ALLOWLIST), writer.mjs (readFrontmatterBoundaries, buildPermissionYaml, spliceFrontmatter — SEC-01 write-only), warnings.mjs (4-level warning system, displayWarning)
- [x] V7.0 C2 CLI & Resolution: cli.mjs (parsePermissionFlags, parseOverrideSpec, SAFE_NAME_RE validation — MF-5), resolve.mjs (layered precedence: built-in < saved < CLI preset < overrides), persistence.mjs (XDG_CONFIG_HOME — W-09, 0o600, atomic write, yolo persistence blocked)
- [x] V7.0 C3 TUI Permission Editor: createPermissionState + updatePermission pure reducer (W-03), preset selector (skip/strict/balanced/permissive/yolo/custom — R1 opt-in), per-agent permission editor, bash pattern sub-editor, security warnings inline, "Apply to all agents", footer hints (R2)
- [x] V7.0 C4 Integration: permission step in install flow (opt-in — R1), installAgent applies permissions, TUI confirm dialog shows permission summary, YOLO gated with CONFIRM typing (MF-3), S3 hash documentation (MF-6)
- [x] V7.0 Release: version bump 7.0.0 (package.json + install.sh), 805 tests passing (628 JS + 177 Python)
- [x] V7.0 Post-release code review (CR2 — 16 issues): C-1 parsePermissionFlags --flag=value normalization, H-1 cmdUpdate permissions propagation, H-2 basePath in recordInstall/removeLockEntry, H-3 byline→subagent default mode, M-1 quoteKey alignment JS/Python, M-2 Esc permission-edit→preset-select, M-3 viewport overflow with inline warnings, M-4 CATEGORY_MAP alignment, M-5 comment fix, M-6 cache 304/404 distinction, L-1 dead flags removed, L-2 dead code removed, L-3 o/O hint added, L-4 padEndAscii, L-5 atomic write_manifest, L-6 symlink check in cache removal — 805 tests passing
- [x] S2 D1 Template & Infrastructure (9/9): universal agent template structure (Identity/Workflow/Decision/Tools/Quality), 5 permission archetypes (Builder/Auditor/Analyst/Orchestrator/Specialist), 10 category colors (WCAG AA), quality scoring rubric (8 dimensions, 1-5 scale), sync pipeline enrichment (YAML schema validation, template conformance, quality score computation), tests for sync pipeline changes
- [x] S2 D1 Code Review CR3 (commit 657cae4): 29 issues fixed (12 code + 17 design docs), 866 tests passing (628 JS + 238 Python). **D1 infrastructure validated — ready for D2 enrichment phase.**
- [x] S7 Agent Separation plan (v2.1 — 2 review rounds): product agents in `.opencode/agents/` conflicted with OpenCode's active agent directory → silent write failures. Solution: move to `agents/` at root, split `manifest.json` `base_path` into `source_path` (GitHub repo) + `base_path` (local install destination). Key discovery: `base_path` was overloaded for both download and install. Deployment sequence: merge first, npm publish after (~5-10 min risk window). Full plan in `.plan/07-agent-separation.md`. **Plan ready, execution not started. Est. ~3h.**

**Backlog (remaining V6.0 S3 core tasks):** S3.4 (corrupted JSON recovery), S3.5 (manifest sha256/size fields), S3.6 (Python sync hashes), S3.9-S3.10 (TUI state indicators), S3.12 (cache invalidation), S3.16 (Python sync tests)

## Timeline Estimate

| Release | Start | Duration | End (est.) |
|---------|-------|----------|------------|
| V6.0 | TBD | 3-4 days | — |
| V6.1 | V6.0+1 | 3-4 days | — |
| V7.0 | V6.1+1 | 5-7 days | — |
| S2 | Parallel | 10-14 weeks | — |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-19 | Split V6 into V6.0/V6.1/V7.0 | PM review: reduce risk, ship incrementally |
| 2026-02-19 | Write-only frontmatter (no YAML parser) | SEC-01 Critical: eliminate parser differential risk |
| 2026-02-19 | YOLO = all permissions allow + CONFIRM | Clarification: convenience preset, not security bypass |
| 2026-02-19 | Permission screen opt-in only | UX R1: default=skip, only custom opens editor |
| 2026-02-19 | Footer hints mandatory for new modes | UX R2: consistent discoverability |
| 2026-02-19 | Symlink protection in uninstall | SEC-04 High: lstat+realpath before unlink |
| 2026-02-19 | State+reducer for permissions (no class) | W-03: consistent with existing TUI architecture |
| 2026-02-19 | XDG_CONFIG_HOME for persistence | W-09: respect platform conventions |
| 2026-02-19 | Ship CR hardening post-V6.1 release | 4 fixes (C-1, C-2, C-3, SEC-01), remaining Major/Minor issues in backlog |
| 2026-02-19 | Ship CR Major fixes post-hardening | 8 fixes (lock M-1/M-5/M-6, installer M-2/M-4, TUI M-1/M-2/M-5), 562 tests |
| 2026-02-20 | Move product agents from `.opencode/agents/` to `agents/` | S7: conflicts with OpenCode's active agent dir, silent write failures |
| 2026-02-20 | Split `base_path` into `source_path` + `base_path` | S7: single field was overloaded for GitHub download and local install |
| 2026-02-20 | Merge-first deploy sequence for S7 | ~5-10 min risk window acceptable vs. coordinated atomic deploy complexity |
