#!/usr/bin/env python3
"""
test_sync_script.py - Tests unitaires des fonctions pures du script sync-agents.py.

Teste les fonctions de parsing, conversion et generation sans faire
d'appels reseau.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

# ---------------------------------------------------------------------------
# Import du module sync-agents.py (nom avec tiret -> import dynamique)
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import importlib

sync_agents = importlib.import_module("sync-agents")

# Fonctions a tester
parse_frontmatter = sync_agents.parse_frontmatter
extract_short_description = sync_agents.extract_short_description
build_permissions = sync_agents.build_permissions
clean_body = sync_agents.clean_body
_get_opencode_category = sync_agents._get_opencode_category
_get_agent_relative_path = sync_agents._get_agent_relative_path
PRIMARY_AGENTS = sync_agents.PRIMARY_AGENTS
CATEGORY_MAPPING = sync_agents.CATEGORY_MAPPING
CURATED_AGENTS = sync_agents.CURATED_AGENTS
EXTENDED_AGENTS = sync_agents.EXTENDED_AGENTS
build_parser = sync_agents.build_parser


# ---------------------------------------------------------------------------
# Tests parse_frontmatter()
# ---------------------------------------------------------------------------


class TestParseFrontmatter(unittest.TestCase):
    """Tests pour parse_frontmatter() : extraction du frontmatter YAML."""

    def test_valid_frontmatter(self):
        """Verifie le parsing d'un frontmatter valide avec cles simples."""
        content = """---
name: test-agent
description: A test agent for unit testing.
mode: subagent
---

This is the body content."""

        meta, body = parse_frontmatter(content)
        self.assertEqual(meta["name"], "test-agent")
        self.assertEqual(meta["description"], "A test agent for unit testing.")
        self.assertEqual(meta["mode"], "subagent")
        self.assertEqual(body, "This is the body content.")

    def test_empty_frontmatter(self):
        """Verifie le parsing d'un frontmatter vide (delimiteurs sans contenu)."""
        content = """---
---

Body only."""

        meta, body = parse_frontmatter(content)
        self.assertEqual(meta, {})
        self.assertEqual(body, "Body only.")

    def test_no_frontmatter(self):
        """Verifie le parsing d'un contenu sans delimiteurs de frontmatter."""
        content = "Just some plain text without frontmatter."

        meta, body = parse_frontmatter(content)
        self.assertEqual(meta, {})
        self.assertEqual(body, content)

    def test_malformed_frontmatter_no_closing(self):
        """Verifie le parsing d'un frontmatter sans delimiteur de fermeture."""
        content = """---
name: broken
description: No closing delimiter"""

        meta, body = parse_frontmatter(content)
        # Sans fermeture, tout est traite comme du contenu brut
        self.assertEqual(meta, {})

    def test_quoted_values(self):
        """Verifie le parsing des valeurs entre guillemets."""
        content = """---
description: "A quoted description with \\"escapes\\"."
mode: primary
---

Body."""

        meta, body = parse_frontmatter(content)
        self.assertIn("escapes", meta["description"])
        self.assertEqual(meta["mode"], "primary")

    def test_multiline_continuation(self):
        """Verifie que les lignes de continuation sont rattachees a la cle precedente."""
        content = """---
description: First line
  continuation of description
mode: subagent
---

Body."""

        meta, body = parse_frontmatter(content)
        self.assertIn("First line", meta["description"])
        self.assertIn("continuation", meta["description"])
        self.assertEqual(meta["mode"], "subagent")


# ---------------------------------------------------------------------------
# Tests extract_short_description()
# ---------------------------------------------------------------------------


class TestExtractShortDescription(unittest.TestCase):
    """Tests pour extract_short_description() : generation de descriptions courtes."""

    def test_normal_description(self):
        """Verifie l'extraction d'une description normale."""
        desc = "A senior TypeScript developer specializing in advanced patterns."
        result = extract_short_description(desc, "typescript-pro")
        self.assertIn("TypeScript", result)
        self.assertTrue(result.endswith("."))

    def test_description_with_specifically(self):
        """Verifie la suppression de l'artefact 'Specifically:' en fin de description."""
        desc = "Expert in security auditing and compliance. Specifically:."
        result = extract_short_description(desc, "security-auditor")
        self.assertNotIn("Specifically:", result)
        self.assertTrue(result.endswith("."))

    def test_empty_description(self):
        """Verifie le fallback pour une description vide."""
        result = extract_short_description("", "my-agent")
        self.assertIn("my agent", result)
        self.assertTrue(result.endswith("."))

    def test_long_description_truncated(self):
        """Verifie que les descriptions longues sont tronquees a 2 phrases."""
        desc = (
            "First sentence about the agent. "
            "Second sentence with more details. "
            "Third sentence that should be removed. "
            "Fourth sentence also gone."
        )
        result = extract_short_description(desc, "test")
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        self.assertLessEqual(len(sentences), 2)

    def test_claude_replacement(self):
        """Verifie que les references a 'Claude Code' sont remplacees par 'OpenCode'."""
        desc = "Use Claude Code for advanced development tasks."
        result = extract_short_description(desc, "test")
        self.assertNotIn("Claude Code", result)
        self.assertIn("OpenCode", result)

    def test_xml_tags_removed(self):
        """Verifie que les tags XML sont supprimes de la description."""
        desc = "Use this <b>agent</b> for <example>testing</example> purposes."
        result = extract_short_description(desc, "test")
        self.assertNotIn("<b>", result)
        self.assertNotIn("<example>", result)

    def test_description_with_example_block(self):
        """Verifie que le texte avant un bloc <example> est extrait correctement."""
        desc = "Short description here.<example>Some example content</example>"
        result = extract_short_description(desc, "test")
        self.assertIn("Short description here", result)


