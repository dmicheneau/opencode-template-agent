#!/usr/bin/env python3
"""
test_shellcheck.py - Validation shellcheck des scripts shell du projet.

Verifie que les scripts shell passent shellcheck sans erreur ni warning.
Skippe gracieusement si shellcheck n'est pas installe.
"""

from __future__ import annotations

import shutil
import subprocess
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SHELLCHECK_BIN = shutil.which("shellcheck")

SHELL_SCRIPTS = [
    PROJECT_ROOT / "install.sh",
]


@unittest.skipUnless(SHELLCHECK_BIN, "shellcheck not installed")
class TestShellcheck(unittest.TestCase):
    """Verifie que les scripts shell passent shellcheck sans erreur."""

    def test_shell_scripts(self):
        """Verifie que tous les scripts shell passent shellcheck sans warning."""
        for script in SHELL_SCRIPTS:
            with self.subTest(script=script.name):
                self.assertTrue(script.exists(), f"{script} not found")

                result = subprocess.run(
                    [SHELLCHECK_BIN, str(script)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(
                    result.returncode,
                    0,
                    f"shellcheck failed on {script.name}:\n{result.stdout}\n{result.stderr}",
                )


if __name__ == "__main__":
    unittest.main()
