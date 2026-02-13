# Product Review — Plan V2: Skills Sync + CI Automatisée

> **Reviewer**: Product Manager (AI)
> **Date**: 2026-02-13
> **Scope**: Deep codebase audit + plan analysis across 8 dimensions
> **Verdict**: **APPROVE with 8 adjustments** — strategically sound, operationally ambitious

---

## Executive Summary

Plan V2 makes the right strategic bet: integrating 686 upstream skills as OpenCode Skills (not agents) is architecturally correct and expands user value without degrading the existing experience. The plan is well-structured, the decisions are sound, and the technical design doc is thorough.

However, the plan is **over-engineered for a v1 skills launch**. The 5-factor scoring system, full CI automation, and 3-tier curation model introduce complexity before you have any user signal on skill adoption. I recommend a leaner path to first value, then iterating with data.

**Key number**: Plan V1 shipped 49 agents + CLI + CI + 176 tests. That's a proven execution track record. Plan V2 can build on this — but should ship smaller, sooner.

---

## 1. Strategic Alignment ✅ STRONG

### What's right
- **The agent/skill semantic split is correct.** Agents = "who you are" (persona). Skills = "how to do X" (methodology). This maps perfectly to OpenCode's architecture where agents are always-loaded and skills are on-demand via the `skill` tool.
- **686 agents would be catastrophic.** The current 43→49 agent list is already substantial. Adding 686 would make the `available_agents` context window explode. Skills' on-demand loading model avoids this entirely.
- **Format distance is minimal.** Source `SKILL.md` → target `SKILL.md` requires only frontmatter cleanup and path rewriting. Compare this to converting skills → agents, which would need complete persona rewriting.
- **4 existing hand-written skills prove the model works.** `brainstormai`, `memory`, `sequential-thinking`, and `browser-mcp` are already in `.opencode/skills/` and functioning. This isn't theoretical — you're extending a proven pattern.

### What's missing
- **No user demand signal.** The plan doesn't cite any user request, GitHub issue, or usage data suggesting people want more skills. Is this supply-push or demand-pull? For an open-source project with 0 documented users (the upstream has 20k+ stars but *your fork* has unknown adoption), this matters.
- **No competitive analysis.** Are other OpenCode registries emerging? Is aitmpl.com itself adding OpenCode-native support? If davila7 ships OpenCode skills natively, this project's differentiator shrinks.

### Recommendation
- Add a "Why now" section to the plan citing concrete demand signals (GitHub stars trend, issues, download counts if any, or at minimum a thesis on why supply-leading is correct here).

---

## 2. Scope Assessment ⚠️ AMBITIOUS — needs trimming

### Phase-by-phase effort estimate

| Phase | Plan estimate | My estimate | Risk |
|-------|--------------|-------------|------|
| Phase 4 (sync-skills.py + scoring + tests) | 4-5 sessions | **6-8 sessions** | 🔴 High — scoring alone is 1-2 sessions of subjective manual work for 686 items |
| Phase 5 (CI sync.yml) | 1-2 sessions | **3-4 sessions** | 🟡 Medium — the 949-line design doc reveals significant complexity |
| Phase 6 (CLI skills) | 2-3 sessions | **2-3 sessions** | 🟢 Low — mirrors existing agent install patterns |
| Phase 7 (Tier 2 + auto scoring) | 2-3 sessions | **2-3 sessions** | 🟢 Low — builds on Phase 4 foundation |

### The scoring problem (T4.2)
This is the single biggest scope risk. The 5-factor weighted scoring requires manually evaluating 686 skills across 5 dimensions:

```
Utility × 3 + Priority × 2 + Quality × 2 + Complementarity × 2 + Size × 1
```

- **Utility**: requires understanding what each skill does and how broadly applicable it is. 686 skills × ~2 min review = **~23 hours of manual work**.
- **Complementarity**: requires comparing each skill against the 49 existing agents. This is a matrix evaluation.
- **Quality**: requires reading each SKILL.md and assessing completeness. Many may be stubs.

