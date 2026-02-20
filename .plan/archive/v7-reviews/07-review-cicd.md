# Review CI/CD — S7 Séparation agents produit / agents de développement

**Reviewer :** CI/CD Engineer
**Document reviewé :** `.plan/07-agent-separation.md`
**Scope :** DevOps, CI/CD, backward compatibility, deployment strategy

---

## Verdict : CHANGES_REQUESTED

Le plan identifie correctement le problème fondamental (dual usage de `base_path`) et propose une approche par phases bien structurée. Mais il manque une pièce critique : la **stratégie de release coordonnée** qui empêche les anciennes versions du CLI de casser.

Les issues ci-dessous sont classées par sévérité. Les deux issues **CRITICAL** doivent être adressées avant exécution.

---

## Issues

### 🔴 CRITICAL-1 — Pas de stratégie de version/release npm

**Constat :** Le CLI (`opencode-agents`) charge le manifest depuis son propre package npm (`registry.mjs` ligne 51 : `join(__dirname, '..', 'manifest.json')`), pas depuis GitHub. Le `package.json` inclut `manifest.json` dans le champ `files`.

Conséquence : un utilisateur avec une ancienne version du CLI (installée globalement via `npm install -g`, ou lockée dans un `package.json`) aura :
- Un manifest avec `base_path: ".opencode/agents"` uniquement (pas de `source_path`)
- Un `getDownloadUrl()` qui construit des URLs vers `.opencode/agents/<path>.md`
- Après le merge, ces fichiers n'existent plus dans le repo → **HTTP 404 sur chaque install**

Le fallback `source_path || base_path` ne protège que les **nouvelles** versions du CLI. Les anciennes versions n'ont pas ce code.

**Fix requis :** Ajouter une **Phase 1.5 — Release strategy** au plan :

