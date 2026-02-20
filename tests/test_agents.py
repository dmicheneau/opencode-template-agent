#!/usr/bin/env python3
"""
test_agents.py - Validation des fichiers agents OpenCode (.md).

Verifie la structure, le frontmatter YAML, les permissions et les conventions
de nommage pour chaque agent present dans .opencode/agents/.
"""

from __future__ import annotations

import os
import re
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AGENTS_DIR = PROJECT_ROOT / ".opencode" / "agents"

VALID_MODES = {"primary", "subagent", "all", "byline", "ask"}
REQUIRED_FIELDS = {"description", "mode"}
FILENAME_PATTERN = re.compile(r"^[a-z0-9-]+\.md$")


# ---------------------------------------------------------------------------
# Parseur YAML minimal (stdlib only) supportant 2 niveaux de profondeur
# ---------------------------------------------------------------------------


def _parse_yaml_value(val: str) -> Any:
    """Convertit une valeur YAML scalaire en type Python."""
    val = val.strip()
    if not val:
        return None
    # Supprime les guillemets
    if (val.startswith('"') and val.endswith('"')) or (
        val.startswith("'") and val.endswith("'")
    ):
        return val[1:-1]
    if val.lower() in ("true", "yes"):
        return True
    if val.lower() in ("false", "no"):
        return False
    try:
        return int(val)
    except ValueError:
        pass
    return val


def parse_yaml_frontmatter(raw: str) -> Dict[str, Any]:
    """Parse un bloc YAML frontmatter avec support des dicts imbriques (2 niveaux).

    Gere egalement le folded scalar (>) pour les descriptions multilignes.
    """
    result: Dict[str, Any] = {}
    lines = raw.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i]

        # Ignorer les lignes vides
        if not line.strip():
            i += 1
            continue

        # Detecter l'indentation
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        # On ne traite que les cles de niveau 0 ici
        if indent > 0:
            i += 1
            continue

        match = re.match(r"^([\w][\w-]*)\s*:\s*(.*)", stripped)
        if not match:
            i += 1
            continue

        key = match.group(1)
        value_part = match.group(2).strip()

        # Cas 1: folded scalar (description: >)
        if value_part == ">":
            folded_lines: List[str] = []
            i += 1
            while i < len(lines):
                next_line = lines[i]
                if not next_line.strip():
                    break
                next_indent = len(next_line) - len(next_line.lstrip())
                if next_indent < 2:
                    break
                folded_lines.append(next_line.strip())
                i += 1
            result[key] = " ".join(folded_lines)
            continue

        # Cas 2: valeur sur la meme ligne
        if value_part:
            result[key] = _parse_yaml_value(value_part)
            i += 1
            continue

        # Cas 3: dict imbrique (cle sans valeur, les sous-cles suivent)
        sub_dict: Dict[str, Any] = {}
        i += 1
        while i < len(lines):
            sub_line = lines[i]
            if not sub_line.strip():
                i += 1
                continue
            sub_stripped = sub_line.lstrip()
            sub_indent = len(sub_line) - len(sub_line.lstrip())

            # Si on revient au niveau 0, on sort du sous-dict
            if sub_indent < 2:
                break

            sub_match = re.match(r'^(["\']?[^:]+["\']?)\s*:\s*(.*)', sub_stripped)
            if sub_match:
                sub_key = sub_match.group(1).strip().strip("\"'")
                sub_value_part = sub_match.group(2).strip()

                # Sous-sous-dict (3e niveau, ex: bash -> "*": ask)
                if not sub_value_part:
                    sub_sub_dict: Dict[str, Any] = {}
                    i += 1
                    while i < len(lines):
                        ss_line = lines[i]
                        if not ss_line.strip():
                            i += 1
                            continue
                        ss_indent = len(ss_line) - len(ss_line.lstrip())
                        if ss_indent < 4:
                            break
                        ss_stripped = ss_line.lstrip()
                        ss_match = re.match(
                            r'^(["\']?[^:]+["\']?)\s*:\s*(.*)', ss_stripped
                        )
                        if ss_match:
                            ss_key = ss_match.group(1).strip().strip("\"'")
                            ss_val = _parse_yaml_value(ss_match.group(2))
                            sub_sub_dict[ss_key] = ss_val
                        i += 1
                    sub_dict[sub_key] = sub_sub_dict
                    continue
                else:
                    sub_dict[sub_key] = _parse_yaml_value(sub_value_part)
            i += 1

        result[key] = sub_dict

    return result