# ---------------------------------------------------------------------------
# Tests build_permissions()
# ---------------------------------------------------------------------------


class TestBuildPermissions(unittest.TestCase):
    """Tests pour build_permissions() : conversion des outils en permissions."""

    def test_full_access_profile(self):
        """Verifie le profil full-access (Read, Write, Edit, Bash)."""
        perms = build_permissions("Read, Write, Edit, Bash, Glob, Grep")
        self.assertEqual(perms["write"], "allow")
        self.assertEqual(perms["edit"], "ask")
        self.assertIsInstance(perms["bash"], dict)
        self.assertEqual(perms["bash"]["*"], "ask")
        self.assertIn("task", perms)

    def test_read_only_profile(self):
        """Verifie le profil lecture seule (Read, Glob, Grep)."""
        perms = build_permissions("Read, Glob, Grep")
        self.assertEqual(perms["write"], "deny")
        self.assertEqual(perms["edit"], "deny")
        self.assertEqual(perms["bash"], "deny")
        self.assertIn("task", perms)

    def test_analysis_profile(self):
        """Verifie le profil analyse (Read, Bash pour commandes limitees)."""
        perms = build_permissions("Read, Bash, Glob, Grep")
        self.assertEqual(perms["write"], "deny")
        self.assertEqual(perms["edit"], "deny")
        self.assertIsInstance(perms["bash"], dict)

    def test_content_profile(self):
        """Verifie le profil creation de contenu (Read, Write)."""
        perms = build_permissions("Read, Write, Glob, Grep")
        self.assertEqual(perms["write"], "allow")
        self.assertEqual(perms["edit"], "deny")
        self.assertEqual(perms["bash"], "deny")

    def test_webfetch_permission(self):
        """Verifie que webfetch est active quand l'outil fetch est present."""
        perms = build_permissions("Read, WebFetch, Glob")
        self.assertEqual(perms.get("webfetch"), "allow")

    def test_task_always_present(self):
        """Verifie que la permission task est toujours presente."""
        perms = build_permissions("")
        self.assertIn("task", perms)
        self.assertIsInstance(perms["task"], dict)
        self.assertEqual(perms["task"]["*"], "allow")

    def test_empty_tools_string(self):
        """Verifie le comportement avec une chaine d'outils vide."""
        perms = build_permissions("")
        self.assertEqual(perms["write"], "deny")
        self.assertEqual(perms["edit"], "deny")
        self.assertEqual(perms["bash"], "deny")

    def test_bash_has_git_commands(self):
        """Verifie que bash inclut les commandes git pre-autorisees."""
        perms = build_permissions("Bash")
        bash_perms = perms["bash"]
        self.assertIsInstance(bash_perms, dict)
        self.assertIn("git status", bash_perms)
        self.assertEqual(bash_perms["git status"], "allow")
        self.assertIn("git diff*", bash_perms)
        self.assertIn("git log*", bash_perms)


# ---------------------------------------------------------------------------
# Tests clean_body()
# ---------------------------------------------------------------------------


class TestCleanBody(unittest.TestCase):
    """Tests pour clean_body() : nettoyage du contenu du body."""

    def test_remove_example_blocks(self):
        """Verifie la suppression des blocs <example>...</example>."""
        body = """Some content before.

<example>
User: How do I do X?
Assistant: Here's how...
</example>

Some content after."""

        result = clean_body(body)
        self.assertNotIn("<example>", result)
        self.assertNotIn("User:", result)
        self.assertIn("Some content before.", result)
        self.assertIn("Some content after.", result)

    def test_remove_commentary_blocks(self):
        """Verifie la suppression des blocs <commentary>.</commentary>."""
        body = """Main content.

<commentary>
This is an internal note.
</commentary>

More content."""

        result = clean_body(body)
        self.assertNotIn("<commentary>", result)
        self.assertNotIn("internal note", result)
        self.assertIn("Main content.", result)

    def test_replace_claude_code(self):
        """Verifie le remplacement de 'Claude Code' par 'OpenCode'."""
        body = "When using Claude Code, you should follow best practices."
        result = clean_body(body)
        self.assertNotIn("Claude Code", result)
        self.assertIn("OpenCode", result)

    def test_replace_standalone_claude(self):
        """Verifie le remplacement de 'Claude' isole (pas dans un nom de modele)."""
        body = "Claude should analyze the code carefully."
        result = clean_body(body)
        self.assertNotIn("Claude should", result)
        self.assertIn("the AI assistant", result)

    def test_preserve_claude_in_model_names(self):
        """Verifie que 'Claude' est preserve dans les noms de modeles."""
        body = "Use Claude Sonnet for fast responses and Claude Opus for deep analysis."
        result = clean_body(body)
        self.assertIn("Claude Sonnet", result)
        self.assertIn("Claude Opus", result)

    def test_collapse_multiple_blank_lines(self):
        """Verifie que les lignes vides multiples sont reduites a 2 maximum."""
        body = "Line 1.\n\n\n\n\n\nLine 2."
        result = clean_body(body)
        self.assertNotIn("\n\n\n\n", result)

    def test_body_stripped(self):
        """Verifie que le body est trim (pas d'espaces en debut/fin)."""
        body = "   \n\n  Content here.  \n\n   "
        result = clean_body(body)
        self.assertFalse(result.startswith(" "))
        self.assertFalse(result.endswith(" "))
        self.assertFalse(result.endswith("\n"))


