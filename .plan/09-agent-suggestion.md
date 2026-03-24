# S9 — Suggestion Intelligente d'Agents

**Version:** 1.1
**Created:** 2026-03-23
**Updated:** 2026-03-23
**Status:** Draft — corrections post-revue appliquées, prêt pour implémentation
**Scope:** Analyse du projet utilisateur et du contexte conversationnel pour recommander les agents les plus pertinents du registre.

---

## 1. Objectif & Scope

### Ce que fait la feature

Analyser automatiquement le projet de l'utilisateur (stack technique, dépendances, structure) et optionnellement son prompt/intention pour recommander les agents les plus pertinents parmi les 69 du registre. Deux surfaces d'intégration : un tool plugin `suggest_agents` (pour les sessions OpenCode) et une commande CLI `opencode-agents suggest` (pour l'onboarding).

### Non-goals

- **Pas d'installation automatique** — on recommande, l'utilisateur décide.
- **Pas de NLP avancé** — tokenisation simple + dictionnaire de mots-clés, pas de modèle embarqué.
- **Pas de télémétrie** — aucune donnée de suggestion n'est envoyée nulle part.
- **Pas de hook proactif en v1** — le hook `chat.message` est documenté comme amélioration future (Phase 4).
- **Pas d'apprentissage** — les scores ne s'ajustent pas en fonction de ce que l'utilisateur installe.

### Métriques de succès

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Précision top-5 | ≥ 3/5 pertinents sur projet typique | Test fixtures (React+TS, Go API, Python ML) |
| Latence suggest_agents | < 200ms | Benchmark avec `performance.now()` dans tests |
| Couverture métadonnées | 100% agents ont ≥1 ecosystem + ≥1 intent tag | Script de validation |
| Adoption | Le tool est appelé spontanément par le LLM | Observation qualitative post-déploiement |

---

## 2. Architecture Overview

### 3 couches

```
┌─────────────────────────────────────────────────────────┐
│                  Integration Surfaces                    │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  Plugin Tool         │  │  CLI Command             │  │
│  │  suggest_agents      │  │  opencode-agents suggest │  │
│  │  (prompt + project)  │  │  (project only)          │  │
│  └────────┬────────────┘  └──────────┬───────────────┘  │
│           │                          │                   │
│           ▼                          ▼                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Scoring Engine                       │   │
│  │  scoreAgents(profile, prompt?, installed)         │   │
│  │                                                   │   │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ Stack Score │ │ Intent   │ │ Pack Affinity│   │   │
│  │  │ (ecosystem) │ │ Score    │ │ + Related    │   │   │
│  │  └────────────┘ └──────────┘ └──────────────┘   │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Stack Detector                       │   │
│  │  detectProjectProfile(directory)                  │   │
│  │                                                   │   │
│  │  package.json → deps → frameworks                 │   │
│  │  go.mod, Cargo.toml, pyproject.toml, ...         │   │
│  │  Dockerfile, .github/workflows/, tsconfig.json   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Query Analyzer                       │   │
│  │  analyzeQuery(prompt)                             │   │
│  │                                                   │   │
│  │  Tokenize → keyword dict match → intents + tech  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │ manifest.json│ (enrichi : triggers, ecosystem, intent, related_agents)
                    └──────────────┘
```

### Data flow — appel `suggest_agents`

1. Plugin reçoit l'appel avec `ctx.directory` et optionnel `context`
2. `detectProjectProfile(ctx.directory)` → `ProjectProfile`
3. Si `context` fourni → `analyzeQuery(context)` → `QuerySignals`
4. `getManifest()` charge le registre (caché par mtime)
5. `detectInstalledSet(manifest, ctx.directory)` → `Set<string>`
6. `scoreAgents({ profile, query?, installed, manifest })` → `Suggestion[]`
7. Formatage texte des top 10 suggestions avec raisons

---

## 3. Phase 1 — Enrichissement des Métadonnées (Mode Hybride)

Les métadonnées actuelles du manifest sont insuffisantes pour un scoring de qualité. Les 228 tags existants sont trop fragmentés (seulement 42 apparaissent plus d'une fois). Les sections Decisions des agents contiennent des mots-clés de déclenchement riches mais inexploités.

### 3.1 Automatisé : Extraction des Trigger Keywords

**Fichier :** `scripts/extract-triggers.py`

**Principe :** Parser la section `## Decisions` de chaque agent `.md`, extraire les mots-clés techniques des conditions IF/ELIF/ELSE.

```python
#!/usr/bin/env python3
"""Extract trigger keywords from agent Decisions sections.

Reads agents/<category>/<name>.md, parses ## Decisions,
extracts technical keywords from IF/ELIF/ELSE conditions.
Outputs a JSON mapping: { agent_name: string[] }.
"""

import json
import re
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "triggers.json"

# Patterns de conditions dans les sections Decisions
CONDITION_RE = re.compile(
    r"(?:^|\n)\s*[-*]?\s*(?:IF|ELIF|ELSE|When|If)\s+(.+?)(?:→|—|$)",
    re.MULTILINE | re.IGNORECASE,
)

# Mots à ignorer (articles, conjonctions, verbes génériques)
STOPWORDS = {
    "the", "a", "an", "is", "are", "has", "have", "need", "needs",
    "more", "than", "with", "without", "only", "not", "no", "yes",
    "you", "your", "it", "its", "this", "that", "and", "or", "but",
    "for", "from", "into", "over", "under", "between", "through",
    "if", "elif", "else", "when", "then", "should", "would", "could",
    "be", "been", "being", "do", "does", "done", "get", "got",
    "use", "uses", "used", "using", "want", "wants", "of", "in",
    "to", "at", "by", "on", "up", "out", "off", "about",
}


def extract_decisions_section(content: str) -> str:
    """Extract text between ## Decisions and the next ## heading."""
    match = re.search(
        r"^## Decisions\s*\n(.*?)(?=^## |\Z)",
        content,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1) if match else ""


def extract_keywords(decisions_text: str) -> list[str]:
    """Extract technical keywords from IF/ELIF conditions."""
    keywords = []
    for match in CONDITION_RE.finditer(decisions_text):
        condition = match.group(1).strip()
        # Tokenize: split on non-alphanumeric (keep hyphens for tech terms)
        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9._-]*", condition)
        for token in tokens:
            normalized = token.lower().strip(".-_")
            if normalized and normalized not in STOPWORDS and len(normalized) > 2:
                keywords.append(normalized)
    return sorted(set(keywords))


def main():
    results: dict[str, list[str]] = {}
    freq: dict[str, int] = {}

    for md_file in sorted(AGENTS_DIR.rglob("*.md")):
        # Guard anti-symlink : skip les liens symboliques pour éviter les boucles
        if md_file.is_symlink():
            print(f"  SKIP: {md_file} — symlink ignored")
            continue
        agent_name = md_file.stem
        content = md_file.read_text(encoding="utf-8")
        decisions = extract_decisions_section(content)
        if not decisions:
            print(f"  WARN: {agent_name} — no ## Decisions section")
            continue
        kw = extract_keywords(decisions)
        results[agent_name] = kw
        for k in kw:
            freq[k] = freq.get(k, 0) + 1

    # Write results
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    # Print top 50 keywords by frequency for human review
    print(f"\nExtracted triggers for {len(results)} agents → {OUTPUT_FILE}")
    print("\nTop 50 keywords by frequency:")
    for kw, count in sorted(freq.items(), key=lambda x: -x[1])[:50]:
        print(f"  {count:3d}× {kw}")


if __name__ == "__main__":
    main()
```

**Processus :**

1. Le script parcourt `agents/**/*.md`
2. Pour chaque fichier, il isole la section `## Decisions`
3. Il extrait les conditions IF/ELIF/ELSE/When avec regex
4. Les tokens sont normalisés (lowercase, strip ponctuation) et filtrés par stopwords
5. Output dans `data/triggers.json` : `{ "agent-name": ["keyword1", "keyword2", ...] }`
6. Affiche les top 50 mots-clés par fréquence pour review humaine

**Déduplication :** Les keywords sont normalisés en lowercase, les doublons supprimés par `set()`, et les termes trop courts (< 3 chars) ignorés.

**Test :** `tests/test_extract_triggers.py`

```python
def test_extract_decisions_section():
    content = "# Title\n\n## Decisions\n\n- IF foo → bar\n\n## Examples\n"
    assert "IF foo" in extract_decisions_section(content)
    assert "Examples" not in extract_decisions_section(content)

def test_extract_keywords_basic():
    text = "- IF statically compiled binary (Go, Rust) → distroless\n"
    kw = extract_keywords(text)
    assert "statically" in kw
    assert "compiled" in kw
    assert "rust" in kw

def test_stopwords_filtered():
    text = "- IF the user needs more than 3 → result\n"
    kw = extract_keywords(text)
    assert "the" not in kw
    assert "needs" not in kw
    assert "result" in kw
```

### 3.2 Manuel : Tags Ecosystem & Intent

Les tags ecosystem et intent nécessitent un jugement humain — quel agent « appartient » à quel écosystème est une décision sémantique, pas syntaxique.

#### Vocabulaire contrôlé

**Ecosystem tags (~15) :**

| Tag | Agents typiques |
|-----|----------------|
| `ecosystem:python` | python-pro, data-scientist, data-engineer, ml-engineer, data-analyst |
| `ecosystem:javascript` | react-specialist, nextjs-developer, vue-expert, angular-architect |
| `ecosystem:typescript` | typescript-pro, nextjs-developer, react-specialist, angular-architect |
| `ecosystem:go` | golang-pro |
| `ecosystem:rust` | rust-pro |
| `ecosystem:ruby` | rails-expert |
| `ecosystem:php` | php-pro |
| `ecosystem:java` | java-architect, kotlin-specialist |
| `ecosystem:csharp` | csharp-developer |
| `ecosystem:swift` | swift-expert, mobile-developer |
| `ecosystem:cpp` | cpp-pro |
| `ecosystem:cloud-aws` | aws-specialist, platform-engineer |
| `ecosystem:cloud-gcp` | platform-engineer |
| `ecosystem:cloud-azure` | platform-engineer |
| `ecosystem:docker` | docker-specialist, platform-engineer, ci-cd-engineer |
| `ecosystem:kubernetes` | kubernetes-specialist, platform-engineer, sre-engineer |
| `ecosystem:web` | accessibility, ui-designer, screenshot-ui-analyzer, react-specialist, nextjs-developer, vue-expert, angular-architect |

**Intent tags (~10) :**

| Tag | Description | Agents typiques |
|-----|-------------|----------------|
| `intent:build` | Construire du code | Tous les language-*, nextjs-developer, react-specialist, ... |
| `intent:debug` | Diagnostiquer un bug | debugger |
| `intent:review` | Relire du code | code-reviewer |
| `intent:migrate` | Migrer/moderniser | legacy-modernizer, refactoring-specialist |
| `intent:audit` | Auditer (sécurité, qualité) | security-auditor, compliance-auditor, penetration-tester, smart-contract-auditor, mcp-security-auditor |
| `intent:deploy` | Déployer, CI/CD | ci-cd-engineer, docker-specialist, kubernetes-specialist, platform-engineer |
| `intent:design` | Concevoir une architecture | microservices-architect, api-architect, database-architect, diagram-architect |
| `intent:document` | Écrire de la documentation | documentation-engineer, technical-writer, api-documenter |
| `intent:optimize` | Optimiser les performances | performance-engineer |
| `intent:plan` | Planifier un projet | product-manager, project-manager, scrum-master, business-analyst, prd |
| `intent:test` | Écrire/gérer des tests | test-automator, qa-expert |
| `intent:analyze` | Analyser des données | data-analyst, data-scientist, ux-researcher |

#### Processus d'assignation

1. **Génération du template :** Script `scripts/generate-tag-template.py` crée `data/ecosystem-intent-tags.csv` avec une ligne par agent, colonnes pré-remplies avec des suggestions basées sur les tags existants et la catégorie.

2. **Review humaine :** L'auteur vérifie chaque assignation dans le CSV, corrige, complète.

3. **Merge :** Script `scripts/merge-tags.py` lit le CSV validé et injecte les champs `ecosystem` et `intent` dans `manifest.json`.

4. **Validation :** Le script de merge vérifie que :
   - Chaque agent a au moins 1 tag ecosystem
   - Chaque agent a au moins 1 tag intent
   - Tous les tags utilisés font partie du vocabulaire contrôlé

### 3.3 Related Agents

**Champ :** `related_agents: string[]` — 2 à 4 noms d'agents par entrée.

**Génération initiale automatique :** Script `scripts/generate-related.py` calcule les relations par co-présence dans les packs.

```python
def compute_pack_overlap(manifest: dict) -> dict[str, list[str]]:
    """Pour chaque agent, retourne les agents qui partagent ≥2 packs."""
    agent_packs: dict[str, set[str]] = {}
    for pack_id, pack_def in manifest["packs"].items():
        for agent_name in pack_def["agents"]:
            agent_packs.setdefault(agent_name, set()).add(pack_id)

    related: dict[str, list[str]] = {}
    agents = list(agent_packs.keys())
    for i, a in enumerate(agents):
        candidates = []
        for j, b in enumerate(agents):
            if i == j:
                continue
            overlap = len(agent_packs[a] & agent_packs[b])
            if overlap >= 2:
                candidates.append((b, overlap))
        # Top 4 par overlap décroissant
        candidates.sort(key=lambda x: -x[1])
        related[a] = [name for name, _ in candidates[:4]]
    return related
```

**Raffinement humain :** Le JSON généré est revu manuellement. Cas particuliers :
- Agents sans aucun pack (ex: `search-specialist`) → ajout manuel basé sur la sémantique
- Agents dans un seul pack → les related viennent de ce pack

### 3.4 Changements au schéma du Manifest

**Nouveaux champs par entrée agent :**

```json
{
  "name": "typescript-pro",
  "category": "languages",
  "path": "languages/typescript-pro",
  "mode": "subagent",
  "description": "Advanced TypeScript type system, generics, and full-stack type safety",
  "tags": ["typescript", "types", "generics", "full-stack", "node", "react"],
  "sha256": "...",
  "size": 5234,
  "triggers": ["overloads", "branded", "generic", "function-declaration", "result-type", "unknown"],
  "ecosystem": ["ecosystem:typescript", "ecosystem:javascript", "ecosystem:web"],
  "intent": ["intent:build"],
  "related_agents": ["react-specialist", "nextjs-developer", "java-architect"]
}
```

**Rétro-compatibilité :** Tous les nouveaux champs sont optionnels. Le code existant (`search_agents`, `list_agents`, `get_agent`, `check_health`) les ignore — aucune modification nécessaire aux tools v1.

**Validation :** Mise à jour de `validateManifest()` dans `src/registry.mjs` :

```javascript
// Ajout dans validateManifest(), après la boucle agents existante
for (const agent of agents) {
  // ... validations existantes ...

  // Nouveaux champs (optionnels) — validation des types si présents
  if (agent.triggers !== undefined) {
    if (!Array.isArray(agent.triggers) || !agent.triggers.every(t => typeof t === 'string')) {
      throw new Error(`Agent "${agent.name}": triggers must be string[]`);
    }
  }
  if (agent.ecosystem !== undefined) {
    if (!Array.isArray(agent.ecosystem) || !agent.ecosystem.every(t => typeof t === 'string' && t.startsWith('ecosystem:'))) {
      throw new Error(`Agent "${agent.name}": ecosystem tags must start with "ecosystem:"`);
    }
    // Note : la validation se limite au préfixe `ecosystem:` en v1.
    // Pas d'allowlist stricte — on tolère les tags non documentés pour faciliter
    // l'enrichissement itératif. Une allowlist sera ajoutée en v2 une fois le
    // vocabulaire stabilisé par l'usage réel.
  }
  if (agent.intent !== undefined) {
    if (!Array.isArray(agent.intent) || !agent.intent.every(t => typeof t === 'string' && t.startsWith('intent:'))) {
      throw new Error(`Agent "${agent.name}": intent tags must start with "intent:"`);
    }
  }
  if (agent.related_agents !== undefined) {
    if (!Array.isArray(agent.related_agents) || !agent.related_agents.every(t => typeof t === 'string')) {
      throw new Error(`Agent "${agent.name}": related_agents must be string[]`);
    }
  }
}
```

**Mise à jour des types :**

Dans `plugin/types.d.ts` :

```typescript
interface OcAgentEntry {
  name: string;
  category: string;
  path: string;
  mode: "primary" | "subagent";
  description: string;
  tags: string[];
  // Phase 1 enrichment (optional — graceful degradation when absent)
  triggers?: string[];
  ecosystem?: string[];
  intent?: string[];
  related_agents?: string[];
}
```

Dans `src/registry.mjs` (JSDoc) :

```javascript
/**
 * @typedef {{
 *   name: string;
 *   category: string;
 *   path: string;
 *   mode: 'primary' | 'subagent';
 *   description: string;
 *   tags: string[];
 *   triggers?: string[];
 *   ecosystem?: string[];
 *   intent?: string[];
 *   related_agents?: string[];
 * }} AgentEntry
 */
```

---

## 4. Phase 2 — Moteur de Recommandation (`src/recommender.mjs`)

Module pur, zéro dépendance externe, importé par le plugin ET le CLI.

### 4.1 Stack Detector

**Fichier :** `src/recommender.mjs` (section détection)

**Input :** `directory: string` — chemin absolu du répertoire projet.

**Output :**

```javascript
/**
 * @typedef {{
 *   languages: string[];
 *   frameworks: string[];
 *   tools: string[];
 *   hasTests: boolean;
 *   hasCi: boolean;
 *   hasDocker: boolean;
 *   hasKubernetes: boolean;
 *   hasTerraform: boolean;
 * }} ProjectProfile
 */
```

**Signaux détectés :**

| Fichier / Pattern | Signal | Champ |
|-------------------|--------|-------|
| `package.json` | Existence → JS/TS ; `dependencies` parsing → frameworks | languages, frameworks |
| `tsconfig.json` | TypeScript | languages |
| `go.mod` | Go | languages |
| `Cargo.toml` | Rust | languages |
| `pyproject.toml` | Python ; `[tool.poetry]` ou `[project]` → deps | languages, frameworks |
| `requirements.txt` | Python ; scan lignes pour frameworks connus | languages, frameworks |
| `Gemfile` | Ruby ; scan pour rails | languages, frameworks |
| `pom.xml` / `build.gradle` | Java | languages |
| `*.csproj` | C# | languages |
| `Package.swift` | Swift | languages |
| `Dockerfile` / `docker-compose.yml` / `docker-compose.yaml` | Docker | hasDocker, tools |
| `.github/workflows/` / `.gitlab-ci.yml` / `Jenkinsfile` | CI/CD | hasCi, tools |
| `terraform/` / `*.tf` (racine) | Terraform | hasTerraform, tools |
| `.k8s/` / `k8s/` / `helm/` / `Chart.yaml` | Kubernetes | hasKubernetes, tools |
| `tests/` / `test/` / `__tests__/` / `spec/` / `*_test.go` | Tests présents | hasTests |

**Détection des frameworks dans `package.json` :**

```javascript
const FRAMEWORK_SIGNALS = {
  // dep name → framework label
  'react': 'react',
  'react-dom': 'react',
  'next': 'nextjs',
  'vue': 'vue',
  '@angular/core': 'angular',
  'express': 'express',
  'fastify': 'fastify',
  'hono': 'hono',
  'svelte': 'svelte',
  '@sveltejs/kit': 'sveltekit',
  'astro': 'astro',
  'remix': 'remix',
  'nuxt': 'nuxt',
  'react-native': 'react-native',
  'expo': 'expo',
  'electron': 'electron',
  'prisma': 'prisma',
  'drizzle-orm': 'drizzle',
  'mongoose': 'mongodb',
  'pg': 'postgres',
  'redis': 'redis',
  'ioredis': 'redis',
  'graphql': 'graphql',
  '@apollo/server': 'graphql',
  'stripe': 'stripe',
};
```

**Détection des frameworks Python (`pyproject.toml` / `requirements.txt`) :**

```javascript
const PYTHON_FRAMEWORK_SIGNALS = {
  'fastapi': 'fastapi',
  'django': 'django',
  'flask': 'flask',
  'torch': 'pytorch',
  'tensorflow': 'tensorflow',
  'transformers': 'huggingface',
  'langchain': 'langchain',
  'pandas': 'pandas',
  'numpy': 'numpy',
  'scikit-learn': 'sklearn',
  'sqlalchemy': 'sqlalchemy',
  'pytest': 'pytest',
};
```

**Implémentation — stratégie de lecture :**

```javascript
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

/**
 * Detect project stack from filesystem signals.
 * @param {string} directory
 * @returns {ProjectProfile}
 */
export function detectProjectProfile(directory) {
  // Path containment guard : résolution absolue + vérification que c'est bien un répertoire
  const absDir = resolve(directory);
  try {
    const stat = statSync(absDir);
    if (!stat.isDirectory()) {
      return emptyProfile();
    }
  } catch {
    return emptyProfile();
  }
  // Sécurité anti-traversal : si `absDir` s'avère être un lien symbolique qui sort
  // du répertoire de travail, on refuse (cas rare mais défensif).
  // En pratique, resolve() aplatit les ../ — cette guard couvre les cas restants.
  const cwd = process.cwd();
  const rel = relative(cwd, absDir);
  if (rel.startsWith('..')) {
    // Répertoire hors cwd — acceptable si l'appelant passe un chemin absolu explicite,
    // mais on log un warning (sans throw) pour faciliter le debug.
    // On ne bloque pas : le CLI et le plugin peuvent légitimement pointer hors du cwd.
  }

  const languages = new Set();
  const frameworks = new Set();
  const tools = new Set();
  let hasTests = false;
  let hasCi = false;
  let hasDocker = false;
  let hasKubernetes = false;
  let hasTerraform = false;

  // Helper utilisé dans les guard clauses ci-dessus
  function emptyProfile() {
    return { languages: [], frameworks: [], tools: [], hasTests: false, hasCi: false,
             hasDocker: false, hasKubernetes: false, hasTerraform: false };
  }
  const frameworks = new Set();
  const tools = new Set();
  let hasTests = false;
  let hasCi = false;
  let hasDocker = false;
  let hasKubernetes = false;
  let hasTerraform = false;

  // ── package.json ───────────────────────────────────
  const pkgPath = join(absDir, 'package.json');
  if (existsSync(pkgPath)) {
    languages.add('javascript');
    try {
      // Guard taille : skip si > 5MB (package.json malformé ou inhabituel)
      if (statSync(pkgPath).size <= 5 * 1024 * 1024) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const [dep, _] of Object.entries(allDeps)) {
        if (FRAMEWORK_SIGNALS[dep]) {
          frameworks.add(FRAMEWORK_SIGNALS[dep]);
        }
      }
      if (allDeps['typescript'] || existsSync(join(absDir, 'tsconfig.json'))) {
        languages.add('typescript');
      }
      }
    } catch { /* malformed package.json — just note JS */ }
  }

  // ── tsconfig.json (standalone, sans package.json) ──
  if (!languages.has('typescript') && existsSync(join(absDir, 'tsconfig.json'))) {
    languages.add('typescript');
    languages.add('javascript');
  }

  // ── go.mod ──
  if (existsSync(join(absDir, 'go.mod'))) {
    languages.add('go');
  }

  // ── Cargo.toml ──
  if (existsSync(join(absDir, 'Cargo.toml'))) {
    languages.add('rust');
  }

  // ── pyproject.toml / requirements.txt ──
  const hasPyproject = existsSync(join(absDir, 'pyproject.toml'));
  const hasRequirements = existsSync(join(absDir, 'requirements.txt'));
  if (hasPyproject || hasRequirements) {
    languages.add('python');
    try {
      const pyPath = hasPyproject
        ? join(absDir, 'pyproject.toml')
        : join(absDir, 'requirements.txt');
      // Guard taille : skip si > 5MB
      if (statSync(pyPath).size <= 5 * 1024 * 1024) {
        const content = readFileSync(pyPath, 'utf-8');
        const lower = content.toLowerCase();
        for (const [pkg, fw] of Object.entries(PYTHON_FRAMEWORK_SIGNALS)) {
          if (lower.includes(pkg)) {
            frameworks.add(fw);
          }
        }
      }
    } catch { /* best-effort */ }
  }

  // ── Gemfile ──
  if (existsSync(join(absDir, 'Gemfile'))) {
    languages.add('ruby');
    try {
      const content = readFileSync(join(absDir, 'Gemfile'), 'utf-8');
      if (content.includes('rails')) frameworks.add('rails');
    } catch { /* best-effort */ }
  }

  // ── Java ──
  if (existsSync(join(absDir, 'pom.xml')) || existsSync(join(absDir, 'build.gradle'))) {
    languages.add('java');
  }

  // ── C# ──
  try {
    const entries = readdirSync(absDir);
    if (entries.some(e => e.endsWith('.csproj'))) languages.add('csharp');
  } catch { /* best-effort */ }

  // ── Swift ──
  if (existsSync(join(absDir, 'Package.swift'))) {
    languages.add('swift');
  }

  // ── Docker ──
  if (existsSync(join(absDir, 'Dockerfile')) ||
      existsSync(join(absDir, 'docker-compose.yml')) ||
      existsSync(join(absDir, 'docker-compose.yaml'))) {
    hasDocker = true;
    tools.add('docker');
  }

  // ── CI/CD ──
  if (existsSync(join(absDir, '.github', 'workflows')) ||
      existsSync(join(absDir, '.gitlab-ci.yml')) ||
      existsSync(join(absDir, 'Jenkinsfile'))) {
    hasCi = true;
    tools.add('ci-cd');
  }

  // ── Terraform ──
  if (existsSync(join(absDir, 'terraform'))) {
    hasTerraform = true;
    tools.add('terraform');
  } else {
    try {
      const entries = readdirSync(absDir);
      if (entries.some(e => e.endsWith('.tf'))) {
        hasTerraform = true;
        tools.add('terraform');
      }
    } catch { /* best-effort */ }
  }

  // ── Kubernetes ──
  if (existsSync(join(absDir, 'k8s')) ||
      existsSync(join(absDir, '.k8s')) ||
      existsSync(join(absDir, 'helm')) ||
      existsSync(join(absDir, 'Chart.yaml'))) {
    hasKubernetes = true;
    tools.add('kubernetes');
  }

  // ── Tests ──
  const testDirs = ['tests', 'test', '__tests__', 'spec'];
  for (const dir of testDirs) {
    if (existsSync(join(absDir, dir))) {
      hasTests = true;
      break;
    }
  }

  // ── Monorepo scan (1 niveau) ────────────────────────────
  // Si moins de 2 langages détectés, on tente un scan 1 niveau dans les
  // répertoires de workspaces typiques (packages/*, apps/*, services/*).
  // Ne scanne PAS récursivement — évite les faux positifs et la lenteur.
  if (languages.size < 2) {
    const MONOREPO_DIRS = ['packages', 'apps', 'services'];
    for (const monoDir of MONOREPO_DIRS) {
      const monoPath = join(directory, monoDir);
      if (!existsSync(monoPath)) continue;
      try {
        for (const entry of readdirSync(monoPath, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const subDir = join(monoPath, entry.name);
          // Re-run detection signals on each workspace (sans récursion)
          const subProfile = detectProjectProfile(subDir);
          for (const lang of subProfile.languages) languages.add(lang);
          for (const fw of subProfile.frameworks) frameworks.add(fw);
          for (const tool of subProfile.tools) tools.add(tool);
          if (subProfile.hasTests) hasTests = true;
          if (subProfile.hasCi) hasCi = true;
          if (subProfile.hasDocker) hasDocker = true;
          if (subProfile.hasKubernetes) hasKubernetes = true;
          if (subProfile.hasTerraform) hasTerraform = true;
        }
      } catch { /* best-effort */ }
    }
  }

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    tools: [...tools],
    hasTests,
    hasCi,
    hasDocker,
    hasKubernetes,
    hasTerraform,
  };
}
```

**Caching :** Le profil est calculé à chaque appel — pas de cache persistant. Raison : la détection est rapide (~5-15 `existsSync` + 2-3 `readFileSync`), et un cache nécessiterait un mécanisme d'invalidation complexe (watcher FS ou mtime sur N fichiers). Si la latence pose problème en pratique, on ajoutera un cache mtime sur `package.json` (le fichier qui change le plus souvent et qui coûte le plus à parser).

**Tests :** `tests/recommender.test.mjs` — voir section 7.

### 4.2 Scoring Engine

**Input :**

```javascript
/**
 * @typedef {{
 *   profile: ProjectProfile;
 *   query?: QuerySignals;
 *   installed: Set<string>;
 *   manifest: Manifest;
 * }} ScoringInput
 */
```

**Output :**

```javascript
/**
 * @typedef {{
 *   agent: AgentEntry;
 *   score: number;
 *   reasons: string[];
 *   sources: Array<'stack' | 'intent' | 'pack' | 'related'>;
 * }} Suggestion
 */
```

**Algorithme de scoring :**

Pour chaque agent du registre, on calcule un score composite :

```javascript
// Poids par défaut (scope "both") — ajustés dynamiquement selon le scope
const WEIGHTS_DEFAULT = { stack: 0.5, intent: 0.4, tools: 0.1 };
// Quand profile === null (scope "prompt") : intent absorbe le poids stack
const WEIGHTS_PROMPT_ONLY = { stack: 0, intent: 0.7, tools: 0.3 };

/**
 * @param {ScoringInput} input
 * @returns {Suggestion[]}
 */
export function scoreAgents({ profile, query, installed, manifest }) {
  const agents = manifest.agents;
  const scores = [];

  // Redistribution des poids si pas de profil projet
  const W = profile ? WEIGHTS_DEFAULT : WEIGHTS_PROMPT_ONLY;

  for (const agent of agents) {
    // Skip agents already installed
    if (installed.has(agent.name)) continue;

    let totalScore = 0;
    const reasons = [];
    const sources = new Set();

    // ── 1. Stack Score (0-1, weight: W.stack) ──────────────
    if (profile) {
      const stackScore = computeStackScore(agent, profile);
      if (stackScore > 0) {
        totalScore += stackScore * W.stack;
        reasons.push(...getStackReasons(agent, profile));
        sources.add('stack');
      }
    }

    // ── 2. Intent Score (0-1, weight: W.intent) ─────────────
    if (query) {
      const intentScore = computeIntentScore(agent, query);
      if (intentScore > 0) {
        totalScore += intentScore * W.intent;
        reasons.push(...getIntentReasons(agent, query));
        sources.add('intent');
      }
    }

    // ── 3. Tools/infra bonus (0-W.tools) ───────────────────
    if (profile) {
      const toolsBonus = computeToolsBonus(agent, profile);
      totalScore += toolsBonus * W.tools;
    }

    if (totalScore > 0) {
      scores.push({ agent, score: totalScore, reasons, sources: [...sources] });
    }
  }

  // ── 4. Pack affinity boost ────────────────────────────
  applyPackAffinityBoost(scores, manifest);

  // ── 5. Related agents boost ───────────────────────────
  applyRelatedBoost(scores);

  // ── Sort & cap ────────────────────────────────────────
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 10);
}
```

#### Détail des sous-scores

**Stack Score** — Matching ecosystem tags contre profil projet :

```javascript
// Mapping profil → ecosystem tags
const LANG_TO_ECOSYSTEM = {
  javascript: 'ecosystem:javascript',
  typescript: 'ecosystem:typescript',
  python: 'ecosystem:python',
  go: 'ecosystem:go',
  rust: 'ecosystem:rust',
  ruby: 'ecosystem:ruby',
  php: 'ecosystem:php',
  java: 'ecosystem:java',
  csharp: 'ecosystem:csharp',
  swift: 'ecosystem:swift',
  cpp: 'ecosystem:cpp',
};

const TOOL_TO_ECOSYSTEM = {
  docker: 'ecosystem:docker',
  kubernetes: 'ecosystem:kubernetes',
};

function computeStackScore(agent, profile) {
  if (!agent.ecosystem || agent.ecosystem.length === 0) {
    // Fallback : matching par tags + description si pas d'ecosystem tags
    return computeFallbackStackScore(agent, profile);
  }

  const profileEcosystems = new Set();
  for (const lang of profile.languages) {
    if (LANG_TO_ECOSYSTEM[lang]) profileEcosystems.add(LANG_TO_ECOSYSTEM[lang]);
  }
  for (const tool of profile.tools) {
    if (TOOL_TO_ECOSYSTEM[tool]) profileEcosystems.add(TOOL_TO_ECOSYSTEM[tool]);
  }
  // Frameworks → web ecosystem
  if (profile.frameworks.length > 0) profileEcosystems.add('ecosystem:web');

  // Jaccard : |intersection| / |union|
  // Évite de favoriser les agents avec peu de tags ecosystem
  let intersection = 0;
  for (const eco of agent.ecosystem) {
    if (profileEcosystems.has(eco)) intersection++;
  }
  const union = new Set([...agent.ecosystem, ...profileEcosystems]).size;

  return union > 0 ? intersection / union : 0;
}
```

**Intent Score** — Matching query signals contre intent tags + triggers :

```javascript
function computeIntentScore(agent, query) {
  let score = 0;

  // Intent tag match (fort signal)
  if (agent.intent) {
    for (const intentTag of agent.intent) {
      const intent = intentTag.replace('intent:', '');
      if (query.detectedIntents.includes(intent)) {
        score += 0.5;
        break; // un match suffit
      }
    }
  }

  // Trigger keyword match (signal moyen)
  if (agent.triggers) {
    const triggerMatches = agent.triggers.filter(t =>
      query.keywords.some(k => k === t || t.includes(k) || k.includes(t))
    );
    score += Math.min(triggerMatches.length * 0.1, 0.3);
  }

  // Description keyword match (signal faible)
  const descLower = agent.description.toLowerCase();
  const descMatches = query.keywords.filter(k => descLower.includes(k));
  score += Math.min(descMatches.length * 0.05, 0.2);

  return Math.min(score, 1);
}
```

**Pack Affinity Boost :**

```javascript
function applyPackAffinityBoost(scores, manifest) {
  const scoreMap = new Map(scores.map(s => [s.agent.name, s]));

  for (const [packId, pack] of Object.entries(manifest.packs)) {
    // Combien d'agents de ce pack sont déjà dans les résultats ?
    const inResults = pack.agents.filter(name => scoreMap.has(name));
    if (inResults.length >= 2) {
      // Boost tous les agents du pack de 10%
      for (const name of pack.agents) {
        const entry = scoreMap.get(name);
        if (entry) {
          entry.score = Math.min(entry.score * 1.1, 1.0); // clamp à 1.0
          if (!entry.reasons.includes(`Pack synergy: ${pack.label}`)) {
            entry.reasons.push(`Pack synergy: ${pack.label}`);
          }
        }
      }
    }
  }
}
```

**Related Agents Boost :**

```javascript
function applyRelatedBoost(scores) {
  const scoreMap = new Map(scores.map(s => [s.agent.name, s]));
  // Copie pour le tri — ne pas muter `scores` avant que le sort final soit fait
  const topAgents = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const top of topAgents) {
    if (!top.agent.related_agents) continue;
    for (const relatedName of top.agent.related_agents) {
      const related = scoreMap.get(relatedName);
      if (related) {
        related.score += 0.05;
        if (!related.reasons.some(r => r.startsWith('Related to'))) {
          related.reasons.push(`Related to ${top.agent.name}`);
          if (!related.sources.includes('related')) related.sources.push('related');
        }
      }
    }
  }
}
```

**Fallback scoring (quand les champs enrichis sont absents) :**

Si un agent n'a pas de tags `ecosystem`/`intent`/`triggers`, le scoring dégrade gracieusement en utilisant les champs existants (`tags`, `description`, `category`). Le fallback matche les langages du profil contre `agent.tags` et `agent.description` par substring. Le score fallback a un plafond de 0.6 (vs 1.0 pour le scoring enrichi) pour inciter à compléter les métadonnées.

```javascript
/**
 * Fallback stack score quand agent.ecosystem est absent.
 * Utilise agent.tags et agent.description — plafond 0.6.
 * @param {AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {number}
 */
function computeFallbackStackScore(agent, profile) {
  const text = [
    ...(agent.tags ?? []),
    agent.description.toLowerCase(),
    agent.category,
  ].join(' ').toLowerCase();

  let matches = 0;
  const signals = [...profile.languages, ...profile.frameworks, ...profile.tools];
  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) matches++;
  }
  if (signals.length === 0) return 0;
  // Jaccard simplifié sur les signals — plafonné à 0.6
  return Math.min((matches / signals.length) * 0.9, 0.6);
}

/**
 * Bonus infra basé sur les outils détectés dans le projet (Docker, K8s, Terraform).
 * Retourne une valeur entre 0 et 1 — sera pondéré par W.tools dans scoreAgents.
 * @param {AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {number}
 */
function computeToolsBonus(agent, profile) {
  const text = [
    ...(agent.tags ?? []),
    agent.description.toLowerCase(),
  ].join(' ').toLowerCase();

  let bonus = 0;
  if (profile.hasDocker && text.includes('docker')) bonus += 0.4;
  if (profile.hasKubernetes && text.includes('kubernetes')) bonus += 0.4;
  if (profile.hasTerraform && text.includes('terraform')) bonus += 0.3;
  if (profile.hasCi && (text.includes('ci/cd') || text.includes('pipeline') || text.includes('ci-cd'))) bonus += 0.2;
  return Math.min(bonus, 1.0);
}
```

### 4.3 Query Analyzer

**Input :** `prompt: string`

**Output :**

```javascript
/**
 * @typedef {{
 *   keywords: string[];
 *   detectedIntents: string[];
 *   detectedTech: string[];
 * }} QuerySignals
 */
```

> **Note :** `keywords` contient uniquement les tokens qui ont matché soit un intent soit un tech term.
> `detectedIntents` et `detectedTech` sont les sous-ensembles déjà catégorisés.
> Un même token peut figurer dans `keywords` et dans `detectedTech`, mais `computeIntentScore`
> utilise `detectedIntents` pour le fort signal et `keywords` (intersection avec triggers) pour le
> signal moyen — **pas les deux sur la même dimension**, ce qui évite le double-comptage.

**Implémentation :**

```javascript
// Dictionnaire de mots-clés → intent
const INTENT_KEYWORDS = {
  // intent:build
  'build': 'build', 'create': 'build', 'implement': 'build', 'develop': 'build',
  'code': 'build', 'write': 'build', 'add': 'build', 'feature': 'build',
  'construire': 'build', 'créer': 'build', 'implémenter': 'build',
  // intent:debug
  'debug': 'debug', 'fix': 'debug', 'bug': 'debug', 'error': 'debug',
  'crash': 'debug', 'broken': 'debug', 'issue': 'debug', 'failing': 'debug',
  'corriger': 'debug', 'réparer': 'debug',
  // intent:review
  'review': 'review', 'check': 'review', 'audit': 'review', 'inspect': 'review',
  'relire': 'review', 'vérifier': 'review',
  // intent:migrate
  'migrate': 'migrate', 'upgrade': 'migrate', 'convert': 'migrate',
  'modernize': 'migrate', 'legacy': 'migrate', 'refactor': 'migrate',
  'migrer': 'migrate', 'moderniser': 'migrate',
  // intent:deploy
  'deploy': 'deploy', 'ship': 'deploy', 'release': 'deploy',
  'ci': 'deploy', 'cd': 'deploy', 'pipeline': 'deploy',
  'déployer': 'deploy', 'livrer': 'deploy',
  // intent:design
  'design': 'design', 'architect': 'design', 'architecture': 'design',
  'schema': 'design', 'diagram': 'design', 'concevoir': 'design',
  // intent:document
  'document': 'document', 'docs': 'document', 'readme': 'document',
  'api-doc': 'document', 'documenter': 'document',
  // intent:optimize
  'optimize': 'optimize', 'performance': 'optimize', 'slow': 'optimize',
  'fast': 'optimize', 'speed': 'optimize', 'optimiser': 'optimize',
  // intent:plan
  'plan': 'plan', 'roadmap': 'plan', 'sprint': 'plan', 'backlog': 'plan',
  'requirement': 'plan', 'prd': 'plan', 'planifier': 'plan',
  // intent:test
  'test': 'test', 'testing': 'test', 'spec': 'test', 'coverage': 'test',
  'tester': 'test',
  // intent:analyze
  'analyze': 'analyze', 'data': 'analyze', 'analytics': 'analyze',
  'dashboard': 'analyze', 'analyser': 'analyze',
};

// Dictionnaire de mots-clés techniques
const TECH_KEYWORDS = new Set([
  'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
  'typescript', 'javascript', 'python', 'go', 'golang', 'rust',
  'ruby', 'rails', 'php', 'java', 'kotlin', 'swift', 'csharp', 'c#',
  'docker', 'kubernetes', 'k8s', 'terraform', 'aws', 'gcp', 'azure',
  'postgres', 'postgresql', 'redis', 'mongodb', 'graphql', 'rest', 'api',
  'fastapi', 'django', 'flask', 'express', 'fastify', 'hono',
  'prisma', 'drizzle', 'sqlalchemy',
  'pytorch', 'tensorflow', 'ml', 'ai', 'llm', 'langchain', 'rag',
  'mcp', 'opencode',
  'ci/cd', 'cicd', 'github-actions', 'gitlab',
  'security', 'penetration', 'audit',
  'accessibility', 'wcag', 'a11y',
]);

/**
 * Analyze a user prompt to extract intents and tech keywords.
 * No NLP library — simple tokenization + dictionary matching.
 * @param {string} prompt
 * @returns {QuerySignals}
 */
export function analyzeQuery(prompt) {
  // Guard taille : tronque à 2000 chars — évite les prompts pathologiques
  const input = prompt.length > 2000 ? prompt.slice(0, 2000) : prompt;
  // Tokenize : split sur espaces et ponctuation, lowercase
  // \p{L}\p{N} avec flag /u pour préserver les accents (é, ü, ñ, etc.)
  const tokens = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-./#+]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  const keywords = [];
  const detectedIntents = new Set();
  const detectedTech = new Set();

  for (const token of tokens) {
    // Check intent
    if (INTENT_KEYWORDS[token]) {
      detectedIntents.add(INTENT_KEYWORDS[token]);
      keywords.push(token);
    }
    // Check tech
    if (TECH_KEYWORDS.has(token)) {
      detectedTech.add(token);
      keywords.push(token);
    }
  }

  // Bi-gram check — ATTENTION : dead code en pratique.
  // Le tokenizer garde les `.` et `/` dans les tokens (ils sont dans la regex de remplacement),
  // donc `next.js` reste un token unique, jamais splité en `next` + `js`.
  // De même, `ci/cd` reste `ci/cd`. Ces termes sont déjà dans TECH_KEYWORDS comme tokens entiers.
  // Ce bloc est conservé défensivement pour les rares cas où le prompt encode différemment,
  // mais il ne produit aucun hit sur les inputs normaux. À supprimer en v2 si toujours dead.
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}.${tokens[i + 1]}`;
    const bigramDash = `${tokens[i]}-${tokens[i + 1]}`;
    if (TECH_KEYWORDS.has(bigram)) detectedTech.add(bigram);
    if (TECH_KEYWORDS.has(bigramDash)) detectedTech.add(bigramDash);
  }

  return {
    keywords: [...new Set(keywords)],
    detectedIntents: [...detectedIntents],
    detectedTech: [...detectedTech],
  };
}
```

---

## 5. Phase 3 — Surfaces d'Intégration

### 5.1 Plugin Tool : `suggest_agents`

**Fichier :** `plugin/tools.ts`
**Enregistrement :** `plugin/index.ts`

**Définition :**

```typescript
import {
  detectProjectProfile,
  analyzeQuery,
  scoreAgents,
} from "../src/recommender.mjs";
import {
  detectInstalledSet,
} from "../src/lock.mjs";

