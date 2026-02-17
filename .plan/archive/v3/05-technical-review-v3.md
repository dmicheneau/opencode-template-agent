# Revue technique — Plan V3 : Agents MCP + TUI Interactive

> **Reviewer** : Senior Technical Architect (AI)
> **Date** : 2026-02-17
> **Scope** : Audit du codebase existant + analyse technique du plan V3 en 8 dimensions
> **Méthode** : Lecture exhaustive de tous les fichiers du projet (src/, bin/, tests/, scripts/, manifest, plan)
> **Verdict** : **APPROVE WITH CHANGES — 2 recommandations majeures, 5 mineures**

---

## Verdict

Le plan V3 couvre deux axes indépendants : **6 nouveaux agents** (dont une nouvelle catégorie `mcp`) et une **TUI interactive** (~1 650 lignes, 6 modules, zero npm deps). Les deux axes sont techniquement réalisables dans les contraintes du projet.

L'**Axe 1** (agents) est **bien cadré et à faible risque** — c'est un pattern déjà maîtrisé (49 agents déjà intégrés). Le seul point délicat est le remapping `prd` (outils Claude Code → `gh` CLI).

L'**Axe 2** (TUI) est **ambitieux mais faisable**. L'architecture 6-modules est bien décomposée. Cependant, le plan **sous-estime 2 problèmes structurels** :

1. 🔴 **T1 — Terminal crash recovery** : SIGTSTP (ctrl-Z) non géré — laissera le terminal en raw mode (inutilisable)
2. 🔴 **T2 — Ratio tests insuffisant** : ~350L tests pour ~1 650L TUI = 21%, contre 64% sur le codebase existant (642L tests / 1 008L code)

Le reste du plan est solide. Les 6 autres dimensions analysées montrent des risques bas à moyens, tous gérables.

---

## 1. Architecture agents (Axe 1)

### Évaluation

L'intégration de 6 agents est un **pattern parfaitement maîtrisé**. Le codebase a déjà absorbé 49 agents avec un pipeline éprouvé (conversion → manifest → tests → commit).

### Analyse par agent

| Agent | Risque | Notes |
|---|---|---|
| `mcp-protocol-specialist` | 🟢 Trivial | 37 lignes, WebSearch → webfetch simple |
| `mcp-server-architect` | 🟢 Trivial | 74 lignes, outils standard |
| `mcp-security-auditor` | 🟢 Trivial | 70 lignes, coexistence sans conflit avec security-auditor |
| `mcp-developer` | 🟢 Simple | 275 lignes, refs souples entre agents |
| `platform-engineer` | 🟡 Moyen | 287 lignes, choix modèle opus vs sonnet à trancher |
| `prd` | 🟠 Haut | 203 lignes, remapping complexe Claude Code → gh CLI + webfetch |

### Risques