# ---------------------------------------------------------------------------
# Tests _get_opencode_category()
# ---------------------------------------------------------------------------


class TestGetOpencodeCategory(unittest.TestCase):
    """Tests pour _get_opencode_category() : mapping des categories source vers OpenCode."""

    def test_programming_languages(self):
        """Verifie le mapping programming-languages -> languages."""
        self.assertEqual(_get_opencode_category("programming-languages"), "languages")

    def test_development_tools(self):
        """Verifie le mapping development-tools -> devtools."""
        self.assertEqual(_get_opencode_category("development-tools"), "devtools")

    def test_data_ai(self):
        """Verifie le mapping data-ai -> ai."""
        self.assertEqual(_get_opencode_category("data-ai"), "ai")

    def test_ai_specialists(self):
        """Verifie le mapping ai-specialists -> ai."""
        self.assertEqual(_get_opencode_category("ai-specialists"), "ai")

    def test_devops_infrastructure(self):
        """Verifie le mapping devops-infrastructure -> devops."""
        self.assertEqual(_get_opencode_category("devops-infrastructure"), "devops")

    def test_security(self):
        """Verifie le mapping security -> security."""
        self.assertEqual(_get_opencode_category("security"), "security")

    def test_blockchain_web3(self):
        """Verifie le mapping blockchain-web3 -> security."""
        self.assertEqual(_get_opencode_category("blockchain-web3"), "security")

    def test_database(self):
        """Verifie le mapping database -> data-api."""
        self.assertEqual(_get_opencode_category("database"), "data-api")

    def test_web_tools(self):
        """Verifie le mapping web-tools -> web."""
        self.assertEqual(_get_opencode_category("web-tools"), "web")

    def test_api_graphql(self):
        """Verifie le mapping api-graphql -> data-api."""
        self.assertEqual(_get_opencode_category("api-graphql"), "data-api")

    def test_documentation(self):
        """Verifie le mapping documentation -> docs."""
        self.assertEqual(_get_opencode_category("documentation"), "docs")

    def test_business_marketing(self):
        """Verifie le mapping business-marketing -> business."""
        self.assertEqual(_get_opencode_category("business-marketing"), "business")

    def test_development_team(self):
        """Verifie le mapping development-team -> web."""
        self.assertEqual(_get_opencode_category("development-team"), "web")

    def test_expert_advisors(self):
        """Verifie le mapping expert-advisors -> devtools."""
        self.assertEqual(_get_opencode_category("expert-advisors"), "devtools")

    def test_unknown_category_passthrough(self):
        """Verifie qu'une categorie inconnue est retournee telle quelle."""
        self.assertEqual(
            _get_opencode_category("some-new-category"), "some-new-category"
        )

    def test_all_mappings_covered(self):
        """Verifie que tous les mappings du CATEGORY_MAPPING sont testes."""
        for source_cat, oc_cat in CATEGORY_MAPPING.items():
            with self.subTest(category=source_cat):
                self.assertEqual(_get_opencode_category(source_cat), oc_cat)


# ---------------------------------------------------------------------------
# Tests _get_agent_relative_path()
# ---------------------------------------------------------------------------


class TestGetAgentRelativePath(unittest.TestCase):
    """Tests pour _get_agent_relative_path() : chemins relatifs des agents."""

    def test_primary_agent_at_root(self):
        """Verifie qu'un agent primary est a la racine (pas de sous-repertoire)."""
        for name in PRIMARY_AGENTS:
            with self.subTest(agent=name):
                result = _get_agent_relative_path(name, "some-category")
                self.assertEqual(result, name)
                self.assertNotIn("/", result)

    def test_subagent_in_category(self):
        """Verifie qu'un sous-agent est dans le sous-repertoire de sa categorie."""
        result = _get_agent_relative_path("typescript-pro", "programming-languages")
        self.assertEqual(result, "languages/typescript-pro")

    def test_subagent_unknown_category(self):
        """Verifie le comportement avec une categorie inconnue."""
        result = _get_agent_relative_path("my-agent", "unknown-cat")
        self.assertEqual(result, "unknown-cat/my-agent")

    def test_all_primary_agents(self):
        """Verifie que tous les PRIMARY_AGENTS retournent un chemin sans slash."""
        for name in PRIMARY_AGENTS:
            with self.subTest(agent=name):
                result = _get_agent_relative_path(name, "any-category")
                self.assertNotIn("/", result)

    def test_security_agent_in_security(self):
        """Verifie le chemin pour un agent security."""
        result = _get_agent_relative_path("security-auditor", "security")
        self.assertEqual(result, "security/security-auditor")

    def test_ai_agent_in_data_ai(self):
        """Verifie le chemin pour un agent AI (data-ai -> ai)."""
        result = _get_agent_relative_path("ai-engineer", "data-ai")
        self.assertEqual(result, "ai/ai-engineer")


# ---------------------------------------------------------------------------
# Tests EXTENDED_AGENTS (Phase 1.5 — Tier 2)
# ---------------------------------------------------------------------------


