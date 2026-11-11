#!/usr/bin/env python3
"""Pruebas aisladas para scripts/corpus_add.py."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "corpus_add.py"


@unittest.skipUnless(
    shutil.which("ffmpeg") and shutil.which("ffprobe"),
    "ffmpeg o ffprobe no está disponible; se omiten las pruebas del corpus.",
)
class CorpusAddTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.corpus = self.root / "corpus"
        self.fake_bin = self.root / "fake-bin"
        self.fake_bin.mkdir()
        self.video = self.root / "vertical.mp4"
        self.horizontal = self.root / "horizontal.mp4"
        self.silent = self.root / "silent.mp4"
        self._make_clip(self.video, "48x64", True)
        self._make_clip(self.horizontal, "64x48", True)
        self._make_clip(self.silent, "48x64", False)
        self._write_fake_localllm()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _make_clip(self, path: Path, size: str, audio: bool) -> None:
        command = [
            "ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc=size={size}:rate=5",
        ]
        if audio:
            command += ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000"]
        command += ["-t", "25", "-shortest", "-c:v", "mpeg4"]
        if audio:
            command += ["-c:a", "aac"]
        else:
            command += ["-an"]
        command.append(str(path))
        subprocess.run(command, check=True)

    def _write_fake_localllm(self) -> None:
        fake = self.fake_bin / "localllm"
        fake.write_text(
            "#!/usr/bin/env python3\n"
            "import os, sys\n"
            "mode = os.environ.get('FAKE_LOCAL_MODE', 'valid')\n"
            "if mode == 'exit2': sys.exit(2)\n"
            "if mode == 'invalid': print('no es json'); sys.exit(0)\n"
            "print('{\"topic\": \"salud y descanso con detalle largo para recortar\", \"language\": \"es\"}')\n",
            encoding="utf-8",
        )
        fake.chmod(0o755)

    def env(self, mode: str = "valid") -> dict[str, str]:
        environment = os.environ.copy()
        environment["PINK_CORPUS_DIR"] = str(self.corpus)
        environment["PATH"] = str(self.fake_bin) + os.pathsep + environment.get("PATH", "")
        environment["FAKE_LOCAL_MODE"] = mode
        return environment

    def run_cli(self, *arguments: str, mode: str = "valid") -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *map(str, arguments)],
            capture_output=True,
            text=True,
            env=self.env(mode),
            check=False,
        )

    def rows(self) -> list[dict]:
        manifest = self.corpus / "manifest.jsonl"
        return [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines()]

    def add(self, path: Path, *extra: str) -> subprocess.CompletedProcess[str]:
        return self.run_cli(str(path), "--source", "propio", "--license", "propio", *extra)

    def variant(self, index: int) -> Path:
        path = self.root / f"clip-{index}.mp4"
        shutil.copyfile(self.video, path)
        with path.open("ab") as handle:
            handle.write(f"\nvariante-{index}\n".encode())
        return path

    def test_correct_add_copies_hashes_and_preserves_original(self) -> None:
        before = hashlib.sha256(self.video.read_bytes()).hexdigest()
        result = self.add(self.video, "--split", "dev", "--topic", "Bienestar")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(hashlib.sha256(self.video.read_bytes()).hexdigest(), before)
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        copied = self.corpus / rows[0]["file"]
        self.assertTrue(copied.is_file())
        self.assertEqual(hashlib.sha256(copied.read_bytes()).hexdigest(), before)
        self.assertEqual(rows[0]["topic"], "Bienestar")

    def test_rejects_duplicate_silent_nc_and_bad_source(self) -> None:
        self.assertEqual(self.add(self.video).returncode, 0)
        for arguments, expected in [
            ((str(self.video), "--source", "propio", "--license", "propio"), "ya está registrado"),
            ((str(self.silent), "--source", "propio", "--license", "propio"), "pista de audio"),
            ((str(self.horizontal), "--source", "propio", "--license", "CC-BY-NC-4.0"), "uso comercial"),
            ((str(self.horizontal), "--source", "ftp://ejemplo.test/a", "--license", "propio"), "URL http"),
        ]:
            result = self.run_cli(*arguments)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(expected, result.stderr)
        self.assertEqual(len(self.rows()), 1)

    def test_horizontal_clip_marks_needs_crop(self) -> None:
        result = self.add(self.horizontal)
        self.assertEqual(result.returncode, 0, result.stderr)
        row = self.rows()[0]
        self.assertEqual(row["orientation"], "landscape")
        self.assertTrue(row["needsCrop"])

    def test_split_is_deterministic_and_caps_at_twelve(self) -> None:
        first = self.variant(0)
        digest = hashlib.sha256(first.read_bytes()).hexdigest()
        first_result = self.add(first)
        self.assertEqual(first_result.returncode, 0, first_result.stderr)
        expected = "holdout" if int(digest[:8], 16) % 2 else "dev"
        self.assertEqual(self.rows()[0]["split"], expected)
        counts = {"dev": 0, "holdout": 0}
        for row in self.rows():
            counts[row["split"]] += 1
        index = 1
        for split in ("dev", "holdout"):
            while counts[split] < 6:
                self.assertEqual(self.add(self.variant(index), "--split", split).returncode, 0)
                counts[split] += 1
                index += 1
        self.assertEqual(len(self.rows()), 12)
        full = self.add(self.variant(index))
        self.assertNotEqual(full.returncode, 0)
        self.assertIn("completo", full.stderr)

    def test_transcript_uses_valid_gemma_json_and_tolerates_failures(self) -> None:
        transcript = self.root / "transcript.txt"
        transcript.write_text("Hoy hablamos del sueño y del descanso.", encoding="utf-8")
        self.assertEqual(self.add(self.video, "--transcript", str(transcript)).returncode, 0)
        row = self.rows()[0]
        self.assertEqual(row["topicSource"], "gemma")
        self.assertLessEqual(len(row["topic"]), 60)
        for index, mode in enumerate(("invalid", "exit2"), 1):
            result = self.run_cli(
                str(self.variant(index)), "--source", "propio", "--license", "propio", "--transcript", str(transcript), mode=mode
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("tema queda vacío", result.stderr)
            added = self.rows()[-1]
            self.assertIsNone(added["topic"])
            self.assertIsNone(added["topicSource"])

    def test_list_reports_missing_split_slots(self) -> None:
        self.assertEqual(self.add(self.video, "--split", "dev", "--topic", "Tema A").returncode, 0)
        result = self.run_cli("list")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Faltan 5 para dev / 6 para holdout", result.stdout)
        self.assertIn("menos de 5 temas", result.stdout)

    def test_verify_checks_provenance_split_and_copied_hash(self) -> None:
        self.assertEqual(self.add(self.video, "--split", "dev").returncode, 0)
        verified = self.run_cli("verify")
        self.assertEqual(verified.returncode, 0, verified.stderr)
        self.assertIn("dev=1 · holdout=0", verified.stdout)

        row = self.rows()[0]
        copied = self.corpus / row["file"]
        with copied.open("ab") as handle:
            handle.write(b"alterado")
        tampered = self.run_cli("verify")
        self.assertNotEqual(tampered.returncode, 0)
        self.assertIn("ya no coincide", tampered.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
