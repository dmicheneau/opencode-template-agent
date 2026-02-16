# Tâches détaillées — Plan V2.1

> **Version** : 2.1 | **Date** : 2026-02-13
> Intègre toutes les recommandations des revues produit (03) et technique (04)
> Ancien fichier de tâches archivé dans `.plan/archive/v1/`

## Vue d'ensemble

| Phase | Contenu | Sessions |
|-------|---------|----------|
| **Pré-requis P1-P3** | Extraction `sync_common.py`, fallback 429, décision `scripts/` | 1.5-2.5 |
| **Phase 4 LITE** | Prototype + `sync-skills.py` + tests + manifest (10-15 skills curés) | 3-4 |
| **Phase 4b** | Smoke test : 5 skills en sessions OpenCode réelles | 0.5 |
| **Phase 6** | CLI skills : `install --skill`, `list --skills`, `search` | 2-3 |
| **Phase 5** | CI automatisée `sync.yml` (agents + skills, cron hebdo, PR auto) | 3-4 |
| **Phase 7** | Tier 2 extended (~120 skills) + scoring automatique | 2-3 |
| **Total** | | **~11-15** |

---

## Pré-requis bloquants (P1-P3)

> ⚠️ Ces 3 tâches **DOIVENT** être complétées avant toute tâche de Phase 4.
> Elles résolvent les risques critiques C1, C3 et C4 identifiés par la revue technique.

### P1 — Extraire `scripts/sync_common.py`

**Priorité** : 🔴 Critique | **Estimation** : 1-2 sessions
**Bloqué par** : rien
**Débloque** : P2, T4.0, T4.1

**Description** :
Extraire ~430 lignes de code réutilisable depuis `sync-agents.py` (1609L) dans un nouveau module partagé `scripts/sync_common.py`. Ce refactoring élimine le risque C1 (duplication massive) et M1 (divergence progressive).

**Structure cible** :
```
scripts/
  sync_common.py    # ~430 lignes : HTTP, cache, parse, sécurité
  sync-agents.py    # ~1180 lignes : logique agents uniquement (importe sync_common)
  sync-skills.py    # ~600-800 lignes : logique skills (à créer en T4.1)
```

**Code à extraire** (identifié par revue technique §1) :

| Fonction / Classe | Lignes source | Rôle |
|---|---|---|
| `SafeRedirectHandler` | L53-69 (17L) | Bloque les redirections cross-origin |
| `_get_headers()` | L311-320 (10L) | Headers HTTP + auth token |
| `_http_request()` | L327-431 (105L) | Retry, backoff, rate-limit, 304 |
| `_api_get()` | L434-445 (12L) | GET JSON avec retry |
| `_raw_get()` | L448-466 (19L) | GET text avec cap 1MB |
| `_cached_get()` | L515-574 (60L) | ETag/If-Modified-Since |
| `check_rate_limit()` | L577-587 (11L) | Vérification rate limit API |
| `parse_frontmatter()` | L595-646 (52L) | Parse YAML (stdlib, paires clé-valeur) |
| `_load_sync_cache()` / `_save_sync_cache()` | L476-501 (26L) | Persistance du cache de sync |
| `_is_synced_*()` / `clean_synced_*()` | L1006-1080 (75L) | Détection/nettoyage fichiers synced (adaptable) |
| Path traversal guards | L1174-1184 (11L) | Sécurité chemins |
| **Total** | **~430 lignes** | |

**Critères d'acceptation** :
- [ ] `sync_common.py` créé avec toutes les fonctions listées ci-dessus
- [ ] `sync-agents.py` refactoré pour importer depuis `sync_common`
- [ ] Les 117 tests Python existants (`test_sync_script.py`) passent sans régression
- [ ] Les tests adaptés pour mocker les imports depuis `sync_common` si nécessaire
- [ ] Ajout du lint AST dans CI : `python3 -c "import ast; ast.parse(open('scripts/sync_common.py').read())"`
- [ ] Python stdlib only — aucune dépendance externe

---

### P2 — Fallback 429 sans Retry-After

**Priorité** : 🔴 Critique | **Estimation** : 30 min
**Bloqué par** : P1 (le code sera dans `sync_common.py`)
**Débloque** : T4.1

**Description** :
Le throttling de `raw.githubusercontent.com` retourne des 429 **sans** headers `Retry-After` ni `X-RateLimit-Reset`. Le code actuel de `_http_request()` (L376-397) ne gère que le cas avec headers. Sans ce fix, le sync de 120+ skills provoquera des échecs silencieux (risque C3).

**Implémentation** (dans `sync_common.py`, après extraction P1) :
```python
# Dans _http_request(), après le check Retry-After/X-RateLimit-Reset existant
if exc.code in (403, 429):
    retry_after = exc.headers.get("Retry-After")
    reset = exc.headers.get("X-RateLimit-Reset")
    if retry_after:
        wait = int(retry_after)
        # ... code existant ...
    elif reset:
        # ... code existant ...
    else:
        # Fallback: backoff exponentiel pour 429 sans headers
        wait = backoff * (2 ** attempt)  # 1s → 2s → 4s
        logger.warning(
            "  [rate-limit] No Retry-After header on %d, waiting %ds...",
            exc.code, wait
        )
        time.sleep(wait)
        continue
```

**Critères d'acceptation** :
- [ ] Backoff exponentiel 1s → 2s → 4s sur 429 sans headers
- [ ] Log warning avec le temps d'attente
- [ ] Test unitaire couvrant le cas 429 sans Retry-After
- [ ] Comportement existant (429 avec Retry-After) inchangé

