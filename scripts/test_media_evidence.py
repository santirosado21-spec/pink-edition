import io
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest

from media_evidence import assess, audio_envelope, measure, picture
from media_intake import reference_anchors


class EvidenceTests(unittest.TestCase):
    def test_flash_is_distinct_from_persistent_change(self):
        dark, light = bytes([0] * 16), bytes([255] * 16)
        flash = picture([dark] * 10 + [light] + [dark] * 10, 10)
        cut = picture([dark] * 10 + [light] * 11, 10)
        self.assertEqual(flash['flashSeconds'], [1.0])
        self.assertEqual(cut['flashSeconds'], [])
        self.assertIn(1, cut['strongChangeSeconds'])

    def test_silent_and_antiphase_audio_are_not_confused(self):
        silent = audio_envelope(io.BytesIO(bytes(4800 * 4)))
        stereo = audio_envelope(io.BytesIO(struct.pack('<4800f', *([.5, -.5] * 2400))))
        self.assertEqual(silent['quietFraction'], 1)
        self.assertEqual(stereo['quietFraction'], 0)
        self.assertAlmostEqual(stereo['peakDbfs'], -6.02, places=2)

    def test_missing_audio_fails_but_dark_open_is_advisory(self):
        evidence = {'durationSeconds': 2, 'picture': {'sampleFps': 30, 'decodedFrames': 60, 'firstFrameDark': True, 'flashSeconds': []}, 'audio': {'present': False}}
        self.assertEqual(assess(evidence, 2)['state'], 'fail')
        evidence['audio'] = {'present': True, 'peakDbfs': -6}
        self.assertEqual(assess(evidence, 2)['state'], 'review')
        self.assertEqual(assess(evidence, 5)['state'], 'fail')

    def test_reference_samples_remain_bounded_and_keep_coverage(self):
        anchors = reference_anchors(30, [float('nan'), -1, 31, 3, 6, 9, 12])
        self.assertEqual(len(anchors), 6)
        self.assertIn(.9, [round(x, 1) for x in anchors])
        self.assertIn(27.3, anchors)
        self.assertTrue(all(0 <= x < 30 for x in anchors))

    def test_real_ffmpeg_files_decode_and_report_without_models(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'tone.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=128x72:rate=30:duration=2',
                            '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', str(path)], check=True)
            measured = measure(path)
            self.assertEqual(measured['picture']['decodedFrames'], 60)
            self.assertTrue(measured['audio']['present'])
            self.assertTrue(-30 < measured['audio']['integratedLufs'] < -15)
            self.assertEqual(assess(measured, 2)['errors'], [])
            json.dumps(measured, allow_nan=False)
            silent = Path(directory) / 'silent.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-an', '-c:v', 'copy', str(silent)], check=True)
            self.assertFalse(measure(silent, reference=True)['audio']['present'])
            bad = Path(directory) / 'invalid.mp4'
            bad.write_bytes(b'not a video')
            with self.assertRaises(subprocess.CalledProcessError):
                measure(bad)


if __name__ == '__main__':
    unittest.main()
