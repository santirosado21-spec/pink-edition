"""Session input contract: the worker names missing fields instead of KeyError mid-run."""
import unittest

from one_shot_worker import validate_input


def complete():
    return {'brief': {'preferences': {'vibe': 'balanced'}, 'resourcePolicy': 'relevant-only'},
            'sources': [{'id': 'a', 'name': '1.mp4', 'seconds': 8, 'width': 360, 'height': 640}]}


class SessionInputContractTests(unittest.TestCase):
    def test_complete_input_passes(self):
        validate_input(complete())

    def test_missing_dimensions_are_named_with_their_source(self):
        data = complete()
        del data['sources'][0]['width']
        del data['sources'][0]['height']
        with self.assertRaisesRegex(ValueError, '1.mp4: falta width.*1.mp4: falta height'):
            validate_input(data)

    def test_missing_id_and_seconds_are_named(self):
        data = complete()
        del data['sources'][0]['id']
        del data['sources'][0]['seconds']
        with self.assertRaisesRegex(ValueError, 'falta id'):
            validate_input(data)

    def test_source_without_name_is_identified_by_position(self):
        data = complete()
        data['sources'][0] = {'seconds': 8, 'width': 360, 'height': 640}
        with self.assertRaisesRegex(ValueError, 'archivo 1: falta id.*archivo 1: falta name'):
            validate_input(data)

    def test_empty_sources_are_rejected(self):
        data = complete()
        data['sources'] = []
        with self.assertRaisesRegex(ValueError, 'no tiene archivos'):
            validate_input(data)

    def test_missing_preferences_are_rejected(self):
        data = complete()
        data['brief'] = {}
        with self.assertRaisesRegex(ValueError, 'preferencias del cuestionario'):
            validate_input(data)


if __name__ == '__main__':
    unittest.main()


class SourceVoiceContractTests(unittest.TestCase):
    def test_source_with_words_passes(self):
        from one_shot_worker import assert_source_voice
        assert_source_voice({'id': 'a', 'name': 'voz.mp4'},
                            {'segments': [{'words': [{'word': ' hola', 'start': 0, 'end': 1}]}]})

    def test_voiceless_source_is_named(self):
        from one_shot_worker import assert_source_voice
        with self.assertRaisesRegex(ValueError, 'timelapse.webm'):
            assert_source_voice({'id': 'b', 'name': 'timelapse.webm'}, {'segments': []})

    def test_blank_words_and_missing_words_key_count_as_voiceless(self):
        from one_shot_worker import assert_source_voice
        for transcript in ({'segments': [{'words': [{'word': '   ', 'start': 0, 'end': 1}]}]},
                           {'segments': [{}]}, {}):
            with self.assertRaisesRegex(ValueError, 'No se detectó habla legible en c.mp4'):
                assert_source_voice({'id': 'c', 'name': 'c.mp4'}, transcript)

    def test_source_without_name_falls_back_to_id(self):
        from one_shot_worker import assert_source_voice
        with self.assertRaisesRegex(ValueError, 'clip-9'):
            assert_source_voice({'id': 'clip-9'}, {'segments': []})