class TestExtendedAgents(unittest.TestCase):
    """Tests pour EXTENDED_AGENTS : validation du dictionnaire d'agents etendus."""

    def test_extended_agents_not_empty(self):
        """Verifie que EXTENDED_AGENTS est un dictionnaire non vide."""
        self.assertIsInstance(EXTENDED_AGENTS, dict)
        self.assertGreater(len(EXTENDED_AGENTS), 0)

    def test_extended_agents_format(self):
        """Verifie que chaque cle est une chaine et chaque valeur suit le format 'category/name'."""
        for key, value in EXTENDED_AGENTS.items():
            with self.subTest(agent=key):
                self.assertIsInstance(key, str)
                self.assertIsInstance(value, str)
                self.assertIn("/", value, f"La valeur '{value}' ne contient pas de '/'")
                parts = value.split("/")
                self.assertEqual(
                    len(parts),
                    2,
                    f"La valeur '{value}' devrait avoir exactement 2 parties (category/name)",
                )
                self.assertTrue(len(parts[0]) > 0, "La categorie ne doit pas etre vide")
                self.assertTrue(len(parts[1]) > 0, "Le nom ne doit pas etre vide")

    def test_no_duplicates_between_tiers(self):
        """Verifie qu'aucun nom d'agent n'apparait a la fois dans CURATED_AGENTS et EXTENDED_AGENTS."""
        curated_keys = set(CURATED_AGENTS.keys())
        extended_keys = set(EXTENDED_AGENTS.keys())
        overlap = curated_keys & extended_keys
        self.assertEqual(
            len(overlap),
            0,
            f"Agents presents dans les deux tiers : {overlap}",
        )

    def test_extended_agents_categories_mapped(self):
        """Verifie que toutes les categories source des EXTENDED_AGENTS existent dans CATEGORY_MAPPING."""
        for name, path in EXTENDED_AGENTS.items():
            with self.subTest(agent=name):
                source_category = path.split("/")[0]
                self.assertIn(
                    source_category,
                    CATEGORY_MAPPING,
                    f"La categorie source '{source_category}' de l'agent '{name}' "
                    f"n'est pas dans CATEGORY_MAPPING",
                )

    def test_combined_tiers_count(self):
        """Verifie que CURATED_AGENTS + EXTENDED_AGENTS = total combine, sans chevauchement."""
        combined = {**CURATED_AGENTS, **EXTENDED_AGENTS}
        self.assertEqual(
            len(combined),
            len(CURATED_AGENTS) + len(EXTENDED_AGENTS),
            "Le total combine devrait etre la somme des deux tiers (pas de chevauchement)",
        )

    def test_extended_agents_no_primary_conflict(self):
        """Verifie qu'aucun agent etendu ne porte le meme nom qu'un PRIMARY_AGENTS."""
        for name in EXTENDED_AGENTS:
            with self.subTest(agent=name):
                self.assertNotIn(
                    name,
                    PRIMARY_AGENTS,
                    f"L'agent etendu '{name}' est en conflit avec PRIMARY_AGENTS",
                )


# ---------------------------------------------------------------------------
# Tests des nouveaux mappings de categories (Phase 1.5)
# ---------------------------------------------------------------------------


class TestNewCategoryMappings(unittest.TestCase):
    """Tests pour les nouveaux mappings de categories ajoutes en Phase 1.5."""

    def test_new_category_mappings(self):
        """Verifie que les nouveaux mappings de categories Phase 1.5 existent."""
        new_mappings = {
            "game-development": "specialist",
            "mcp-dev-team": "mcp",
            "modernization": "devops",
            "realtime": "web",
            "finance": "business",
            "git": "devtools",
            "performance-testing": "devtools",
            "ui-analysis": "web",
            "deep-research-team": "web",
            "ffmpeg-clip-team": "media",
            "obsidian-ops-team": "specialist",
            "ocr-extraction-team": "specialist",
            "podcast-creator-team": "media",
        }
        for source_cat, expected_oc_cat in new_mappings.items():
            with self.subTest(category=source_cat):
                self.assertIn(
                    source_cat,
                    CATEGORY_MAPPING,
                    f"Le mapping '{source_cat}' est absent de CATEGORY_MAPPING",
                )
                self.assertEqual(
                    CATEGORY_MAPPING[source_cat],
                    expected_oc_cat,
                    f"Le mapping '{source_cat}' devrait pointer vers '{expected_oc_cat}'",
                )


# ---------------------------------------------------------------------------
# Tests de l'argument --tier du CLI (Phase 1.5)
# ---------------------------------------------------------------------------


class TestTierArgument(unittest.TestCase):
    """Tests pour l'argument --tier du parser CLI."""

    def test_tier_argument_default(self):
        """Verifie que la valeur par defaut de --tier est 'core'."""
        parser = build_parser()
        args = parser.parse_args([])
        self.assertEqual(args.tier, "core")

    def test_tier_argument_choices(self):
        """Verifie que les choix valides pour --tier sont core, extended, all."""
        parser = build_parser()

        # Les trois choix valides doivent etre acceptes
        for choice in ("core", "extended", "all"):
            with self.subTest(tier=choice):
                args = parser.parse_args(["--tier", choice])
                self.assertEqual(args.tier, choice)

        # Un choix invalide doit lever une erreur
        with self.assertRaises(SystemExit):
            parser.parse_args(["--tier", "invalid"])

    def test_extended_list_output_tags(self):
        """Verifie que le listing en mode extended contient les tags [ext] et [core]."""
        import io
        from contextlib import redirect_stdout

        parser = build_parser()
        args = parser.parse_args(["--list", "--tier", "extended"])

        # Simuler la logique de listing pour capturer la sortie
        # On reproduit la partie pertinente de main() pour le --list
        agents = {**CURATED_AGENTS, **EXTENDED_AGENTS}
        core_set = frozenset(CURATED_AGENTS.keys())
        extended_set = frozenset(EXTENDED_AGENTS.keys())

        buf = io.StringIO()
        with redirect_stdout(buf):
            by_category = {}
            for name, path in sorted(agents.items()):
                cat = path.split("/")[0] if "/" in path else "uncategorized"
                by_category.setdefault(cat, []).append(name)

            for cat in sorted(by_category.keys()):
                oc_cat = _get_opencode_category(cat)
                print(f"  {cat}/ -> @{oc_cat}/")
                for agent_name in sorted(by_category[cat]):
                    mode_tag = (
                        "[primary]" if agent_name in PRIMARY_AGENTS else "[subagent]"
                    )
                    if agent_name in core_set:
                        tier_tag = "[core]"
                    elif agent_name in extended_set:
                        tier_tag = "[ext] "
                    else:
                        tier_tag = "[disc]"
                    rel_path = _get_agent_relative_path(agent_name, cat)
                    print(f"    {agent_name:40s} {mode_tag}  {tier_tag}  @{rel_path}")

        output = buf.getvalue()
        self.assertIn("[core]", output, "La sortie devrait contenir le tag [core]")
        self.assertIn("[ext]", output, "La sortie devrait contenir le tag [ext]")
        # Verifier qu'aucun tag [disc] n'apparait en mode extended
        self.assertNotIn(
            "[disc]", output, "Le mode extended ne devrait pas avoir de tag [disc]"
        )


