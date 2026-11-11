"""Contrato sin red de editorial_timing: apoyos literales con tiempos en cuadros.

Cubre el módulo importado cuya única otra prueba (test_editorial_pipeline) está
bloqueada por los scripts originales. Palabras y frases sintéticas; los tiempos
de palabra ya vienen en cuadros, como los entrega el pipeline.
"""
import copy
import unittest

from editorial_timing import (
    ICON_TERMS,
    editorial_boundary,
    event_anchor_frame,
    event_overlaps,
    excerpt_words,
    graphic_reading_floor,
    grounded_beat,
    limit_media_duration,
    literal_excerpt,
    reading_frames,
    tokens,
)

FPS = 30
TEXT = 'Ahora las personas leen en casa durante las pausas'
WORDS = [{'text': word, 'start': i * 20, 'end': i * 20 + 12} for i, word in enumerate(TEXT.split())]
SENTENCE = {'text': TEXT, 'start': 0, 'end': 300}


def prefs(**editorial):
    base = {'readingPace': 'balanced', 'emphasisStyle': 'overlay', 'presence': 'balanced'}
    base.update(editorial)
    return {'editorial': base}


class LiteralTests(unittest.TestCase):
    def test_excerpt_returns_source_spelling(self):
        self.assertEqual(literal_excerpt('Las Personas Leen', 'las personas'), 'Las Personas')

    def test_excerpt_needs_word_boundary(self):
        self.assertIsNone(literal_excerpt('Marcamos la salida', 'mar'))

    def test_excerpt_token_fallback_crosses_punctuation(self):
        self.assertEqual(literal_excerpt('Lee, piensa y actúa hoy', 'lee piensa'), 'Lee, piensa')

    def test_excerpt_rejects_empty_or_non_string(self):
        self.assertIsNone(literal_excerpt(TEXT, ''))
        self.assertIsNone(literal_excerpt(TEXT, '   '))
        self.assertIsNone(literal_excerpt(TEXT, None))

    def test_tokens_casefold_unicode(self):
        self.assertEqual(tokens('¿Qué PASÓ?'), ['qué', 'pasó'])

    def test_excerpt_words_maps_multi_token_words(self):
        words = [{'text': 'ice-cream', 'start': 0, 'end': 10}, {'text': 'cone', 'start': 10, 'end': 20}]
        found = excerpt_words('ice cream cone', words)
        self.assertEqual(found, [words[0], words[0], words[1]])

    def test_excerpt_words_empty_without_match(self):
        self.assertEqual(excerpt_words('texto inventado', WORDS), [])


class BudgetTests(unittest.TestCase):
    def test_reading_frames_floor(self):
        self.assertEqual(reading_frames('uno', 'balanced', FPS), round(.9 * FPS))

    def test_reading_frames_pace_order(self):
        text = ' '.join(['palabra'] * 10)
        self.assertGreater(reading_frames(text, 'calm', FPS), reading_frames(text, 'brisk', FPS))

    def test_graphic_floor_minimum_and_growth(self):
        self.assertEqual(graphic_reading_floor('uno', FPS), round(2.2 * FPS))
        self.assertGreater(graphic_reading_floor(' '.join(['paso'] * 10), FPS), round(2.2 * FPS))

    def test_event_overlaps_half_open_with_guard(self):
        accepted = [{'from': 100, 'frames': 50}]
        self.assertFalse(event_overlaps(150, 30, accepted))
        self.assertTrue(event_overlaps(149, 30, accepted))
        self.assertTrue(event_overlaps(150, 30, accepted, guard=15))
        self.assertFalse(event_overlaps(180, 30, accepted, guard=15))


