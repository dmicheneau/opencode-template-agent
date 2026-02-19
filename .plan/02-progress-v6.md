# V6 Progress

**Plan:** [00-plan-v6.md](00-plan-v6.md)
**Tasks:** [01-tasks-v6.md](01-tasks-v6.md)
**Updated:** 2026-02-19 (V6.0 Phase A: S1 ✅ S5 ✅ S3 core partial ✅)

---

## Release Progress

### V6.0 — MVP (S1 + S5 + S3 core)

| Section | Done | Total | % |
|---------|------|-------|---|
| S1: TUI Anti-Flicker | 10 | 11 | 91% |
| S5: Pack Fix + Flash | 10 | 10 | 100% |
| S3 core: Hash Detection | 9 | 17 | 53% |
| V6.0 Release Tasks | 0 | 3 | 0% |
| **V6.0 Total** | **29** | **39** | **74%** |

### V6.1 — Lifecycle (S6 + S3 extras)

| Section | Done | Total | % |
|---------|------|-------|---|
| S6: Agent Uninstall | 0 | 20 | 0% |
| S3 extras: CLI Flags | 0 | 6 | 0% |
| V6.1 Release Tasks | 0 | 3 | 0% |
| **V6.1 Total** | **0** | **26** | **0%** |

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
| V6.0 MVP | 29 | 39 | 74% | **In Progress** |
| V6.1 Lifecycle | 0 | 26 | 0% | Queued |
| V7.0 Permissions | 0 | 38 | 0% | Queued |
| S2 Enrichment | 0 | 45 | 0% | Queued |
| **Total** | **29** | **148** | **20%** | |

## Review Integration

- [x] Plan revised with 4 review findings (2026-02-19)
- [x] Release split V6.0/V6.1/V7.0 adopted (PM recommendation)
- [x] 12 new tasks added from reviews (F-01, F-02, F-03, MF-2, W-04, etc.)
- [x] 8 tasks modified based on review feedback (SEC-01, W-03, W-08, R1, etc.)
- [x] Begin V6.0 Phase A implementation
- [x] S1: TUI Anti-Flicker — DEC 2026 sync markers, line diffing, coalesced redraw, shared SPINNER_INTERVAL_MS
- [x] S5: Pack Fix + Flash — auto-select uninstalled, flash messages, confirmContext, 3s auto-dismiss
- [x] S3 core (partial): lock.mjs module, SHA-256 hashing, 4-state detection, lock I/O, migration bootstrap, 42 tests

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