# ---------------------------------------------------------------------------
# Additional imports for new tests
# ---------------------------------------------------------------------------

import json
import os
import shutil
import tempfile
from unittest.mock import patch

# Additional function imports for new tests
build_opencode_agent = sync_agents.build_opencode_agent
_yaml_serialize_permission = sync_agents._yaml_serialize_permission
sync_agent = sync_agents.sync_agent
_load_sync_cache = sync_agents._load_sync_cache
_save_sync_cache = sync_agents._save_sync_cache
clean_synced_agents = sync_agents.clean_synced_agents
UNKNOWN_PERMISSIONS = sync_agents.UNKNOWN_PERMISSIONS


# ---------------------------------------------------------------------------
# Tests build_opencode_agent()
# ---------------------------------------------------------------------------


class TestBuildOpencodeAgent(unittest.TestCase):
    """Tests pour build_opencode_agent() : generation de fichiers agent OpenCode."""

    def test_basic_output_structure(self):
        """Verifie la structure de base : frontmatter YAML entre --- et body."""
        meta = {"description": "A test agent.", "tools": "Read, Glob, Grep"}
        result = build_opencode_agent(
            "my-agent", meta, "Body content here.", "devtools"
        )
        # Must start with ---
        self.assertTrue(result.startswith("---\n"))
        # Must contain closing ---
        lines = result.split("\n")
        # Find closing --- (second occurrence)
        fence_indices = [i for i, line in enumerate(lines) if line.strip() == "---"]
        self.assertGreaterEqual(
            len(fence_indices), 2, "Should have opening and closing ---"
        )
        # Must contain body after frontmatter
        self.assertIn("Body content here.", result)

    def test_primary_agent_mode(self):
        """Verifie qu'un agent PRIMARY obtient mode: primary."""
        meta = {"description": "Full-stack dev."}
        result = build_opencode_agent(
            "fullstack-developer", meta, "Body.", "development-team"
        )
        self.assertIn("mode: primary", result)

    def test_subagent_mode(self):
        """Verifie qu'un agent non-PRIMARY obtient mode: subagent."""
        meta = {"description": "TypeScript expert."}
        result = build_opencode_agent(
            "typescript-pro", meta, "Body.", "programming-languages"
        )
        self.assertIn("mode: subagent", result)

    def test_category_in_header_comment(self):
        """Verifie que le commentaire synced header contient la categorie."""
        meta = {"description": "Test."}
        result = build_opencode_agent("my-agent", meta, "Body.", "security")
        self.assertIn("<!-- Synced from aitmpl.com", result)
        self.assertIn("category: security", result)

    def test_body_preserved_and_cleaned(self):
        """Verifie que le body est present et nettoye (Claude Code -> OpenCode)."""
        meta = {"description": "Test."}
        body = "Use Claude Code for best results."
        result = build_opencode_agent("my-agent", meta, body, "devtools")
        # Claude Code should be replaced
        self.assertNotIn("Claude Code", result)
        self.assertIn("OpenCode", result)

    def test_custom_permissions_used(self):
        """Verifie que les permissions passees en argument sont utilisees."""
        meta = {"description": "Test.", "tools": "Read, Write, Edit, Bash"}
        custom_perms = {"write": "deny", "edit": "deny", "bash": "deny"}
        result = build_opencode_agent(
            "my-agent", meta, "Body.", "devtools", permissions=custom_perms
        )
        # With custom permissions, write should be deny (not allow from tools)
        self.assertIn("write: deny", result)
        self.assertIn("edit: deny", result)
        self.assertIn("bash: deny", result)

    def test_description_in_frontmatter(self):
        """Verifie que la description est presente dans le frontmatter."""
        meta = {"description": "A specialized testing agent."}
        result = build_opencode_agent("test-agent", meta, "Body.", "devtools")
        self.assertIn("description:", result)
        self.assertIn("testing agent", result)

    def test_permission_block_present(self):
        """Verifie que le bloc permission: est present dans le frontmatter."""
        meta = {"description": "Test.", "tools": "Read, Write, Bash"}
        result = build_opencode_agent("my-agent", meta, "Body.", "devtools")
        self.assertIn("permission:", result)
        self.assertIn("write: allow", result)


# ---------------------------------------------------------------------------
# Tests _yaml_serialize_permission()
# ---------------------------------------------------------------------------