class BoundaryTests(unittest.TestCase):
    SCENES = [{'from': 0, 'frames': 300}, {'from': 300, 'frames': 300}]

    def boundary(self, event, sentence, next_event=500, total=600, style='overlay', anchor_frame=None):
        return editorial_boundary(event, sentence, self.SCENES, next_event, total,
                                  prefs(emphasisStyle=style), FPS, anchor_frame)

    def test_overlay_capped_by_scene_end(self):
        event = {'kind': 'card', 'labels': ['las personas']}
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}), 300)

    def test_composed_extends_three_seconds_after_sentence(self):
        event = {'kind': 'card', 'labels': ['las personas']}
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}, style='composed'), 200 + 3 * FPS)

    def test_broll_behaves_as_composed(self):
        event = {'kind': 'broll', 'anchor': 'las personas'}
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}), 200 + 3 * FPS)

    def test_never_past_next_event_or_total(self):
        event = {'kind': 'card', 'labels': ['las personas']}
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}, next_event=250), 250)
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}, next_event=900, total=280), 280)

    def test_anchor_frame_selects_its_scene(self):
        event = {'kind': 'card', 'labels': ['las personas']}
        self.assertEqual(self.boundary(event, {'start': 0, 'end': 200}, anchor_frame=400), 500)

    def test_event_anchor_frame_uses_anchor_or_first_label(self):
        sentence = SENTENCE
        self.assertEqual(event_anchor_frame({'kind': 'broll', 'anchor': 'leen en casa'}, sentence, WORDS), 60)
        self.assertEqual(event_anchor_frame({'kind': 'card', 'labels': ['las personas']}, sentence, WORDS), 20)

    def test_event_anchor_frame_none_without_timing(self):
        sentence = {'text': TEXT, 'start': 1000, 'end': 1300}
        self.assertIsNone(event_anchor_frame({'kind': 'card', 'labels': ['las personas']}, sentence, WORDS))


class MediaDurationTests(unittest.TestCase):
    def test_fitting_beat_untouched(self):
        beat = {'id': 'b1', 'from': 0, 'frames': 100, 'textPages': [{'text': 'a', 'from': 0, 'frames': 100}]}
        self.assertEqual(limit_media_duration(beat, {'durationFrames': 300}), [])
        self.assertEqual(beat['frames'], 100)

    def test_clamps_frames_and_text_pages(self):
        beat = {'id': 'b1', 'from': 0, 'frames': 300,
                'textPages': [{'text': 'a', 'from': 0, 'frames': 120}, {'text': 'b', 'from': 70, 'frames': 30}]}
        warnings = limit_media_duration(beat, {'durationFrames': 60})
        self.assertEqual(beat['frames'], 60)
        self.assertEqual(beat['textPages'], [{'text': 'a', 'from': 0, 'frames': 60}])
        self.assertEqual(warnings[0]['requiredFrames'], 300)
        self.assertEqual(warnings[0]['frames'], 60)
        self.assertEqual(warnings[0]['beatId'], 'b1')

    def test_rejects_non_positive_or_non_int_duration(self):
        beat = {'id': 'b1', 'from': 0, 'frames': 10}
        for bad in (0, -5, 1.5, '90', None):
            with self.assertRaises(ValueError):
                limit_media_duration(dict(beat), {'durationFrames': bad})


