# Plan V6 — Six Axes of Improvement

**Version:** 6.0
**Created:** 2026-02-18
**Status:** Active
**Previous:** [V5 (archived)](.plan/archive/v5/00-plan-v5.md)

---

## Overview

V6 addresses 6 critical improvement axes identified through multi-agent analysis.
Each axis was analyzed by a specialized subagent (performance, prompt engineering,
TypeScript architecture, security, UI design) to produce detailed technical designs.

## Axes Summary

| # | Axis | Severity | Effort | Impact |
|---|------|----------|--------|--------|
| S1 | TUI Anti-Flicker | High | S (1-2h) | Eliminates visual tearing |
| S2 | Agent Content Enrichment | High | XL (10-14w) | Dramatically better agent prompts |
| S3 | Hash-Based Update Detection | Medium | M (4-6h) | Users know when agents are outdated |
| S4 | Permission Modification + YOLO | Medium | L (2-3d) | Customizable security posture |
| S5 | Pack Installation Fix + Uninstall | High | M (4-6h) | Working pack install + agent removal |
| S6 | Agent Uninstall (CLI + TUI) | Medium | M (4-6h) | Clean agent management lifecycle |

---

## S1 — TUI Anti-Flicker

**Analyzed by:** Performance Engineer

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
cursor positioning. Add invalidate() for resize. Renderer stays pure (untouched).
97.5% output reduction for spinner, 85KB/s → 5KB/s.

**Phase 3 — Write Coalescing (10min, very low risk):**
queueMicrotask-based deferred redraw. Spinner interval 80ms→120ms.
Total: 85KB/s → 3.3KB/s (25x reduction).

**Files:** screen.mjs (sync+diff), index.mjs (coalesce+spinner), renderer.mjs (divisor only)

---

## S2 — Agent Content Enrichment

**Analyzed by:** Prompt Engineer

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

### Problem
`detectInstalled()` only checks `existsSync()`. Updated upstream agents show ✓ (installed)
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

**4 Agent States:** current (✓ green), outdated (↑ yellow), not-installed (blank), unknown (? gray)

**New module `lock.mjs`:** computeHash, readLockFile, writeLockFile, upsertLockEntry, removeLockEntry.
Atomic writes via tmp+rename. Corrupted JSON → backup + empty lock.

**Registry:** manifest.json v2 adds `sha256` + `size` per agent (pre-computed in Python sync).

**CLI:** `--update` (reinstall outdated only), `--rehash` (rebuild lock from disk), `--verify` (tamper check).

**Performance:** <5ms startup overhead (one JSON read + string comparisons). Zero file hashing at startup.

**Migration:** Graceful degradation: full → partial → minimal → fallback (existsSync only).

---

## S4 — Permission Modification + YOLO Mode

**Analyzed by:** Security Engineer

### Problem
Agents have hardcoded permissions. No way to customize at install time. No YOLO mode.

### Solution

**4 Presets** (all 17 permissions defined):
- `strict` — Most deny/ask, no bash/task
- `balanced` — OpenCode defaults + per-role bash patterns
- `permissive` — Most allow, bash with safe patterns, external_directory ask
- `yolo` — ALL allow (requires typing 'yolo' to confirm)

**YAML Frontmatter Parser** (`src/permissions/parser.js`):
Surgical line-based splice — only replaces permission block, preserves everything else.
Round-trip fidelity: parse → modify → serialize → parse = expected.

**TUI Flow:** Preset selector → Per-agent permission editor (↑↓ navigate, ←→ cycle) → Bash pattern sub-editor.

**CLI:** `--yolo`, `--permissions <preset>`, `--permission-override [agent:]perm=action`,
`--save-permissions`, `--no-saved-permissions`

**Persistence:** `~/.config/opencode/permission-preferences.json` (0o600, atomic write, schema validation).
YOLO never persisted as default.

**Security:** 4-level warning system (CRITICAL/HIGH/MEDIUM/INFO), bordered display,
confirmation prompts. Defense in depth: source audit → configuration → runtime → recoverability.

**Implementation:** 7 new files in `src/permissions/`, 4 phases, ~50 tests.

---

## S5 — Pack Installation Fix

**Analyzed by:** UI Designer

### Problem
In TUI pack_detail, Enter with no selection is a no-op. Users expect Enter to install
all pack agents, but must manually press `a` (Select All) first.

### Fix
When Enter is pressed in pack_detail with `selection.size === 0`:
1. Auto-select ALL uninstalled agents in the pack
2. Transition to confirm with `confirmContext` ("Install pack X (N agents)?")
3. Edge cases: pack with all installed → show message, mixed → select only uninstalled

**Files:** state.mjs (handleConfirm in pack_detail), renderer.mjs (confirm context display)

---

## S6 — Agent Uninstall

**Analyzed by:** UI Designer

### Problem
No uninstall capability exists anywhere (installer, CLI, TUI).

### Solution

**CLI:** `opencode-agents uninstall <name>`, `--pack`, `--category`, `--all`, `--dry-run`, `--force`

**TUI:** `x` key → uninstall mode → shows installed agents → Space to select → Enter to confirm →
"Remove N agents? [y/N]" → uninstalling → done. Two new modes: `uninstall_confirm`, `uninstalling`.

**Installer:** `uninstallAgent()` (delete file, clean empty dirs, update lock), `uninstallAgents()` batch.
Path traversal security, ENOENT handling.

**Implementation:** ~400-500 lines across 9 files, independently committable steps.

---

## Sequencing

```
Phase A — Quick Wins (1 day)
├── S1: TUI Anti-Flicker (all 3 phases)
└── S5: Pack Installation Fix

Phase B — Core Features (2-3 days)
├── S3: Hash-Based Detection
├── S6: Agent Uninstall (CLI + TUI)
└── S4: Permission Presets (balanced only, no TUI editor yet)

Phase C — Full Permissions (2-3 days)
├── S4: YAML Parser + all presets + YOLO
├── S4: TUI Permission Editor
└── S4: Persistence

Phase D — Content Enrichment (10-14 weeks, parallel)
├── S2: Template design + sync pipeline changes
├── S2: Phase 1 — languages + devtools (20 agents)
├── S2: Phase 2 — ai + security + devops (18 agents)
├── S2: Phase 3 — web + data-api + docs (16 agents)
└── S2: Phase 4 — business + mcp + primary (16 agents)
```

## Constraints

- Zero npm dependencies — Node.js 20+ ESM
- Python stdlib only for sync scripts
- All 427 tests (250 JS + 177 Python) must pass at each phase
- `permission:` only (never `tools:`)
- Atomic file writes for lock file and permission modifications
