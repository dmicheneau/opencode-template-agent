# Current Mission
Fonctionnalité de suggestion intelligente d'agents — analyse du prompt, contexte, et projet

## Status: Analyse terminée, design en cours

## Contexte
L'utilisateur veut une feature qui analyse le prompt, le contexte de conversation, ou le projet courant pour suggérer les agents les plus pertinents du registre (69 agents, 10 catégories, 15 packs).

## Découvertes clés

### Surfaces d'intégration viables
1. **Plugin tool `suggest_agents`** (PRIMAIRE) — s'ajoute aux 4 tools existants dans plugin/tools.ts. A accès à ctx.directory pour scanner le projet, et PluginInput.client pour l'historique de session. Le LLM décide quand l'appeler.
2. **CLI `opencode-agents suggest`** (SECONDAIRE) — commande déterministe qui scanne le répertoire courant. Bon pour onboarding.
3. **Hook `chat.message`** (OPTIONNEL) — suggestion proactive au premier message. Détection de stack automatique.
4. **Skill** (COMPLÉMENT) — instructions pour guider le LLM quand utiliser quels agents.

### Architecture plugin (ctx)
- `ToolContext` fournit: sessionID, messageID, agent, directory, worktree, abort, metadata(), ask()
- `PluginInput` fournit: client (OpencodeClient avec session.messages()), project, $shell
- Le client capturé en closure donne accès à l'historique de conversation
- PAS d'accès direct au texte du prompt dans execute() — faut passer par client.session.messages()

### Qualité des métadonnées (3.5/5)
- 228 tags uniques, 69 agents, moyenne 5.5 tags/agent
- Tags trop fragmentés (seul "security" apparaît 6 fois)
- Pas de tags écosystème (python, javascript, etc.) ni d'intent (build, debug, audit)
- Les sections Decisions des agents sont RICHES en IF/THEN triggers — meilleure source pour le matching
- Packs = bons clusters de recommandation mais pas assez granulaires

### Manques identifiés
- Pas de détection de stack projet (package.json → agents)
- Pas de recherche sémantique/fuzzy
- Pas de synonymes/alias dans les tags
- episode-orchestrator absent du manifest
- Pas de related_agents entre agents

## Plan d'implémentation (BROUILLON)

### Phase 1 — Enrichissement métadonnées
- Ajouter tags écosystème et intent au manifest
- Extraire trigger keywords des sections Decisions
- Ajouter related_agents au manifest

### Phase 2 — Moteur de recommandation (src/suggest.mjs)
- Détecteur de stack projet (scan package.json, go.mod, etc.)
- Matching multi-signal (tags, triggers, stack, description)
- Score de pertinence pondéré

### Phase 3 — Intégration surfaces
- Plugin tool suggest_agents (tools.ts)
- CLI command suggest (bin/cli.mjs)
- Optionnel: hook chat.message pour proactivité

## Fichiers concernés
- `manifest.json` — enrichissement métadonnées agents
- `src/suggest.mjs` — NOUVEAU, moteur de recommandation
- `plugin/tools.ts` — ajout suggest_agents tool
- `plugin/types.d.ts` — types pour suggest.mjs
- `bin/cli.mjs` — ajout commande suggest
- `tests/` — tests pour chaque couche

## Décisions en attente
- Scope exact de la phase 1 (quels enrichissements en premier ?)
- Algorithme de scoring (pondérations, fuzzy matching)
- Format de sortie du suggest_agents tool
- Faut-il enrichir le manifest ou créer un index séparé ?
