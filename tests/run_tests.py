#!/usr/bin/env python3
"""
run_tests.py - Lanceur de la suite de tests du projet opencode-template-agent.

Execute les tests de validation des agents et les tests unitaires du script
de synchronisation, puis affiche un resume consolide.
"""

from __future__ import annotations

import sys
import time
import unittest
from pathlib import Path

# S'assurer que le repertoire du projet est dans le path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def main() -> int:
    """Lance toutes les suites de tests et affiche un resume."""

    print("=" * 70)
    print("  OPENCODE TEMPLATE AGENT - Suite de tests")
    print("=" * 70)
    print()

    start_time = time.time()

    # Decouvrir et charger tous les tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    test_dir = Path(__file__).resolve().parent

    # Charger test_agents.py
    print("[1/2] Chargement de test_agents.py...")
    try:
        agents_suite = loader.discover(
            str(test_dir),
            pattern="test_agents.py",
        )
        suite.addTests(agents_suite)
        print("      OK")
    except Exception as exc:
        print(f"      ERREUR: {exc}")

    # Charger test_sync_script.py
    print("[2/2] Chargement de test_sync_script.py...")
    try:
        sync_suite = loader.discover(
            str(test_dir),
            pattern="test_sync_script.py",
        )
        suite.addTests(sync_suite)
        print("      OK")
    except Exception as exc:
        print(f"      ERREUR: {exc}")

    print()
    print("-" * 70)
    print()

    # Executer les tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    elapsed = time.time() - start_time

    # Resume
    print()
    print("=" * 70)
    print("  RESUME")
    print("=" * 70)
    print()

    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped)
    success = total - failures - errors - skipped

    print(f"  Tests executes : {total}")
    print(f"  Reussis        : {success}")
    print(f"  Echoues        : {failures}")
    print(f"  Erreurs        : {errors}")
    print(f"  Ignores        : {skipped}")
    print(f"  Duree          : {elapsed:.2f}s")
    print()

    if failures > 0:
        print("  ECHECS:")
        for test, traceback in result.failures:
            print(f"    - {test}")
        print()

    if errors > 0:
        print("  ERREURS:")
        for test, traceback in result.errors:
            print(f"    - {test}")
        print()

    if result.wasSuccessful():
        print("  >>> TOUS LES TESTS PASSENT <<<")
    else:
        print("  >>> DES TESTS ONT ECHOUE <<<")

    print()
    print("=" * 70)

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
