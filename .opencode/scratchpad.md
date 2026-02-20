# Current Mission
Séparation agents produit / agents de développement (S7)

## Plan
1. [done] Analyser l'architecture actuelle — identifier le problème de dual-usage de `.opencode/agents/`
2. [done] Auditer tous les fichiers impactés (src/, scripts/, tests/, CI, docs)
3. [done] Rédiger le plan `.plan/07-agent-separation.md`
4. [pending] Validation du plan par l'utilisateur
5. [pending] Exécution Phase 0-4 de la migration

## Agent Results
- explore agent: 70 agents produit dans `.opencode/agents/`, 16 skills dans `.opencode/skills/`, pas de `templates/` existant
- general agent (audit): Découverte critique — `manifest.json` `base_path` sert à la fois pour source (GitHub raw URL) ET destination (install chez l'utilisateur). Doit être splitté en `source_path` + `base_path`.
- Fichiers impactés: manifest.json, src/installer.mjs, src/registry.mjs, scripts/sync-agents.py, scripts/update-manifest.py, scripts/enrich_agents.py, tests/test_agents.py, tests/cli.test.mjs, .github/workflows/ci.yml, .github/workflows/sync-agents.yml, install.sh, README.md, docs/architecture.md

## Decisions
- D1: Agents produit déplacés vers `agents/` à la racine (choix utilisateur, option recommandée)
- D2: manifest.json aura un nouveau champ `source_path: "agents"` (pour GitHub raw download), `base_path` reste `.opencode/agents` (destination d'installation chez l'utilisateur)
- D3: Rétrocompatibilité via fallback `source_path || base_path` dans getDownloadUrl()

## Open Questions
- Validation du plan par l'utilisateur avant exécution

## Parked Scopes
- S2 Content Enrichment (D2-D5): bloqué par S7, à reprendre après migration
- V6.0 MVP: 9 tasks restantes (S3 core + release)