---

### P3 — Décision : traitement des fichiers `scripts/` compagnons

**Priorité** : 🔴 Critique | **Estimation** : 15 min (décision uniquement)
**Bloqué par** : rien (indépendant)
**Débloque** : T4.1

**Description** :
Les skills upstream contiennent parfois des répertoires `scripts/` avec du code Python exécutable. Copier des scripts depuis une source non contrôlée est un risque de sécurité (C4). Il faut trancher entre les options avant d'implémenter T4.1.

**Options évaluées** :

| Option | Sécurité | Utilité | Complexité |
|--------|----------|---------|------------|
| A. Copier tel quel | 🔴 Risque élevé | ✅ Maximale | Faible |
| B. Renommer en `.py.txt` | 🟡 Moyen | 🟡 Réduite | Faible |
| C. Copier dans `reference/` | 🟡 Moyen | 🟡 Réduite | Faible |
| D. Exclure les scripts | ✅ Aucun risque | 🔴 Perte de contenu | Faible |
| **E. Copier + warning header** | 🟡 Moyen | ✅ Maximale | Faible |

**Décision recommandée** : **Option E** — copier avec warning header + cap 5MB total par skill + guard anti-symlink.

Warning header à insérer en tête de chaque script copié :
```python
# WARNING: This script was synced from an external source (aitmpl.com).
# Review before execution. Do not run untrusted code.
```

**Critères d'acceptation** :
- [ ] Option choisie et documentée dans `02-decisions-v2.md` (D9)
- [ ] Implémentation définie pour T4.1

---

## Phase 4 LITE — Script `sync-skills.py` + 10-15 skills curés

### T4.0 — Prototype : conversion manuelle de 3 skills

**Priorité** : 🔴 Haute | **Estimation** : 30 min
**Bloqué par** : P1, P2
**Débloque** : T4.1

**Description** :
Convertir manuellement 3 skills upstream pour valider les hypothèses de conversion avant de construire le pipeline automatique (recommandation R4 produit). Cette étape révèle les cas limites et évite des heures de conception spéculative.

**3 archétypes à convertir** :

| Archétype | Exemple | Complexité | Ce qu'il valide |
|-----------|---------|------------|-----------------|
| Simple | `clean-code` (development) | SKILL.md seul, pas de fichiers compagnons | Frontmatter mapping, path rewriting basique |
| Standard | Un skill avec `reference.md` ou `scripts/` | SKILL.md + 2-3 fichiers compagnons | Copie multi-fichiers, warning header scripts |
| Complexe | `brainstormai`-class (ou similaire) | SKILL.md + répertoires nestés (`workflows/`, `agents/`, `data/`) | Copie récursive, chemins profonds, limites de taille |

**Pour chaque skill, vérifier** :
1. Le frontmatter est correctement réduit à `name` + `description`
2. Le header de provenance est ajouté (`<!-- Synced from aitmpl.com | ... -->`)
3. Les chemins `~/.claude/skills/` sont réécrits en `.opencode/skills/`
4. Les fichiers compagnons sont correctement copiés avec la bonne arborescence
5. Le skill est reconnu par OpenCode (`skill` tool dans une session réelle)

**Critères d'acceptation** :
- [x] 3 skills convertis manuellement dans `.opencode/skills/` (clean-code, task-execution-engine, mcp-builder)
- [x] Document de retour d'expérience : cas limites découverts → `.plan/05-t40-retex.md`
- [x] Validation que le format est reconnu par OpenCode (6/6 checks pass)

---

### T4.1 — Script `sync-skills.py` (Python, stdlib only)

**Priorité** : 🔴 Haute | **Estimation** : 2-3 sessions
**Bloqué par** : P1, P2, P3, T4.0
**Débloque** : T4.3

**Description** :
Construire le script de synchronisation des skills depuis `davila7/claude-code-templates`. Utilise `sync_common.py` (P1) pour toute l'infrastructure HTTP/cache/parse. Sélectionne les skills via une liste `CURATED_SKILLS` manuelle (pas de scoring automatique — reporté à Phase 7).

**Pipeline de conversion** :
```
Fetch tree → Filter (CURATED_SKILLS) → Parse SKILL.md → Transform frontmatter
    → Rewrite paths → Copy companion files → Validate → Write manifest
```

#### Sélection : liste `CURATED_SKILLS` manuelle

Même pattern que `CURATED_AGENTS` (L120-175 de `sync-agents.py`) :

```python
CURATED_SKILLS: Dict[str, str] = {
    # Development
    "clean-code": "development/clean-code",
    "testing-patterns": "development/testing-patterns",
    # Architecture
    "api-design": "architecture/api-design",
    "design-patterns": "architecture/design-patterns",
    # DevOps
    "ci-cd": "devops/ci-cd",
    "docker-best-practices": "devops/docker-best-practices",
    # ... 10-15 skills hand-picked au total
}
```

> **Note** : Les noms et chemins exacts seront déterminés lors de T4.0 (prototype).
> Catégories exclues : `railway` (12), `sentry` (6), `video` (4) = 22 skills éliminés.

#### Mapping frontmatter

| Source (aitmpl) | Cible (OpenCode) |
|-----------------|------------------|
| `name` | `name` (direct) |
| `description` | `description` (direct, max 150 chars) |
| `allowed-tools` | SUPPRIMÉ |
| `version` | SUPPRIMÉ (non reconnu par OpenCode) |
| `priority` | SUPPRIMÉ (non reconnu par OpenCode) |
| `license` | SUPPRIMÉ (non reconnu par OpenCode) |