class TestYamlSerializePermission(unittest.TestCase):
    """Tests pour _yaml_serialize_permission() : serialisation YAML des permissions."""

    def test_simple_string_values(self):
        """Verifie la serialisation de valeurs simples (cle: valeur)."""
        perms = {"write": "allow", "edit": "deny"}
        lines = _yaml_serialize_permission(perms)
        self.assertIn("write: allow", lines)
        self.assertIn("edit: deny", lines)

    def test_nested_dict_values(self):
        """Verifie la serialisation de valeurs imbriquees (dict dans dict)."""
        perms = {"bash": {"git status": "allow", "git log*": "allow"}}
        lines = _yaml_serialize_permission(perms)
        self.assertIn("bash:", lines)
        self.assertTrue(any("git status: allow" in line for line in lines))
        self.assertTrue(any("git log" in line for line in lines))

    def test_special_chars_quoted(self):
        """Verifie que les cles avec caracteres speciaux (* etc.) sont quotees."""
        perms = {"bash": {"*": "ask", "git status": "allow"}}
        lines = _yaml_serialize_permission(perms)
        # The "*" key should be quoted
        self.assertTrue(
            any('"*": ask' in line for line in lines),
            f"Expected quoted '*' key in lines: {lines}",
        )
        # "git status" should NOT be quoted (no special chars)
        self.assertTrue(
            any(
                "git status: allow" in line and '"git status"' not in line
                for line in lines
            ),
            f"'git status' should not be quoted in lines: {lines}",
        )

    def test_empty_dict(self):
        """Verifie qu'un dict vide produit une liste vide."""
        lines = _yaml_serialize_permission({})
        self.assertEqual(lines, [])

    def test_indent_parameter(self):
        """Verifie que le parametre indent ajoute des espaces en debut de ligne."""
        perms = {"write": "allow"}
        lines = _yaml_serialize_permission(perms, indent=4)
        self.assertEqual(len(lines), 1)
        self.assertTrue(
            lines[0].startswith("    "),
            f"Line should start with 4 spaces: '{lines[0]}'",
        )
        self.assertIn("write: allow", lines[0])

    def test_full_permission_profile(self):
        """Verifie la serialisation d'un profil complet (comme build_permissions produit)."""
        perms = build_permissions("Read, Write, Edit, Bash, Glob, Grep")
        lines = _yaml_serialize_permission(perms)
        # Should have lines for write, edit, bash (nested), task (nested)
        self.assertTrue(any("write:" in line for line in lines))
        self.assertTrue(any("edit:" in line for line in lines))
        self.assertTrue(any("bash:" in line for line in lines))
        self.assertTrue(any("task:" in line for line in lines))
        # Bash should be nested (has sub-keys), so "bash:" line should end with ":"
        bash_line = [line for line in lines if line.strip() == "bash:"]
        self.assertEqual(
            len(bash_line), 1, "bash: should be a standalone key (nested dict)"
        )

    def test_unknown_permissions_serialization(self):
        """Verifie la serialisation du profil UNKNOWN_PERMISSIONS (tout deny)."""
        lines = _yaml_serialize_permission(UNKNOWN_PERMISSIONS)
        self.assertTrue(any("write: deny" in line for line in lines))
        self.assertTrue(any("edit: deny" in line for line in lines))
        self.assertTrue(any("bash: deny" in line for line in lines))
        self.assertTrue(any("mcp: deny" in line for line in lines))
        self.assertTrue(any("task: deny" in line for line in lines))

    def test_nested_indent(self):
        """Verifie que les sous-cles sont indentees de 2 espaces supplementaires."""
        perms = {"task": {"*": "allow"}}
        lines = _yaml_serialize_permission(perms, indent=0)
        self.assertEqual(lines[0], "task:")
        self.assertTrue(
            lines[1].startswith("  "), f"Sub-key should be indented: '{lines[1]}'"
        )


# ---------------------------------------------------------------------------
# Tests sync_agent() (with mocking)
# ---------------------------------------------------------------------------


