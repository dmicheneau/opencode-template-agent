# Current Mission
Fix bash permission issues across global config and 70 agent frontmatters

## Plan
1. [done] Fix global config opencode.json — expanded bash patterns for common dev tools
2. [done] Fix 70 agent frontmatters — applied 5 archetype permission profiles (Builder/Auditor/Analyst/Orchestrator/Specialist)
3. [done] Restored webfetch: allow on agents that needed it
4. [done] Fixed 3 major review issues (accessibility bash whitelist, ui-designer bash whitelist, docs webfetch)
5. [done] Review passed — archetype consistency verified across all 70 agents
6. [done] Tests: 866/866 passing (628 JS + 238 Python)

## Agent Results
- Builder (28 agents): edit upgraded to allow, comprehensive bash whitelist (50+ patterns)
- Auditor (9 agents): write/edit/bash all deny, task only
- Analyst (6 agents): data-focused bash whitelist (python, jupyter, sqlite3, csvkit, git read)
- Orchestrator (5 agents): write allow, edit/bash deny, task allow. episode-orchestrator kept full access.
- Specialist (22 agents): 6 sub-profiles with domain-specific bash patterns (infra, data, security, docs, ai-infra, architecture)

## Decisions
- accessibility.md and ui-designer.md: hybrid Auditor+tools profile (bash deny except specific npx tools they need)
- webfetch: allow restored on 10 agents that use it in their workflow
- Global config uses JSONC (comments) — valid for opencode, noted as minor
- docker-specialist and terraform-specialist use Builder profile (not Infra) since they're in the Builder archetype mapping

## Open Questions
- None — ready for commit if user wants

## Parked Scopes
- S2 Content Enrichment (D2-D5): user questioning whether this is worth doing. May reduce scope.
- V6.0 MVP: 9 tasks remaining (S3 core + release tasks)
