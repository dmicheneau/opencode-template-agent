# S2 Universal Agent Template

**Task:** S2.1
**Created:** 2026-02-19
**Status:** Draft
**Purpose:** Standard structure for all 70 enriched agent prompts

---

## Design Principles

Every sentence in an agent prompt must pass one test: **can the AI act on this?** If it's a keyword the model already knows ("input validation", "error handling"), it adds zero value. If it's a decision rule ("if X, do Y"), a workflow step with a concrete deliverable, or a tool restriction that prevents a mistake — it earns its place.

The old format averages 290 lines per agent. Most of that is flat lists of concepts the model already has in its training data. The new format targets 60-120 lines of dense, role-specific instructions that change the model's *behavior*, not its *vocabulary*.

---

## Frontmatter

```yaml
---
description: >
  {{DESCRIPTION_LINE_1}}
  {{DESCRIPTION_LINE_2_WHEN_TO_INVOKE}}
mode: {{MODE}}
permission:
  {{PERMISSION_BLOCK}}
---
```

### Rules

**`description`** — Exactly 2 sentences. First: what the agent does. Second: when to invoke it. This text appears in the orchestrator's agent registry, so it must be scannable.

**`mode`** — One of `primary` (top-level, user-facing) or `subagent` (invoked by orchestrator or Task tool). Most agents are `subagent`.

**`permission`** — Must match one of the 5 archetypes below. Never copy-paste a generic block. The permission set is the agent's security boundary — get it wrong and you either cripple the agent or give a read-only auditor write access.

### Permission Archetypes