#### Header de provenance

Ajouté immédiatement après le frontmatter :
```markdown
<!-- Synced from aitmpl.com | source: davila7/claude-code-templates | category: {cat} -->
```

#### Réécriture de chemins

Dans le body et les scripts :
- `~/.claude/skills/{name}/` → `.opencode/skills/{name}/`
- `@[skills/other-skill]` → `Requires skill: other-skill`

#### Gestion multi-fichiers

| Type de fichier | Action |
|-----------------|--------|
| `SKILL.md` | Transformer (frontmatter + paths) et écrire |
| `*.md` (reference, forms, examples) | Copier dans le répertoire du skill |
| `scripts/*.py` | Copier avec warning header (décision P3) |
| `templates/*` | Copier dans `templates/` |
| Autres fichiers | Copier dans le répertoire du skill |

#### Mesures de sécurité (revue technique §9)

4 gardes obligatoires pour chaque fichier compagnon :

**A2 — Support fichiers non-texte** :
```python
def _raw_get(url, *, retries=3, backoff=1.0, decode=True):
    # ... existing logic ...
    if decode:
        return body.decode("utf-8")
    return body  # bytes bruts pour CSV, images, etc.
```

**A3 — Path traversal sur CHAQUE fichier compagnon** :
```python
for companion_path in skill_files:
    resolved = (skill_dir / companion_path).resolve()
    if not str(resolved).startswith(str(skill_dir.resolve()) + "/"):
        raise ValueError(f"[SECURITY] Path traversal in companion file: {companion_path}")
```

**A4 — Cap taille totale par skill (5MB)** :
```python
MAX_SKILL_TOTAL_SIZE = 5 * 1024 * 1024  # 5 MB
total = sum(len(content) for content in files.values())
if total > MAX_SKILL_TOTAL_SIZE:
    raise ValueError(f"Skill {name} exceeds size limit: {total} bytes")
```

**A5 — Guard anti-symlink** :
```python
if out_path.is_symlink():
    raise ValueError(f"[SECURITY] Symlink detected at {out_path}")
```

#### Délai inter-fichier

Pour éviter le throttling de `raw.githubusercontent.com` (pas de rate limit API formelle mais throttling à ~100 req/min) :
- Délai inter-fichier : **100ms** entre chaque download raw
- Délai inter-skill : **300ms** (cohérent avec `sync-agents.py` L1575)

**Critères d'acceptation** :
- [ ] Script `sync-skills.py` fonctionnel avec `CURATED_SKILLS` manuelle
- [ ] Importe toute l'infra depuis `sync_common.py` (0 duplication)
- [ ] 10-15 skills core synced dans `.opencode/skills/`
- [ ] 4 gardes de sécurité implémentés (A2, A3, A4, A5)
- [ ] Fichiers compagnons copiés avec warning header (si option E retenue pour P3)
- [ ] Délais inter-fichier et inter-skill respectés
- [ ] 4 skills hand-written (`brainstormai`, `browser-mcp`, `memory`, `sequential-thinking`) jamais touchés (protection D8)
- [ ] Mode `--clean` pour supprimer les skills synced (comme `sync-agents.py`)
- [ ] Mode `--dry-run` pour prévisualiser sans écrire

---

### T4.3 — Tests de validation skills

**Priorité** : 🔴 Haute | **Estimation** : 1 session
**Bloqué par** : T4.1
**Débloque** : T4.4

**Description** :
Créer une suite de tests complète pour le script `sync-skills.py` et pour la validation des skills produits. Inclut les 3 fixtures d'archétypes recommandées par la revue technique (§8).

#### Fixtures d'archétypes (A — revue technique §8)

Créer 3 répertoires de fixtures dans `tests/fixtures/skills/` :

```
tests/fixtures/skills/
  simple-skill/               # Archétype 1 : SKILL.md seul
    SKILL.md
  standard-skill/             # Archétype 2 : SKILL.md + fichiers compagnons
    SKILL.md
    reference.md
    scripts/
      helper.py
  complex-skill/              # Archétype 3 : SKILL.md + répertoires nestés
    SKILL.md
    agents/
      analyst.agent.md
    workflows/
      brainstorm/
        data/techniques.csv
        steps/step-01.md
    templates/
      output.md
```

#### Tests à implémenter

**Tests unitaires (`tests/test_sync_skills.py`)** :
- [ ] Parse frontmatter : extraction `name` + `description`, suppression des champs non reconnus
- [ ] Réécriture de chemins : `~/.claude/` → `.opencode/`
- [ ] Réécriture des références : `@[skills/X]` → `Requires skill: X`
- [ ] Header de provenance : présent et correctement formaté
- [ ] `CURATED_SKILLS` : seuls les skills listés sont synced
- [ ] Mode `--clean` : supprime tous les skills synced (pas les hand-written)
- [ ] Mode `--dry-run` : aucun fichier écrit

**Tests de sécurité** :
- [ ] Path traversal rejeté : `../../../etc/passwd` dans un chemin compagnon
- [ ] Path traversal rejeté : `scripts/../../malicious.sh`
- [ ] Symlink rejeté : fichier compagnon qui est un symlink
- [ ] Cap taille : skill dépassant 5MB total rejeté
- [ ] Noms de fichiers invalides rejetés