def load_agent(filepath: Path) -> Tuple[Dict[str, Any], str, str]:
    """Charge un fichier agent et retourne (frontmatter_dict, body, raw_frontmatter).

    Raises ValueError si le frontmatter est absent ou mal forme.
    """
    content = filepath.read_text(encoding="utf-8")

    if not content.strip().startswith("---"):
        raise ValueError(f"Le fichier ne commence pas par '---': {filepath.name}")

    # Trouver la fin du frontmatter
    end_idx = content.find("\n---", 3)
    if end_idx == -1:
        raise ValueError(f"Frontmatter non ferme (pas de '---' final): {filepath.name}")

    raw_fm = content[3:end_idx].strip()
    body = content[end_idx + 4 :].strip()

    meta = parse_yaml_frontmatter(raw_fm)
    return meta, body, raw_fm


# ---------------------------------------------------------------------------
# Decouverte dynamique des agents
# ---------------------------------------------------------------------------


def discover_agents() -> List[Path]:
    """Retourne la liste de tous les fichiers .md dans AGENTS_DIR (recursif)."""
    if not AGENTS_DIR.exists():
        return []
    return sorted(AGENTS_DIR.rglob("*.md"))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestAgentFiles(unittest.TestCase):
    """Validation structurelle de tous les fichiers agents."""

    @classmethod
    def setUpClass(cls):
        """Charge tous les agents une seule fois pour les tests."""
        cls.agent_files = discover_agents()
        cls.agents: Dict[str, Tuple[Dict[str, Any], str, str]] = {}
        for f in cls.agent_files:
            try:
                cls.agents[str(f)] = load_agent(f)
            except ValueError:
                cls.agents[str(f)] = ({}, "", "")

    def test_agents_directory_exists(self):
        """Verifie que le repertoire des agents existe."""
        self.assertTrue(
            AGENTS_DIR.exists(),
            f"Le repertoire {AGENTS_DIR} n'existe pas",
        )

    def test_agents_not_empty(self):
        """Verifie qu'il y a au moins un agent."""
        self.assertGreater(
            len(self.agent_files),
            0,
            "Aucun fichier agent trouve",
        )

    def test_frontmatter_starts_with_delimiter(self):
        """Verifie que chaque fichier commence par '---' (frontmatter YAML)."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                content = filepath.read_text(encoding="utf-8")
                self.assertTrue(
                    content.strip().startswith("---"),
                    f"{filepath.name}: ne commence pas par '---'",
                )

    def test_required_fields_present(self):
        """Verifie que les champs obligatoires (description, mode) sont presents."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                for field in REQUIRED_FIELDS:
                    self.assertIn(
                        field,
                        meta,
                        f"{filepath.name}: champ obligatoire '{field}' manquant",
                    )

    def test_mode_is_valid(self):
        """Verifie que le mode est une valeur valide (primary, subagent, byline, ask)."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                mode = meta.get("mode", "")
                self.assertIn(
                    mode,
                    VALID_MODES,
                    f"{filepath.name}: mode '{mode}' invalide, attendu: {VALID_MODES}",
                )

    def test_description_not_empty(self):
        """Verifie que la description n'est pas vide."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                desc = meta.get("description", "")
                self.assertTrue(
                    desc and len(str(desc).strip()) > 0,
                    f"{filepath.name}: description vide",
                )

    def test_description_no_specifically_artifact(self):
        """Verifie que la description ne contient pas l'artefact 'Specifically:.'."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                desc = str(meta.get("description", ""))
                self.assertNotIn(
                    "Specifically:.",
                    desc,
                    f"{filepath.name}: description contient l'artefact 'Specifically:.'",
                )

    def test_description_max_length(self):
        """Verifie que la description fait moins de 500 caracteres."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                desc = str(meta.get("description", ""))
                self.assertLess(
                    len(desc),
                    500,
                    f"{filepath.name}: description trop longue ({len(desc)} > 500 chars)",
                )

    def test_permission_present_and_is_dict(self):
        """Verifie que 'permission' est present et est un dictionnaire."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                self.assertIn(
                    "permission",
                    meta,
                    f"{filepath.name}: champ 'permission' manquant",
                )
                self.assertIsInstance(
                    meta["permission"],
                    dict,
                    f"{filepath.name}: 'permission' doit etre un dict, "
                    f"recu: {type(meta['permission']).__name__}",
                )

    def test_permission_no_deprecated_tools(self):
        """Verifie que 'permission' ne contient PAS le champ 'tools:' (format deprecie)."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, raw_fm = self.agents[str(filepath)]
                # Verifier dans le frontmatter brut qu'il n'y a pas de cle 'tools' au top-level
                has_tools = bool(re.search(r"^tools\s*:", raw_fm, re.MULTILINE))
                self.assertFalse(
                    has_tools,
                    f"{filepath.name}: contient le champ deprecie 'tools:' dans le frontmatter",
                )

    def test_bash_permission_not_simple_allow(self):
        """Verifie que si 'bash' est dans permission, il est soit 'deny' soit un dict."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                meta, _, _ = self.agents[str(filepath)]
                perms = meta.get("permission", {})
                if not isinstance(perms, dict):
                    continue
                bash_val = perms.get("bash")
                if bash_val is None:
                    continue
                if isinstance(bash_val, str):
                    self.assertEqual(
                        bash_val,
                        "deny",
                        f"{filepath.name}: bash ne peut pas etre '{bash_val}', "
                        f"attendu 'deny' ou un dict granulaire",
                    )
                else:
                    self.assertIsInstance(
                        bash_val,
                        dict,
                        f"{filepath.name}: bash doit etre 'deny' ou un dict, "
                        f"recu: {type(bash_val).__name__}",
                    )

    def test_body_not_empty(self):
        """Verifie que le body (apres le frontmatter) n'est pas vide (> 100 caracteres)."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                _, body, _ = self.agents[str(filepath)]
                self.assertGreater(
                    len(body),
                    100,
                    f"{filepath.name}: body trop court ({len(body)} <= 100 chars)",
                )

    def test_filename_pattern(self):
        """Verifie que le nom du fichier correspond au pattern [a-z0-9-]+.md."""
        for filepath in self.agent_files:
            with self.subTest(agent=filepath.name):
                self.assertRegex(
                    filepath.name,
                    FILENAME_PATTERN,
                    f"{filepath.name}: ne correspond pas au pattern [a-z0-9-]+.md",
                )