**This is not a 1-session task.** It's a multi-day effort that produces a subjective, hard-to-reproduce result.

### The sync-skills.py complexity
The plan estimates 2-3 sessions. But comparing with `sync-agents.py` (1609 lines) and considering that skills add:
- Multi-file handling (directories, not single files)
- Path rewriting in body AND scripts
- Companion file classification (scripts/, templates/, data/)
- Scoring integration
- Multi-tier filtering

A more realistic estimate is **4-5 sessions** for a production-quality script with tests.

---

## 3. Phase Ordering 🔄 NEEDS ADJUSTMENT

### Current order
```
Phase 4 (sync + scoring) 🔴 → Phase 5 (CI) 🔴 → Phase 6 (CLI) 🟡 → Phase 7 (Extended) 🟡
```

### Recommended order
```
Phase 4 LITE (sync + manual pick) 🔴 → Phase 6 (CLI) 🔴 → Phase 5 (CI) 🟡 → Phase 7 (Extended + scoring) 🟡
```

### Rationale

| Change | Why |
|--------|-----|
| **Phase 4 → Phase 4 LITE** | Hand-pick 10-15 core skills instead of building the scoring system. Ship skills that work before building the scoring that picks them. |
| **Phase 6 before Phase 5** | Users get value from `npx opencode-agents install --skill X` before CI automation exists. CI is operational infrastructure; CLI is user-facing value. |
| **Phase 5 demoted to 🟡** | You can run `python3 scripts/sync-skills.py` manually for weeks/months before automating. Manual sync + PR is fine at this scale. |
| **Scoring moved to Phase 7** | By the time you build scoring, you'll have real usage data on which skills people actually install. Data-driven scoring > gut-feel scoring. |

### Time to first user value

| Approach | Sessions to first usable skill | Sessions to full Phase 4 |
|----------|-------------------------------|--------------------------|
| Current plan | ~8 (after scoring + tests) | ~8 |
| Recommended | **~3** (sync 15 skills + basic tests) | ~3 |

---

## 4. Risk Assessment 🔴 6 significant risks

### Risk 1: Scoring subjectivity (CRITICAL)
- **Impact**: The scoring formula has no empirical basis. "Utility = 10 vs 5" is a judgment call. Different reviewers would produce different tier assignments.
- **Probability**: Certain — this is inherent to the approach.
- **Mitigation**: Defer scoring to Phase 7. Start with a manually curated list of 10-15 obvious picks. Build scoring later informed by real usage data.

### Risk 2: Upstream dependency fragility (HIGH)
- **Impact**: Complete dependency on `davila7/claude-code-templates` repo structure. If they reorganize `cli-tool/components/skills/`, the sync breaks.
- **Probability**: Medium — active repos restructure periodically.
- **Mitigation**: Add upstream communication to the plan. Open an issue or PR on the upstream repo establishing the relationship. Pin to a known tree SHA as fallback.
- **Open question**: Has there been any communication with davila7? Do they know about this project?

### Risk 3: Multi-file complexity underestimated (HIGH)
- **Impact**: The brainstormai skill has **35 files** across a deeply nested directory structure (`workflows/create-prd/steps/step-07-complete.annexe.md`). The plan's file handling table (T4.1) is simplistic — 4 rules for `*.md`, `scripts/*.py`, `templates/*`, and "others".
- **Evidence**: brainstormai has `agents/`, `workflows/brainstorm/steps/`, `workflows/brainstorm/data/`, `workflows/brainstorm/templates/`, `workflows/create-prd/steps/`, `workflows/create-prd/templates/` — 6 different subdirectory types not covered by the 4 rules.
- **Mitigation**: Before building sync-skills.py, manually examine 5-10 upstream skills to validate the multi-file handling assumptions. The plan should have a "prototype step."

