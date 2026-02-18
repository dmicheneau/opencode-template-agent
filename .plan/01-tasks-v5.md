# Taches V5 — Consolidation & Distribution

> Derive de : 00-plan-v5.md
> Derniere mise a jour : 2026-02-18

## S7 — npm Publish & Distribution

- [ ] S7.1 : Configurer package.json pour publication npm (`opencode-agents`)
- [ ] S7.2 : GitHub Releases avec release notes auto-generees
- [ ] S7.3 : Tags semver git (v4.0.0 retroactif + v5.0.0)
- [ ] S7.4 : Workflow CI pour publish automatique sur tag

## S8 — install.sh Overhaul

- [ ] S8.1 : Ajouter couverture de tests pour install.sh (shellcheck + bats)
- [ ] S8.2 : Revoir la logique de detection des agents installes
- [ ] S8.3 : Decision D21 — deprecier install.sh en faveur de npx uniquement ?

## S9 — Agent Expansion Wave 2

- [ ] S9.1 : Re-sync tier extended, triage nouveaux candidats
- [ ] S9.2 : Cible 85 agents (+15)
- [ ] S9.3 : Revue des packs existants, ajout de nouveaux packs si pertinent

## S10 — TUI Enhancements

- [ ] S10.1 : Vue detail agent (panneau lateral ou popup)
- [ ] S10.2 : Overlay aide raccourcis clavier (touche `?`)
- [ ] S10.3 : Decision D22 — support themes (dark/light/custom) ?

## S11 — Infrastructure & DevOps

- [ ] S11.1 : Pin GitHub Actions par SHA (Dependabot)
- [ ] S11.2 : Revisiter D18 (auto-merge sync PRs apres rodage)
- [ ] S11.3 : Agent versioning (tracker la version installee)

## S12 — Community & Adoption

- [ ] S12.1 : npm keywords et GitHub topics pour discoverability
- [ ] S12.2 : Decision D23 — telemetrie opt-in (download counts) ?
- [ ] S12.3 : Template pour contributions d'agents communautaires

## Sequencement

| Ordre | Axe | Bloque par | Priorite |
|-------|-----|------------|----------|
| 1 | S7 (npm publish) | — | Haute |
| 1 | S8 (install.sh) | — | Haute |
| 2 | S9 (expansion) | S7 | Moyenne |
| 2 | S10 (TUI enhance) | — | Moyenne |
| 3 | S11 (infra) | — | Basse |
| 3 | S12 (community) | S7 | Basse |
