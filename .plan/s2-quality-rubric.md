# Quality Scoring Rubric — AI Agent Markdown Files

Rubric for evaluating agent definition files (~60-120 lines, YAML frontmatter + 5 required sections: Identity, Workflow, Decision Trees, Tool Guidance, Quality Gate). Each dimension is scored 1-5. An agent passes if the overall average is >= 3.5 and no single dimension falls below 2.

---

## Overview Table

| # | Dimension              | What it measures                                              | Weight |
|---|------------------------|---------------------------------------------------------------|--------|
| 1 | Specificity            | Actionable role-specific instructions vs generic advice       | Equal  |
| 2 | Decision Density       | Number of concrete IF/THEN decision points                    | Equal  |
| 3 | Workflow Clarity        | Concrete ordered steps vs vague phases                        | Equal  |
| 4 | Permission Alignment   | Permissions match role's actual needs                         | Equal  |
| 5 | Density                | Signal-to-noise ratio per line                                | Equal  |
| 6 | Tool Awareness         | References specific tools with rationale                      | Equal  |
| 7 | Anti-pattern Coverage  | Warns against domain-specific mistakes                        | Equal  |
| 8 | Collaboration Clarity  | Knows when to delegate and to whom                            | Equal  |

**Overall Score** = arithmetic mean of all 8 dimensions.

**Pass criteria:**
- Overall score >= 3.5
- No individual dimension < 2

---

## Dimension Details

### 1. Specificity

> Actionable role-specific instructions vs generic advice.

An agent file that could apply to any role scores low. One that contains instructions only a person in *this exact role* would need scores high.

| Score | Description |
|-------|-------------|
| **1** | Generic instructions that could apply to any agent ("be thorough", "follow best practices"). No mention of domain-specific concepts, tools, or vocabulary. |
| **3** | References domain concepts and role-specific tasks, but some instructions remain generic or could apply to adjacent roles. At least 50% of directives are role-unique. |
| **5** | Nearly every instruction is meaningless outside this role's context. Uses precise domain vocabulary. A reader could identify the role from the instructions alone without seeing the title. |

**Automated check hint:**
- Count lines matching domain-specific keywords (maintain a per-role keyword list).
- Regex: `r"(?:always|never|must|should)\s+\w+"` — flag lines where the verb object is generic (e.g., "always be careful") vs specific (e.g., "always validate schema before migration").
- Heuristic: `specific_lines / total_instruction_lines >= 0.7` for score 5.

---

### 2. Decision Density

> Number of concrete IF/THEN decision points embedded in the file.

Decision points are explicit branching instructions: "If X, do Y; otherwise do Z." They turn a passive description into an executable playbook.

| Score | Description |
|-------|-------------|
| **1** | Zero or one decision point in the entire file. Instructions are purely sequential or declarative with no branching logic. |
| **3** | 3-5 explicit decision points. The Decision Trees section exists and contains at least 2 non-trivial branches. Some edge cases are covered. |
| **5** | 7+ decision points spread across Workflow and Decision Trees sections. Covers happy path, error cases, and ambiguous situations. Decisions reference concrete signals (metric thresholds, file patterns, error codes). |

**Automated check hint:**
- Regex: `r"(?i)\b(if|when|unless|otherwise|else|in case|fallback)\b"` — count unique matches.
- Count lines containing `->`, `=>`, or markdown list items starting with conditional keywords.
- Heuristic: `decision_count >= 7` for score 5, `>= 3` for score 3, `< 2` for score 1.

---

### 3. Workflow Clarity

> Concrete ordered steps vs vague phases.

The Workflow section should read like a recipe — numbered steps, clear inputs/outputs, and defined completion criteria. Vague phase names ("Planning", "Execution") without substeps score low.