class TestEnrichedAgents(unittest.TestCase):
    """Validation structurelle des agents enrichis (independante du header sync)."""

    HEADING_PATTERN = re.compile(r"^#{1,4}\s+\S", re.MULTILINE)
    HTML_COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.DOTALL)

    @classmethod
    def setUpClass(cls):
        """Charge tous les agents."""
        cls.all_agents: List[Tuple[Path, Dict[str, Any], str]] = []
        for filepath in discover_agents():
            try:
                meta, body, raw_fm = load_agent(filepath)
                cls.all_agents.append((filepath, meta, body))
            except ValueError:
                continue

    def test_all_agents_have_task_permission(self):
        """Verifie que chaque agent a task: '*': allow dans permission."""
        for filepath, meta, body in self.all_agents:
            with self.subTest(agent=filepath.name):
                perms = meta.get("permission", {})
                self.assertIn(
                    "task",
                    perms,
                    f"{filepath.name}: 'task' manquant dans permission",
                )
                task_val = perms["task"]
                self.assertIsInstance(
                    task_val,
                    dict,
                    f"{filepath.name}: 'task' doit etre un dict",
                )
                self.assertEqual(
                    task_val.get("*"),
                    "allow",
                    f"{filepath.name}: task.'*' doit etre 'allow', "
                    f"recu: {task_val.get('*')}",
                )

    def test_agents_have_role_definition(self):
        """Verifie que le body contient du contenu substantiel (role, instructions)."""
        for filepath, meta, body in self.all_agents:
            with self.subTest(agent=filepath.name):
                # Retirer les commentaires HTML pour mesurer le contenu reel
                clean_body = self.HTML_COMMENT_PATTERN.sub("", body).strip()
                self.assertGreater(
                    len(clean_body),
                    200,
                    f"{filepath.name}: body trop court apres suppression des commentaires "
                    f"({len(clean_body)} <= 200 chars)",
                )

    def test_agents_body_has_structured_content(self):
        """Verifie que le body contient au moins un heading markdown."""
        for filepath, meta, body in self.all_agents:
            with self.subTest(agent=filepath.name):
                self.assertTrue(
                    self.HEADING_PATTERN.search(body),
                    f"{filepath.name}: aucun heading markdown trouve dans le body",
                )


