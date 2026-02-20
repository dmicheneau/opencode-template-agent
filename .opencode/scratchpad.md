# Current Mission — COMPLETE
S7 — Séparation agents produit / agents de développement

## Status: DONE ✅
Migration exécutée, reviewée (2 rounds), tous fixes appliqués.

## What was done
1. 72 fichiers migrés de `.opencode/agents/` vers `agents/` via `git mv`
2. `source_path: "agents"` ajouté à manifest.json (fallback `source_path || base_path`)
3. Code mis à jour : src/installer.mjs, src/registry.mjs, 3 scripts Python, 2 workflows CI, install.sh
4. 8 nouveaux tests (source_path validation, fallback, null byte)
5. Documentation mise à jour (architecture.md, progress-v6.md)
6. Nettoyage : répertoires vides supprimés, README.md agents/ supprimé (conflit glob tests)

## Test Results
- JS: 636/636 pass
- Python: 238/237 pass + 1 skip (attendu)
- Total: 874 tests, 0 failure (baseline était 866)

## Review
- R1: CHANGES_REQUESTED (1 critical CI validation, 1 major test quality, 2 minor validation)
- R2: APPROVED (all fixes verified + 6 additional polish items applied)

## Next Steps
- Commit quand l'utilisateur le demande
- S2 Content Enrichment est débloqué
- V6.0 MVP: 9 tasks restantes (S3 core + release)
