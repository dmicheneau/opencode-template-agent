# Plan V6 — Six Axes of Improvement

**Version:** 6.0
**Created:** 2026-02-18
**Updated:** 2026-02-19
**Status:** Active
**Previous:** [V5 (archived)](.plan/archive/v5/00-plan-v5.md)

---

## Overview

V6 addresses 6 critical improvement axes identified through multi-agent analysis.
Each axis was analyzed by a specialized subagent (performance, prompt engineering,
TypeScript architecture, security, UI design) to produce detailed technical designs.

**Post-review:** Plan revised based on 4 independent reviews (code-reviewer, security-auditor,
UX-designer, project-manager). Key changes: release split strategy, write-only permissions,
flash messages, migration support, symlink protection.

## Release Strategy

Following the PM recommendation, V6 is split into incremental releases:

| Release | Content | Tasks | Effort | Scope |
|---------|---------|-------|--------|-------|
| **V6.0** (MVP) | S1 anti-flicker + S5 pack fix + S3 core detection | ~36 | 3-4 days | Quick wins + foundation |
| **V6.1** | S6 uninstall (CLI+TUI) + S3 CLI extras | ~25 | 3-4 days | Lifecycle management |
| **V7.0** | S4 full permissions + YOLO | ~34 | 5-7 days | Security posture |
| **S2** (continuous) | Agent content enrichment | ~45 | 10-14 weeks | Parallel to all releases |
| **Total** | | **~140** | | |

Each release ships with:
- All existing tests passing (562: 385 JS + 177 Python)
- Version bump in package.json + install.sh
- CHANGELOG.md updated

## Axes Summary

| # | Axis | Severity | Effort | Impact |
|---|------|----------|--------|--------|
| S1 | TUI Anti-Flicker | High | S (1-2h) | Eliminates visual tearing |
| S2 | Agent Content Enrichment | High | XL (10-14w) | Dramatically better agent prompts |
| S3 | Hash-Based Update Detection | Medium | M (4-6h) | Users know when agents are outdated |
| S4 | Permission Modification + YOLO | Medium | L (5-7d) | Customizable security posture |
| S5 | Pack Installation Fix | High | S (2-3h) | Working pack install + user feedback |
| S6 | Agent Uninstall (CLI + TUI) | Medium | M (4-6h) | Clean agent management lifecycle |

---

## S1 — TUI Anti-Flicker

**Analyzed by:** Performance Engineer
**Release:** V6.0

### Root Causes (ranked)
1. **CRITICAL** — No synchronized terminal output: flush() writes 6.8-8.6KB frames that kernel can split
2. **HIGH** — Full frame rebuild every 80ms spinner tick (85KB/sec for 1-char change)
3. **MEDIUM** — No write coalescing (progress + spinner double-render)
4. **LOW** — CLEAR_TO_END stale gap on frame height reduction

### Solution — 3 Phases

**Phase 1 — Sync Output (5min, zero risk):**
Add DEC Private Mode 2026 markers (`\x1b[?2026h`/`\x1b[?2026l`) around flush.
Supported terminals hold render until complete. Unsupported terminals ignore silently.
Eliminates ~90% visible flicker.

**Phase 2 — Line-Level Diffing (30min, low risk):**
Store prevLines[] in screen.mjs, compare per-line, emit only changed lines with
cursor positioning. Add invalidate() for resize **and frame height changes** (W-10).
Renderer stays pure (untouched). 97.5% output reduction for spinner, 85KB/s → 5KB/s.

**Phase 3 — Write Coalescing (10min, very low risk):**
queueMicrotask-based deferred redraw. Spinner interval 80ms→120ms.
**Extract shared `SPINNER_INTERVAL_MS` constant** used by both renderer.mjs and index.mjs (W-04).
Total: 85KB/s → 3.3KB/s (25x reduction).

**Files:** screen.mjs (sync+diff), index.mjs (coalesce+spinner), renderer.mjs (divisor only), ansi.mjs (constant)

---

## S2 — Agent Content Enrichment

**Analyzed by:** Prompt Engineer
**Release:** Continuous (parallel to V6.0/V6.1/V7.0)