class TestSyncAgent(unittest.TestCase):
    """Tests pour sync_agent() : synchronisation d'un agent avec mocking I/O."""

    SAMPLE_SOURCE = """---
name: test-agent
description: A test agent for unit testing purposes.
tools: Read, Write, Bash, Glob, Grep
mode: subagent
---

You are a test agent. Follow best practices when testing code.

## Guidelines
- Write clean tests
- Use assertions properly
"""

    def setUp(self):
        """Cree un repertoire temporaire pour chaque test."""
        self.tmpdir = tempfile.mkdtemp(prefix="test_sync_agent_")
        self.output_dir = Path(self.tmpdir)

    def tearDown(self):
        """Nettoie le repertoire temporaire."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_creates_file(self, mock_raw_get):
        """Verifie que sync_agent cree le fichier agent dans le bon repertoire."""
        mock_raw_get.return_value = self.SAMPLE_SOURCE
        result = sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        self.assertIsNotNone(result)
        # File should be created in the devtools subdirectory
        expected_path = self.output_dir / "devtools" / "test-agent.md"
        self.assertTrue(expected_path.exists(), f"Expected file at {expected_path}")
        content = expected_path.read_text(encoding="utf-8")
        self.assertIn("---", content)
        self.assertIn("<!-- Synced from aitmpl.com", content)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_returns_manifest_entry(self, mock_raw_get):
        """Verifie que sync_agent retourne un dictionnaire manifest valide."""
        mock_raw_get.return_value = self.SAMPLE_SOURCE
        result = sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["name"], "test-agent")
        self.assertEqual(result["category"], "development-tools")
        self.assertEqual(result["opencode_category"], "devtools")
        self.assertEqual(result["mode"], "subagent")
        self.assertEqual(result["status"], "synced")
        self.assertIn("path", result)
        self.assertIn("source", result)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_force_overwrites(self, mock_raw_get):
        """Verifie que force=True ecrase un fichier existant."""
        mock_raw_get.return_value = self.SAMPLE_SOURCE
        # First sync
        sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        out_path = self.output_dir / "devtools" / "test-agent.md"
        self.assertTrue(out_path.exists())
        first_content = out_path.read_text(encoding="utf-8")

        # Modify source slightly
        modified_source = self.SAMPLE_SOURCE.replace(
            "Follow best practices", "Follow MODIFIED practices"
        )
        mock_raw_get.return_value = modified_source

        # Second sync with force=True
        result = sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "synced")
        second_content = out_path.read_text(encoding="utf-8")
        self.assertIn("MODIFIED", second_content)
        self.assertNotEqual(first_content, second_content)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_skip_existing_no_force(self, mock_raw_get):
        """Verifie que force=False ne remplace pas un fichier existant."""
        mock_raw_get.return_value = self.SAMPLE_SOURCE
        # First sync
        sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        out_path = self.output_dir / "devtools" / "test-agent.md"
        original_content = out_path.read_text(encoding="utf-8")

        # Second sync with force=False (default)
        result = sync_agent(
            "test-agent",
            "development-tools/test-agent",
            "davila7/claude-code-templates",
            self.output_dir,
            force=False,
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "skipped")
        # Content should be unchanged
        self.assertEqual(out_path.read_text(encoding="utf-8"), original_content)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_not_found_returns_none(self, mock_raw_get):
        """Verifie que sync_agent retourne None quand l'agent n'est pas trouve."""
        mock_raw_get.return_value = None
        result = sync_agent(
            "nonexistent-agent",
            "development-tools/nonexistent-agent",
            "davila7/claude-code-templates",
            self.output_dir,
        )
        self.assertIsNone(result)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_empty_body_returns_none(self, mock_raw_get):
        """Verifie que sync_agent retourne None quand le body est vide."""
        empty_body_source = "---\nname: empty\ndescription: Empty agent.\n---\n\n   \n"
        mock_raw_get.return_value = empty_body_source
        result = sync_agent(
            "empty-agent",
            "development-tools/empty-agent",
            "davila7/claude-code-templates",
            self.output_dir,
        )
        self.assertIsNone(result)

    @patch.object(sync_agents, "_raw_get")
    def test_sync_primary_agent_at_root(self, mock_raw_get):
        """Verifie qu'un agent primary est ecrit a la racine (pas de sous-repertoire)."""
        source = """---
name: fullstack-developer
description: Full-stack development expert.
tools: Read, Write, Edit, Bash, Glob, Grep
---

You are a fullstack developer.
"""
        mock_raw_get.return_value = source
        result = sync_agent(
            "fullstack-developer",
            "development-team/fullstack-developer",
            "davila7/claude-code-templates",
            self.output_dir,
            force=True,
        )
        self.assertIsNotNone(result)
        # Primary agents are placed at root, not in a category subdirectory
        expected_path = self.output_dir / "fullstack-developer.md"
        self.assertTrue(
            expected_path.exists(), f"Primary agent should be at root: {expected_path}"
        )
        self.assertEqual(result["mode"], "primary")


# ---------------------------------------------------------------------------
# Tests _load_sync_cache() / _save_sync_cache()
# ---------------------------------------------------------------------------


class TestSyncCache(unittest.TestCase):
    """Tests pour _load_sync_cache() et _save_sync_cache() : cache de synchronisation."""

    def setUp(self):
        """Cree un repertoire temporaire pour chaque test."""
        self.tmpdir = tempfile.mkdtemp(prefix="test_sync_cache_")
        self.output_dir = Path(self.tmpdir)

    def tearDown(self):
        """Nettoie le repertoire temporaire."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_roundtrip_save_load(self):
        """Verifie que sauvegarder puis charger retourne les memes donnees."""
        cache_data = {
            "test-agent": {
                "etag": '"abc123"',
                "last_modified": "Thu, 01 Jan 2025 00:00:00 GMT",
                "sha256": "deadbeef" * 8,
            },
            "another-agent": {
                "etag": '"def456"',
                "sha256": "cafebabe" * 8,
            },
        }
        _save_sync_cache(self.output_dir, cache_data)
        loaded = _load_sync_cache(self.output_dir)
        self.assertEqual(loaded, cache_data)

    def test_load_nonexistent_returns_empty(self):
        """Verifie que le chargement d'un fichier inexistant retourne un dict vide."""
        result = _load_sync_cache(self.output_dir)
        self.assertEqual(result, {})

    def test_load_corrupt_json_returns_empty(self):
        """Verifie que le chargement d'un JSON corrompu retourne un dict vide."""
        cache_path = self.output_dir / ".sync-cache.json"
        cache_path.write_text("{ this is not valid JSON !!!", encoding="utf-8")
        result = _load_sync_cache(self.output_dir)
        self.assertEqual(result, {})

    def test_load_non_dict_returns_empty(self):
        """Verifie que le chargement d'un JSON non-dict retourne un dict vide."""
        cache_path = self.output_dir / ".sync-cache.json"
        cache_path.write_text('["this", "is", "a", "list"]', encoding="utf-8")
        result = _load_sync_cache(self.output_dir)
        self.assertEqual(result, {})

    def test_save_creates_parent_dirs(self):
        """Verifie que _save_sync_cache cree les repertoires parents si necessaire."""
        nested_dir = self.output_dir / "deep" / "nested" / "dir"
        _save_sync_cache(nested_dir, {"key": "value"})
        loaded = _load_sync_cache(nested_dir)
        self.assertEqual(loaded, {"key": "value"})

    def test_cache_file_is_valid_json(self):
        """Verifie que le fichier cache est du JSON valide et lisible."""
        cache_data = {"agent": {"etag": '"test"', "sha256": "abc123"}}
        _save_sync_cache(self.output_dir, cache_data)
        cache_path = self.output_dir / ".sync-cache.json"
        self.assertTrue(cache_path.exists())
        raw = cache_path.read_text(encoding="utf-8")
        parsed = json.loads(raw)
        self.assertEqual(parsed, cache_data)

    def test_save_overwrites_existing(self):
        """Verifie que _save_sync_cache ecrase un cache existant."""
        _save_sync_cache(self.output_dir, {"old": "data"})
        _save_sync_cache(self.output_dir, {"new": "data"})
        loaded = _load_sync_cache(self.output_dir)
        self.assertEqual(loaded, {"new": "data"})
        self.assertNotIn("old", loaded)