**Tests de structure (`tests/test_skills.py`)** :
- [ ] Chaque skill synced a un `SKILL.md` valide
- [ ] Frontmatter contient `name` et `description`
- [ ] Header de provenance (`<!-- Synced from aitmpl.com`) présent sur les synced
- [ ] Header de provenance ABSENT sur les 4 skills hand-written
- [ ] Pas de liens internes cassés
- [ ] Budget contexte : ≤ 15 skills × 4 lignes = ~60 lignes dans `available_skills`

**Critères d'acceptation** :
- [ ] 3 fixtures d'archétypes créées
- [ ] Tests unitaires pour `sync-skills.py` (minimum 30 tests)
- [ ] Tests de validation structurelle pour les skills produits
- [ ] Tests de sécurité pour les fichiers compagnons
- [ ] Tous les tests verts, 0 régression sur les 176 tests existants

---

### T4.4 — Manifest `skills-manifest.json`

**Priorité** : 🟡 Moyenne | **Estimation** : inclus dans T4.1
**Bloqué par** : T4.3
**Débloque** : Phase 4b

**Description** :
Générer un fichier `skills-manifest.json` à la racine du projet. Ce manifest doit lister **TOUS les fichiers** de chaque skill (A9 — revue technique §6), pas seulement `SKILL.md`. C'est indispensable pour que la CLI sache quoi télécharger lors de `install --skill`.

**Schema** :
```json
{
  "schema_version": "1.0",
  "synced_at": "2026-02-13T04:00:00Z",
  "source_repo": "davila7/claude-code-templates",
  "source_tree_sha": "abc123...",
  "total_source_skills": 686,
  "excluded_categories": {
    "railway": 12,
    "sentry": 6,
    "video": 4
  },
  "excluded_total": 22,
  "synced_count": 15,
  "skills": [
    {
      "name": "clean-code",
      "category": "development",
      "source_path": "cli-tool/components/skills/development/clean-code",
      "target_path": ".opencode/skills/clean-code",
      "description": "Best practices for writing clean, maintainable code",
      "files": [
        {"path": "SKILL.md", "size": 4521, "sha": "abc123"},
        {"path": "scripts/lint_runner.py", "size": 890, "sha": "def456"}
      ],
      "total_size": 5411,
      "status": "synced"
    }
  ]
}
```

**Points clés** :
- `files[]` liste exhaustive de tous les fichiers du skill (pas juste SKILL.md)
- `total_size` pour validation côté CLI (cap 5MB)
- `sha` par fichier pour détecter les changements lors des syncs ultérieurs
- `schema_version` pour faciliter les migrations futures (recommandation revue technique §10)

**Critères d'acceptation** :
- [ ] Manifest généré automatiquement par `sync-skills.py`
- [ ] Chaque skill a la liste complète de ses fichiers avec taille et SHA
- [ ] Champ `schema_version` présent
- [ ] Test de validation du schema du manifest

---

## Phase 4b — Smoke test en sessions OpenCode réelles

**Priorité** : 🟡 Moyenne | **Estimation** : 0.5 session
**Bloqué par** : T4.4
**Débloque** : T6.1

**Description** :
Valider le produit avant de scaler la pipeline (recommandation R8 produit). Utiliser 5 skills synced en sessions OpenCode **réelles** pour vérifier qu'ils apportent de la valeur et fonctionnent correctement.

**Protocole de test** :

Pour chaque skill testé :

| # | Vérification | Attendu |
|---|-------------|---------|
| 1 | Le skill apparaît dans `available_skills` du `skill` tool | ✅ Listé avec `name` et `description` |
| 2 | Le `skill` tool charge le skill correctement | ✅ Contenu injecté dans le contexte |
| 3 | Les instructions du skill sont cohérentes et utiles | ✅ Pas de références cassées, instructions applicables |
| 4 | Les fichiers compagnons sont accessibles si référencés | ✅ Chemins internes résolus |
| 5 | Le budget contexte est acceptable (pas de bloat) | ✅ Pas d'impact visible sur la performance |

**5 skills à tester** :
- 1 skill simple (SKILL.md seul)
- 1 skill standard (SKILL.md + fichiers compagnons)
- 1 skill de chaque grande catégorie : development, architecture, devops

**Livrables** :
- [ ] 5 skills testés en sessions réelles
- [ ] Document de retour : ce qui fonctionne, ce qui ne fonctionne pas
- [ ] Corrections appliquées si nécessaire avant de passer à Phase 6
- [ ] Décision go/no-go pour le scaling

---

## Phase 6 — CLI : Support Skills

> ⚡ Phase 6 est exécutée **AVANT** Phase 5 (inversion R2 produit).
> Justification : CLI = valeur utilisateur directe. CI = infrastructure opérationnelle.
> Le sync peut être exécuté manuellement pendant des semaines. L'accès CLI ne peut pas.
> Résultat : première valeur HIGH en ~5-6 sessions au lieu de ~12-15 (amélioration 2.5×).

### T6.1 — Commandes CLI et infrastructure pour skills

**Priorité** : 🔴 Haute | **Estimation** : 1-2 sessions
**Bloqué par** : Phase 4b
**Débloque** : T6.2

**Description** :
Ajouter le support des skills dans la CLI npm. Cela nécessite un refactoring structurel de `installer.mjs` (actuellement single-file only) et l'ajout de `loadSkillsManifest()` dans `registry.mjs`.

**Nouvelles commandes** :
```bash
npx opencode-agents install --skill clean-code
npx opencode-agents install --skill clean-code,api-design
npx opencode-agents list --skills
npx opencode-agents search "testing"    # cherche dans agents ET skills
```

#### Refactoring `registry.mjs`