### Problem
Current 70 agent prompts are bullet-point lists of features/frameworks. They tell
agents WHAT to know, not HOW to work. No exploitation of OpenCode features (steps,
options, color, description, granular permissions).

### Solution

**Universal Template** with enforced sections:
- Identity & Expertise (REQUIRED)
- Workflow Protocol with conditional branches and tool references (REQUIRED)
- Decision-Making Framework with IF/THEN/ELSE logic (REQUIRED)
- OpenCode Tool Usage (REQUIRED)
- Quality Checklist (REQUIRED)

**5 Permission Archetypes:**
- Builder (fullstack, languages): read/edit/bash(patterns)/task allow
- Auditor (security, code-reviewer): read allow, edit/bash ask/deny
- Analyst (data, business): read/codesearch allow, edit ask
- Orchestrator (primary agents): broad access, doom_loop allow
- Specialist (docs, mcp): targeted permissions per domain

**10 Category Colors** (WCAG AA): Semantic hue families for UI differentiation.

**Enrichment Roadmap:** 3-4 phases, 5-7 agents/week over 10-14 weeks.
Priority: languages & devtools first (highest usage + gap severity).

**Sync Pipeline:** Add YAML schema validation, template conformance checks, quality scoring.

---

## S3 — Hash-Based Update Detection

**Analyzed by:** TypeScript Architecture Expert
**Release:** V6.0 (core) + V6.1 (CLI extras)

### Problem
`detectInstalled()` only checks `existsSync()`. Updated upstream agents show checkmark (installed)
but have stale content. No way to detect or update selectively.

### Solution

**Lock File** `.opencode/agents/.manifest-lock.json`:
```json
{
  "version": 1,
  "generatedAt": "2026-02-18T14:30:00Z",
  "agents": {
    "agent-id": {
      "sha256": "64-hex-chars",
      "installedAt": "2026-02-18T14:30:00Z",
      "sourceUrl": "https://...",
      "size": 12480
    }
  }
}
```

**4 Agent States:** current (checkmark green), outdated (up-arrow yellow), not-installed (blank), unknown (? gray)

**New module `lock.mjs`:** computeHash, readLockFile, writeLockFile, upsertLockEntry, removeLockEntry.
Atomic writes via tmp+rename. Corrupted JSON → warning visible + backup + empty lock (MF-4).

**Registry:** manifest.json v2 adds **optional** `sha256` + `size` per agent (W-02: fields optional
to avoid breaking existing test fixtures using makeManifest()). Pre-computed in Python sync.

**Detection API (W-08):** New `detectAgentStates()` returns Map<id, state>. Existing
`detectInstalled()` wraps it as backward-compatible Set<id> for code that only needs boolean.

**CLI (V6.1):** `--update` (reinstall outdated only), `--rehash` (rebuild lock from disk; skip
agents not in manifest — M-07), `--verify` (tamper check).

**Performance:** <5ms startup overhead (one JSON read + string comparisons). Zero file hashing at startup.

**Migration (F-03):** On first run, detect installed agents without lock file, bootstrap lock
entries with "unknown" state. Users see `?` indicator until next install/update resolves state.
Graceful degradation: full → partial → minimal → fallback (existsSync only).

**Cache (M-05):** Invalidate registry.mjs singleton cache when manifest version changes.

---

## S4 — Permission Modification + YOLO Mode

**Analyzed by:** Security Engineer
**Release:** V7.0

### Problem
Agents have hardcoded permissions. No way to customize at install time. No YOLO mode.

### Solution

**4 Presets** (all 17 permissions defined):
- `strict` — Most deny/ask, no bash/task
- `balanced` — OpenCode defaults + per-role bash patterns
- `permissive` — Most allow, bash with safe patterns, external_directory ask
- `yolo` — ALL permissions set to `allow` (sets every permission to allow for maximum autonomy)

**Write-Only Frontmatter Approach (SEC-01 MF-1):**
~~Custom YAML parser~~ → **Regenerate entire frontmatter from JSON structure.**
No custom YAML parsing = no parser differential risk. Read existing content after `---` markers,
rebuild permission block entirely from the resolved permission set, write back.
Round-trip: read frontmatter boundaries → build new permission YAML from JSON → splice back.

