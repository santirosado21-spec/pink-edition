"""Contrato del manifiesto de revisión: mapeo fuente/salida y gates de incertidumbre.

Sin render ni PIL: ejercita las funciones puras de review_contract con
fixtures sintéticos. Propuesta en docs/estrategia/autonomia-2026-10-15/
SIGUIENTE-TRABAJO.md (paquete 3): intervalos fuente/salida y QC desconocido
explícito en el manifiesto de revisión.
"""

import unittest

from review_contract import (caption_at, caption_warnings, key_frames,
                             source_frame_at, uncertainty_gates)

FPS = 30


def word(wid, start, text):
    return {"id": wid, "source_start_frame": start, "text": text}


def page(start, end, lines):
    return {"start_frame": start, "end_frame": end, "lines": lines}


def clip(cid, source_in, source_out, timeline_in, words, pages):
    return {"id": cid, "source_in_frame": source_in, "source_out_frame": source_out,
            "duration_frames": source_out - source_in,
            "timeline_in_frame": timeline_in,
            "timeline_out_frame": timeline_in + (source_out - source_in),
            "words": words, "pages": pages}


def fixture():
    """Dos clips con un hueco entre ellos; el segundo reusa el inicio de la fuente."""
    words_a = [word("a1", 100, "hola"), word("a2", 110, "mundo"),
               word("a3", 130, "corto")]
    pages_a = [page(100, 140, [[words_a[0], words_a[1]]]),
               page(140, 170, [[word("a4", 140, "segunda")], [words_a[2]]])]
    # Nota: a3 vive en la segunda página; sus frames fuente son 130-170.
    pages_a[1]["lines"][1][0]["source_start_frame"] = 160
    words_a[2]["source_start_frame"] = 160
    clip_a = clip("clip-a", 100, 200, 0, words_a, pages_a)

    words_b = [word("b1", 10, "otra"), word("b2", 20, "toma")]
    pages_b = [page(10, 40, [[words_b[0], words_b[1]]])]
    clip_b = clip("clip-b", 0, 100, 130, words_b, pages_b)

    timeline = {"is_sample": False, "fps": FPS, "duration_frames": 230,
                "clips": [clip_a, clip_b]}
    style = {"fps": FPS, "captions": {"reveal_frames": 5, "min_last_word_frames": 15},
             "graphics": {"enter_frames": 6, "exit_frames": 6}}
    plan = {"is_sample": False, "cards": [
        {"id": "card-1", "anchor_word_id": "b1", "offset_frames": 0,
         "duration_frames": 30}], "backgrounds": []}
    return timeline, style, plan


class SourceMappingTest(unittest.TestCase):
    def test_source_frame_at_maps_and_rejects_gaps(self):
        timeline, _, _ = fixture()
        # Frame 5 del montaje: clip-a, fuente 105.
        self.assertEqual(source_frame_at(timeline, 5),
                         {"clip": "clip-a", "source_frame": 105})
        # El hueco 100-129 no pertenece a ningún clip.
        self.assertIsNone(source_frame_at(timeline, 100))
        # Límites: in inclusivo, out exclusivo.
        self.assertEqual(source_frame_at(timeline, 0)["source_frame"], 100)
        self.assertIsNone(source_frame_at(timeline, 230))

    def test_key_frames_declares_output_and_source_times(self):
        timeline, style, plan = fixture()
        items = key_frames(timeline, style, plan)
        self.assertTrue(items)
        for item in items:
            self.assertAlmostEqual(item["seconds"], item["frame"] / FPS, places=3)
            self.assertIsNotNone(item["source"])
            source = source_frame_at(timeline, item["frame"])
            self.assertEqual(item["source"]["source_frame"], source["source_frame"])
            self.assertAlmostEqual(item["source"]["seconds"],
                                   source["source_frame"] / FPS, places=3)

    def test_card_events_produce_three_samples(self):
        timeline, style, plan = fixture()
        items = key_frames(timeline, style, plan)
        kinds = [item["kind"] for item in items]
        self.assertIn("card_enter", kinds)
        self.assertIn("card_hold", kinds)
        self.assertIn("card_exit", kinds)
        holder = next(item for item in items if item["kind"] == "card_hold")
        self.assertEqual(holder["cards"], ["card-1"])


class CaptionContractTest(unittest.TestCase):
    def test_caption_at_boundaries(self):
        timeline, _, _ = fixture()
        # Página 1 de clip-a: fuente [100, 140) => montaje [0, 40).
        self.assertEqual(caption_at(timeline, 0), ["hola mundo"])
        self.assertEqual(caption_at(timeline, 39), ["hola mundo"])
        # Página 2: fuente [140, 170) => montaje [40, 70).
        self.assertEqual(caption_at(timeline, 40), ["segunda", "corto"])
        # Hueco entre clips: sin caption.
        self.assertEqual(caption_at(timeline, 100), [])
        # Clip-b: fuente [10, 40) => montaje [140, 170).
        self.assertEqual(caption_at(timeline, 140), ["otra toma"])

    def test_warnings_flag_barely_visible_and_orphan(self):
        timeline, style, _ = fixture()
        warnings = caption_warnings(timeline, style)
        kinds = {(w["kind"], w.get("word_id") or w["text"]) for w in warnings}
        # a3: visible = 170 - 160 = 10 < 15.
        self.assertIn(("word_barely_visible", "a3"), kinds)
        # Segunda página de clip-a termina con renglón de una palabra corta.
        self.assertIn(("orphan_line", "corto"), kinds)
        # b2: visible = 40 - 20 = 20 >= 15, sin aviso.
        self.assertNotIn(("word_barely_visible", "b2"), kinds)


class UncertaintyGateTest(unittest.TestCase):
    def test_gates_are_explicit_unknowns(self):
        timeline, _, _ = fixture()
        gates = uncertainty_gates(timeline)
        self.assertEqual(gates["face_placement"]["state"], "unknown")
        self.assertEqual(gates["voice_coverage"]["state"], "unknown")
        for gate in gates.values():
            self.assertTrue(gate["note"])


if __name__ == "__main__":
    unittest.main()