export const suggest_agents = tool({
  description:
    "Analyze the current project and optionally a task description to suggest the most relevant agents to install. Uses project stack detection (languages, frameworks, tools) and intent matching. Returns ranked suggestions with reasons.",
  args: {
    context: tool.schema
      .string()
      .optional()
      .describe(
        "What the user is trying to do — e.g. 'debug a React performance issue' or 'set up CI/CD for a Go API'"
      ),
    scope: tool.schema
      .enum(["project", "prompt", "both"])
      .optional()
      .describe("Scoring scope: 'project' (stack only), 'prompt' (context only), 'both' (default)"),
  },
  async execute(args, ctx) {
    try {
      const manifest = getManifest();
      const effectiveScope = args.scope ?? "both";

      // 1. Stack detection
      let profile = null;
      if (effectiveScope !== "prompt") {
        profile = detectProjectProfile(ctx.directory);
      }

      // 2. Query analysis
      let query = null;
      if (args.context && effectiveScope !== "project") {
        query = analyzeQuery(args.context);
      }

      // 3. Installed agents
      const installed = detectInstalledSet(manifest, ctx.directory);

      // 4. Scoring
      const suggestions = scoreAgents({
        profile,
        query,
        installed,
        manifest,
      });

      if (suggestions.length === 0) {
        if (installed.size >= manifest.agents.length * 0.8) {
          return "You already have most agents installed! Use search_agents to find specific ones.";
        }
        return "No strong matches found. Try providing more context about what you're building, or use search_agents with a specific keyword.";
      }

      // 5. Format output
      const lines = suggestions.map((s, i) => {
        const score = Math.round(s.score * 100);
        const reasons = s.reasons.join(" · ");
        return `${i + 1}. ${s.agent.name} (${s.agent.category}) — ${score}% match\n   ${s.agent.description}\n   Why: ${reasons}`;
      });

      const header = profile
        ? `Detected stack: ${[...profile.languages, ...profile.frameworks].join(", ") || "unknown"}`
        : "Stack detection skipped (prompt-only mode)";

      return `${header}\n\nSuggested agents:\n\n${lines.join("\n\n")}`;
    } catch (err) {
      return `Error: ${sanitizeError(err)}`;
    }
  },
});
```

**Enregistrement dans `plugin/index.ts` :**

```typescript
import {
  search_agents,
  list_agents,
  get_agent,
  check_health,
  suggest_agents,
} from "./tools.ts"