- Créer `loadSkillsManifest()` parallèle à `loadManifest()` (actuellement L87-101)
- Type `SkillEntry` distinct de `AgentEntry` (le `AgentEntry` actuel L36-44 est fixé sur `agents[]`)
- Cache séparé `_cachedSkills` (ou abstraction `loadJsonManifest(path)` générique)

#### Refactoring `installer.mjs` (revue technique §6)

L'`installer.mjs` actuel (212L) ne gère que des fichiers uniques :
```
download(url) → string → writeFileSync(dest, content, 'utf-8')
```

Pour les skills, il faut :

**A10 — `downloadBinary()` pour fichiers non-texte** :
```javascript
function downloadBinary(url, _redirectCount = 0) {
  // Comme download() mais retourne Buffer.concat(chunks) sans .toString()
  // Nécessaire pour CSV, images, et autres fichiers non-texte
}
```

**A11 — Pool de download concurrent (max 3)** :
```javascript
async function downloadPool(urls, concurrency = 3) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map(url => downloadBinary(url))));
  }
  return results;
}
```

**A9 — Itération sur `skills-manifest.json`** :
La CLI itère sur le champ `files[]` du manifest pour savoir quels fichiers télécharger. Pas besoin d'appel API tree — tout est dans le manifest.

```javascript
async function installSkill(skillName, cwd) {
  const manifest = await loadSkillsManifest();
  const skill = manifest.skills.find(s => s.name === skillName);
  const files = skill.files; // Liste exhaustive depuis le manifest
  // Créer la structure de répertoires + télécharger tous les fichiers
}
```

**A12 — `SAFE_NAME_RE` étendu pour chemins compagnons** :
```javascript
// Actuel (agents, L56 de registry.mjs) :
const SAFE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

// Étendu pour skills (chemins avec sous-répertoires) :
const SAFE_SKILL_PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/;
```

**Path traversal récursif** :
```javascript
for (const file of skill.files) {
  const filePath = resolve(skillDir, file.path);
  if (!filePath.startsWith(skillDir + sep)) {
    throw new Error(`Security: path "${file.path}" escapes skill directory`);
  }
}
```

**Critères d'acceptation** :
- [ ] `install --skill` fonctionne pour un skill simple et un skill multi-fichiers
- [ ] `install --skill X,Y` installe plusieurs skills
- [ ] `list --skills` affiche les skills disponibles
- [ ] `downloadBinary()` créé et fonctionnel
- [ ] Pool concurrent max 3 pour les fichiers compagnons
- [ ] Path traversal guard sur chaque fichier téléchargé
- [ ] `SAFE_SKILL_PATH_RE` validant les chemins compagnons
- [ ] `loadSkillsManifest()` dans `registry.mjs`
- [ ] Dry-run mode supporté

---

### T6.2 — Search cross-type avec préfixe `[agent]`/`[skill]`

**Priorité** : 🟡 Moyenne | **Estimation** : inclus dans T6.1
**Bloqué par** : T6.1
**Débloque** : T6.3

**Description** :
La commande `search` doit chercher dans les agents **ET** les skills, avec un préfixe de type pour désambiguïser les résultats (M4 — revue technique §7).

**Affichage** :
```
$ npx opencode-agents search "review"

  [agent] code-reviewer              — Code review expert
  [skill] code-review-checklist      — How to conduct effective code reviews
  [agent] security-auditor           — Security audit specialist
  [skill] security-review            — Security review methodology
```

**Implémentation** :
- Étendre `searchAgents()` (L164-177 de `registry.mjs`) en `searchAll()` qui cherche dans les deux manifests
- Ajouter le préfixe `[agent]`/`[skill]` dans le formatteur de résultats
- Trier les résultats par pertinence (score de matching), pas par type

**Critères d'acceptation** :
- [ ] `search` retourne agents ET skills
- [ ] Préfixe `[agent]`/`[skill]` visible dans chaque résultat
- [ ] Pas de collision de noms non gérée (un agent et un skill peuvent avoir le même nom)
- [ ] Performance acceptable même avec 15 skills + 49 agents

---

### T6.3 — Tests CLI pour skills

**Priorité** : 🟡 Moyenne | **Estimation** : 1 session
**Bloqué par** : T6.2
**Débloque** : T5.1

**Description** :
Étendre `tests/cli.test.mjs` (actuellement 59 tests, 642 lignes) pour couvrir toutes les nouvelles commandes skills.

**Tests à ajouter** :
- [ ] `install --skill X` : installation d'un skill simple (SKILL.md seul)
- [ ] `install --skill X` : installation d'un skill multi-fichiers (structure de répertoires créée)
- [ ] `install --skill X,Y` : installation multiple
- [ ] `install --skill X --dry-run` : prévisualisation sans écriture
- [ ] `list --skills` : listing correct des skills disponibles
- [ ] `search "query"` : résultats incluant agents ET skills avec préfixes
- [ ] Erreur gracieuse : skill inexistant
- [ ] Erreur gracieuse : manifest skills absent
- [ ] Path traversal rejeté dans les chemins de fichiers compagnons
- [ ] Compatibilité Node 20, 22, 23

**Critères d'acceptation** :
- [ ] Minimum 20 nouveaux tests CLI
- [ ] 0 régression sur les 59 tests CLI existants
- [ ] Tests passent sur Node 20, 22, 23
- [ ] Couverture des cas d'erreur et de sécurité

---

## Phase 5 — CI Automatisée `sync.yml`

> ⚡ Phase 5 est exécutée **APRÈS** Phase 6 (inversion R2 produit).
> Le sync peut être exécuté manuellement (`python3 scripts/sync-skills.py`) en attendant.

