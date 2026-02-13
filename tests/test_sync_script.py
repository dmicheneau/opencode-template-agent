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
        """Verifie le mapping database -> database."""
        self.assertEqual(_get_opencode_category("database"), "database")

    def test_web_tools(self):
        """Verifie le mapping web-tools -> web."""
        self.assertEqual(_get_opencode_category("web-tools"), "web")

    def test_api_graphql(self):
        """Verifie le mapping api-graphql -> api."""
        self.assertEqual(_get_opencode_category("api-graphql"), "api")

    def test_documentation(self):
        """Verifie le mapping documentation -> docs."""
        self.assertEqual(_get_opencode_category("documentation"), "docs")

    def test_business_marketing(self):
        """Verifie le mapping business-marketing -> business."""
        self.assertEqual(_get_opencode_category("business-marketing"), "business")

    def test_development_team(self):
        """Verifie le mapping development-team -> team."""
        self.assertEqual(_get_opencode_category("development-team"), "team")

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
        """Verifie que CURATED_AGENTS (43) + EXTENDED_AGENTS (90) = 133 total, sans chevauchement."""
        self.assertEqual(len(CURATED_AGENTS), 43)
        self.assertEqual(len(EXTENDED_AGENTS), 90)
        combined = {**CURATED_AGENTS, **EXTENDED_AGENTS}
        self.assertEqual(
            len(combined),
            133,
            "Le total combine devrait etre 133 (pas de chevauchement)",
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
            "deep-research-team": "team",
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
