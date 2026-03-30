# Moteur de recommandation

Le moteur de recommandation analyse la stack du projet courant et propose automatiquement les agents les plus pertinents. Il opère en trois phases : détection du profil, scoring composite, boosts post-scoring.

## Déclencheurs

### CLI — `runSuggestFlow`

Fichier : `bin/cli.mjs`, lignes 372-482.

Activé quand `opencode-agents install` est lancé **sans argument**. Le moteur scanne le répertoire courant, calcule un score pour chaque agent, filtre ceux dont le score est inférieur à `0.1`, puis affiche le top 8. Un prompt Y/n demande confirmation avant installation ; il s'auto-confirme si le flag `--force` est passé ou si le processus ne tourne pas en TTY.

### TUI — lancement interactif

Fichier : `src/tui/index.mjs`, lignes 37-56.

Activé au démarrage si un TTY est détecté. Si `profile.languages.length > 0 || profile.tools.length > 0`, l'interface démarre directement en mode `suggest` plutôt qu'en mode `browse`. Les agents affichés sont ceux retournés par `scoreAgents` dont le score passe le filtre `>= 0.1` ; ils sont pré-sélectionnés. L'utilisateur peut désélectionner avec `Space` et confirmer l'installation avec `Enter`.

---

## Phase 1 — Détection de la stack

Fonction : `detectProjectProfile(directory)` dans `src/recommender.mjs`.

Lit les fichiers de configuration présents dans le répertoire et en extrait les signaux technologiques :

| Fichier lu | Signal détecté |
|---|---|
| `package.json` deps | JS/TS + framework (`react`, `next`, `vue`, `express`…) |
| `tsconfig.json` | TypeScript |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pyproject.toml` / `requirements.txt` | Python + framework (`fastapi`, `django`, `torch`…) |
| `Gemfile` | Ruby/Rails |
| `pom.xml` / `build.gradle` | Java |
| `*.csproj` | C# |
| `Package.swift` | Swift |
| `Dockerfile`, `docker-compose.yml` | Docker |
| `.github/workflows`, `.gitlab-ci.yml` | CI/CD |
| `terraform/`, `*.tf` | Terraform |
| `k8s/`, `helm/`, `Chart.yaml` | Kubernetes |
| `tests/`, `__tests__/`… | Tests présents |
| `packages/`, `apps/`, `services/` | Monorepo (scan 1 niveau) |

Produit : un objet `ProjectProfile { languages[], frameworks[], tools[], hasDocker, ... }` consommé par le scoring.

---

## Phase 2 — Scoring

Fonction : `scoreAgents({ profile, query, installed, manifest })` dans `src/recommender.mjs`.

Score composite entre 0 et 1, calculé sur trois composantes pondérées. Les poids varient selon que la stack a été détectée ou non :

```js
// Stack détectée + prompt utilisateur
const WEIGHTS_DEFAULT = { stack: 0.5, intent: 0.4, tools: 0.1 };

// Aucune stack détectée (prompt seul)
const WEIGHTS_PROMPT_ONLY = { stack: 0, intent: 1.0, tools: 0 };
```

### Composante stack (poids 0.5)

Similarité Jaccard entre le champ `ecosystem` de l'agent (défini dans `manifest.json`) et les écosystèmes détectés dans le projet. Exemple : un projet React correspond à l'écosystème `web`, ce qui booste les agents déclarant `"ecosystem": ["web"]`.

### Composante intent (poids 0.4)

Le prompt utilisateur (`query`) est tokenisé et comparé à un dictionnaire de 11 intents FR/EN :

`build`, `debug`, `review`, `migrate`, `deploy`, `design`, `document`, `optimize`, `plan`, `test`, `analyze`

Le résultat est confronté au champ `intent` de l'agent dans le manifest.

### Composante tools (poids 0.1)

Bonus direct si le projet utilise Docker, Kubernetes ou Terraform **et** que l'agent mentionne explicitement ces outils.

---

## Phase 3 — Boosts post-scoring

Deux passes appliquées après le scoring brut :

**Pack affinity boost** : si au moins deux agents d'un même pack apparaissent dans les résultats, tous les agents de ce pack reçoivent +10 %.

**Related agents boost** : les agents listés dans le champ `related_agents` des agents du top 5 gagnent +0.05.

Le score final est clampé à `1.0`. Filtre : `score >= 0.1`. Tri décroissant. La fonction retourne au maximum 10 résultats (`scores.slice(0, 10)` — ligne 758 de `src/recommender.mjs`).

---

## Champ `triggers` — extension non déployée

Le scoring engine lit un champ optionnel `triggers` dans le manifest pour affiner le calcul de l'intent score. **Aucun agent du manifest actuel ne définit ce champ.** C'est une extension réservée pour une évolution future.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/recommender.mjs` | Moteur complet : `detectProjectProfile`, `analyzeQuery`, `scoreAgents` |
| `bin/cli.mjs` (lignes 372-482) | `runSuggestFlow` — point d'entrée CLI |
| `src/tui/index.mjs` (lignes 37-56) | Déclenchement TUI au lancement |
| `src/tui/state.mjs` `updateSuggest()` | Gestion des actions utilisateur en mode suggest |
| `src/tui/renderer.mjs` `renderSuggest()` | Rendu de l'écran suggest |
| `manifest.json` | Métadonnées `ecosystem`, `intent`, `related_agents` par agent |