### Risk 4: No rollback strategy (MEDIUM)
- **Impact**: If a sync introduces broken skills (invalid SKILL.md, missing companion files, broken internal references), there's no documented way to revert.
- **Probability**: Low-medium — validation should catch most issues, but edge cases exist.
- **Mitigation**: Document a rollback procedure. Since sync creates PRs (not direct pushes), the main branch is protected. But add a `--clean` mode to sync-skills.py (like sync-agents.py has) that removes all synced skills.

### Risk 5: Context budget not validated (MEDIUM)
- **Impact**: T4.3 estimates "≤ 25 skills × 4 lines = ~100 lines in `available_skills`." But is 100 lines acceptable? Has this been tested with real OpenCode sessions?
- **Probability**: Unknown — no testing cited.
- **Mitigation**: Before building the full pipeline, manually create 25 stub skills and verify that OpenCode's `skill` tool lists them without context window issues.

### Risk 6: Code reuse unresolved (MEDIUM)
- **Impact**: `sync-agents.py` has significant reusable infrastructure: HTTP helpers with SafeRedirectHandler, frontmatter parsing, ETag/If-Modified-Since caching, path traversal protection, sync cache logic. The design doc (§15) explicitly flags this as an open question. Decision D3 says "separate script" but doesn't address shared code.
- **Probability**: Certain — you will duplicate code or extract shared modules.
- **Mitigation**: Decide NOW: `sync_common.py` shared module or accept code duplication. This affects the implementation architecture of T4.1.

---

## 5. User Value Assessment 📊

### Value delivery timeline (current plan)

| Phase | Direct user value | Wait time |
|-------|------------------|-----------|
| Phase 4 | LOW — skills exist on disk but only available if you know to use the `skill` tool and know the skill name | 6-8 sessions |
| Phase 5 | ZERO — CI is purely operational | +3-4 sessions |
| Phase 6 | HIGH — users can discover, search, and install skills via CLI | +2-3 sessions |
| Phase 7 | MEDIUM — broader catalog, auto-curation | +2-3 sessions |

**Total sessions to first HIGH-value delivery: ~12-15 sessions.**

### Value delivery timeline (recommended plan)

| Phase | Direct user value | Wait time |
|-------|------------------|-----------|
| Phase 4 LITE | MEDIUM — 15 high-quality skills immediately available | 3 sessions |
| Phase 6 | HIGH — CLI discoverability for skills | +2-3 sessions |
| Phase 5 | MEDIUM — automated freshness (operational) | +3-4 sessions |
| Phase 7 | MEDIUM — broader catalog with data-driven scoring | +2-3 sessions |

**Total sessions to first HIGH-value delivery: ~5-6 sessions.** That's a **2.5x improvement.**

---

## 6. Curation Critique ⚠️ Overthought for v1

### The 3-tier model
Conceptually sound: Core (installed by default), Extended (on-demand), Archive (source only). This mirrors how package managers work (featured vs all).

### The problems

1. **~25 core skills is a guess.** The plan says "~25" without empirical basis. Why not 10? Why not 50? The number should emerge from actual curation, not be set a priori.

2. **The scoring formula is unvalidated.** The 5-factor weighted scoring (utility 3×, priority 2×, quality 2×, complementarity 2×, size 1×) has no empirical basis. The weights are arbitrary. The scoring criteria descriptions are vague ("0=domain-specific, 5=most projects, 10=all" — who decides where "git workflow optimization" falls?).

3. **Manual scoring of 686 items is impractical.** Even at 2 minutes per skill, that's 23 hours of focused evaluation work. This is not a sustainable process.

4. **Category exclusions are well-chosen.** Excluding `railway` (12), `sentry` (6), `video` (4) = 22 skills is a good call. These are vendor-specific or niche.

### Better approach for v1

1. **Start with a manual pick list of 10-15 obvious high-value skills.** Categories like `development` (clean-code, testing patterns), `architecture` (design patterns, API design), and `devops` (CI/CD, Docker) are universally useful.
2. **Ship them.** Get real usage data.
3. **Build scoring in Phase 7** informed by actual install counts and user feedback.
4. **Let the tier boundaries emerge from data**, not from formula thresholds.

