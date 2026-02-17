# Décisions techniques — Plan V2

> Mis à jour le 2026-02-13 suite aux revues produit (03) et technique (04)

## D1 — Skills → OpenCode Skills (pas agents)

**Date** : 2026-02-13 | **Statut** : ✅ Validée (confirmée par les deux revues)

**Contexte** : 686 skills disponibles sur aitmpl.com. Faut-il les convertir en agents
ou en skills OpenCode ?

**Décision** : Convertir en **skills OpenCode** (`.opencode/skills/{name}/SKILL.md`).

**Justification** :
- Les skills enseignent "comment faire" → injection d'instructions on-demand
- Les agents définissent "qui être" → persona persistante en session
- 686 agents bloateraient la liste des agents (43 → 729)
- Le format source (SKILL.md) est quasi-identique au format cible OpenCode
- Les skills multi-fichiers (scripts, references) ne sont pas supportés par les agents

---

## D2 — Curation manuelle pour v1, scoring automatique pour v2 ⚡ RÉVISÉE

**Date** : 2026-02-13 | **Statut** : ✅ Validée (révisée suite à R1 produit + H1 technique)

**Contexte** : 686 skills c'est trop. Il faut sélectionner.

**Décision initiale** : ~~Scoring 5-facteurs pondéré (utilité 3x + priority 2x + qualité 2x + complémentarité 2x + taille 1x)~~

**Décision révisée** : **Curation manuelle** pour le v1 (Phase 4 LITE) avec scoring automatique reporté à Phase 7.

| Version | Approche | Volume | Justification |
|---------|----------|--------|---------------|
| **v1 (Phase 4 LITE)** | `CURATED_SKILLS` liste manuelle hand-pick | 10-15 skills | Même pattern prouvé que `CURATED_AGENTS` (L120-175 de sync-agents.py). Élimine 23h de scoring subjectif. |
| **v2 (Phase 7)** | Scoring automatique basé sur données d'usage réelles | ~120 skills | trending-data.json + install counts + feedback utilisateur |

**Tiers maintenus** :
| Tier | Volume | Livraison |
|------|--------|-----------|
| Core | 10-15 | Installé par défaut (Phase 4 LITE) |
| Extended | ~120 | Install on-demand via CLI (Phase 7) |
| Archive | ~540 | Repo source uniquement |

---

## D3 — Script séparé `sync-skills.py` + module partagé `sync_common.py` ⚡ RÉVISÉE

**Date** : 2026-02-13 | **Statut** : ✅ Validée (complétée suite à C1 technique)

**Décision initiale** : ~~Nouveau script `sync-skills.py` séparé~~

**Décision révisée** : Script séparé `sync-skills.py` **MAIS avec extraction préalable de `sync_common.py`** (~430 lignes réutilisables).

**Structure cible** :
```
scripts/
  sync_common.py    # ~430 lignes : HTTP, cache, parse, sécurité
  sync-agents.py    # ~1180 lignes : logique agents uniquement
  sync-skills.py    # ~600-800 lignes : logique skills uniquement
```

**Code à extraire** (identifié par la revue technique §1) :
| Fonction | Lignes | Rôle |
|----------|--------|------|
| `SafeRedirectHandler` | 17 | Bloque les redirections cross-origin |
| `_get_headers()` | 10 | Headers HTTP + auth token |
| `_http_request()` | 105 | Retry, backoff, rate-limit, 304 |
| `_api_get()` | 12 | GET JSON avec retry |
| `_raw_get()` | 19 | GET text avec cap 1MB |
| `_cached_get()` | 60 | ETag/If-Modified-Since |
| `check_rate_limit()` | 11 | Vérification rate limit API |
| `parse_frontmatter()` | 52 | Parse YAML stdlib |
| `_load_sync_cache()` / `_save_sync_cache()` | 26 | Persistence cache |
| `_is_synced_*()` / `clean_synced_*()` | 75 | Détection/nettoyage synced files |
| Path traversal guards | 11 | Sécurité chemins |
| **Total** | **~430 lignes** | |

**Pré-requis** : P1 doit être complété AVANT de commencer T4.1.

---

## D4 — CI cron hebdomadaire avec PR automatique

**Date** : 2026-02-13 | **Statut** : ✅ Validée (ajustements mineurs suite aux revues)

**Décision** : Workflow cron hebdomadaire (dimanche 04:00 UTC), PR automatique
via `peter-evans/create-pull-request`, branche fixe `sync/upstream-auto`.