**TUI Flow (R1: opt-in only):**
Default: install with agent's built-in permissions (no permission screen).
Only when user selects "Custom" preset does the permission editor appear.
Flow: preset selector (skip=default, strict, balanced, permissive, yolo, custom) →
if custom: per-agent permission editor (up/down navigate, left/right cycle) → bash pattern sub-editor.

**Permission Editor Architecture (W-03):**
~~PermissionEditor class~~ → **State + reducer pattern** (consistent with existing TUI architecture).
`createPermissionState()` + `updatePermission()` pure reducer.

**CLI:** `--yolo`, `--permissions <preset>`, `--permission-override [agent:]perm=action`,
`--save-permissions`, `--no-saved-permissions`

**Persistence (W-09):** `${XDG_CONFIG_HOME || '~/.config'}/opencode/permission-preferences.json`
(0o600, atomic write, schema validation). YOLO never persisted as default.

**YOLO Confirmation:**
YOLO mode sets ALL 17 permissions to `allow`. Requires typing `CONFIRM` to activate.
This is a permission convenience preset, not a security bypass — it simply removes all
interactive permission prompts for users who want full autonomy.

**Input Validation (MF-5):** All permission override values validated against SAFE_NAME_RE +
action allowlist (`allow`, `ask`, `deny`).

**Security:** 4-level warning system (CRITICAL/HIGH/MEDIUM/INFO), bordered display,
confirmation prompts. Defense in depth: source audit → configuration → runtime → recoverability.

**Hash Documentation (MF-6):** Document that S3 hashes are for change detection only,
not supply chain security verification.

**Mandatory Footer Hints (R2):** Every new TUI mode MUST include footer hint bar showing
available key bindings.

**Implementation:** ~7 new files in `src/permissions/`, 4 sub-phases, ~50 tests.

---

## S5 — Pack Installation Fix

**Analyzed by:** UI Designer
**Release:** V6.0

### Problem
In TUI pack_detail, Enter with no selection is a no-op. Users expect Enter to install
all pack agents, but must manually press `a` (Select All) first.

### Fix
When Enter is pressed in pack_detail with `selection.size === 0`:
1. Auto-select ALL uninstalled agents in the pack
2. Transition to confirm with `confirmContext` ("Install pack X (N agents)?")
3. Edge cases: pack with all installed → show flash message

**Flash Message Mechanism (F-01):**
New flash state field with auto-dismiss timer. Used for transient feedback:
- "All agents already installed" (pack all-installed)
- "N agents uninstalled" (after uninstall)
- "Lock file rebuilt" (after --rehash)
Rendered in info bar area, auto-clears after 3 seconds.

**Files:** state.mjs (handleConfirm + flash state), renderer.mjs (confirm context + flash rendering),
index.mjs (flash timer management)

---

## S6 — Agent Uninstall

**Analyzed by:** UI Designer
**Release:** V6.1

### Problem
No uninstall capability exists anywhere (installer, CLI, TUI).

### Solution

**CLI:** `opencode-agents uninstall <name>`, `--pack`, `--category`, `--all` (requires `--force`),
`--dry-run`, `--force`

**TUI (W-06: follow design doc):**
`x` key → uninstall mode → shows installed agents → Space to select → Enter to confirm →
"Remove N agents? [y/N]" → uninstalling → done.
Modes: `uninstall_confirm`, `uninstalling` (no separate `uninstall_browse` — reuse browse with filter).

**Action Enum (F-02):** Add `UNINSTALL` to Action enum in input.mjs. Map `x` key → UNINSTALL action.

**Installer:** `uninstallAgent()` (delete file, clean empty dirs, update lock), `uninstallAgents()` batch.

**Security — Symlink Protection (MF-2):**
Before any unlink/write operation: `lstat()` to check for symlinks, `realpath()` to resolve,
**reject if target is a symlink** or resolves outside the agents directory.
Path traversal security + ENOENT handling.

**Status Bar (M-06):** Update status bar hints when in uninstall mode to show available actions.

**Implementation:** ~400-500 lines across 9 files, independently committable steps.

---

## Sequencing

