"""Regresiones de preferencias y maquetación, sin descargar ni ejecutar modelos."""
import json
import tempfile
import unittest
from pathlib import Path
from plan_io import check_preferences
from layout_captions import repaginate
from transcribe import uncovered_speech, fill_missing_times, chronological_segments

ROOT = Path(__file__).resolve().parents[1]
BASE = dict(topic="", notes="", vibe="balanced", graphics="few", brand_color="#e63b7a", context_colors=False, sfx="soft")

class BrandCatalogTests(unittest.TestCase):
    def test_recovered_words_are_inserted_inside_original_phrase(self):
        original = {"language": "es", "words": [
            {"word": "Hola", "start": 0, "end": 1},
            {"word": "mundo", "start": 9, "end": 10}]}
        recovered = {"language": "en", "words": [
            {"word": "hello", "start": 2, "end": 3}]}
        result = chronological_segments([original, recovered])
        self.assertEqual([w["word"] for s in result for w in s["words"]], ["Hola", "hello", "mundo"])
        self.assertEqual([s["language"] for s in result], ["es", "en", "es"])
        self.assertEqual(len(original["words"]), 2)

    def test_uncovered_voice_inside_aligned_segment(self):
        segment = {"start": 0, "end": 10, "words": [
            {"word": "Hola", "start": 0, "end": 1},
            {"word": "again", "start": 9, "end": 10},
        ]}
        self.assertEqual(uncovered_speech([{"start": 0, "end": 160000}], [segment]), [[1, 9]])

    def test_missing_token_does_not_reverse_word_order(self):
        words = [{"word": "a", "start": 0, "end": 2}, {"word": "2026"},
                 {"word": "b", "start": 1.5, "end": 2.5}]
        fill_missing_times(words, 0, 2.5)
        self.assertEqual([w["word"] for w in words], ["a", "2026", "b"])
        self.assertLessEqual(words[0]["start"], words[1]["start"])
        self.assertLessEqual(words[1]["start"], words[2]["start"])

    def test_recover_speech_after_language_switch(self):
        speech = [{"start": 0, "end": 4 * 16000}, {"start": 4 * 16000, "end": 10 * 16000}]
        self.assertEqual(uncovered_speech(speech, [{"start": 0, "end": 3.5}]), [[3.5, 10]])
        self.assertEqual(uncovered_speech(speech, [{"start": 0, "end": 10}]), [])
        # Nunca unir huecos atravesando palabras ya reconocidas.
        self.assertEqual(uncovered_speech(speech, [{"start": 0, "end": 2}, {"start": 3.5, "end": 3.7}, {"start": 6, "end": 10}]), [[2, 3.5], [3.7, 6]])

    def test_backward_compatibility_and_invalid_options(self):
        self.assertEqual(check_preferences(BASE), [])
        self.assertEqual(check_preferences({**BASE, "language": "mixed", "font": "mono", "catalog_version": 1}), [])
        for field, value in [("font", "unknown"), ("graphic_kinds", ["bill", "bill"]), ("language", "xx")]:
            self.assertTrue(check_preferences({**BASE, field: value}))

    def test_font_layout_keeps_words_and_timing(self):
        words = [{"id": f"w{i}", "text": text, "source_start_frame": i * 15, "source_end_frame": (i + 1) * 15} for i, text in enumerate(["Desafortunadamente", "we", "need", "practice", "every", "día."])]
        original = {"duration_frames": 90, "clips": [{"source_in_frame": 0, "duration_frames": 90, "words": words, "pages": []}]}
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for font in ["inter", "serif", "mono"]:
                (folder / "timeline.json").write_text(json.dumps(original))
                (folder / "plan.json").write_text(json.dumps({"preferences": {**BASE, "font": font}}))
                repaginate(folder / "timeline.json", folder / "plan.json", ROOT / "style/pink-demo-v1.json")
                result = json.loads((folder / "timeline.json").read_text())
                clip = result["clips"][0]
                self.assertEqual(clip["words"], words)
                self.assertEqual(clip["duration_frames"], 90)
                self.assertEqual([w["id"] for page in clip["pages"] for line in page["lines"] for w in line], [w["id"] for w in words])
                self.assertTrue(all(len(page["lines"]) <= 2 for page in clip["pages"]))

if __name__ == "__main__":
    unittest.main()
