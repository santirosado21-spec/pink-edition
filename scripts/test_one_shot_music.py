"""Contrato sin red de la política de música: 'none' nunca falla ni promete inclusión.

El brief valida y el intake prefieren musicMood 'none' (decisión del 10-oct:
sin música por defecto; la agrega el usuario al publicar). Antes, el flujo por
defecto (none + licensed-library) rompía el worker con KeyError en el paso de
música y la vista previa prometía «Música pendiente».
"""
import json
import pathlib
import tempfile
import unittest
import wave

from one_shot_worker import select_music

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SelectMusicTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = pathlib.Path(self.tmp.name)

    def select(self, mood, source='licensed-library'):
        assets, issues = [], []
        result = select_music(self.folder, {'musicMood': mood, 'musicSource': source}, assets, issues)
        return result, assets, issues

    def test_none_attaches_nothing_without_error(self):
        (music_file, frames), assets, issues = self.select('none')
        self.assertEqual((music_file, frames), (None, 1))
        self.assertEqual(assets, [])
        self.assertEqual(issues, [])
        self.assertFalse((self.folder / 'music.wav').exists())

    def test_none_with_own_source_is_not_a_missing_track(self):
        (_, _), _, issues = self.select('none', 'own')
        self.assertEqual(issues, [])

    def test_chosen_mood_synthesizes_original_score(self):
        (music_file, frames), assets, issues = self.select('calm')
        self.assertEqual(music_file, 'music.wav')
        self.assertEqual(frames, round(60 / 76 * 32 * 30))
        self.assertEqual(issues, [])
        self.assertEqual(assets[0]['license'], 'Original project composition; no third-party samples')
        with wave.open(str(self.folder / 'music.wav'), 'rb') as track:
            self.assertEqual(track.getframerate(), 24000)
            self.assertGreater(track.getnframes(), 24000 * 20)

    def test_own_track_requested_is_an_issue_not_a_substitute(self):
        (music_file, _), assets, issues = self.select('energetic', 'own')
        self.assertIsNone(music_file)
        self.assertEqual(assets, [])
        self.assertEqual(len(issues), 1)

    def test_every_selectable_mood_works(self):
        for mood in ('calm', 'energetic', 'documentary', 'cinematic'):
            (music_file, frames), _, issues = self.select(mood)
            self.assertEqual((music_file, issues), ('music.wav', []), mood)
            self.assertGreater(frames, 1, mood)


class MusicCopyTests(unittest.TestCase):
    """La interfaz nunca promete música pendiente o incluida cuando el usuario eligió «Sin música»."""

    def test_execution_panel_does_not_promise_pending_music(self):
        source = (ROOT / 'app/_components/LocalExecutionPanel.tsx').read_text()
        self.assertNotIn("'pendiente'", source.split('imágenes ·')[1].split('</p>')[0])
        self.assertIn("Sin música: se agrega al publicar", source)

    def test_intake_summary_and_review_follow_the_choice(self):
        source = (ROOT / 'app/_components/LocalIntake.tsx').read_text()
        self.assertIn("Sin música (se agrega al publicar)", source)
        self.assertIn('Voz íntegra; la música se agrega al publicar.', source)
        self.assertIn("Sin música de fondo: la agregas tú al publicar.", source)


if __name__ == '__main__':
    unittest.main()
