# Current Mission — Bug Fixes for TUI (Post-V7.0.0)

## Status: ✅ DONE (2026-02-23)

Two bugs fixed, acceptance tests written, security hardening applied after 2 review rounds. 671 tests pass, 0 failures. Ready for commit.

## Plan
1. [done] Explore codebase: renderer + agent detection logic
2. [done] Write acceptance tests for both bugs
3. [done] Fix bug 1: duplicate lines on TUI cursor movement
4. [done] Fix bug 2: local agents not detected
5. [done] Verify all tests pass
6. [done] Review round 1 — found 3 major + 3 minor security/correctness issues
7. [done] Fix review issues: symlink protection, lock key validation, verifyLockIntegrity paths, category guard, Windows paths
8. [done] Review round 2 — found 1 major (relativePath traversal) + 2 minor
9. [done] Fix round 2 issues: relativePath validation in isValidLockEntry + defense-in-depth in verifyLockIntegrity + SAFE_NAME_RE on scanned names
10. [pending] Git commit

## What Changed

### src/tui/screen.mjs (Bug 1 fix)
- Removed redundant CLEAR_LINE from flush() diff path (was causing double CLEAR_LINE → visual duplication)
- Removed unused CLEAR_LINE import

### src/lock.mjs (Bug 2 fix + security hardening)
- Added `resolveAgentPath()` — handles primary/all/subagent modes correctly
- Added `scanLocalAgents()` — recursive .md discovery with symlink protection + path containment
- Added `SAFE_NAME_RE` import + filtering in `readLock()` for lock key path traversal prevention
- Extended `LockEntry` with optional `relativePath` field
- `isValidLockEntry` validates relativePath (rejects `..`, `/`, `\` prefixes)
- `verifyLockIntegrity` uses relativePath with defense-in-depth containment check
- `rehashLock` and `bootstrapLock` store relativePath for locally-discovered agents
- `resolveAgentPath` guards against undefined category
- All path splits handle both `/` and `\` separators

### tests/screen-flush.test.mjs (NEW — 221 lines)
6 acceptance tests for Bug 1: no duplicate rows, exactly 1 CLEAR_LINE per changed line, symmetric navigation, no diff on identical frames, full redraw on resize, renderer CLEAR_LINE contract.

### tests/lock.test.mjs (+~390 lines added)
- Acceptance tests for Bug 2: manual .md detection, mode "all" paths, detectInstalledSet, coexistence
- Security tests: symlink skipping (3 tests), path traversal key filtering (3 tests), relativePath validation
- Correctness tests: relativePath stored by rehash/bootstrap, used by verify, backward compat fallback

### .opencode/agents/.manifest-lock.json
Auto-updated by lock system.

## Test Counts
- JS: 671 tests, 0 failures
- (Python: 311 tests, 0 failures, 1 expected skip — not re-run this round)

## Key Decisions
- Acceptance tests use REAL render()/flush()/state machine — no mocks
- Symlink protection: lstatSync + realpathSync containment (stronger than existing SEC-04 single-check)
- Lock key validation at readLock boundary — all consumers inherit protection
- relativePath stored as optional field for backward compat with old lock files
- Defense-in-depth: relativePath validated both in isValidLockEntry AND at verifyLockIntegrity point-of-use

## Git State
- Branch: main, 5 commits ahead of origin/main (not pushed)
- 4 modified files + 1 new file, all unstaged