### T5.1 — Workflow GitHub Actions `sync.yml`

**Priorité** : 🟡 Moyenne | **Estimation** : 1-2 sessions
**Bloqué par** : T6.3, A8 (`validate.py`)
**Débloque** : T5.2

**Description** :
Créer un workflow CI qui synchronise automatiquement les agents et skills depuis le repo upstream via un cron hebdomadaire, avec création de PR automatique.

#### Architecture (révisée — A6 technique)

```
detect-changes → sync (séquentiel: agents puis skills) → validate → create-pr
```

> ⚠️ **Job SÉQUENTIEL** (pas parallèle) pour sync-agents + sync-skills (A6).
> Justification : Les jobs parallèles nécessitent des artifacts pour partager le workspace Git.
> Le gain de temps (~2-3 min) ne justifie pas la complexité. Un seul job `sync` exécute
> séquentiellement les deux scripts.

#### Schedule

```yaml
on:
  schedule:
    - cron: '0 4 * * 0'     # Dimanche 04:00 UTC
  workflow_dispatch:          # Déclenchement manuel
```

#### Permissions (A7 — scopées au workflow)

```yaml
# sync.yml — permissions au niveau du workflow, PAS globales au repo
permissions:
  contents: write
  pull-requests: write
```

> Le CI actuel (`ci.yml` L9-10) n'a que `contents: read`. Les permissions élargies
> sont **scopées à `sync.yml` uniquement**.

#### Job 1 — `detect-changes`

- Appel API GitHub recursive tree (`/git/trees/main?recursive=1`)
- Compare le SHA du tree `cli-tool/components/` avec `.sync-state.json`
- Si identique → skip les jobs suivants
- Outputs : `agents_changed`, `skills_changed` (booleans)

#### Job 2 — `sync` (séquentiel, conditionnel)

```yaml
sync:
  needs: detect-changes
  if: needs.detect-changes.outputs.agents_changed == 'true' || needs.detect-changes.outputs.skills_changed == 'true'
  steps:
    - uses: actions/checkout@SHA  # SHA-pinned
    - name: Sync agents
      if: needs.detect-changes.outputs.agents_changed == 'true'
      run: python3 scripts/sync-agents.py
    - name: Sync skills
      if: needs.detect-changes.outputs.skills_changed == 'true'
      run: python3 scripts/sync-skills.py
```

#### Job 3 — `validate`

- Exécute `python3 scripts/validate.py` (A8 — validateur extrait, voir T5.4)
- Exécute `node --test tests/cli.test.mjs`
- Vérifie la cohérence des manifests

#### Job 4 — `create-pr`

- Utilise `peter-evans/create-pull-request` (SHA-pinned)
- Branche fixe : `sync/upstream-auto`
- Met à jour la PR existante si elle est encore ouverte
- Title : `sync: update from aitmpl.com (YYYY-MM-DD)`
- Body : diff des composants ajoutés/modifiés/supprimés
- Label : `auto-sync`

**Critères d'acceptation** :
- [ ] Workflow `sync.yml` fonctionnel avec cron + manual trigger
- [ ] Job séquentiel (pas parallèle) pour agents + skills
- [ ] Permissions scopées au workflow (pas globales)
- [ ] Toutes les actions SHA-pinned
- [ ] PR créée/mise à jour automatiquement
- [ ] Skip si aucun changement détecté
- [ ] Pas de secrets dans les logs

---

### T5.2 — Fichier d'état `.sync-state.json`

**Priorité** : 🟡 Moyenne | **Estimation** : inclus dans T5.1
**Bloqué par** : T5.1
**Débloque** : T5.3

**Description** :
Fichier de persistance pour détecter les changements entre deux syncs. Format choisi : `.sync-state.json` (décision D5, confirmée par R7 produit).

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

**Critères d'acceptation** :
- [ ] Fichier créé/mis à jour à chaque sync
- [ ] Utilisé par le job `detect-changes` pour le diff
- [ ] Commité dans le repo (pas dans `.gitignore`)

---

### T5.3 — Rate limiting et sécurité

**Priorité** : 🔴 Haute | **Estimation** : inclus dans T5.1
**Bloqué par** : T5.2
**Débloque** : T5.4

**Description** :
Corriger le calcul de rate limiting (risque C3) et documenter les contraintes réelles.

#### Calcul corrigé (revue technique §5)

> ⚠️ L'estimation initiale de **~936 appels** est **fausse**. Le calcul réel est **2000+ appels**.

| Opération | Appels API `api.github.com` | Downloads raw `raw.githubusercontent.com` |
|---|---|---|
| Tree API recursive (detect) | 1 | — |
| Agents : Contents API par catégorie (~15) | ~15 | — |
| Agents : Raw download (~130 extended) | — | ~130 |
| Skills : Tree API | (déjà compté) | — |
| Skills : SKILL.md download (15-120 skills) | — | 15-120 |
| Skills : fichiers compagnons | — | **50-200+** |
| Rate limit check | 1 | — |
| **Total** | **~18** (bien < 5000/hr) | **195-450+** |

**Deux systèmes distincts** :
- `api.github.com` : rate limit 5000/hr avec token → ✅ non problématique
- `raw.githubusercontent.com` : throttling non documenté, ~100 req/min, 429 sans `Retry-After` → ⚠️ risque réel