---

## 7. Missing Considerations 🕳️

### 7.1 Skill dependency management
The plan mentions rewriting `@[skills/other-skill]` → `Requires skill: other-skill` (T4.1). But what happens when a skill references another skill? Is there dependency resolution? Auto-install of dependencies? Or just a text note? This needs a decision.

### 7.2 Versioning strategy
When upstream updates a skill (new instructions, changed scripts), what happens to users who already installed it? Is there a version check? Update notification? Or just "re-install to get latest"? The agents handle this with the sync header, but skills have companion files that complicate updates.

### 7.3 Discoverability UX
How do users find the right skill? `npx opencode-agents search "testing"` will search by name/description, but skills are methodological — users might search by problem ("how to write better tests") not by skill name ("test-driven-development"). Is keyword search sufficient?

### 7.4 Upstream communication
The entire project depends on `davila7/claude-code-templates`. There's no mention of:
- Has there been any communication with the upstream maintainer?
- Do they know about this project?
- Are they open to PRs that would make syncing easier (e.g., standardized frontmatter)?
- What's the bus factor if the upstream goes dormant or changes license?

### 7.5 `.sync-state.json` vs `.sync-tree-sha` inconsistency
The design doc (sync-pipeline.md) uses a simple `.sync-tree-sha` marker file approach. The task list (T5.2) describes a more complex `.sync-state.json` with multiple fields. These need reconciliation — pick one.

### 7.6 Skill quality variance
The plan assumes all 686 upstream skills are usable. But:
- How many are stubs (< 20 lines)?
- How many have broken internal references?
- How many are duplicates or near-duplicates?
A quick audit of the upstream repo would answer this and inform the curation strategy.

### 7.7 No smoke test phase
After Phase 4, before building CLI support (Phase 6) or CI (Phase 5), you should manually use 5-10 synced skills in real OpenCode sessions. Do they actually help? Do the instructions make sense? Is the context budget acceptable? **Validate the product before scaling the pipeline.**

---

## 8. Concrete Recommendations 🎯

### R1: Cut T4.2 to a manual pick list (CRITICAL)
**Instead of**: Building a 5-factor scoring system and evaluating 686 skills.
**Do**: Hand-pick 10-15 core skills by browsing the upstream categories. Create a simple `CURATED_SKILLS` list in sync-skills.py (same pattern as `CURATED_AGENTS` in sync-agents.py).
**Why**: Faster to first value, eliminates the biggest scope risk, and you can build data-driven scoring later in Phase 7.

### R2: Swap Phase 5 and Phase 6 (HIGH)
**Instead of**: Building CI automation before CLI skills support.
**Do**: Ship `npx opencode-agents install --skill X` before building `sync.yml`.
**Why**: Users > Operations. You can run sync manually for weeks. CLI is user-facing value; CI is developer convenience.

### R3: Extract shared helpers NOW (HIGH)
**Instead of**: Leaving the code reuse question open until implementation.
**Do**: Create `scripts/sync_common.py` before starting sync-skills.py. Extract from sync-agents.py: HTTP helpers, frontmatter parsing, sync cache, path traversal checks, manifest generation patterns.
**Why**: Avoids code duplication. Makes both scripts more maintainable. The design doc flags this as an open question — close it.

### R4: Prototype before building (MEDIUM)
**Instead of**: Building the full sync pipeline and discovering edge cases late.
**Do**: Manually convert 3 upstream skills (1 simple, 1 with companion files, 1 complex like brainstormai-class) to validate assumptions about frontmatter mapping, multi-file handling, and path rewriting.
**Why**: 30 minutes of manual conversion reveals more issues than hours of speculative design.

