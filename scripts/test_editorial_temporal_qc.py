import copy
import unittest
from editorial_temporal_qc import measure


class TemporalQC(unittest.TestCase):
    def setUp(self):
        self.edit = {'fps': 30, 'frames': 300, 'captions': [
            {'text': 'Una', 'startMs': 0, 'endMs': 400}, {'text': 'idea', 'startMs': 2000, 'endMs': 2600}],
            'beats': [{'id': 'headline', 'kind': 'card', 'from': 0, 'frames': 100,
                       'textPages': [{'text': 'Una idea', 'from': 0, 'frames': 100}]}]}

    def test_gap_is_not_an_error_and_no_fake_render_claim(self):
        result = measure(self.edit)
        self.assertEqual(result['state'], 'passed')
        self.assertFalse(result['movieInspected'])
        self.assertEqual(result['aestheticApproval'], 'pending')

    def test_invalid_scene_or_page_bounds_fail(self):
        bad = copy.deepcopy(self.edit); bad['beats'][0]['frames'] = 500
        self.assertEqual(measure(bad)['state'], 'failed')

    def test_missing_movie_is_not_reported_as_inspected(self):
        result = measure(self.edit, '/this-movie-does-not-exist.mp4')
        self.assertEqual(result['state'], 'failed')
        self.assertFalse(result['movieInspected'])
        self.assertFalse(result['mediaValidated'])
        bad = copy.deepcopy(self.edit); bad['beats'][0]['textPages'][0]['frames'] = 101
        self.assertEqual(measure(bad)['state'], 'failed')

    def test_brief_page_is_a_reading_warning(self):
        self.edit['beats'][0]['textPages'][0]['frames'] = 12
        self.assertEqual(measure(self.edit)['warnings'][0]['code'], 'brief-text-page')


if __name__ == '__main__': unittest.main()