export const agentRegistry: Plugin = async (_input) => {
  return {
    tool: {
      search_agents,
      list_agents,
      get_agent,
      check_health,
      suggest_agents,
    },
  }
}
```

**Types (`plugin/types.d.ts`) — ajout module recommender :**

```typescript
// ─── src/recommender.mjs ──────────────────────────────────────────────────

interface OcProjectProfile {
  languages: string[];
  frameworks: string[];
  tools: string[];
  hasTests: boolean;
  hasCi: boolean;
  hasDocker: boolean;
  hasKubernetes: boolean;
  hasTerraform: boolean;
}

interface OcQuerySignals {
  keywords: string[];
  detectedIntents: string[];
  detectedTech: string[];
}

interface OcSuggestion {
  agent: OcAgentEntry;
  score: number;
  reasons: string[];
  sources: Array<"stack" | "intent" | "pack" | "related">;
}

declare module "../src/recommender.mjs" {
  export function detectProjectProfile(directory: string): OcProjectProfile;
  export function analyzeQuery(prompt: string): OcQuerySignals;
  export function scoreAgents(input: {
    profile: OcProjectProfile | null;
    query: OcQuerySignals | null;
    installed: Set<string>;
    manifest: OcManifest;
  }): OcSuggestion[];
}
```

### 5.2 Commande CLI : `opencode-agents suggest`

**Fichier :** `bin/cli.mjs`

**Comportement :**

1. Détecte le stack depuis `process.cwd()`
2. Charge le manifest, détecte les agents installés
3. Exécute le scoring (signaux projet uniquement, pas de prompt)
4. Affiche les recommandations avec commandes d'installation

```javascript
/**
 * Handle the "suggest" command.
 * @param {ParsedArgs} parsed
 */
