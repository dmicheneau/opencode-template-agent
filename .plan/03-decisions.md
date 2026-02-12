# 📋 Décisions techniques (Architecture Decision Records)

## ADR-001 : Format `permission:` plutôt que `tools:`

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : OpenCode supporte deux formats pour contrôler les outils des agents :
- `tools: { write: false, edit: false }` — champ déprécié
- `permission: { write: deny, edit: ask }` — format moderne

**Décision** : Utiliser exclusivement `permission:` dans tous les agents générés.

**Raison** :
- `tools:` est marqué comme déprécié dans la documentation technique (DeepWiki)
- `permission:` offre une granularité supérieure (allow/ask/deny vs true/false)
- `permission.bash` supporte des patterns glob pour des commandes spécifiques
- Pérennité : le format `tools:` pourrait être supprimé dans une future version

**Conséquences** :
- Le script `sync-agents.py` génère uniquement `permission:` dans le frontmatter
- Les agents ont des profils de permissions intelligents basés sur leurs outils source

---

## ADR-002 : Organisation en sous-répertoires (nested agents)

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : OpenCode supporte les agents dans des sous-répertoires :
`.opencode/agents/team/researcher.md` → invoqué via `@team/researcher`

**Décision** : Organiser les subagents en 11 sous-répertoires par catégorie. Les agents primaires restent à la racine.

**Raison** :
- 40+ agents à plat est ingérable dans l'autocomplétion
- Les catégories donnent un contexte immédiat : `@security/...` vs `@languages/...`
- Les primary agents doivent rester accessibles rapidement (pas de préfixe)

**Conséquences** :
- Les invocations changent : `@typescript-pro` → `@languages/typescript-pro`
- Le script sync crée automatiquement les sous-répertoires
- Le `manifest.json` inclut le chemin relatif de chaque agent

---

## ADR-003 : `OPENCODE_CONFIG_DIR` comme mécanisme d'URL

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : L'objectif est de charger des agents depuis une URL. OpenCode n'a pas de chargement natif par URL mais offre :
- `OPENCODE_CONFIG_DIR` → pointe vers un répertoire externe
- Plugin system → extensions npm
- `{file:...}` → références à des fichiers

**Décision** : Utiliser `OPENCODE_CONFIG_DIR` pointant vers un clone Git du registre.

**Raison** :
- Aucun développement de plugin nécessaire
- Fonctionne immédiatement avec l'écosystème existant
- `git pull` suffit pour mettre à jour
- Compatible avec CI/CD et cron
- Le sync script offre une couche supplémentaire de flexibilité

**Alternatives considérées** :
1. Plugin npm custom → trop complexe pour le gain
2. API HTTP + script de download → fragile, pas de versioning
3. Git submodule → complexe pour les utilisateurs

**Conséquences** :
- Les utilisateurs doivent cloner le repo et configurer la variable d'environnement
- Un one-liner dans `.zshrc` suffit pour l'installation

---

## ADR-004 : Curation à 43 agents (sur 399)

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : aitmpl.com propose 399 agents. En importer la totalité serait contre-productif.

**Décision** : Curer 43 agents couvrant les besoins de développement les plus courants. L'option `--all` reste disponible pour les utilisateurs avancés.

**Critères de sélection** :
- Pertinence pour le développement logiciel (exclut marketing, podcasts, OCR...)
- Qualité du system prompt (longueur, structure, exemples)
- Couverture des langages majeurs
- Complémentarité (pas de doublons fonctionnels)

**Répartition** :
- Langages : 10 (couverture des langages majeurs)
- DevTools : 5 (cycle de développement complet)
- IA/Data : 6 (verticale IA complète)
- Infra : 4 (DevOps + Cloud)
- Sécurité : 3 (audit + pentest + blockchain)
- Web : 2 (React + Next.js)
- API : 2 (REST + GraphQL)
- Docs : 3 (technique + API)
- Business : 3 (PM + projet + agile)
- Database : 2 (architecture + PostgreSQL)
- Design/Mobile : 2 (UI + mobile)

---

## ADR-005 : Python stdlib uniquement pour le script sync

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : Le script sync-agents.py pourrait utiliser des librairies tierces (requests, pyyaml, click...).

**Décision** : N'utiliser que la bibliothèque standard Python (urllib, json, re, argparse, pathlib).

**Raison** :
- Zéro dépendance = zéro installation
- Fonctionne sur n'importe quel système avec Python 3.8+
- Pas besoin de virtualenv, pip, ou package manager
- Le script reste un fichier unique auto-suffisant

**Conséquences** :
- Parsing YAML custom (regex-based) au lieu de pyyaml
- urllib au lieu de requests (un peu plus verbeux)
- argparse au lieu de click (suffisant pour nos besoins)

---

## ADR-006 : Stratégie 3 niveaux pour la curation des agents

**Date** : 2026-02-12
**Statut** : ✅ Adopté

**Contexte** : Le registre source contient 399 agents. La première curation à 43 agents (ADR-004) couvre les besoins essentiels mais laisse de côté des agents de niche potentiellement utiles. L'option `--all` (399) est trop bruyante pour un usage quotidien.

**Décision** : Adopter une stratégie à 3 niveaux :
- **Tier 1 — Core (43)** : agents essentiels, curés manuellement, qualité maximale. Mode par défaut.
- **Tier 2 — Extended (~120-150)** : agents de niche pertinents, curés avec des critères assouplis. Activé via `--tier extended`.
- **Tier 3 — All (399)** : totalité du registre source, pour exploration. Activé via `--all` avec avertissement.

**Raison** :
- Le ratio 43/399 (11%) laisse des trous dans les domaines spécialisés (cloud providers, gaming, data engineering...)
- Un niveau intermédiaire (~150 agents) offre une bonne couverture sans noyer l'utilisateur
- Les permissions par défaut sont plus restrictives pour les agents non curés (Tier 3)
- L'utilisateur choisit son niveau de curation selon ses besoins

**Critères Tier 2** :
1. System prompt > 500 mots
2. Pas de doublon fonctionnel avec Tier 1
3. Pertinence pour ≥10% des développeurs
4. Prompt bien structuré (sections, exemples, contraintes)

**Conséquences** :
- Le script `sync-agents.py` doit supporter `--tier core|extended|all`
- Une liste `EXTENDED_AGENTS` doit être ajoutée (curation manuelle)
- Les agents Tier 3 reçoivent un profil de permissions restrictif (read-only)
- Documentation mise à jour pour expliquer les 3 niveaux
- Voir `.plan/04-agent-tiers.md` pour le détail complet