```
V6.0 — MVP (3-4 days)
├── S1: TUI Anti-Flicker (all 3 phases)
├── S5: Pack Installation Fix + Flash Messages
└── S3 core: Lock module + detection + manifest v2 + migration

V6.1 — Lifecycle (3-4 days)
├── S6: Agent Uninstall (CLI + TUI) — requires S3 lock.mjs from V6.0
└── S3 extras: --update, --rehash, --verify CLI flags

V7.0 — Permissions (5-7 days)
├── S4: Write-only frontmatter + all presets + YOLO
├── S4: TUI Permission Editor (opt-in, state+reducer)
└── S4: Persistence (XDG_CONFIG_HOME)

S2 — Content Enrichment (10-14 weeks, parallel to all releases)
├── Template design + sync pipeline changes
├── Phase 1 — languages + devtools (20 agents)
├── Phase 2 — ai + security + devops (18 agents)
├── Phase 3 — web + data-api + docs (16 agents)
└── Phase 4 — business + mcp + primary (16 agents)
```

### Dependency Graph

```
S3.1-S3.4 (lock.mjs) ──→ S6.1 (uninstallAgent needs lock)
S3.1-S3.4 (lock.mjs) ──→ S3.11-S3.14 (CLI flags need lock)
S5 (flash) ──→ S6 (reuses flash for "N agents uninstalled")
S3 (manifest v2 hashes) ◇──→ S2 (each enrichment batch invalidates hashes — coordinate)
```

## Review Findings Integration

**4 reviews completed 2026-02-18:**
- Code Reviewer: 7.5/10 — 7 PASS, 10 WARN, 3 FAIL, 8 MISSING
- Security Auditor: 7.2/10 — 1 Critical, 3 High, 5 Medium, 4 Low, 2 Info
- UX Designer: 6.5/10 — 2 Critical, 5 other recommendations
- Project Manager: 6/10 — recommended release split

**Findings addressed in this revision:**

| Finding | Source | Resolution |
|---------|--------|------------|
| F-01 Flash mechanism | Code Review | Added S5.7-S5.9 |
| F-02 Action enum | Code Review | Added S6.18 |
| F-03 Migration | Code Review | Added S3.19-S3.20 |
| W-01 S3→S6 dependency | Code Review | Enforced by V6.0→V6.1 split |
| W-02 Optional sha256/size | Code Review | Noted in S3.5 |
| W-03 State+reducer | Code Review | S4.20 modified |
| W-04 SPINNER_INTERVAL_MS | Code Review | Added S1.11 |
| W-06 No uninstall_browse | Code Review | S6.6 simplified |
| W-08 detectAgentStates() | Code Review | S3.7 modified |
| W-09 XDG_CONFIG_HOME | Code Review | S4.11 modified |
| W-10 invalidate() scope | Code Review | S1.5 modified |
| SEC-01 Write-only (MF-1) | Security | S4.2-S4.4 rewritten |
| SEC-04 Symlink (MF-2) | Security | Added to S6.1 |
| SEC-03 YOLO confirm (MF-3) | Security | CONFIRM typing required |
| SEC-05 Lock corruption (MF-4) | Security | Warning + re-verify |
| SEC-06 Input validation (MF-5) | Security | Added S4.33 |
| SEC-02 Hash docs (MF-6) | Security | Documented in S3 |
| R1 Opt-in permissions | UX | S4.27 modified |
| R2 Footer hints | UX | Mandatory constraint added |
| M-01 Version bump | Code Review | Added per-release task |
| M-05 Cache invalidation | Code Review | Added to S3 notes |
| M-06 Status bar hints | Code Review | Added to S6 |
| PM release split | PM | V6.0/V6.1/V7.0 adopted |

**Findings deferred:**
- M-02 (--update in TUI): deferred post-V6.1
- M-08 (accessibility badges): deferred to S2 enrichment
- R4 (group permissions by risk): deferred to V7.0 refinement
- R8 (--dry-run for install): deferred post-V7.0
- R9 (? help overlay): deferred post-V7.0

## Constraints

- Zero npm dependencies — Node.js 20+ ESM
- Python stdlib only for sync scripts
- All 562 tests (385 JS + 177 Python) must pass at each release
- `permission:` only (never `tools:`)
- Atomic file writes for lock file and permission modifications
- **Footer hints mandatory** for every new TUI mode (R2)
- **Version bump required** in package.json + install.sh for each release (M-01)