| Score | Description |
|-------|-------------|
| **1** | No numbered steps. Workflow is described in prose paragraphs or as a bulleted list of phase names without detail. No clear start/end conditions. |
| **3** | Numbered steps exist but some lack exit criteria or have ambiguous ordering. Inputs are stated; outputs are implicit. The reader could follow the workflow but would need to make judgment calls on transitions. |
| **5** | Every step is numbered with a verb-first imperative. Each step has an explicit input, action, and output or completion signal. Transitions between steps are unambiguous. Total step count is 4-10 (neither too granular nor too vague). |

**Automated check hint:**
- Regex for numbered steps: `r"^\s*\d+\.\s+"` — count matches.
- Check for verb-first patterns: `r"^\s*\d+\.\s+[A-Z][a-z]+\b"` where first word is a verb (maintain verb list: Run, Check, Validate, Create, Review, etc.).
- Heuristic: `numbered_steps >= 4 and numbered_steps <= 10` and `verb_first_ratio >= 0.8` for score 5.

---

### 4. Permission Alignment

> Permissions declared in frontmatter match what the role actually needs — no more, no less.

Over-permissioned agents are a security risk. Under-permissioned agents will fail at runtime. The permissions should be the minimal set required by the workflow and tool guidance sections.

| Score | Description |
|-------|-------------|
| **1** | Permissions are missing, wildcard (`*`), or clearly copy-pasted from another agent. No relationship between declared permissions and the actions described in the file. |
| **3** | Permissions cover the main actions but include 1-2 unnecessary extras or miss a minor capability. The permission list is plausible for the role. |
| **5** | Every permission maps to a specific action in the Workflow or Tool Guidance section. No unused permissions. No missing permissions. A justification comment or reference exists for non-obvious permissions. |

