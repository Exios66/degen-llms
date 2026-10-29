#!/usr/bin/env python3
"""Build both distribution manifests and verify their wheels outside the checkout.

Requires build and setuptools in the invoking Python environment.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="casino-packages-") as temporary:
        work = Path(temporary)
        for manifest in ("pyproject.toml", "mandalay-bay.toml"):
            source = work / manifest.removesuffix(".toml")
            source.mkdir()
            for package in ("mandalay_bay", "blackjack", "poker"):
                shutil.copytree(ROOT / package, source / package, ignore=shutil.ignore_patterns("__pycache__"))
            for name in ("README.md", "LICENSE"):
                shutil.copy2(ROOT / name, source / name)
            shutil.copy2(ROOT / manifest, source / "pyproject.toml")
            result = subprocess.run(
                [sys.executable, "-m", "build", "--wheel", "--no-isolation", str(source)],
                capture_output=True, text=True,
            )
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)
            wheel = next((source / "dist").glob("*.whl"))
            unpacked = source / "installed"
            with zipfile.ZipFile(wheel) as archive:
                archive.extractall(unpacked)
            # Isolated Python ignores the checkout, cwd, and inherited PYTHONPATH.
            code = "\n".join([
                "import sys",
                f"sys.path.insert(0, {str(unpacked)!r})",
                "from mandalay_bay.activities.registry import ALL_ACTIVITIES",
                "from mandalay_bay.staff_manifest import load_base_manifest",
                "from mandalay_bay.activities.horse_racing import load_horse_name_pool",
                "from mandalay_bay.trading_desk import load_catalog",
                "assert len(ALL_ACTIVITIES) == 12",
                "assert len(load_horse_name_pool()) >= 6",
                "assert load_catalog()['contracts']",
                "assert load_base_manifest()",
                "from mandalay_bay.main import main",
                "main(['--help'])",
            ])
            check = subprocess.run([sys.executable, "-I", "-c", code], cwd=work, capture_output=True, text=True)
            if check.returncode:
                raise RuntimeError(check.stdout + check.stderr)
            print(f"PASS {manifest}: {wheel.name}, 12 activities and bundled data load outside checkout")


if __name__ == "__main__":
    main()