### R5: Define scope for nested skill complexity (MEDIUM)
**Instead of**: The simplistic 4-rule file handling table in T4.1.
**Do**: Audit the upstream repo's skill directory structures. How many skills have deeply nested subdirectories? Decide: recursive copy of entire directory tree (simple but might bring unwanted files) vs. explicit file type rules (complex but controlled).
**Why**: brainstormai has 35 files in 6 subdirectory types. The plan's 4 rules don't cover `agents/`, `workflows/`, `data/`.

### R6: Add upstream communication (MEDIUM)
**Do**: Open a GitHub issue on `davila7/claude-code-templates` introducing this project. Ask about:
- Stability of the `cli-tool/components/skills/` path structure
- Interest in standardized frontmatter across skills
- Willingness to accept PRs that improve skill quality
**Why**: Reduces upstream dependency risk. May open collaboration opportunities.

### R7: Reconcile state file format (LOW)
**Do**: Pick one: `.sync-state.json` (task list T5.2) or `.sync-tree-sha` (design doc). I recommend `.sync-state.json` since it carries more useful metadata and supports the parallel agents/skills sync architecture.
**Why**: Inconsistency between plan and design doc will cause confusion during implementation.

### R8: Add a smoke test milestone (LOW)
**Do**: After Phase 4, before Phase 5/6, manually use 5 synced skills in real OpenCode sessions. Document: Do they work? Are the instructions clear? Does the `skill` tool load them correctly? Is the context budget acceptable?
**Why**: You're building a pipeline to produce skills. Validate the product before scaling the factory.

---

## Summary Decision Matrix

| # | Recommendation | Impact | Effort | Priority |
|---|---------------|--------|--------|----------|
| R1 | Manual pick list (kill scoring) | 🔴 Saves 6+ hours | 🟢 Negative (less work) | **DO FIRST** |
| R2 | Swap Phase 5 ↔ Phase 6 | 🔴 2.5× faster to user value | 🟢 Zero (reorder) | **DO FIRST** |
| R3 | Extract shared helpers | 🟡 Prevents tech debt | 🟡 1-2 hours | **BEFORE T4.1** |
| R4 | Prototype 3 skills manually | 🟡 Validates assumptions | 🟢 30 min | **BEFORE T4.1** |
| R5 | Audit nested complexity | 🟡 Prevents surprises | 🟢 1 hour | **BEFORE T4.1** |
| R6 | Upstream communication | 🟡 Reduces risk | 🟢 30 min | **THIS WEEK** |
| R7 | Reconcile state file | 🟢 Removes confusion | 🟢 5 min | **BEFORE T5.1** |
| R8 | Smoke test milestone | 🟢 Validates product | 🟢 1 hour | **AFTER Phase 4** |

---

## Revised Phase Plan (Proposed)

### Phase 4 LITE — Sync 15 Core Skills (3 sessions)
1. **T4.0** (NEW): Manually convert 3 skills to validate assumptions (30 min)
2. **T4.1**: Build `sync-skills.py` with `CURATED_SKILLS` list (no scoring). Extract `sync_common.py` first.
3. **T4.3**: Tests for the sync script + skill validation
4. **T4.4**: `skills-manifest.json` for the 15 core skills

### Phase 6 — CLI Skills Support (2-3 sessions)
5. **T6.1**: `install --skill`, `list --skills`, `search` across agents + skills
6. **T6.3**: CLI tests

### Phase 5 — CI Automation (3-4 sessions)
7. **T5.1**: `sync.yml` workflow
8. **T5.2**: `.sync-state.json`
9. **T5.3**: Rate limiting + security
10. **T5.4**: Custom component protection

### Phase 7 — Extended Catalog + Scoring (2-3 sessions)
11. **T4.2** (MOVED): Build scoring system informed by real usage data
12. **T7.1**: Automated scoring
13. **T7.2**: Tier 2 catalog (~120 skills)
14. **T7.3**: New component detection

**Total: ~10-13 sessions** (vs ~14-18 in the original plan)

---

> **Bottom line**: The strategy is right. The execution plan is over-engineered for a first launch. Ship 15 skills + CLI support in ~5 sessions, then iterate with data. Kill the scoring system until you have usage signals.