function cmdSuggest(parsed) {
  try {
  const limit = parsed.flags.limit
    ? parseInt(/** @type {string} */ (parsed.flags.limit), 10)
    : 10;
  const jsonOutput = Boolean(parsed.flags.json);
  const manifest = getManifest();

  // Stack detection
  const profile = detectProjectProfile(process.cwd());
  const installed = detectInstalledSet(manifest);

  // Scoring (project only, no prompt)
  const suggestions = scoreAgents({
    profile,
    query: null,
    installed,
    manifest,
  }).slice(0, limit);

  if (jsonOutput) {
    const output = suggestions.map(s => ({
      name: s.agent.name,
      category: s.agent.category,
      score: Math.round(s.score * 100),
      reasons: s.reasons,
      sources: s.sources,
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  const stackInfo = [...profile.languages, ...profile.frameworks].join(', ') || 'unknown';
  header(`Detected stack: ${stackInfo}`);

  if (profile.hasDocker) console.log(`  ${dim('+')} Docker detected`);
  if (profile.hasCi) console.log(`  ${dim('+')} CI/CD detected`);
  if (profile.hasKubernetes) console.log(`  ${dim('+')} Kubernetes detected`);
  if (profile.hasTerraform) console.log(`  ${dim('+')} Terraform detected`);
  console.log();

  if (suggestions.length === 0) {
    console.log(`  ${dim('No suggestions — either all relevant agents are installed or the project stack wasn\'t recognized.')}`);
    console.log(`  ${dim(`Try: opencode-agents search <keyword>`)}`);
    return;
  }

  header(`Top ${suggestions.length} suggestions:`);
  console.log();
  for (const s of suggestions) {
    const score = Math.round(s.score * 100);
    const icon = categoryIcon(s.agent.category);
    console.log(`  ${bold(s.agent.name)} ${dim(`(${s.agent.category})`)} — ${cyan(`${score}%`)} match`);
    console.log(`  ${dim(s.agent.description)}`);
    console.log(`  ${dim('→')} ${s.reasons.join(' · ')}`);
    console.log(`  ${dim('$')} ${green(`npx opencode-agents install ${s.agent.name}`)}`);
    console.log();
  }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

  // Human-readable output
  const stackInfo = [...profile.languages, ...profile.frameworks].join(', ') || 'unknown';
  header(`Detected stack: ${stackInfo}`);

  if (profile.hasDocker) console.log(`  ${dim('+')} Docker detected`);
  if (profile.hasCi) console.log(`  ${dim('+')} CI/CD detected`);
  if (profile.hasKubernetes) console.log(`  ${dim('+')} Kubernetes detected`);
  if (profile.hasTerraform) console.log(`  ${dim('+')} Terraform detected`);
  console.log();

  if (suggestions.length === 0) {
    console.log(`  ${dim('No suggestions — either all relevant agents are installed or the project stack wasn\'t recognized.')}`);
    console.log(`  ${dim(`Try: opencode-agents search <keyword>`)}`);
    return;
  }

  header(`Top ${suggestions.length} suggestions:`);
  console.log();
  for (const s of suggestions) {
    const score = Math.round(s.score * 100);
    const icon = categoryIcon(s.agent.category);
    console.log(`  ${bold(s.agent.name)} ${dim(`(${s.agent.category})`)} — ${cyan(`${score}%`)} match`);
    console.log(`  ${dim(s.agent.description)}`);
    console.log(`  ${dim('→')} ${s.reasons.join(' · ')}`);
    console.log(`  ${dim('$')} ${green(`npx opencode-agents install ${s.agent.name}`)}`);
    console.log();
  }
}
```

**Ajout dans le router `main()` :**

```javascript
case 'suggest':
case 'recommend':
  cmdSuggest(parsed);
  break;
```

**Ajout dans `showHelp()` :**

```
  opencode-agents suggest                  Suggest agents based on your project
```

**Flags :**
- `--json` : sortie machine-readable (JSON array)
- `--limit N` : nombre max de suggestions (défaut: 10)

**Ajout dans `KNOWN_FLAGS` :**

```javascript
const KNOWN_FLAGS = new Set([
  // ... existing ...
  'json', 'limit',
]);
```

---

## 6. Phase 4 (Future) — Hook Proactif

**Hors scope v1.** Documenté ici pour référence.

Le hook `chat.message` permettrait de détecter automatiquement la première message d'une session et d'injecter une suggestion :

```typescript
// Future v2 — chat.message hook
export const agentRegistry: Plugin = async (_input) => {
  const suggestedSessions = new Set<string>();

  return {
    tool: { /* ... */ },
    hook: {
      "chat.message": async (ctx) => {
        if (suggestedSessions.has(ctx.sessionID)) return;
        suggestedSessions.add(ctx.sessionID);

        const profile = detectProjectProfile(ctx.directory);
        const manifest = getManifest();
        const installed = detectInstalledSet(manifest, ctx.directory);
        const suggestions = scoreAgents({ profile, query: null, installed, manifest });

        if (suggestions.length > 0) {
          const top3 = suggestions.slice(0, 3).map(s => s.agent.name).join(", ");
          return {
            tip: `💡 Based on your project, you might want: ${top3}. Use suggest_agents for details.`,
          };
        }
      },
    },
  };
};
```

**Prérequis :** Vérifier que `@opencode-ai/plugin` supporte les hooks `chat.message` et que l'interface permet d'injecter des tips dans la conversation.

---

## 7. Stratégie de Tests

### Tests unitaires

| Module | Fichier test | Runner | Cas clés |
|--------|-------------|--------|----------|
| `detectProjectProfile` | `tests/recommender.test.mjs` | `node --test` | Projet React+TS, Go API, Python ML, projet vide, multi-stack |
| `analyzeQuery` | `tests/recommender.test.mjs` | `node --test` | "debug a React issue", "deploy to kubernetes", prompt vide, termes français |
| `scoreAgents` | `tests/recommender.test.mjs` | `node --test` | Fixture profiles + expected top agents, fallback sans enrichment |
| `extract_triggers.py` | `tests/test_extract_triggers.py` | `pytest` | Extraction Decisions, stopwords, agent sans Decisions |
| `suggest_agents` (tool) | `tests/plugin/tools.test.ts` | `bun test` | Intégration bout-en-bout du tool |
| CLI `suggest` | `tests/cli.test.mjs` | `node --test` | Sortie humaine, sortie JSON, --limit |

### Fixtures de test

Trois profils de référence, chacun un répertoire dans `tests/fixtures/` :

**`tests/fixtures/react-ts-project/`** :
```
package.json      → { dependencies: { react, next, @prisma/client }, devDependencies: { typescript } }
tsconfig.json     → {}
.github/workflows → (directory)
docker-compose.yml → (empty file)
tests/            → (directory)
```

Agents attendus dans le top 5 : `react-specialist`, `nextjs-developer`, `typescript-pro`, `docker-specialist`, `ci-cd-engineer`.

**`tests/fixtures/go-api-project/`** :
```
go.mod            → module github.com/example/api
Dockerfile        → (empty file)
k8s/              → (directory)
```

Agents attendus dans le top 5 : `golang-pro`, `docker-specialist`, `kubernetes-specialist`, `api-architect`.

**`tests/fixtures/python-ml-project/`** :
```
pyproject.toml    → [project] dependencies = ["torch", "transformers", "fastapi"]
requirements.txt  → torch\ntransformers\nfastapi\npandas
tests/            → (directory)
```

Agents attendus dans le top 5 : `python-pro`, `ml-engineer`, `data-scientist`, `llm-architect`.

### Edge cases

- **Projet vide** (aucun fichier reconnu) → retourne liste vide, pas d'erreur
- **Stack inconnue** (ex: Haskell) → retourne agents transversaux (debugger, code-reviewer, test-automator)
- **Tous les agents installés** → message "already installed most agents"
- **Manifest sans champs enrichis** → fallback scoring, résultats dégradés mais pas d'erreur
- **Prompt vide** → skip query analysis, scoring sur stack uniquement
- **Répertoire inaccessible** → `detectProjectProfile` retourne profil vide, pas de throw

### Scripts `package.json`

```json
{
  "test:recommender": "node --test tests/recommender.test.mjs",
  "test": "node --test tests/cli.test.mjs tests/tui.test.mjs tests/lock.test.mjs tests/recommender.test.mjs"
}
```

---

## 8. Migration & Compatibilité

### Rétro-compatibilité

- **Schéma manifest additif** : les 4 nouveaux champs (`triggers`, `ecosystem`, `intent`, `related_agents`) sont optionnels. Le manifest reste valide sans eux.
- **Tools existants inchangés** : `search_agents`, `list_agents`, `get_agent`, `check_health` ne lisent pas les nouveaux champs et fonctionnent identiquement.
- **CLI existant inchangé** : toutes les commandes existantes sont préservées. `suggest` est un ajout.
- **Scoring graceful degradation** : si les champs enrichis sont absents, le scoring utilise les tags et descriptions existantes avec un plafond de score réduit.

### Stratégie de déploiement

1. Phase 1 (enrichissement) peut se faire en plusieurs commits sans casser quoi que ce soit
2. Phase 2 (recommender) ajoute un nouveau module — aucun fichier existant modifié sauf `plugin/types.d.ts` (ajout de types)
3. Phase 3 (intégration) modifie `plugin/tools.ts`, `plugin/index.ts`, `bin/cli.mjs` — changements additifs uniquement
4. La feature est activée atomiquement quand le tool `suggest_agents` est enregistré dans `index.ts`

---

## 9. Inventaire des Fichiers

### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/recommender.mjs` | Stack detector, scoring engine, query analyzer (~350 lignes) |
| `scripts/extract-triggers.py` | Extraction automatique des triggers depuis ## Decisions |
| `scripts/generate-tag-template.py` | Génère le CSV template pour l'assignation manuelle ecosystem/intent |
| `scripts/merge-tags.py` | Merge le CSV validé + triggers JSON dans manifest.json |
| `scripts/generate-related.py` | Calcule les related_agents par co-présence dans les packs |
| `data/triggers.json` | Output de l'extraction triggers (staging, pas commité tel quel) |
| `data/ecosystem-intent-tags.csv` | Template d'assignation tags (staging) |
| `tests/recommender.test.mjs` | Tests unitaires du moteur de recommandation |
| `tests/test_extract_triggers.py` | Tests du script d'extraction triggers |
| `tests/fixtures/react-ts-project/` | Fixture : projet React + TypeScript |
| `tests/fixtures/go-api-project/` | Fixture : projet Go + K8s |
| `tests/fixtures/python-ml-project/` | Fixture : projet Python ML |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `manifest.json` | Ajout des champs `triggers`, `ecosystem`, `intent`, `related_agents` sur les 69 agents |
| `src/registry.mjs` | JSDoc `AgentEntry` étendu + `validateManifest()` accepte les nouveaux champs |
| `src/lock.mjs` | Ajout de `detectInstalledSet(manifest, directory?)` — wrapper autour de `detectAgentStates()` qui filtre les statuts `installed` et `outdated` et retourne un `Set<string>` de noms d'agents |
| `plugin/types.d.ts` | `OcAgentEntry` étendu + types `OcProjectProfile`, `OcQuerySignals`, `OcSuggestion` + module `recommender.mjs` + déclaration `detectInstalledSet` dans `lock.mjs` |
| `plugin/tools.ts` | Ajout de `suggest_agents` tool |
| `plugin/index.ts` | Export de `suggest_agents` |
| `bin/cli.mjs` | Ajout commande `suggest` + import `recommender.mjs` + help text + KNOWN_FLAGS |
| `package.json` | Script `test:recommender`, ajout `tests/recommender.test.mjs` au script `test` |

**`detectInstalledSet` — spec d'implémentation (`src/lock.mjs`) :**

```javascript
/**
 * Returns the set of installed agent names (status: 'installed' | 'outdated').
 * Wrapper around detectAgentStates() for use in the recommender.
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [directory] — defaults to process.cwd()
 * @returns {Set<string>}
 */
export function detectInstalledSet(manifest, directory) {
  const states = detectAgentStates(manifest, directory ?? process.cwd());
  return new Set(
    states
      .filter(s => s.status === 'installed' || s.status === 'outdated')
      .map(s => s.name)
  );
}
```

**Déclaration dans `plugin/types.d.ts` :**

```typescript
declare module "../src/lock.mjs" {
  export function detectInstalledSet(
    manifest: OcManifest,
    directory?: string
  ): Set<string>;
}
```

---

## 10. Questions Ouvertes / Décisions à Prendre

### Q1 — Faut-il commiter `data/triggers.json` ?

**Options :**
- **A) Commiter** : traçabilité, review possible, reproductibilité. Mais c'est un artefact dérivé.
- **B) Ne pas commiter** : le script peut le regénérer. Les triggers sont mergés dans manifest.json qui, lui, est commité.

**Recommandation :** Option B — ne pas commiter. Le merge dans manifest.json suffit. Ajouter `data/` au `.gitignore`.

### Q2 — Poids relatifs stack vs intent

Les poids actuels (stack: 0.5, intent: 0.4, tools: 0.1) sont des estimations initiales. Faut-il les rendre configurables ou les fixer ?

**Recommandation :** Les fixer dans le code pour v1. Pas de configuration externe — ça complexifie sans bénéfice mesurable tant qu'on n'a pas de feedback réel. Si les résultats sont mauvais sur les fixtures, on ajuste les constantes directement.

### Q3 — Agents « transversaux » (debugger, code-reviewer, test-automator)

Ces agents sont pertinents pour tout projet, indépendamment du stack. Faut-il leur donner un boost de base ?

**Recommandation :** Oui, mais **pas via un tag `ecosystem:*` wildcard — hors scope v1** (ça nécessiterait de modifier `computeStackScore` pour gérer la wildcard et complexifie le scoring sans gain mesurable à ce stade). À la place, assigner à ces agents des **intent tags larges** couvrant les intentions universelles : `intent:debug`, `intent:review`, `intent:test`, `intent:optimize`, `intent:build`. Ainsi, ils remontent naturellement dès qu'un de ces intents est détecté dans le prompt, et leur fallback stack score (basé sur la description) les fait apparaître sur les projets vides.

### Q4 — Fréquence du scoring dans le plugin

Le scoring relit le manifest et scanne les agents installés à chaque appel. Acceptable en v1 (le manifest est caché par mtime, `detectInstalledSet` fait du `existsSync` × N), mais est-ce que ça pose problème si le LLM appelle `suggest_agents` plusieurs fois dans une session ?

**Recommandation :** Acceptable en v1. `existsSync` est rapide (~0.1ms par appel), 69 agents = ~7ms. Si ça devient un problème, on ajoutera un cache par sessionID.

### Q5 — Langue de l'output du tool

Le tool retourne du texte en anglais (consistant avec les 4 tools existants). Le CLI affiche en anglais aussi. Faut-il supporter le français ?

**Recommandation :** Anglais uniquement pour v1. Tous les tools existants sont en anglais, et le LLM traduit si nécessaire.

### Q6 — Ordre d'implémentation

**Recommandation :**
1. **Phase 1.1** — `scripts/extract-triggers.py` + tests → valider que l'extraction fonctionne
2. **Phase 1.2** — Assignation manuelle ecosystem/intent tags (CSV → review → merge)
3. **Phase 1.3** — `scripts/generate-related.py` → review → merge
4. **Phase 1.4** — Update `validateManifest()` + types
5. **Phase 2** — `src/recommender.mjs` + tests avec fixtures
6. **Phase 3.1** — Plugin tool `suggest_agents`
7. **Phase 3.2** — CLI command `suggest`
8. **Phase 3.3** — Tests d'intégration

Chaque phase est un commit (ou PR) autonome. Les phases 1.x peuvent se paralléliser.

---

## 11. Corrections Post-Revue (v1.0 → v1.1)

Corrections appliquées suite à la revue du review-manager. Document mis à jour le 2026-03-23.

### Critiques (C)

- [x] **C1** — `computeStackScore` : formule recall (`|intersection| / |agent.ecosystem|`) remplacée par **Jaccard** (`|intersection| / |union|`). Évite de favoriser artificiellement les agents avec peu de tags ecosystem.
- [x] **C2** — `applyRelatedBoost` : tri pour trouver le top-5 déplacé sur une **copie** `[...scores].sort(...)` au lieu de muter le tableau source. Évite un bug de classement silencieux si cette fonction est appelée avant le tri final dans `scoreAgents`.

### Majeures (M)

- [x] **M1** — `scoreAgents` : ajout de la redistribution des poids quand `profile === null` (scope "prompt"). Constantes `WEIGHTS_DEFAULT` et `WEIGHTS_PROMPT_ONLY` documentées et extraites. Évite un crash sur `computeStackScore(agent, null)`.
- [x] **M2** — `analyzeQuery` : tokenizer corrigé `\w` → `\p{L}\p{N}` avec flag `/u`. Préserve les accents français/espagnols/allemands (é, ü, ñ, etc.).
- [x] **M3** — `QuerySignals` : note explicite sur la non-redondance entre `keywords`, `detectedIntents` et `detectedTech` ajoutée pour documenter l'absence de double-comptage dans `computeIntentScore`.
- [x] **M4** — `detectProjectProfile` : scan monorepo 1 niveau ajouté pour `packages/`, `apps/`, `services/` si `languages.size < 2` après le scan root.
- [x] **M5** — `detectInstalledSet` : fonction spécifiée et documentée dans la section 9 (Fichiers modifiés). Déclaration TypeScript ajoutée dans `plugin/types.d.ts`. C'est un wrapper autour de `detectAgentStates()` qui filtre `installed` + `outdated`.
- [x] **M6** — `detectProjectProfile` : guard d'entrée ajouté (`statSync` + vérification `isDirectory()`). Retourne un profil vide si le répertoire est inaccessible ou n'est pas un dossier. `emptyProfile()` helper ajouté.
- [x] **M7** — Limites de taille ajoutées : fichiers de dépendances > 5MB ignorés (`package.json`, `pyproject.toml`, `requirements.txt`). Prompts > 2000 chars tronqués dans `analyzeQuery`.

### Mineures (m)

- [x] **m1** — `applyPackAffinityBoost` : boost `score *= 1.1` clampé à 1.0 (`Math.min(..., 1.0)`).
- [x] **m2** — `computeFallbackStackScore` et `computeToolsBonus` : fonctions définies et documentées dans la section 4.2 (étaient référencées mais non spécifiées).
- [x] **m3** — Q3 (agents transversaux) : tag `ecosystem:*` wildcard marqué **hors scope v1**. Solution recommandée : intent tags larges (`intent:debug`, `intent:review`, `intent:test`, `intent:build`, `intent:optimize`).
- [x] **m4** — Bigram detection dans `analyzeQuery` : code commenté et documenté comme dead code avec explication (le tokenizer garde `.` et `/`, donc `next.js` reste un token unique).
- [x] **m5** — `OcSuggestion` et `Suggestion` : `source: string` → `sources: string[]`. Mise à jour en cascade dans `scoreAgents`, `applyRelatedBoost`, CLI (JSON output), et TypeScript types.
- [x] **m6** — `cmdSuggest` (CLI) : ajout d'un `try/catch` global avec `process.exitCode = 1` sur erreur.
- [x] **m7** — `extract-triggers.py` : guard symlink ajouté dans la boucle `rglob` (`if md_file.is_symlink(): continue`).
- [x] **m8** — `validateManifest()` : commentaire ajouté pour documenter que la validation ecosystem est intentionnellement loose en v1 (préfixe uniquement, pas d'allowlist).