- 🟠 **HAUT — Remapping `prd`** : L'agent `prd` original utilise des outils spécifiques à Claude Code (`WebSearch`, `Bash`, `Read`, `Write`). La conversion vers OpenCode nécessite un mapping créatif :
  - `WebSearch` → `webfetch` (OK, déjà fait pour d'autres agents)
  - `Bash` → permission `bash` (OK)
  - `Read`/`Write` → permission `read`/`edit`/`write` (OK)
  - Mais le workflow de l'agent repose sur l'enchaînement de ces outils dans un ordre spécifique. Le remapping doit préserver la sémantique du workflow, pas seulement les outils individuels.

- 🟡 **MOYEN — Choix modèle `platform-engineer`** : L'original demande opus. Le projet utilise sonnet par défaut. C'est une **décision à prendre avant la conversion**, pas un problème technique. Documenter le choix dans la décision D12.

- 🟢 **BAS — Collision `mcp-security-auditor` / `security-auditor`** : Les noms sont distincts et les catégories différentes (`mcp` vs `security`). Pas de collision dans le manifest. La recherche CLI (`searchAgents()` L164-177 de `registry.mjs`) retournera les deux pour une query "security" — c'est le comportement attendu.

### Recommandation

| # | Action | Effort |
|---|---|---|
| A1 | Ajouter l'icône `mcp` dans `CATEGORY_ICONS` de `display.mjs` | 5 min |
| A2 | Créer la catégorie `mcp` dans `manifest.json` sous `categories` | 5 min |
| A3 | Décision D12 : opus vs sonnet pour `platform-engineer` | 15 min (décision) |
| A4 | Convertir `prd` en dernier — c'est le plus complexe | Séquencement |

---

## 2. Architecture TUI (Axe 2)

### Évaluation

La décomposition en 6 modules est **bien pensée** et respecte la séparation des responsabilités :

```
terminal.mjs   — I/O bas niveau (raw mode, alternate screen, curseur)
input.mjs      — Parsing des keypress (bytes bruts → events typés)
renderer.mjs   — Rendu des frames (composition de lignes, diff-based ou full-redraw)
components.mjs — Composants réutilisables (input, dialog, checkbox list)
screens.mjs    — Écrans métier (agent list, category drill-down, packs)
app.mjs        — Machine à états, routage, pile d'écrans
```

### Points forts

1. **Alternate screen buffer** : Le terminal original sera préservé à la sortie. C'est la bonne décision.
2. **Détection TTY automatique** : `process.stdin.isTTY` + fallback CLI classique — non-breaking.
3. **Zero deps** : Cohérent avec la philosophie du projet. Node.js `process.stdin` en raw mode + séquences ANSI est suffisant.
4. **State machine** : Légèrement over-engineered pour 3-4 écrans, mais future-proof si le TUI grandit.

### Risques

- 🟠 **HAUT — Frontière `renderer.mjs` / `components.mjs` floue** : Le plan attribue ~350L à `components.mjs` (TUI-3) et un renderer non quantifié (implicitement dans TUI-1). Qui est responsable du "rendu" ? Si `renderer.mjs` fait le full-frame redraw et `components.mjs` produit des tableaux de strings, c'est clair. Mais le plan ne le spécifie pas explicitement. Risque : duplication de logique de rendu entre les deux modules.

- 🟡 **MOYEN — Réutilisation de `display.mjs` existant** : `display.mjs` (236L) contient déjà des helpers ANSI (`wrap()`, `bold()`, `cyan()`, `padEnd()`, `NO_COLOR` detection). Le plan ne mentionne pas si `src/tui/` importera ces helpers ou les re-déclarera. Recommandation : importer depuis `display.mjs` pour éviter la duplication.

- 🟡 **MOYEN — Piping / non-TTY inattendu** : Si le binaire est appelé dans un pipe (`npx ... | grep`), `process.stdin.isTTY` sera `undefined`. Le plan prévoit la détection TTY, mais le comportement exact dans ce cas (fallback silencieux au CLI classique ? message d'erreur ?) doit être spécifié.

### Recommandation

| # | Action | Détail |
|---|---|---|
| T3 | Documenter la frontière renderer/components | renderer = full-frame, components = ligne-par-ligne |
| T4 | Importer `bold`, `cyan`, `dim`, `wrap`, `NO_COLOR` depuis `display.mjs` | Éviter la duplication ANSI |
| T5 | Spécifier le comportement non-TTY | Fallback CLI classique sans message d'erreur |

---

## 3. Terminal crash recovery

### Évaluation

C'est le **risque technique le plus sérieux** du plan TUI. Le raw mode modifie l'état global du terminal. Si le process ne restaure pas cet état avant de quitter, **le terminal de l'utilisateur devient inutilisable** (pas d'echo, pas de line buffering, pas de ctrl-C).

### Signaux gérés par le plan

Le plan mentionne (TUI-1) : "Gestion propre des sorties (SIGINT, exceptions)".

### Signaux NON gérés

| Signal | Cause | Conséquence si non géré |
|---|---|---|
| `SIGTSTP` | ctrl-Z (background) | Terminal reste en raw mode. Le shell parent reçoit le prompt mais l'input est en raw mode — invisible et inutilisable |
| `SIGCONT` | `fg` (foreground resume) | Le TUI reprend mais l'alternate screen est perdu. Affichage corrompu |
| `SIGKILL` | `kill -9` | Non interceptable — rien à faire, mais documenter |
| `SIGWINCH` | Resize terminal | Plan le gère en TUI-4, OK |
| `uncaughtException` | Bug dans le code | Le plan le mentionne implicitement via "exceptions" |
| `unhandledRejection` | Promise rejetée non catchée | Non mentionné — même risque que uncaughtException |

### Impact

Un utilisateur qui fait ctrl-Z pendant que le TUI est actif se retrouve avec un terminal cassé. La seule récupération est `reset` ou fermer le terminal. C'est une **expérience utilisateur inacceptable** pour un outil CLI.

### Mitigation

```javascript
// terminal.mjs — gestion SIGTSTP/SIGCONT
function setupSignalHandlers() {
  // ctrl-Z : restaurer le terminal AVANT la suspension
  process.on('SIGTSTP', () => {
    restoreTerminal();       // raw mode off, show cursor, exit alternate screen
    process.kill(process.pid, 'SIGTSTP');  // re-envoyer pour suspendre réellement
  });

  // fg : réactiver le TUI
  process.on('SIGCONT', () => {
    enterRawMode();          // re-enter raw mode
    enterAlternateScreen();  // re-enter alternate screen
    fullRedraw();            // redessiner tout
  });

  // ctrl-C
  process.on('SIGINT', () => {
    restoreTerminal();
    process.exit(0);
  });

  // Crash
  process.on('uncaughtException', (err) => {
    restoreTerminal();
    console.error(err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    restoreTerminal();
    console.error(err);
    process.exit(1);
  });
}
```

### Recommandation

| # | Sévérité | Action |
|---|---|---|
| **T1** | 🔴 MAJEUR | Ajouter SIGTSTP/SIGCONT/unhandledRejection à la gestion des signaux dans `terminal.mjs` (TUI-1) |

---

## 4. Tests TUI — Ratio et couverture

### Évaluation

Le plan prévoit ~350 lignes de tests pour ~1 650 lignes de TUI. C'est un ratio de **21%**, significativement en dessous du standard du projet.

### Comparaison avec le codebase existant

| Composant | Code | Tests | Ratio |
|---|---|---|---|
| CLI (src/ + bin/) | 1 008L | 642L | **64%** |
| Scripts Python | 1 609L | 117 tests (fichier dédié) | N/A (ratio tests != ratio lignes) |
| **TUI (plan V3)** | **1 650L** | **350L** | **21%** |

### Cas critiques non mentionnés dans le plan

Le plan liste : keypress parsing, composants (assert strings), machine à états (transitions). C'est un bon début, mais il manque :

| Cas | Module | Criticité |
|---|---|---|
| Restauration terminal après crash (raw mode cleanup) | terminal.mjs | 🔴 Critique |
| Séquences ANSI multi-octets (utf-8, emojis) dans les noms d'agents | input.mjs | 🟡 Moyen |
| Scroll aux bornes (premier/dernier élément) | screens.mjs | 🟡 Moyen |
| Terminal très petit (< 80 cols, < 24 rows) | renderer.mjs | 🟡 Moyen |
| Installation échec pendant le TUI (erreur réseau inline) | screens.mjs | 🟡 Moyen |
| NO_COLOR=1 + TUI (le rendu est-il lisible sans couleurs ?) | components.mjs | 🟢 Bas |
| Clé inconnue / séquence escape invalide (fuzzing input) | input.mjs | 🟢 Bas |

### Recommandation

| # | Sévérité | Action |
|---|---|---|
| **T2** | 🔴 MAJEUR | Augmenter les tests TUI à ~600-700L minimum (ratio ≥40%). Ajouter les cas critiques ci-dessus. |

---

## 5. Performance et scalabilité

### Évaluation

Le TUI affichera **56 agents** dans 10 catégories. C'est une quantité **triviale** — aucun problème de performance n'est anticipé.

### Analyse

| Opération | Volume | Impact |
|---|---|---|
| Chargement du manifest | 56 agents, ~25KB JSON | Instantané (<1ms) |
| Rendu full-frame | ~56 lignes max + headers | Instantané (<5ms) |
| Filtrage live (recherche) | 56 éléments, string.includes() | Instantané (<0.1ms) |
| Scroll | 56 éléments | Pas de virtualisation nécessaire |
| Installation séquentielle pendant TUI | N agents, ~1-3s chacun | UX acceptable — afficher progression |

### Risques

- 🟢 **BAS — Full-frame redraw** : Le plan ne précise pas si le renderer utilise le diff-based rendering ou le full-redraw. Pour 56 agents, le full-redraw est parfaitement acceptable et plus simple à implémenter. Ne pas over-engineer avec du diff.

- 🟢 **BAS — Installation pendant le TUI** : L'installer actuel (`installer.mjs`) fait des downloads HTTPS séquentiels. Pendant l'install, le TUI doit afficher une progression (spinner ou barre). Le plan (TUI-3) mentionne un "écran de confirmation" mais pas l'affichage de progression pendant l'install.

### Recommandation

| # | Action | Détail |
|---|---|---|
| T6 | Ajouter un feedback visuel pendant l'installation | Spinner ou barre de progression par agent |

---

## 6. Compatibilité et edge cases

### Évaluation

Le TUI en raw mode est **intrinsèquement dépendant du terminal**. Le plan mentionne "Windows Terminal, iTerm" (R3) et "TERM=dumb, NO_COLOR" (TUI-4). C'est un bon début mais incomplet.

### Matrice de compatibilité

| Terminal | Alternate Screen | Raw Mode | ANSI Colors | Box Drawing | Statut |
|---|---|---|---|---|---|
| iTerm2 (macOS) | ✅ | ✅ | ✅ | ✅ | ✅ Primaire |
| Terminal.app (macOS) | ✅ | ✅ | ✅ | ✅ | ✅ Supporté |
| Windows Terminal | ✅ | ✅ | ✅ | ✅ | ✅ Supporté |
| **cmd.exe** (Windows legacy) | ❌ | 🟡 | 🟡 | ❌ | ⚠️ Fallback CLI |
| Linux (xterm, gnome-terminal) | ✅ | ✅ | ✅ | ✅ | ✅ Supporté |
| SSH / tmux / screen | ✅ | ✅ | ✅ | ✅ | ✅ Supporté |
| CI / pipe (non-TTY) | ❌ | ❌ | 🟡 | ❌ | Auto-detect → CLI |
| Screen reader (accessibility) | ❌ | ❌ | N/A | N/A | ⚠️ Non supporté |

### Risques

- 🟡 **MOYEN — `cmd.exe` legacy** : Windows cmd.exe avant Windows 10 1511 ne supporte pas les séquences ANSI ni l'alternate screen. La détection TTY (`isTTY`) retournera `true` mais le TUI sera corrompu. Mitigation : vérifier `process.env.WT_SESSION` (Windows Terminal) ou `process.env.TERM_PROGRAM` pour détecter le terminal, ou se fier à `TERM=dumb` comme fallback universel.

- 🟡 **MOYEN — Accessibilité** : Le raw mode est **incompatible avec les lecteurs d'écran**. Le plan ne mentionne pas l'accessibilité. Ce n'est pas bloquant pour un outil CLI dev, mais devrait être documenté.

- 🟡 **MOYEN — Langue du TUI** : Le projet a ses docs en français et son code en anglais. Les labels du TUI (titres, aide, messages) — en quelle langue ? Le CLI existant est 100% anglais ("agents available", "installed", "already exists"). Le TUI devrait suivre cette convention.

### Recommandation

| # | Action | Détail |
|---|---|---|
| T7 | Documenter le fallback `TERM=dumb` et `cmd.exe` legacy | TUI-1, dans terminal.mjs |
| T8 | Labels TUI en anglais (cohérence avec le CLI existant) | Décision à prendre |

---

## 7. Code quality et maintenabilité

### Évaluation

Le codebase existant est **propre et cohérent** : JSDoc partout, ESM strict, noms explicites, séparation claire (registry/installer/display/cli). Le TUI doit maintenir ce standard.

### Points d'attention

- 🟢 **ANSI hand-rolled** : Inévitable avec zero deps. Le pattern `wrap()` de `display.mjs` est élégant et réutilisable. Le TUI devrait l'importer, pas le re-déclarer.

- 🟢 **`readline` vs raw stdin** : Le module `readline` de Node.js pourrait simplifier le parsing des keypress (il gère les séquences escape multi-octets). Le choix du plan (raw stdin parsing) est plus de travail mais donne un contrôle total. C'est défendable pour un TUI custom.

- 🟢 **State machine dans `app.mjs`** : Un peu over-engineered pour 3-4 écrans, mais le pattern est correct et extensible. Si le TUI ne dépasse jamais 4 écrans, un simple `switch` suffisait. Mais la machine à états ne fait pas de mal.

### Risques

- 🟡 **MOYEN — Taille du codebase** : Le TUI ajoute ~1 650L de code et ~350L de tests. C'est une augmentation de **~200%** de la base Node.js (de 1 008L à ~2 658L). Le projet passe d'un "petit CLI" à un "CLI + TUI". La maintenance augmente proportionnellement.

### Métriques projetées

| Métrique | Avant V3 | Après V3 (estimé) |
|---|---|---|
| Lignes Node.js (src/ + bin/) | 1 008 | ~2 700 (+168%) |
| Lignes de test Node.js | 642 | ~1 000 (+56%) |
| Fichiers source Node.js | 4 | 10 (+6 modules TUI) |
| Agents dans manifest | 49 | 56 (+14%) |
| Catégories | 11 | 10 (-1, réorganisation) |

---

## 8. Séquencement et dépendances

### Évaluation

Le séquencement du plan est **correct**. Les deux axes sont indépendants (A1-A4 agents || TUI-1 à TUI-4), ce qui permet l'entrelacement.

### Chaîne de dépendances

```
Axe 1 (Agents) :
  A1 (mcp/ + 3 simples) → A2 (mcp-developer + platform-engineer) → A3 (prd) → A4 (manifest + tests)
                                       ↑ D12 (opus vs sonnet)

Axe 2 (TUI) :
  TUI-1 (MVP) → TUI-2 (navigation) → TUI-3 (recherche) → TUI-4 (polish)
       ↑ T1 (SIGTSTP)                                          ↑ T2 (tests)
```

### Risque de séquencement

- 🟢 **BAS** : Le seul risque est le scope creep TUI (R4 dans le plan). Les 4 phases TUI sont bien délimitées. La recommandation est de ne pas commencer TUI-2 avant que TUI-1 soit terminé ET que les tests de TUI-1 soient écrits (pas reporter les tests à TUI-4).

### Recommandation

| # | Action | Détail |
|---|---|---|
| T9 | Écrire les tests de chaque phase TUI DANS la même phase | Pas de phase "tests" séparée à la fin |

---

## Risques classés par sévérité

### 🔴 Majeurs (2) — À résoudre avant / pendant l'implémentation

| # | Risque | Section | Mitigation |
|---|---|---|---|
| T1 | SIGTSTP/SIGCONT non gérés — terminal cassé après ctrl-Z | §3 | Ajouter handlers dans `terminal.mjs` (TUI-1) |
| T2 | Tests TUI insuffisants (21% vs 64% existant) | §4 | Augmenter à ~600-700L, couvrir les cas critiques |

### 🟠 Hauts (1)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| R1 | Remapping `prd` — workflow Claude Code complexe | §1 | Convertir en dernier, mapper vers gh CLI + webfetch |

### 🟡 Moyens (6)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| T3 | Frontière renderer/components floue | §2 | Documenter : renderer = frame, components = lignes |
| T4 | Duplication ANSI helpers (display.mjs vs tui/) | §2 | Importer depuis display.mjs |
| T5 | Comportement non-TTY non spécifié | §2 | Fallback CLI classique |
| T7 | cmd.exe legacy incompatible | §6 | Détecter TERM=dumb, fallback CLI |
| T8 | Langue des labels TUI non décidée | §6 | Anglais (cohérence CLI) |
| M1 | Taille du codebase +168% | §7 | Acceptable si tests proportionnels |

### 🟢 Bas (3)

| # | Risque | Section | Mitigation |
|---|---|---|---|
| T6 | Pas de feedback visuel pendant l'install | §5 | Ajouter spinner/barre |
| T9 | Tests reportés en fin de phase | §8 | Tests dans chaque phase |
| L1 | Collision noms mcp-security-auditor / security-auditor | §1 | Noms distincts — non bloquant |

---

## Recommandations résumées

### Modifications obligatoires (avant implémentation)

| # | Action | Phase | Effort |
|---|---|---|---|
| **T1** | Gérer SIGTSTP/SIGCONT/unhandledRejection dans `terminal.mjs` | TUI-1 | 30 min |
| **T2** | Augmenter les tests TUI de ~350L à ~600-700L | TUI-1 à TUI-4 | Continu |

### Modifications recommandées

| # | Action | Phase | Effort |
|---|---|---|---|
| T3 | Documenter la frontière renderer/components | TUI-1 | 15 min |
| T4 | Réutiliser `display.mjs` helpers dans le TUI | TUI-1 | 30 min |
| T5 | Spécifier le fallback non-TTY (CLI classique) | TUI-1 | 15 min |
| T6 | Feedback visuel pendant l'installation | TUI-3 | 1h |
| T7 | Fallback TERM=dumb / cmd.exe | TUI-4 | 30 min |
| T8 | Décider langue labels TUI (→ anglais) | Avant TUI-1 | 5 min |
| T9 | Tests dans chaque phase (pas en fin) | TUI-1 à TUI-4 | Inclus dans T2 |

### Agents — Actions

| # | Action | Phase | Effort |
|---|---|---|---|
| A1 | Ajouter icône `mcp` dans `display.mjs` CATEGORY_ICONS | A1 | 5 min |
| A2 | Créer catégorie `mcp` dans manifest.json | A1 | 5 min |
| A3 | Décision D12 : opus vs sonnet pour platform-engineer | Avant A2 | 15 min |
| A4 | Convertir `prd` en dernier (complexité max) | A3 | 1 session |

---

> **Bottom line technique** : Le plan V3 est plus simple et mieux ciblé que le V2. L'axe agents est un travail routinier à faible risque. L'axe TUI est ambitieux mais bien architecturé — les deux risques majeurs (crash recovery terminal et couverture de tests) sont facilement résolvables avec les mitigations proposées. Le projet reste dans ses contraintes (zero deps, ESM, stdlib only).

---
### Post-review: Réorganisation catégories (D15)
Toutes les issues identifiées dans cette revue ont été corrigées. De plus, les catégories ont été réorganisées de 12→10 pour résoudre la confusion UX entre les tabs "Developer"/"Programming"/"Development". 358 tests passent (241 JS + 117 Python).