**Automated check hint:**
- Extract permissions from YAML frontmatter: `r"permissions:\s*\n((?:\s+-\s+.+\n)*)"`.
- Extract tool/action references from body: `r"(?:use|run|execute|call|invoke)\s+[`]?(\w+)[`]?"`.
- Compare sets: `unused = permissions - referenced_tools`, `missing = referenced_tools - permissions`.
- Heuristic: `len(unused) == 0 and len(missing) == 0` for score 5.

---

### 5. Density

> Signal-to-noise ratio per line.

Every line should carry information. Filler phrases ("It is important to note that..."), redundant restating, and excessive formatting scaffolding dilute the signal. An agent file is not documentation — it's a compressed operational spec.

| Score | Description |
|-------|-------------|
| **1** | Over 30% of lines are filler, boilerplate, or repeated information. File exceeds 120 lines due to bloat. Contains paragraphs that could be replaced by a single directive. |
| **3** | Minor filler present but most lines carry information. File is within 60-120 line range. Some sentences could be tightened but none are purely decorative. |
| **5** | Every line earns its place. No filler phrases. File is 60-100 lines and covers all 5 required sections with room to spare. Reads like a compressed checklist, not an essay. |

**Automated check hint:**
- Total line count: flag if > 120 or < 30.
- Regex for filler: `r"(?i)(it is important|note that|please ensure|keep in mind|remember to|as mentioned|in order to)"` — count matches.
- Heuristic: `filler_lines / total_lines <= 0.05` for score 5, `<= 0.15` for score 3, `> 0.30` for score 1.
- Blank line ratio: `blank_lines / total_lines > 0.25` is a yellow flag.

---

### 6. Tool Awareness

> References specific tools with rationale for when and why to use each.

The Tool Guidance section should name concrete tools (CLI commands, APIs, scripts, MCP servers) and explain *when* to reach for each one — not just list them.

| Score | Description |
|-------|-------------|
| **1** | No tools mentioned, or tools listed without context. Tool Guidance section is missing or contains only a bulleted list of names. |
| **3** | 2-4 tools referenced with brief usage context. At least one tool has a "when to use" condition. Tool Guidance section exists as a distinct section. |
| **5** | 4+ tools referenced, each with a triggering condition and expected outcome. Includes "prefer X over Y when Z" guidance. Tools are referenced inline in the Workflow section where they're actually used, not just in an isolated list. |

**Automated check hint:**
- Count backtick-wrapped tool names: `r"`[a-zA-Z_][\w-]*`"` — unique count.
- Check for conditional tool usage: `r"(?:use|prefer|run)\s+`\w+`\s+(?:when|if|for)"`.
- Check for tool mentions outside the Tool Guidance section header (inline integration).
- Heuristic: `unique_tools >= 4 and conditional_tool_refs >= 2 and inline_tool_refs >= 1` for score 5.

---

### 7. Anti-pattern Coverage

> Warns against domain-specific mistakes the agent should avoid.

Good agents don't just say what to do — they say what NOT to do. These warnings should be specific to the domain, not generic ("don't introduce bugs").

| Score | Description |
|-------|-------------|
| **1** | No warnings or anti-patterns mentioned. Or only generic warnings like "be careful" or "avoid errors." |
| **3** | 2-3 domain-specific anti-patterns called out. Uses "DO NOT" or "NEVER" with concrete examples. At least one anti-pattern would surprise a junior practitioner. |
| **5** | 5+ anti-patterns, each tied to a concrete scenario or signal. Includes *why* the anti-pattern is dangerous, not just the prohibition. Covers both common mistakes and subtle traps that even experienced practitioners hit. |

**Automated check hint:**
- Regex: `r"(?i)\b(do not|don't|never|avoid|anti-pattern|mistake|wrong|pitfall|trap)\b"` — count unique context lines.
- Check that warning lines contain domain-specific nouns (not just generic verbs).
- Heuristic: `antipattern_count >= 5 and domain_specific_ratio >= 0.8` for score 5.

---

### 8. Collaboration Clarity

> Knows when to delegate and to whom.

Agents operate in a multi-agent system. A well-defined agent knows the boundaries of its role and explicitly states when to hand off to another agent, escalate to a human, or request input from a peer.

| Score | Description |
|-------|-------------|
| **1** | No mention of other agents, roles, or handoff conditions. The agent appears to operate in isolation. |
| **3** | Mentions 1-2 handoff scenarios. References at least one other agent or role by name. Delegation triggers are described but could be more precise. |
| **5** | 3+ handoff scenarios with named target agents and explicit trigger conditions. Includes both "delegate to" and "receive from" flows. Boundaries are crisp — a reader knows exactly what this agent owns and what it does not. |

**Automated check hint:**
- Regex for agent references: `r"(?:delegate|hand off|escalate|forward|ask|consult|notify)\s+(?:to\s+)?[`]?\w+[-\w]*[`]?"`.
- Count unique agent/role names referenced.
- Check for bidirectional references (both inbound and outbound).
- Heuristic: `handoff_scenarios >= 3 and unique_agents_referenced >= 2` for score 5.

---

## Scoring Rules

```
overall_score = mean(all 8 dimension scores)

PASS if:
  overall_score >= 3.5
  AND min(all dimension scores) >= 2

FAIL otherwise.

Rating labels:
  4.5 - 5.0  →  Excellent
  3.5 - 4.4  →  Good (passes)
  2.5 - 3.4  →  Needs improvement (fails)
  1.0 - 2.4  →  Poor (fails)
```

---

## Automated Scoring — Python Pseudocode

```python
import re
import yaml
from statistics import mean


def score_agent(content: str) -> dict:
    """Score an agent markdown file across 8 quality dimensions.

    Args:
        content: Raw markdown string of the agent file.

    Returns:
        Dict with per-dimension scores, overall score, and pass/fail.
    """
    lines = content.strip().split("\n")
    total_lines = len(lines)
    body = content.split("---", 2)[-1] if "---" in content else content

    # --- Parse frontmatter ---
    frontmatter = {}
    if content.startswith("---"):
        fm_block = content.split("---", 2)[1]
        frontmatter = yaml.safe_load(fm_block) or {}

    permissions = set(frontmatter.get("permissions", []))

    # --- Helper regexes ---
    RE_DECISION = re.compile(
        r"(?i)\b(if|when|unless|otherwise|else|in case|fallback)\b"
    )
    RE_NUMBERED_STEP = re.compile(r"^\s*\d+\.\s+")
    RE_VERB_FIRST = re.compile(
        r"^\s*\d+\.\s+(Run|Check|Validate|Create|Review|Parse|Extract|Send|"
        r"Update|Delete|Read|Write|Execute|Deploy|Test|Build|Scan|Notify|Open|"
        r"Close|Merge|Reject|Approve|Generate|Analyze|Compare|Resolve)\b",
        re.IGNORECASE,
    )
    RE_FILLER = re.compile(
        r"(?i)(it is important|note that|please ensure|keep in mind|"
        r"remember to|as mentioned|in order to)"
    )
    RE_TOOL_REF = re.compile(r"`([a-zA-Z_][\w-]*)`")
    RE_CONDITIONAL_TOOL = re.compile(
        r"(?:use|prefer|run)\s+`\w+`\s+(?:when|if|for)", re.IGNORECASE
    )
    RE_ANTIPATTERN = re.compile(
        r"(?i)\b(do not|don't|never|avoid|anti-pattern|mistake|pitfall|trap)\b"
    )
    RE_HANDOFF = re.compile(
        r"(?i)(?:delegate|hand off|escalate|forward|ask|consult|notify)"
        r"\s+(?:to\s+)?`?\w+[\w-]*`?"
    )

    scores = {}

    # 1. Specificity — needs a per-role keyword list; approximate here.
    #    Count lines with domain-specific verbs + nouns vs generic advice.
    generic_phrases = re.compile(
        r"(?i)(be thorough|follow best practices|ensure quality|be careful|"
        r"do a good job|pay attention)"
    )
    generic_count = sum(1 for l in lines if generic_phrases.search(l))
    specificity_ratio = 1 - (generic_count / max(total_lines, 1))
    if specificity_ratio >= 0.95:
        scores["specificity"] = 5
    elif specificity_ratio >= 0.80:
        scores["specificity"] = 3
    else:
        scores["specificity"] = 1

    # 2. Decision Density
    decision_count = sum(1 for l in lines if RE_DECISION.search(l))
    if decision_count >= 7:
        scores["decision_density"] = 5
    elif decision_count >= 3:
        scores["decision_density"] = 3
    else:
        scores["decision_density"] = 1

    # 3. Workflow Clarity
    numbered_steps = [l for l in lines if RE_NUMBERED_STEP.match(l)]
    verb_first = [l for l in numbered_steps if RE_VERB_FIRST.match(l)]
    step_count = len(numbered_steps)
    vf_ratio = len(verb_first) / max(step_count, 1)
    if 4 <= step_count <= 10 and vf_ratio >= 0.8:
        scores["workflow_clarity"] = 5
    elif step_count >= 3:
        scores["workflow_clarity"] = 3
    else:
        scores["workflow_clarity"] = 1

    # 4. Permission Alignment
    tool_refs_in_body = set(RE_TOOL_REF.findall(body))
    unused = permissions - tool_refs_in_body
    missing = tool_refs_in_body - permissions  # approximate
    if len(unused) == 0 and len(missing) <= 1:
        scores["permission_alignment"] = 5
    elif len(unused) <= 2:
        scores["permission_alignment"] = 3
    else:
        scores["permission_alignment"] = 1

    # 5. Density
    filler_count = sum(1 for l in lines if RE_FILLER.search(l))
    blank_count = sum(1 for l in lines if l.strip() == "")
    filler_ratio = filler_count / max(total_lines, 1)
    if filler_ratio <= 0.05 and 30 <= total_lines <= 120:
        scores["density"] = 5
    elif filler_ratio <= 0.15 and total_lines <= 140:
        scores["density"] = 3
    else:
        scores["density"] = 1

    # 6. Tool Awareness
    unique_tools = set(RE_TOOL_REF.findall(body))
    conditional_refs = len(RE_CONDITIONAL_TOOL.findall(body))
    if len(unique_tools) >= 4 and conditional_refs >= 2:
        scores["tool_awareness"] = 5
    elif len(unique_tools) >= 2:
        scores["tool_awareness"] = 3
    else:
        scores["tool_awareness"] = 1

    # 7. Anti-pattern Coverage
    ap_lines = [l for l in lines if RE_ANTIPATTERN.search(l)]
    ap_count = len(ap_lines)
    if ap_count >= 5:
        scores["antipattern_coverage"] = 5
    elif ap_count >= 2:
        scores["antipattern_coverage"] = 3
    else:
        scores["antipattern_coverage"] = 1

    # 8. Collaboration Clarity
    handoff_matches = RE_HANDOFF.findall(body)
    if len(handoff_matches) >= 3:
        scores["collaboration_clarity"] = 5
    elif len(handoff_matches) >= 1:
        scores["collaboration_clarity"] = 3
    else:
        scores["collaboration_clarity"] = 1

    # --- Overall ---
    all_scores = list(scores.values())
    overall = round(mean(all_scores), 2)
    min_score = min(all_scores)
    passed = overall >= 3.5 and min_score >= 2

    return {
        "dimensions": scores,
        "overall": overall,
        "min_dimension": min_score,
        "passed": passed,
        "label": (
            "Excellent" if overall >= 4.5 else
            "Good" if overall >= 3.5 else
            "Needs improvement" if overall >= 2.5 else
            "Poor"
        ),
    }
```

---

## Examples

### Good Agent — `code-reviewer.md` (expected score: 4.2+)

```
dimensions:
  specificity:            5  # Every instruction is code-review-specific
  decision_density:       4  # 5 IF/THEN branches (severity routing, language checks)
  workflow_clarity:       5  # 7 numbered verb-first steps with exit criteria
  permission_alignment:   4  # Permissions match except one legacy entry
  density:                4  # 85 lines, 2 filler phrases
  tool_awareness:         5  # References `rg`, `ast-grep`, `eslint`, `semgrep` with conditions
  antipattern_coverage:   4  # 4 anti-patterns (nitpick storms, style-only reviews, etc.)
  collaboration_clarity:  4  # Delegates to `security-reviewer` and `architect`, receives from `planner`

overall: 4.38
min_dimension: 4
passed: true
label: Good
```

Why it scores well:
- The Workflow section has 7 steps: `1. Read the diff` through `7. Post summary comment`, each with a clear trigger and output.
- Decision Trees cover: severity >= critical → block merge; test coverage < threshold → flag; unfamiliar language → delegate to specialist.
- Tool Guidance names 4 tools with "use X when Y" conditions.
- Anti-patterns include: "DO NOT leave comments on auto-generated files", "NEVER approve without reading test changes", "avoid nitpicking formatting if a linter is configured."

### Bad Agent — `generic-helper.md` (expected score: 2.0-)

```
dimensions:
  specificity:            1  # "Be helpful and thorough" — applies to anything
  decision_density:       1  # Zero IF/THEN constructs
  workflow_clarity:       1  # Prose paragraph, no numbered steps
  permission_alignment:   1  # Wildcard permissions, no tools referenced
  density:                2  # 45 lines but 40% is filler and blank lines
  tool_awareness:         1  # No tools mentioned
  antipattern_coverage:   1  # "Avoid mistakes" — not domain-specific
  collaboration_clarity:  1  # No mention of other agents

overall: 1.12
min_dimension: 1
passed: false
label: Poor
```

Why it scores poorly:
- Identity section says "You are a helpful assistant" — no role specificity.
- Workflow section is a single paragraph: "Understand the request, think about it, then respond."
- No Decision Trees section at all.
- Tool Guidance says "Use appropriate tools as needed."
- Quality Gate says "Ensure output is high quality."
- Could replace the entire file with "try your best" and lose zero information.