**Ajustements suite aux revues** :
- ⚡ Job séquentiel (pas parallèle) pour sync-agents + sync-skills (A6 technique — évite complexité artifacts)
- ⚡ Permissions scopées au workflow `sync.yml` (A7 technique)
- ⚡ Extraire le validateur CI inline dans `scripts/validate.py` (A8 technique)

---

## D5 — Diff detection via Git tree SHA

**Date** : 2026-02-13 | **Statut** : ✅ Validée

**Décision** : Utiliser l'API Git recursive tree, comparer le SHA du sous-arbre
`cli-tool/components/` avec le SHA stocké dans `.sync-state.json`.

**Format retenu** (R7 produit) : `.sync-state.json` (pas `.sync-tree-sha`)
```json
{
  "last_sync": "2026-02-13T04:00:00Z",
  "source_tree_sha": "abc123...",
  "agents_tree_sha": "def456...",
  "skills_tree_sha": "ghi789...",
  "agents_count": 415,
  "skills_count": 686
}
```

---

## D6 — Catégories exclues

**Date** : 2026-02-13 | **Statut** : ✅ Validée

**Décision** : Exclure 3 catégories : `railway` (12), `sentry` (6), `video` (4) = 22 skills.

---

## D7 — Frontmatter : champs supprimés

**Date** : 2026-02-13 | **Statut** : ✅ Validée

**Décision** : Supprimer `allowed-tools`, `version`, `priority`, `license` du frontmatter
cible. Ne garder que `name` et `description` (les seuls champs reconnus par OpenCode pour
les skills).

---

## D8 — Protection des composants custom

**Date** : 2026-02-13 | **Statut** : ✅ Validée

**Décision** : 4 couches de protection pour ne jamais écraser les composants custom.

1. **Blocklist** dans le script de sync
2. **Header de provenance** (`<!-- Synced from aitmpl.com`) sur les synced uniquement
3. **Validation CI** vérifie que les custom n'ont pas le header
4. **Tests** couvrent les custom séparément

---

## D9 — Traitement des fichiers compagnons (scripts/) des skills syncées

**Date** : 2026-02-13 | **Statut** : ✅ Décidé (P3)

**Décision** : Option E — Copier les fichiers compagnons (scripts/) tels quels en préservant les chemins relatifs, avec des gardes de sécurité légères : suppression du bit exécutable, limite de 5 Mo par skill, rejet des liens symboliques, et ajout d'un en-tête d'avertissement dans les fichiers texte.

**Justification** : Les utilisateurs sont des développeurs qui choisissent activement d'installer une skill depuis un registre curé — le risque réel n'est pas le code malveillant (problème de curation amont) mais l'exécution accidentelle et la consommation de ressources non bornée. Renommer ou déplacer les fichiers casse le contrat entre SKILL.md et ses scripts compagnons. Les gardes légères (suppression de +x, plafond de taille, rejet des symlinks) couvrent les risques réels avec un coût de maintenance minimal.

**Implications** :
- Les fichiers `scripts/` sont copiés avec leurs chemins relatifs préservés — les références depuis SKILL.md fonctionnent sans modification
- Le bit exécutable est supprimé à la sync : les développeurs doivent explicitement `chmod +x` avant d'exécuter, ce qui force une revue consciente
- Un en-tête `# ⚠️ AUTO-SYNCED from aitmpl.com — Review before executing` est ajouté aux fichiers texte (.py, .sh, .js) pour signaler clairement l'origine externe
- Les liens symboliques sont rejetés et une limite de 5 Mo par skill est appliquée pour éviter les abus de ressources
- Les fichiers compagnons syncés sont listés dans le résumé de sync pour visibilité

---

## D10 — Ordre des phases ⚡ NOUVELLE

**Date** : 2026-02-13 | **Statut** : ✅ Validée (suite à R2 produit)

**Décision** : Inverser Phase 5 et Phase 6.

| Avant | Après | Justification |
|-------|-------|---------------|
| Phase 4 → Phase 5 (CI) → Phase 6 (CLI) | Phase 4 LITE → Phase 6 (CLI) → Phase 5 (CI) | Users > Ops. CLI est valeur utilisateur directe. CI peut être exécuté manuellement. 2.5× plus rapide vers la première valeur. |

---

## Décisions reportées

| ID | Sujet | Raison du report |
|----|-------|-----------------|
| D11 | npm publish | Pas prioritaire, npx via GitHub fonctionne |
| D12 | API REST / web interface | Phase 8+, dépend du volume d'utilisateurs |
| D13 | Auto-merge des PR de sync | Risqué, à évaluer après plusieurs semaines de sync |
| D14 | Communication upstream (davila7) | R6 produit — à faire cette semaine mais pas bloquant |
