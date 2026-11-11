#!/usr/bin/env python3
"""Pruebas aisladas para scripts/round_notes.py."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "round_notes.py"


class RoundNotesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.rounds = self.root / "rounds"
        self.fake_bin = self.root / "fake-bin"
        self.fake_bin.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, path: Path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")

    def make_round(self, name: str = "20261101-120000") -> Path:
        folder = self.rounds / name
        self.write_json(
            folder / "video-01" / "quality.json",
            {
                "title": "Piscina",
                "durationSeconds": 53.2,
                "checks": {"voz completa": True, "sin solapes": False},
                "editorialIssues": [],
                "audioQc": {"exitCode": 0},
                "fullVoiceQc": {"exitCode": 0},
                "visualModelReview": {"exitCode": 0},
                "run": {"elapsedSeconds": 910},
            },
        )
        self.write_json(
            folder / "video-02" / "quality.json",
            {
                "title": "Estrés",
                "durationSeconds": 41.0,
                "checks": {"voz completa": True},
                "editorialIssues": ["tarjeta sin ancla"],
                "audioQc": {"exitCode": 1},
                "reviewRenderExitCode": 0,
            },
        )
        (folder / "video-02" / "render.log").write_text(
            "render\nwarning: poco margen\nerror: frame 12\n", encoding="utf-8"
        )
        return folder

    def write_fake_localllm(self, body: str, exit_code: int = 0) -> None:
        fake = self.fake_bin / "localllm"
        fake.write_text(
            "#!/usr/bin/env python3\n"
            "import sys\n"
            f"sys.stdout.write({body!r})\n"
            f"sys.exit({exit_code})\n",
            encoding="utf-8",
        )
        fake.chmod(0o755)

    def run_cli(self, *arguments: str, use_fake: bool = False) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["PINK_LOOP_ROUNDS"] = str(self.rounds)
        env["PINK_NOTES_CMD"] = ""
        if use_fake:
            env["PATH"] = str(self.fake_bin) + os.pathsep + env.get("PATH", "")
        else:
            env["PATH"] = str(self.fake_bin)  # sin localllm disponible
        return subprocess.run(
            [sys.executable, str(SCRIPT), *arguments],
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )

    def notes(self, folder: Path) -> str:
        return (folder / "notes.md").read_text(encoding="utf-8")

    def test_deterministic_summary_cites_real_failures_and_timings(self) -> None:
        folder = self.make_round()
        result = self.run_cli(folder.name)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.notes(folder)
        self.assertIn("«Piscina»: sin solapes", text)
        self.assertIn("«Estrés» (audioQc=1)", text)
        self.assertIn("53.2 s", text)
        self.assertIn("elapsedSeconds=910.0", text)
        self.assertIn("render.log", text)

    def test_valid_summarizer_bullets_are_used(self) -> None:
        folder = self.make_round()
        self.write_fake_localllm("- «Piscina» tuvo 1 check fallido\n- «Estrés» duró 41.0 s\n")
        result = self.run_cli(folder.name, use_fake=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.notes(folder)
        self.assertIn("«Piscina» tuvo 1 check fallido", text)
        self.assertIn("«Estrés» duró 41.0 s", text)
        self.assertNotIn("Descartada", result.stderr)

    def test_invented_numbers_or_titles_are_discarded(self) -> None:
        folder = self.make_round()
        self.write_fake_localllm(
            "- «Piscina» tardó 999 s en renderizar\n- «Fantasma» falló\n- «Estrés» duró 41.0 s\n"
        )
        result = self.run_cli(folder.name, use_fake=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.notes(folder)
        self.assertNotIn("999", text)
        self.assertNotIn("Fantasma", text)
        self.assertIn("«Estrés» duró 41.0 s", text)
        self.assertIn("Descartada por no verificable", result.stderr)

    def test_substring_numbers_and_near_titles_are_injection(self) -> None:
        folder = self.make_round()
        # 91 es subcadena de 910.0 y «Pisc» de «Piscina»: ambos deben descartarse.
        self.write_fake_localllm("- «Piscina» tardó 91 s\n- «Pisc» sin fallos\n- «Estrés» duró 41 s\n")
        result = self.run_cli(folder.name, use_fake=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.notes(folder)
        self.assertNotIn("91 s", text)
        self.assertNotIn("«Pisc»", text)
        self.assertIn("«Estrés» duró 41 s", text)  # 41 equivale al hecho 41.0

    def test_summarizer_failure_falls_back_to_deterministic(self) -> None:
        folder = self.make_round()
        self.write_fake_localllm("", exit_code=2)
        result = self.run_cli(folder.name, use_fake=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("«Piscina»: sin solapes", self.notes(folder))
        self.assertIn("el resumidor falló", result.stderr)

    def test_all_unverifiable_falls_back_to_deterministic(self) -> None:
        folder = self.make_round()
        self.write_fake_localllm("- Todo salió perfecto en 7 segundos\n")
        result = self.run_cli(folder.name, use_fake=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("«Piscina»: sin solapes", self.notes(folder))
        self.assertIn("ninguna viñeta", result.stderr)

    def test_round_without_quality_fails(self) -> None:
        self.make_round()
        empty = self.rounds / "vacia"
        empty.mkdir()
        result = self.run_cli("vacia")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("quality.json", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