# ---------------------------------------------------------------------------
# Tests clean_synced_agents()
# ---------------------------------------------------------------------------


class TestCleanSyncedAgents(unittest.TestCase):
    """Tests pour clean_synced_agents() : nettoyage des fichiers agents synchronises."""

    SYNCED_CONTENT = (
        "---\n"
        'description: "Test agent."\n'
        "mode: subagent\n"
        "---\n\n"
        "<!-- Synced from aitmpl.com | source: davila7/claude-code-templates "
        "| category: devtools -->\n\n"
        "Agent body content.\n"
    )

    CUSTOM_CONTENT = (
        "---\n"
        'description: "Custom agent."\n'
        "mode: subagent\n"
        "---\n\n"
        "This is a hand-written agent, not synced.\n"
    )

    def setUp(self):
        """Cree un repertoire temporaire avec des fichiers de test."""
        self.tmpdir = tempfile.mkdtemp(prefix="test_clean_agents_")
        self.output_dir = Path(self.tmpdir)

    def tearDown(self):
        """Nettoie le repertoire temporaire."""
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_removes_synced_files(self):
        """Verifie que les fichiers avec le header synced sont supprimes."""
        synced_file = self.output_dir / "synced-agent.md"
        synced_file.write_text(self.SYNCED_CONTENT, encoding="utf-8")
        removed = clean_synced_agents(self.output_dir)
        self.assertEqual(removed, 1)
        self.assertFalse(synced_file.exists())

    def test_preserves_non_synced_files(self):
        """Verifie que les fichiers sans header synced sont preserves."""
        custom_file = self.output_dir / "custom-agent.md"
        custom_file.write_text(self.CUSTOM_CONTENT, encoding="utf-8")
        synced_file = self.output_dir / "synced-agent.md"
        synced_file.write_text(self.SYNCED_CONTENT, encoding="utf-8")
        removed = clean_synced_agents(self.output_dir)
        self.assertEqual(removed, 1)
        self.assertTrue(custom_file.exists(), "Custom agent should be preserved")
        self.assertFalse(synced_file.exists(), "Synced agent should be removed")

    def test_handles_empty_directory(self):
        """Verifie que le nettoyage d'un repertoire vide retourne 0."""
        removed = clean_synced_agents(self.output_dir)
        self.assertEqual(removed, 0)

    def test_handles_nonexistent_directory(self):
        """Verifie que le nettoyage d'un repertoire inexistant retourne 0."""
        nonexistent = Path(self.tmpdir) / "does-not-exist"
        removed = clean_synced_agents(nonexistent)
        self.assertEqual(removed, 0)

    def test_handles_subdirectories(self):
        """Verifie que les fichiers synced dans les sous-repertoires sont aussi supprimes."""
        # Create synced files in subdirectories
        subdir = self.output_dir / "devtools"
        subdir.mkdir()
        synced_sub = subdir / "sub-agent.md"
        synced_sub.write_text(self.SYNCED_CONTENT, encoding="utf-8")

        # Create a custom file at root
        custom_root = self.output_dir / "custom.md"
        custom_root.write_text(self.CUSTOM_CONTENT, encoding="utf-8")

        # Create synced file at root
        synced_root = self.output_dir / "synced-root.md"
        synced_root.write_text(self.SYNCED_CONTENT, encoding="utf-8")

        removed = clean_synced_agents(self.output_dir)
        self.assertEqual(removed, 2)
        self.assertFalse(synced_sub.exists())
        self.assertFalse(synced_root.exists())
        self.assertTrue(custom_root.exists())

    def test_dry_run_does_not_remove(self):
        """Verifie que dry_run=True ne supprime pas les fichiers."""
        synced_file = self.output_dir / "synced-agent.md"
        synced_file.write_text(self.SYNCED_CONTENT, encoding="utf-8")
        removed = clean_synced_agents(self.output_dir, dry_run=True)
        self.assertEqual(removed, 1)  # counts as "would remove"
        self.assertTrue(
            synced_file.exists(), "File should NOT be removed in dry-run mode"
        )

    def test_removes_manifest_json(self):
        """Verifie que manifest.json est aussi supprime lors du nettoyage."""
        manifest = self.output_dir / "manifest.json"
        manifest.write_text('{"agents": []}', encoding="utf-8")
        # Also add a synced file so the function enters the cleanup path
        synced_file = self.output_dir / "agent.md"
        synced_file.write_text(self.SYNCED_CONTENT, encoding="utf-8")
        clean_synced_agents(self.output_dir)
        self.assertFalse(manifest.exists(), "manifest.json should be removed")


if __name__ == "__main__":
    unittest.main(verbosity=2)