1. La migration du repo ET la mise à jour du CLI (`installer.mjs` + `registry.mjs`) doivent être dans le **même commit/PR**
2. Bump de version npm obligatoire : `7.0.0` → `7.1.0` (minor, car breaking pour la source mais pas pour l'API publique)
3. `npm publish` doit se faire **immédiatement après le merge** — pas de fenêtre où le repo a bougé mais le npm package pointe encore vers l'ancien chemin
4. Idéalement, automatiser via un workflow `release.yml` déclenché au merge
5. Documenter dans le README/CHANGELOG que les versions < 7.1.0 ne sont plus compatibles avec le repo
6. Considérer un **redirect** : garder un symlink `agents/<path>.md` → `.opencode/agents/<path>.md` pendant 30 jours, ou mieux : une GitHub Pages redirect (non applicable pour raw.githubusercontent.com)

**Alternative mitigation :** Garder les fichiers `.opencode/agents/*.md` comme des symlinks vers `agents/*.md` pendant une version de transition. Ça donnerait aux anciennes versions du CLI le temps de se mettre à jour. Ajouter un deprecation warning.

---

### 🔴 CRITICAL-2 — `install.sh` : la profondeur du hardcoding est sous-estimée

**Constat :** Le plan mentionne P2.12 pour `install.sh` mais sous-estime l'ampleur. L'audit révèle au moins 4 zones distinctes :

| Ligne | Code | Impact |
|-------|------|--------|
| 303-323 | `get_source_dir()` : `if [[ -d "${script_dir}/.opencode/agents" ]]` | Détection du mode "from repo" cassée |
| 392-400 | `install_merge()` : `source_agents="${source_dir}/.opencode/agents"` | Chemin source hardcodé |
| ~470+ | `AGENT_SUBDIRS` array | Les sous-répertoires sont listés en dur |
| ~500+ | `AGENT_ROOT_FILES` array | Les fichiers racine sont listés en dur |

De plus, `install.sh` est téléchargé et exécuté directement par les utilisateurs via `curl | bash`. Il n'y a **aucun mécanisme de versioning** — l'utilisateur récupère toujours la version `main`. C'est un avantage ici (pas de vieille version qui traîne) mais ça signifie qu'il faut que le script soit correct au moment du merge.

**Fix requis :** 
- P2.12 doit lister explicitement les 4+ zones à modifier, pas juste "modifier `get_source_dir()`"
- Ajouter un test pour `install.sh` dans Phase 4 qui vérifie le mode "from repo" (pas seulement le mode remote)
- Considérer lire `source_path` depuis `manifest.json` au lieu de hardcoder — rendrait le script résistant aux futures migrations

---

### 🟡 MAJOR-1 — Le manifest de sync (`.opencode/agents/manifest.json`) n'est pas adressé

**Constat :** Il existe **deux** `manifest.json` :
1. `./manifest.json` (racine) — distribué dans le package npm, utilisé par la CLI
2. `./.opencode/agents/manifest.json` — généré par `sync-agents.py`, utilisé par le workflow `sync-agents.yml`

Le plan ne mentionne que le premier. Le second contient 133 agents avec métadonnées de sync, permissions, et statut. Après migration, il devrait logiquement vivre dans `agents/manifest.json`.

**Fix requis :** Ajouter dans P1 :
- P1.6 — Déplacer `.opencode/agents/manifest.json` vers `agents/manifest.json` (ou décider explicitement de le supprimer/régénérer)
- Mettre à jour `sync-agents.py` et `update-manifest.py` pour pointer vers le nouveau chemin
- Mettre à jour `sync-agents.yml` lignes qui référencent ce fichier

---

### 🟡 MAJOR-2 — Plan de rollback trop simpliste

**Constat :** Le rollback propose `git checkout main -- <files>`. Problème : si la PR est mergée dans `main`, cette commande ne fait rien d'utile — on checkout `main` depuis `main`.

**Fix requis :** Le rollback devrait :
1. Utiliser `git revert <merge-commit-sha>` pour un rollback post-merge
2. Inclure un rollback npm : `npm unpublish opencode-agents@7.1.0` ou publish d'un `7.1.1` qui restaure l'ancien comportement
3. Documenter le rollback de `install.sh` (qui est stateless — un revert git suffit, mais il faut le mentionner)
4. Définir un **trigger de rollback** : quels symptômes déclenchent le rollback ? (ex: taux d'erreur 404 sur les downloads > X%)

---

### 🟡 MAJOR-3 — Pas de fenêtre de déploiement ni de séquencement

**Constat :** Le plan traite la migration comme une opération git locale. En réalité, c'est un **déploiement distribué** avec 3 surfaces :
1. Le **repo GitHub** (raw.githubusercontent.com sert les fichiers)
2. Le **package npm** (distribue manifest + CLI)
3. Le **script install.sh** (téléchargé directement depuis GitHub)

Ces 3 surfaces doivent être cohérentes au même moment. GitHub raw URLs ont un cache TTL de ~5 min. npm a un cache de ~quelques secondes.

**Fix requis :** Ajouter une section "Séquencement du déploiement" :
1. Merger la PR (les 3 surfaces bougent ensemble car tout est dans le même repo/commit)
2. Vérifier que GitHub raw renvoie les nouveaux fichiers (attendre ~5 min, tester une URL)
3. `npm publish` (si pas automatisé par CI)
4. Smoke test : `npx opencode-agents@latest install typescript-pro` → doit réussir
5. Monitorer les 404 sur les anciennes URLs (si des métriques existent)

---

### 🟡 MAJOR-4 — `.manifest-lock.json` non mentionné

**Constat :** Le fichier `.opencode/agents/.manifest-lock.json` contient les hash SHA256 des agents installés chez l'utilisateur. Il est utilisé par `lock.mjs` pour vérifier l'intégrité.

Ce fichier vit côté **destination** (chez l'utilisateur), donc il ne devrait **pas** être impacté par la migration. Mais le plan devrait l'affirmer explicitement, parce que :
- Si quelqu'un interprète le plan comme "supprimer tout dans `.opencode/agents/`", le lock file sera supprimé
- La Phase 3 dit "Supprimer les sous-répertoires vides dans `.opencode/agents/`" — sans mentionner qu'il faut préserver les fichiers lock/config

**Fix requis :** Dans P3.1, ajouter une note : "Ne PAS toucher aux fichiers `.manifest-lock.json`, `.sync-cache.json` et autres fichiers de state dans `.opencode/agents/`. Ces fichiers concernent l'installation locale, pas la source."

*(Note : dans le contexte du repo de dev, ces fichiers existent aussi. `.sync-cache.json` est gitignored mais `.manifest-lock.json` non.)*

---

### 🟢 MINOR-1 — Estimation de temps pour Phase 2 trop optimiste

**Constat :** Phase 2 est estimée à 45 min pour ~15 tâches couvrant 11 fichiers, incluant du code JS, Python, YAML, et Bash. En pratique, les modifications CI (workflows YAML avec scripts inline Python) sont notoirement sujettes aux erreurs et nécessitent des itérations.

**Suggestion :** Estimer Phase 2 à 1h30 minimum. Prévoir 30 min de buffer pour les corrections post-CI.

---

### 🟢 MINOR-2 — Phase 4 ne teste pas les anciennes versions du CLI

**Constat :** P4.3 teste `npx opencode-agents` — qui récupère la dernière version. Aucun test de la version actuellement publiée sur npm (7.0.0) contre le nouveau repo.

**Suggestion :** Ajouter un test explicite :
```bash
# Installer la version actuelle (pré-migration)
npm install -g opencode-agents@7.0.0
# Tester que l'install échoue gracefully (pas un crash, juste un message clair)
opencode-agents install typescript-pro 2>&1 | grep -i "error\|404\|not found"
```
Ça documente le comportement dégradé et confirme qu'il n'y a pas de crash silencieux.

---

### 🟢 MINOR-3 — `quality_scorer.py` et `test_enrichment.py` pas dans l'inventaire

**Constat :** `quality_scorer.py` est importé par `sync-agents.py` et utilisé en Phase 4 (P4.6). `test_enrichment.py` importe aussi des modules qui référencent `.opencode/agents`. Aucun des deux n'est dans la table d'inventaire des fichiers impactés (même si `quality_scorer.py` est testé en P4.6).

**Suggestion :** Les ajouter à la table pour exhaustivité.

---

## Points positifs

Le plan fait plusieurs choses bien :

- **L'identification du dual-usage de `base_path`** est le vrai insight du plan. Sans cette découverte, la migration aurait cassé l'installation chez les utilisateurs. Le split `source_path` / `base_path` est la bonne solution.

- **Le fallback `source_path || base_path`** est un pattern de rétrocompatibilité solide côté manifest. Si un vieux manifest sans `source_path` est chargé, le code tombe sur `base_path` — correct.

- **L'approche par phases** est propre. Phase 0 (baseline) → Phase 1 (migration) → Phase 2 (code) → Phase 3 (cleanup) → Phase 4 (validation) — c'est le bon ordre.

- **`git mv` pour préserver l'historique** — bonne pratique. Le plan vérifie même que git détecte les renames (P1.4).

- **La table d'inventaire des fichiers impactés** est détaillée et distingue correctement source vs destination. Les fichiers "NON impactés" sont explicitement listés — ça évite les questions.

- **L'analyse de risques** couvre les bons scénarios. La probabilité et l'impact sont réalistes.

---

## Résumé des actions requises

| # | Sévérité | Action |
|---|----------|--------|
| C1 | 🔴 CRITICAL | Ajouter une stratégie de release npm coordonnée |
| C2 | 🔴 CRITICAL | Détailler les 4+ zones de `install.sh` à modifier |
| M1 | 🟡 MAJOR | Adresser le manifest de sync `.opencode/agents/manifest.json` |
| M2 | 🟡 MAJOR | Réécrire le plan de rollback (revert, npm, triggers) |
| M3 | 🟡 MAJOR | Ajouter le séquencement de déploiement |
| M4 | 🟡 MAJOR | Clarifier le sort de `.manifest-lock.json` et fichiers de state |
| m1 | 🟢 MINOR | Revoir l'estimation de Phase 2 |
| m2 | 🟢 MINOR | Tester le comportement des anciennes versions CLI |
| m3 | 🟢 MINOR | Compléter l'inventaire avec quality_scorer.py et test_enrichment.py |

Une fois les 2 CRITICAL et les 4 MAJOR adressés, le plan est bon pour exécution.