**Mitigations** :
- P2 (déjà fait) : fallback backoff exponentiel sur 429 sans headers
- Délai inter-fichier : **100ms** entre chaque download raw de fichier compagnon
- Délai inter-skill : **300ms** entre chaque skill
- Alternative fallback : utiliser l'API Git blobs (`/repos/{owner}/{repo}/git/blobs/{sha}`) si le raw est trop throttlé (consomme le rate limit API à 5000/hr mais plus prévisible)

**Sécurité CI** :
- `GITHUB_TOKEN` : token automatique GitHub Actions
- Pas de secrets dans les logs : jamais de token dans les outputs
- Actions SHA-pinned : toutes les actions épinglées par SHA (cohérent avec `ci.yml` existant)

**Critères d'acceptation** :
- [ ] Délais inter-fichier (100ms) et inter-skill (300ms) configurés
- [ ] Documentation du calcul de rate limit réel dans le code
- [ ] Fallback API blobs documenté (même si pas implémenté initialement)
- [ ] 0 secret dans les logs CI

---

### T5.4 — Protection des composants custom + validateur extrait

**Priorité** : 🔴 Haute | **Estimation** : inclus dans T5.1
**Bloqué par** : T5.3
**Débloque** : T7.1

**Description** :
Deux livrables combinés : protection des composants custom (D8) et extraction du validateur CI inline (A8).

#### 4 couches de protection (D8)

1. **Blocklist** : Liste des fichiers custom à ne jamais écraser (ex: `episode-orchestrator.md`, les 4 skills hand-written)
2. **Header de sync** : `<!-- Synced from aitmpl.com` identifie les fichiers synced
3. **Validation CI** : Vérifie que les custom n'ont pas le header de sync
4. **Tests** : Coverage des custom séparé des synced

#### Extraction du validateur CI (A8 — revue technique §10)

Le validateur actuel est **inline dans `ci.yml`** (L78-125, 47 lignes de Python dans un heredoc YAML). C'est fragile et non testable.

**Avant** (dans `ci.yml`) :
```yaml
- name: Validate agents
  run: |
    python3 -c "
    import os, sys
    # ... 47 lignes de Python inline ...
    "
```

**Après** (script réutilisable) :
```
scripts/validate.py    # Validateur réutilisable pour agents ET skills
```

Le script `validate.py` :
- Valide les agents (frontmatter, body, structure) — même logique que l'inline actuel
- Valide les skills (frontmatter minimal, header provenance, fichiers compagnons)
- Retourne un exit code non-zero si des erreurs sont trouvées
- Est testable unitairement
- Est réutilisable entre `ci.yml` et `sync.yml`

**Critères d'acceptation** :
- [ ] `scripts/validate.py` créé et fonctionnel
- [ ] Valide agents ET skills
- [ ] `ci.yml` mis à jour pour utiliser `python3 scripts/validate.py`
- [ ] `sync.yml` utilise le même validateur
- [ ] Tests unitaires pour le validateur
- [ ] 4 couches de protection custom opérationnelles

---

## Phase 7 — Tier 2 Extended + Scoring Automatique

### T7.1 — Scoring automatique (ex-T4.2, reporté)

**Priorité** : 🟢 Basse | **Estimation** : 1-2 sessions
**Bloqué par** : T5.4
**Débloque** : T7.2

**Description** :
Implémenter le système de scoring automatique, **informé par les données d'usage réelles** collectées depuis le lancement de Phase 4 LITE (recommandation R1 produit — scoring basé sur données, pas gut-feel).

**Critères de scoring** (score 0-100, à calibrer avec les données réelles) :

| Facteur | Poids | Source de données |
|---------|-------|-------------------|
| Utilité cross-projet | 3× | Install counts depuis le manifest, feedback utilisateur |
| Qualité du contenu | 2× | Taille SKILL.md, présence de fichiers compagnons, complétude |
| Complémentarité agents | 2× | Analyse automatique des descriptions vs agents existants |
| Popularité upstream | 1× | `trending-data.json` si disponible |
| Taille adaptée | 1× | Pénalité si < 20 lignes (stub) ou > 500 lignes (bloat) |

**Tiers automatiques** :

| Tier | Seuil | Volume estimé | Action |
|------|-------|--------------|--------|
| Core | ≥ 60 | ~25 | Installé par défaut dans `.opencode/skills/` |
| Extended | ≥ 30 | ~120 | Catalogué, install on-demand via CLI |
| Archive | < 30 | ~540 | Disponible dans le repo source uniquement |

**Critères d'acceptation** :
- [ ] Algorithme de scoring implémenté dans `sync-skills.py`
- [ ] Basé sur au moins 1 source de données réelles (install counts ou feedback)
- [ ] Tiers générés automatiquement à chaque sync
- [ ] Résultats du scoring dans `skills-manifest.json` (champ `score`)
- [ ] Tests unitaires pour l'algorithme de scoring

---

### T7.2 — Catalogue Tier 2 (~120 skills on-demand)

**Priorité** : 🟢 Basse | **Estimation** : 1 session
**Bloqué par** : T7.1
**Débloque** : T7.3

**Description** :
Rendre les skills Tier 2 installables via CLI sans les inclure dans `.opencode/skills/` par défaut.

**Implémentation** :
- `sync-skills.py` génère les entrées Tier 2 dans `skills-manifest.json` avec `"status": "available"` (pas `"synced"`)
- La CLI `list --skills` affiche les Tier 2 avec un indicateur `[available]` vs `[installed]`
- `install --skill X` télécharge depuis le manifest même si le skill n'est pas pré-installé
- Les Tier 2 ne sont PAS dans `.opencode/skills/` par défaut (pas de bloat)

