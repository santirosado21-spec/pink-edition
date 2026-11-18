"""Orientation fallback: no swift toolchain means upright assumption, never a crash nor a cached fake measurement."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from one_shot_worker import orientation


class OrientationFallbackTests(unittest.TestCase):
    def test_cached_result_wins_without_touching_the_toolchain(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder/'analysis').mkdir()
            (folder/'analysis'/'s1-orientation.json').write_text(json.dumps({'degrees': 90}))
            with patch('one_shot_worker.command') as cmd:
                self.assertEqual(orientation(folder, {'id': 's1'}), 90)
                cmd.assert_not_called()

    def test_missing_swiftc_assumes_upright_without_caching(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder/'analysis').mkdir()
            with patch('one_shot_worker.command', side_effect=PermissionError(13, 'Permission denied', 'swiftc')):
                self.assertEqual(orientation(folder, {'id': 's1', 'seconds': 8}), 0)
            self.assertFalse((folder/'analysis'/'s1-orientation.json').exists())

    def test_broken_detector_output_also_assumes_upright(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder/'analysis').mkdir()
            (folder/'analysis'/'orientation-tool').write_text('x')
            with patch('one_shot_worker.command'), patch('one_shot_worker.subprocess.check_output', side_effect=subprocess.CalledProcessError(1, 'tool')):
                self.assertEqual(orientation(folder, {'id': 's1', 'seconds': 8}), 0)
            self.assertFalse((folder/'analysis'/'s1-orientation.json').exists())


if __name__ == '__main__':
    unittest.main()