class TestPrimaryAgents(unittest.TestCase):
    """Validation des agents en mode primary."""

    @classmethod
    def setUpClass(cls):
        """Identifie les agents primary."""
        cls.primary_agents: List[Tuple[Path, Dict[str, Any]]] = []
        for filepath in discover_agents():
            try:
                meta, _, _ = load_agent(filepath)
                if meta.get("mode") == "primary":
                    cls.primary_agents.append((filepath, meta))
            except ValueError:
                continue

    def test_primary_agents_exist(self):
        """Verifie qu'il y a au moins un agent primary."""
        self.assertGreater(
            len(self.primary_agents),
            0,
            "Aucun agent primary trouve",
        )

    def test_primary_agents_at_root(self):
        """Verifie que les agents primary sont a la racine de .opencode/agents/."""
        for filepath, meta in self.primary_agents:
            with self.subTest(agent=filepath.name):
                # Le parent direct doit etre AGENTS_DIR
                self.assertEqual(
                    filepath.parent.resolve(),
                    AGENTS_DIR.resolve(),
                    f"{filepath.name}: agent primary dans un sous-repertoire "
                    f"({filepath.parent.name}/), devrait etre a la racine",
                )


class TestSubAgents(unittest.TestCase):
    """Validation des sous-agents (mode != primary)."""

    @classmethod
    def setUpClass(cls):
        """Identifie les sous-agents."""
        cls.sub_agents: List[Tuple[Path, Dict[str, Any]]] = []
        for filepath in discover_agents():
            try:
                meta, _, _ = load_agent(filepath)
                if meta.get("mode") == "subagent":
                    cls.sub_agents.append((filepath, meta))
            except ValueError:
                continue

    def test_sub_agents_exist(self):
        """Verifie qu'il y a au moins un sous-agent."""
        self.assertGreater(
            len(self.sub_agents),
            0,
            "Aucun sous-agent trouve",
        )

    def test_sub_agents_in_subdirectory(self):
        """Verifie que les sous-agents sont dans un sous-repertoire valide."""
        for filepath, meta in self.sub_agents:
            with self.subTest(agent=filepath.name):
                # Le parent ne doit PAS etre AGENTS_DIR directement
                self.assertNotEqual(
                    filepath.parent.resolve(),
                    AGENTS_DIR.resolve(),
                    f"{filepath.name}: sous-agent a la racine, "
                    f"devrait etre dans un sous-repertoire",
                )
                # Le sous-repertoire doit avoir un nom valide
                subdir_name = filepath.parent.name
                self.assertRegex(
                    subdir_name,
                    r"^[a-z0-9-]+$",
                    f"{filepath.name}: nom de sous-repertoire invalide '{subdir_name}'",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