**Critères d'acceptation** :
- [ ] ~120 skills Tier 2 dans le manifest avec `status: available`
- [ ] CLI `list --skills` distingue installed/available
- [ ] `install --skill` fonctionne pour les Tier 2 (download on-demand)
- [ ] 0 fichier ajouté à `.opencode/skills/` pour les Tier 2 non installés

---

### T7.3 — Détection de nouveaux composants upstream

**Priorité** : 🟢 Basse | **Estimation** : 1 session
**Bloqué par** : T7.2
**Débloque** : rien (fin du plan)

**Description** :
Détecter automatiquement les nouveaux skills/agents ajoutés dans le repo upstream entre deux syncs.

**Implémentation** :
- Comparer le tree SHA à chaque sync avec `.sync-state.json`
- Identifier les NOUVEAUX skills/agents (pas seulement les modifiés)
- Les marquer comme `"status": "new"` dans le manifest
- Les inclure dans la PR de sync avec un label `new-components`
- Notification dans le body de la PR : liste des nouveaux composants à évaluer

**Critères d'acceptation** :
- [ ] Détection des nouveaux composants (absents du manifest précédent)
- [ ] Statut `new` dans le manifest
- [ ] Label `new-components` sur la PR si des nouveaux sont détectés
- [ ] Log des ajouts/modifications/suppressions dans le body de la PR

---

## Chaîne de dépendances

```
P3 (décision scripts/) ─────────────────────┐
                                             │
P1 (sync_common.py) ──→ P2 (429 fallback) ──┤
                                             │
                                             ▼
                                      T4.0 (prototype 3 skills)
                                             │
                                             ▼
                                      T4.1 (sync-skills.py)
                                             │
                                             ▼
                                      T4.3 (tests skills)
                                             │
                                             ▼
                                      T4.4 (manifest)
                                             │
                                             ▼
                                      Phase 4b (smoke test 5 skills)
                                             │
                                             ▼
                                      T6.1 (CLI install/list)
                                             │
                                             ▼
                                      T6.2 (search cross-type)
                                             │
                                             ▼
                                      T6.3 (tests CLI skills)
                                             │
                                             ▼
             A8 (validate.py) ────→   T5.1 (workflow sync.yml)
                                             │
                                             ▼
                                      T5.2 (.sync-state.json)
                                             │
                                             ▼
                                      T5.3 (rate limiting)
                                             │
                                             ▼
                                      T5.4 (protection custom)
                                             │
                                             ▼
                                      T7.1 (scoring auto)
                                             │
                                             ▼
                                      T7.2 (Tier 2 ~120 skills)
                                             │
                                             ▼
                                      T7.3 (détection nouveaux)
```

---

## Récapitulatif des estimations

| Phase | Tâches | Sessions estimées |
|-------|--------|-------------------|
| **Pré-requis** | P1 + P2 + P3 | 1.5-2.5 |
| **Phase 4 LITE** | T4.0 + T4.1 + T4.3 + T4.4 | 3-4 |
| **Phase 4b** | Smoke test | 0.5 |
| **Phase 6** | T6.1 + T6.2 + T6.3 | 2-3 |
| **Phase 5** | T5.1 + T5.2 + T5.3 + T5.4 | 3-4 |
| **Phase 7** | T7.1 + T7.2 + T7.3 | 2-3 |
| **Total** | **18 tâches** | **~11-15 sessions** |

### Jalons clés

| Jalon | Après | Valeur livrée |
|-------|-------|---------------|
| 🏁 **Premier skill synced** | T4.1 (~session 4) | 10-15 skills fonctionnels dans `.opencode/skills/` |
| 🏁 **Produit validé** | Phase 4b (~session 5) | 5 skills testés en conditions réelles |
| 🏁 **Première valeur HIGH** | T6.3 (~session 7) | CLI `install --skill` disponible pour les utilisateurs |
| 🏁 **Infra complète** | T5.4 (~session 11) | Sync automatisé avec CI hebdomadaire |
| 🏁 **Catalogue complet** | T7.3 (~session 14) | ~145 skills disponibles (25 core + 120 extended) |

---

## Références croisées

| Ref revue | Intégré dans | Description |
|-----------|-------------|-------------|
| R1 produit | T4.1 (CURATED_SKILLS), T7.1 | Scoring reporté, curation manuelle pour v1 |
| R2 produit | Ordre des phases (6 avant 5) | Inversion CLI/CI |
| R3 produit | P1 | Extraction `sync_common.py` |
| R4 produit | T4.0 | Prototype 3 skills |
| R8 produit | Phase 4b | Smoke test |
| C1 technique | P1 | Duplication ~430 lignes |
| C3 technique | P2, T5.3 | Rate limiting sous-estimé |
| C4 technique | P3, T4.1 (A3-A5) | Sécurité fichiers compagnons |
| A2 technique | T4.1 | `_raw_get_bytes()` |
| A3 technique | T4.1 | Path traversal par fichier |
| A4 technique | T4.1 | Cap 5MB par skill |
| A5 technique | T4.1 | Guard anti-symlink |
| A6 technique | T5.1 | Job séquentiel CI |
| A7 technique | T5.1 | Permissions scopées |
| A8 technique | T5.4 | `validate.py` extrait |
| A9 technique | T4.4, T6.1 | Manifest liste tous les fichiers |
| A10 technique | T6.1 | `downloadBinary()` |
| A11 technique | T6.1 | Pool concurrent max 3 |
| A12 technique | T6.1 | `SAFE_NAME_RE` étendu |
| M4 technique | T6.2 | Préfixe `[agent]`/`[skill]` |