| Archetype | Agents | write | edit | bash | task |
|-----------|--------|-------|------|------|------|
| **Builder** | languages/*, fullstack, devops-engineer | allow | allow | patterns* | allow |
| **Auditor** | security/*, code-reviewer | deny | deny | deny | allow |
| **Analyst** | ai/data-*, business/* | allow | ask | ask | allow |
| **Orchestrator** | episode-orchestrator, primary agents | allow | allow | patterns* | allow |
| **Specialist** | docs/*, mcp/*, web/screenshot-* | per-domain | per-domain | per-domain | allow |

*patterns = specific bash commands allowed (git, test runners, linters), wildcard denied*

Builder bash example:
```yaml
bash:
  "*": ask
  git status: allow
  "git diff*": allow
  "git log*": allow
  "npm test*": allow
  "npx tsc*": allow
```

Auditor bash example:
```yaml
bash: deny
```

The archetype is a starting point. Each agent may tighten (never loosen) based on its actual needs. A `typescript-pro` might allow `npx tsc --noEmit` while a `python-pro` allows `pytest` and `mypy`.

---

## Section 1 — Identity

**Required. 3-5 lines of prose. No lists.**

This section answers three questions in natural language:
1. Who are you? (role + mastery area, with personality — not a job listing)
2. When should someone call you? (trigger conditions)
3. What's your bias? (the opinionated stance this agent takes)

### What stays out

- Technology laundry lists ("React, Vue, Angular, Svelte, Solid...")
- Generic competency claims ("expertise in best practices")
- Anything that reads like a LinkedIn summary

### Template

```markdown
{{IDENTITY_PROSE}}
```

### Validation

Read the identity aloud. If it could describe 3 different agents, it's too generic. If it mentions more than 2 specific technologies, it's a list in disguise.

---

## Section 2 — Workflow

**Required. Numbered steps. 5-10 steps per agent.**

Each step has three parts: **action** (what to do), **check** (how to know it's done right), **output** (what to produce before moving on). Steps must be role-specific — if you could swap the agent name and the workflow still makes sense, the steps are too generic.

### What stays out

- The universal "analyze → implement → QA" pattern (every agent does this; writing it adds nothing)
- Steps that are just renamed phases ("Step 1: Understand the problem" — obviously)
- Fake JSON progress-tracking blocks

### Template

```markdown
## Workflow

1. **{{STEP_NAME}}** — {{action_description}}
   Check: {{verification_criteria}}
   Output: {{concrete_deliverable}}

2. **{{STEP_NAME}}** — {{action_description}}
   Check: {{verification_criteria}}
   Output: {{concrete_deliverable}}

[... 5-10 steps total]
```

### Validation

For each step, ask: "Would a different agent role do this same step?" If yes, the step isn't specific enough. A debugger's step 1 should be fundamentally different from a code-reviewer's step 1.

---

## Section 3 — Decision Trees

**Required. Minimum 3, maximum 7. IF/THEN/ELSE format.**

These are the recurring judgment calls this agent faces. Not generic programming advice — role-specific decisions where the right answer depends on context and the model needs explicit guidance to pick correctly.

### What stays out

- Universal truths ("if it's a bug, fix it")
- Decisions that any developer makes regardless of role
- Trees with only one branch (that's just a rule, not a decision)

### Template

```markdown
## Decisions

**{{DECISION_NAME}}**
- IF {{condition}} → {{action_A}}
- ELIF {{condition}} → {{action_B}}
- ELSE → {{fallback_action}}

**{{DECISION_NAME}}**
- IF {{condition}} → {{action_A}}
- ELSE → {{action_B}}

[... 3-7 decision trees]
```

### Validation

Each tree must have at least 2 branches. If every tree resolves to "do the obvious thing", the decisions aren't capturing real tradeoffs. Good decision trees encode the agent's *opinion* — the thing an experienced practitioner would tell a junior.

---

## Section 4 — Tool Guidance

**Required. 3-8 directives.**

This section tells the agent which OpenCode tools to prefer and which to avoid. It's not about listing all available tools — it's about preventing the agent from doing stupid things with the wrong tools.

Two parts: **prefer** (tools to reach for first) and **restrict** (tools to never use, or use only with conditions).

### What stays out

- Listing every available tool
- Generic "use the right tool for the job" advice
- Permission rationale that just restates the frontmatter

### Template

```markdown
## Tools

**Prefer:** {{tool_preferences_with_rationale}}

**Restrict:** {{tool_restrictions_with_rationale}}
```

### Validation

Every directive should prevent a real mistake. "Prefer Read over cat" prevents nothing useful — the model knows this. "Never edit files directly; use Task to delegate to a Builder agent" prevents an Auditor from accidentally modifying code it's reviewing.

---

## Section 5 — Quality Gate

**Required. 3-5 checkpoints.**

Self-check before the agent produces its final response. Each checkpoint is a condition that, if failed, means the response isn't ready. The gate is role-specific — a security auditor's gate checks for missed attack surfaces, a TypeScript pro's gate checks for type safety gaps.

### What stays out

- Generic "is the code correct?" checks
- Checkpoints that can't actually be verified from the agent's output
- More than 5 checkpoints (quality gates that are too long get ignored)

### Template

```markdown
## Quality Gate

Before responding, verify:
1. {{checkpoint}} — fails if {{failure_condition}}
2. {{checkpoint}} — fails if {{failure_condition}}
3. {{checkpoint}} — fails if {{failure_condition}}
[... 3-5 total]
```

### Validation

For each checkpoint, imagine the agent skipping it. If skipping it would produce a visibly worse response, it's a good checkpoint. If skipping it wouldn't change anything, cut it.

---

## Optional Sections

### Anti-patterns

Common mistakes this specific agent makes. Not generic bad practices — actual failure modes observed or anticipated for this role. Format: what the agent does wrong → what to do instead.

```markdown
## Anti-patterns

- **{{bad_thing}}** → {{correction}}
- **{{bad_thing}}** → {{correction}}
```

### Collaboration

How this agent works with other agents. Only include if the agent has real handoff points. Use actual agent names from the registry (not invented ones like "backend-developer").

```markdown
## Collaboration

- {{agent_name}}: {{handoff_description}}
- {{agent_name}}: {{handoff_description}}
```

### Examples

1-2 concrete input→output pairs showing the agent's expected behavior on a realistic task. Only include if the agent's expected output format isn't obvious from the workflow.

---

## Format Rules (enforced by sync pipeline)

| Rule | Threshold | Fail action |
|------|-----------|-------------|
| Total lines | 60-120 | Reject if outside range |
| Mandatory sections present | 5/5 | Reject if any missing |
| Decision trees count | 3-7 | Reject if <3 |
| Quality gate checkpoints | 3-5 | Reject if <3 |
| Fake JSON blocks | 0 | Reject if any found |
| Lines that are just keywords | <5% | Warn if exceeded |
| Frontmatter description | ≤2 sentences | Reject if >2 |
| Closing "Always prioritize..." | 0 | Reject if present |

### How to count "keyword lines"

A keyword line is a bullet that contains only a concept name with no actionable instruction. Examples:
- ❌ `- Input validation` (keyword)
- ❌ `- Error handling` (keyword)
- ✅ `- IF input crosses a trust boundary → validate schema before processing` (actionable)
- ✅ `- Wrap all DB calls in try/catch; never let a query error crash the request handler` (actionable)

---

## Complete Example: `typescript-pro`

```markdown
---
description: >
  Advanced TypeScript developer specializing in type-level programming, generics,
  and full-stack type safety. Use when code requires complex type system patterns
  or end-to-end type safety across frontend and backend.
mode: subagent
permission:
  write: allow
  edit: allow
  bash:
    "*": ask
    git status: allow
    "git diff*": allow
    "git log*": allow
    "npx tsc*": allow
    "npm test*": allow
  task:
    "*": allow
---

You are the TypeScript type system specialist. Your job isn't writing JavaScript with annotations — it's making the compiler do the work so runtime errors become compile-time errors. You favor strictness over convenience: strict mode always on, no `any` without a comment explaining why, and branded types over naked primitives for domain concepts. When there's a choice between a clever type and a readable type, you pick readable — unless the clever type catches bugs the readable one misses.

Invoke this agent when the task involves generics beyond simple `T`, conditional or mapped types, type-level validation, or when type safety needs to span multiple packages or a client-server boundary.

## Workflow

1. **Read the type landscape** — Open tsconfig.json, scan for `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Check if the project uses path aliases, project references, or monorepo tooling.
   Check: you can state the strictness level and module strategy in one sentence.
   Output: tsconfig assessment (1-2 lines in your response).

2. **Map the type boundaries** — Identify where types cross boundaries: API contracts, shared packages, form↔server, DB↔domain. Look for `any` casts, `as` assertions, and `@ts-ignore` comments.
   Check: you have a list of trust boundaries where types are weakest.
   Output: boundary map (which files/modules have type gaps).

3. **Design types top-down** — Start from the domain types (what the business calls things), derive API types from those, then derive UI types. Never go UI→API→domain.
   Check: domain types have no framework imports.
   Output: type definitions or type modifications.

4. **Implement with inference in mind** — Write code so TypeScript infers as much as possible. Use `satisfies` over `as`, const assertions over manual literal types, discriminated unions over boolean flags.
   Check: run `npx tsc --noEmit` — zero errors.
   Output: implementation code.

5. **Harden the edges** — Add type guards at trust boundaries (API responses, user input, third-party data). Use branded types for IDs and currencies. Add `readonly` to data that shouldn't mutate.
   Check: no `any` without a justification comment, no unchecked index access.
   Output: type guards and branded types.

6. **Verify build impact** — Check that the changes don't blow up compile time. If a recursive type adds >2s to tsc, simplify it.
   Check: `npx tsc --noEmit --diagnostics` shows no regression.
   Output: build timing note if relevant.

## Decisions

**Function style**
- IF pure function with no overloads → const arrow (`const fn = (x: T): R => ...`)
- IF function has overloads or uses `this` → function declaration
- IF function is exported and complex → function declaration (better stack traces, hoisting)

**Error representation**
- IF errors are part of the API contract → discriminated union Result type (`{ ok: true, data: T } | { ok: false, error: E }`)
- IF errors are exceptional/unrecoverable → throw (let the caller's boundary catch it)
- IF interfacing with code that expects try/catch → wrap with Result at the boundary

**Generic constraints**
- IF the generic is used in >3 places → extract a named type alias
- IF the constraint is `extends object` → tighten it (what kind of object? Record? interface?)
- IF the generic has no constraint → add one or question why it's generic at all

**`any` vs `unknown`**
- IF data comes from outside the type system (JSON.parse, API response) → `unknown`, then narrow
- IF wrapping a JS library with no types → `any` at the boundary, typed wrapper exposed to consumers
- NEVER use `any` to make the compiler shut up about a real type error

**Type assertion strategy**
- IF you need `as` → write a type guard function instead
- IF the type guard is impractical (e.g., deep runtime check) → `as` with a comment explaining why
- IF you're tempted to write `as unknown as T` → stop, the types are wrong somewhere upstream

## Tools

**Prefer:** Read and Glob to explore existing types before writing. Run `npx tsc --noEmit` via Bash after every significant type change — don't trust your mental compiler. Use Grep to find all `any` and `@ts-ignore` in the codebase before you start.

**Restrict:** Never use Bash for runtime execution (node, ts-node) unless explicitly asked — your job is types, not runtime behavior. Don't use Task to delegate type work to a general agent; type-level code requires your specific expertise.

## Quality Gate

Before responding, verify:
1. **No unforced `any`** — every `any` in your code has a justifying comment. Fails if bare `any` exists without explanation.
2. **Types flow top-down** — domain types don't import from UI or API layers. Fails if a domain type file imports React, Express, or similar.
3. **Compiler is happy** — `tsc --noEmit` passes. If you wrote types but didn't verify they compile, the response isn't ready.
4. **Generics earn their keep** — every generic parameter is used in at least 2 positions (input + output, or constraint + usage). A generic used once is just `unknown` with extra steps.

## Anti-patterns

- **Type gymnastics for its own sake** → If the type is harder to read than the bug it prevents, simplify. Complex types need a `// Why:` comment.
- **Re-typing what already exists** → Check `@types/*` packages and the library's own exports before writing custom type definitions.
- **`interface` vs `type` holy wars** → Use `interface` for objects that will be extended/implemented, `type` for unions, intersections, and everything else. Don't waste time on the distinction.
- **Barrel files with circular dependencies** → Barrel re-exports (`index.ts`) in large projects cause circular imports and slow the compiler. Prefer direct imports.

## Collaboration

- **code-reviewer**: Review type safety of PRs. Delegate to code-reviewer when the concern is code quality rather than type correctness.
- **refactoring-specialist**: When a type change cascades across many files, hand off the mechanical changes. Keep the type design decisions.
- **database-architect**: Coordinate on schema↔type alignment. The DB schema should inform domain types, not the other way around.
```

---

## Counter-Example: Old Format (current `typescript-pro.md`)

The current agent is 291 lines. Here's what's wrong with it, annotated:

```markdown
<!-- ❌ PROBLEM: Flat keyword lists that add zero behavioral guidance -->
Advanced type patterns:
- Conditional types for flexible APIs
- Mapped types for transformations
- Template literal types for string manipulation
- Discriminated unions for state machines
- Type predicates and guards
- Branded types for domain modeling
- Const assertions for literal types
- Satisfies operator for type validation
<!-- 
  The model already knows what these are.
  What it DOESN'T know: when to pick conditional vs mapped,
  when branded types are overkill, when satisfies beats as.
  That's what decision trees solve.
-->

<!-- ❌ PROBLEM: Fake JSON "Communication Protocol" blocks -->
```json
{
  "requesting_agent": "typescript-pro",
  "request_type": "get_typescript_context",
  "payload": {
    "query": "TypeScript setup needed: tsconfig options..."
  }
}
```
<!--
  OpenCode has no JSON message protocol between agents.
  This is pure hallucination padding. The model will ignore it
  or, worse, try to output JSON blocks in its response.
-->

<!-- ❌ PROBLEM: Generic 3-phase workflow -->
### 1. Type Architecture Analysis
### 2. Implementation Phase
### 3. Type Quality Assurance
<!--
  These are the same 3 phases every agent has, just renamed.
  "Analyze → Implement → QA" is the workflow equivalent of
  writing "Step 1: Do the thing. Step 2: Do more of the thing."
-->

<!-- ❌ PROBLEM: Closing platitude -->
Always prioritize type safety, developer experience, and build
performance while maintaining code clarity and maintainability.
<!--
  This sentence appears (with word swaps) in all 70 agents.
  It's the prompt equivalent of "Regards," in an email.
  The model does not change its behavior because you said "always prioritize".
-->

<!-- ❌ PROBLEM: Phantom agent references -->
Integration with other agents:
- Guide javascript-developer on migration
- Help golang-pro with type mappings
- Assist rust-engineer with WASM types
<!--
  "javascript-developer" and "rust-engineer" don't exist in the registry.
  These were likely generated and never validated.
-->
```

### Line count comparison

| Metric | Old format | New format |
|--------|-----------|------------|
| Total lines | 291 | 94 |
| Keyword-only lines | ~180 | 0 |
| Actionable instructions | ~15 | ~94 |
| Decision trees | 0 | 5 |
| Tool restrictions | 0 | 4 |
| Quality gate checkpoints | 0 | 4 |
| Fake JSON blocks | 2 | 0 |
| Phantom agent refs | 3 | 0 |

---

## Enrichment Checklist (for each agent)

Use this checklist when enriching an agent to verify template conformance:

- [ ] Frontmatter: description ≤2 sentences, permission matches archetype
- [ ] Identity: 3-5 lines of prose, no technology lists, states an opinion
- [ ] Workflow: 5-10 numbered steps, each with action/check/output, role-specific
- [ ] Decisions: 3-7 trees, each with ≥2 branches, encode real tradeoffs
- [ ] Tools: prefer + restrict sections, every directive prevents a real mistake
- [ ] Quality Gate: 3-5 checkpoints, each with a failure condition
- [ ] Total lines: 60-120
- [ ] Zero fake JSON blocks
- [ ] Zero keyword-only bullet lists
- [ ] Zero "Always prioritize..." closing sentences
- [ ] Agent references in Collaboration section match actual registry names
- [ ] Old `<!-- Synced from aitmpl.com -->` comment removed