class GroundedBeatTests(unittest.TestCase):
    def beat(self, event, boundary=300, **editorial):
        return grounded_beat(event, SENTENCE, WORDS, boundary, prefs(**editorial), FPS)

    def test_card_accepts_literal_excerpt(self):
        beat, warnings, rejection = self.beat({'kind': 'card', 'labels': ['las personas leen en casa']})
        self.assertIsNone(rejection)
        self.assertEqual(warnings, [])
        self.assertEqual(beat['from'], 20)
        self.assertEqual(beat['frames'], 92)  # la voz del extracto termina en el cuadro 112
        self.assertEqual(beat['title'], 'las personas leen en casa')
        self.assertEqual(beat['textPages'], [{'text': 'las personas leen en casa', 'from': 0, 'frames': 92}])
        self.assertLessEqual(beat['from'] + beat['frames'], 300)
        self.assertEqual(beat['presentation'], 'overlay')

    def test_presentation_follows_style_and_kind(self):
        self.assertEqual(self.beat({'kind': 'card', 'labels': ['las personas']}, emphasisStyle='fullscreen')[0]['presentation'], 'fullscreen')
        self.assertEqual(self.beat({'kind': 'card', 'labels': ['las personas']}, emphasisStyle='composed')[0]['presentation'], 'reserved')
        self.assertEqual(self.beat({'kind': 'steps', 'labels': ['las personas', 'leen en casa']}, emphasisStyle='fullscreen')[0]['presentation'], 'overlay')

    def test_broll_presentation_follows_presence(self):
        event = {'kind': 'broll', 'anchor': 'leen en casa', 'reason': 'Apoyo visual'}
        self.assertEqual(self.beat(event, presence='presenter')[0]['presentation'], 'inset')
        self.assertEqual(self.beat(event, presence='visual')[0]['presentation'], 'fullscreen')
        self.assertEqual(self.beat(event, presence='balanced')[0]['presentation'], 'reserved')

    def test_steps_join_labels_literally(self):
        beat, _, rejection = self.beat({'kind': 'steps', 'labels': ['las personas', 'leen en casa']})
        self.assertIsNone(rejection)
        self.assertEqual(beat['title'], 'las personas')
        self.assertEqual(beat['labels'], ['las personas', 'leen en casa'])
        self.assertGreaterEqual(beat['frames'], graphic_reading_floor('las personas · leen en casa', FPS))

    def test_rejects_invented_label(self):
        _, _, rejection = self.beat({'kind': 'card', 'labels': ['texto inventado']})
        self.assertIsNotNone(rejection)

    def test_rejects_structured_graphic_with_one_label(self):
        for kind in ('steps', 'compare'):
            _, _, rejection = self.beat({'kind': kind, 'labels': ['las personas']})
            self.assertIsNotNone(rejection, kind)

    def test_rejects_non_list_labels(self):
        _, _, rejection = self.beat({'kind': 'card', 'labels': 'las personas'})
        self.assertIsNotNone(rejection)

    def test_rejects_missing_word_timing(self):
        sentence = {'text': TEXT, 'start': 1000, 'end': 1300}
        _, _, rejection = grounded_beat({'kind': 'card', 'labels': ['las personas']}, sentence, WORDS, 1300, prefs(), FPS)
        self.assertIsNotNone(rejection)

    def test_rejects_tiny_interval(self):
        _, _, rejection = self.beat({'kind': 'card', 'labels': ['las personas']}, boundary=20 + 5)
        self.assertIsNotNone(rejection)

    def test_steps_never_shorter_than_floor(self):
        _, _, rejection = self.beat({'kind': 'steps', 'labels': ['las personas', 'leen en casa']}, boundary=20 + 40)
        self.assertIn('minimum reading time', rejection)

    def test_icon_requires_meaning_in_excerpt(self):
        _, _, rejection = self.beat({'kind': 'icon', 'icon': 'heart', 'labels': ['las personas leen en casa']})
        self.assertIsNotNone(rejection)
        _, _, rejection = self.beat({'kind': 'icon', 'icon': 'made-up', 'labels': ['las personas']})
        self.assertIsNotNone(rejection)

    def test_icon_accepts_literal_meaning(self):
        beat, _, rejection = self.beat({'kind': 'icon', 'icon': 'people', 'labels': ['las personas']})
        self.assertIsNotNone(ICON_TERMS['people'])
        self.assertIsNone(rejection)
        self.assertEqual(beat['icon'], 'people')

    def test_question_icon_needs_marks_inside_excerpt(self):
        sentence = {'text': '¿Cómo leen las personas?', 'start': 0, 'end': 200}
        words = [{'text': word, 'start': i * 20, 'end': i * 20 + 12} for i, word in enumerate(sentence['text'].split())]
        _, _, rejection = grounded_beat({'kind': 'icon', 'icon': 'question', 'labels': ['cómo leen']},
                                        sentence, words, 200, prefs(), FPS)
        self.assertIsNotNone(rejection)

    def test_reading_budget_overflow_keeps_beat_with_warning(self):
        beat, warnings, rejection = self.beat({'kind': 'card', 'labels': ['las personas leen en casa']}, boundary=20 + 40)
        self.assertIsNone(rejection)
        self.assertEqual(beat['frames'], 40)
        self.assertEqual(warnings[0]['requiredFrames'], 66)

    def test_inputs_never_mutated(self):
        event = {'kind': 'steps', 'labels': ['las personas', 'leen en casa'], 'reason': 'Lista'}
        sentence, words = copy.deepcopy(SENTENCE), copy.deepcopy(WORDS)
        before = (copy.deepcopy(event), copy.deepcopy(sentence), copy.deepcopy(words))
        grounded_beat(event, sentence, words, 300, prefs(), FPS)
        self.assertEqual((event, sentence, words), before)


if __name__ == '__main__':
    unittest.main()
