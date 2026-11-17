"""Contrato del smoke sintético: diagnóstico durable y Python portable, sin render."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import test_render_snapshot_e2e as smoke


class SmokeContract(unittest.TestCase):
    def test_defaults_to_current_python(self):
        with patch.dict(smoke.os.environ, {}, clear=True):
            self.assertEqual(smoke.render_environment()['PINK_TOOLS_PYTHON'], sys.executable)

    def test_preserves_explicit_python_and_other_environment(self):
        with patch.dict(smoke.os.environ, {'PINK_TOOLS_PYTHON': '/chosen/python', 'TEST_FLAG': '1'}, clear=True):
            self.assertEqual(smoke.render_environment(), {'PINK_TOOLS_PYTHON': '/chosen/python', 'TEST_FLAG': '1'})

    def test_failure_is_recorded_without_passing_or_retaining_work(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with patch.object(smoke, 'ROOT', root), patch.object(sys, 'argv', ['smoke']), patch.object(smoke.subprocess, 'run', side_effect=FileNotFoundError('ffmpeg unavailable')):
                with self.assertRaises(FileNotFoundError):
                    smoke.main()
            reports = list(root.glob('work/ollama-pilot/versioning-smoke/*/verification.json'))
            self.assertEqual(len(reports), 1)
            report = json.loads(reports[0].read_text())
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(report['error_type'], 'FileNotFoundError')
            self.assertEqual(list(root.glob('work/qa-snapshot-*')), [])
            self.assertEqual(list(root.glob('public/work/qa-snapshot-*')), [])


if __name__ == '__main__':
    unittest.main()
