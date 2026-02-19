# V6 Progress

**Plan:** [00-plan-v6.md](00-plan-v6.md)
**Tasks:** [01-tasks-v6.md](01-tasks-v6.md)
**Updated:** 2026-02-19 (V6.1 Release: S6 ✅ S3 extras ✅ + Post-release CR hardening ✅ + Major CR fixes ✅ + Minor/Low CR fixes ✅ — ALL 21 CR issues resolved)

---

## Release Progress

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

### V7.0 — Permissions (S4)

| Section | Done | Total | % |
|---------|------|-------|---|
| C1: Foundation | 0 | 8 | 0% |
| C2: CLI & Resolution | 0 | 12 | 0% |
| C3: TUI Editor | 0 | 8 | 0% |
| C4: Integration | 0 | 7 | 0% |
| V7.0 Release Tasks | 0 | 3 | 0% |
| **V7.0 Total** | **0** | **38** | **0%** |

### S2 — Content Enrichment (continuous)

| Section | Done | Total | % |
|---------|------|-------|---|
| D1: Template & Infrastructure | 0 | 9 | 0% |
| D2: Languages & DevTools | 0 | 20 | 0% |
| D3: AI, Security, DevOps | 0 | 5 | 0% |
| D4: Web, Data-API, Docs | 0 | 5 | 0% |
| D5: Business, MCP, Primary | 0 | 6 | 0% |
| **S2 Total** | **0** | **45** | **0%** |

---

## Overall

| Release | Done | Total | % | Status |
|---------|------|-------|---|--------|
| V6.0 MVP | 30 | 39 | 77% | **In Progress** |
| V6.1 Lifecycle | 46 | 46 | 100% | **Done** |
| V7.0 Permissions | 0 | 38 | 0% | Queued |
| S2 Enrichment | 0 | 45 | 0% | Queued |
| **Total** | **76** | **168** | **45%** | |

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
