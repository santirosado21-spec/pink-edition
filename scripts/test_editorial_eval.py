import copy
import tempfile
from pathlib import Path
import unittest
from editorial_eval import package, compare, api_estimate


class EqualInputEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.edit = {'fps': 30, 'width': 720, 'height': 1280, 'frames': 300, 'editorialVersion': 1,
                     'preferences': {}, 'scenes': [], 'captions': [], 'beats': []}
        self.pack = package(self.edit)
        self.result = {'packageSha256': self.pack['packageSha256'], 'edit': self.edit, 'model': 'control'}

    def test_same_input_no_automatic_aesthetic_verdict(self):
        result = compare(self.pack, self.result, {**self.result, 'model': 'candidate'})
        self.assertTrue(result['blindResults']['A']['technicalContractPassed'])
        self.assertIsNone(result['winner'])

    def test_changed_voice_timeline_fails_contract(self):
        candidate = copy.deepcopy(self.result); candidate['edit']['frames'] = 200
        self.assertIn('changed-frames', compare(self.pack, self.result, candidate)['blindResults']['B']['technicalProblems'])

    def test_wrong_package_and_tampering_rejected(self):
        with self.assertRaises(ValueError): compare(self.pack, self.result, {**self.result, 'packageSha256': 'other'})
        changed = copy.deepcopy(self.pack); changed['context']['frames'] = 200
        with self.assertRaises(ValueError): compare(changed, self.result, self.result)

    def test_invented_quote_and_renderer_change_fail(self):
        candidate = copy.deepcopy(self.result)
        candidate['edit']['visualLayoutVersion'] = 999
        candidate['edit']['beats'] = [{'id': 'invented', 'kind': 'card', 'from': 0, 'frames': 30,
                                     'quote': 'Nunca fue dicho', 'headline': 'Nunca fue dicho', 'labels': []}]
        problems = compare(self.pack, self.result, candidate)['blindResults']['B']['technicalProblems']
        self.assertIn('changed-visual-layout', problems)
        self.assertIn('invented:ungrounded-source-quote', problems)

    def test_real_words_at_wrong_time_fail(self):
        self.edit['captions'] = [{'text': 'Real', 'startMs': 0, 'endMs': 200}]
        pack = package(self.edit)
        candidate = {'packageSha256': pack['packageSha256'], 'edit': {**self.edit, 'beats': [
            {'id': 'late', 'kind': 'card', 'from': 90, 'frames': 30, 'quote': 'Real', 'headline': 'Real'}]}}
        self.assertIn('late:headline-time-not-anchored', compare(pack, candidate, candidate)['blindResults']['A']['technicalProblems'])

    def test_audio_or_caption_contract_cannot_bias_comparison(self):
        candidate = copy.deepcopy(self.result)
        candidate['edit']['music'] = 'different.mp4'
        candidate['edit']['captionLayoutVersion'] = 999
        problems = compare(self.pack, self.result, candidate)['blindResults']['B']['technicalProblems']
        self.assertIn('changed-music', problems)
        self.assertIn('changed-captionLayoutVersion', problems)

    def test_cache_cost_and_missing_usage(self):
        self.assertIsNone(api_estimate(self.result))
        sample = {'usage': {'input_tokens': 60000, 'cached_input_tokens': 20000, 'output_tokens': 6000},
                  'rates': {'inputPerMillion': 4, 'outputPerMillion': 20, 'cacheReadPerMillion': .2}}
        self.assertAlmostEqual(api_estimate(sample), .284)
        sample['usage']['cached_input_tokens'] = 90000
        with self.assertRaises(ValueError): api_estimate(sample)

    def test_media_inventory_checks_files_and_hashes(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'sample.mp4'; file.write_bytes(b'synthetic')
            self.edit['scenes'] = [{'asset': 'sample.mp4'}]
            self.assertEqual(len(package(self.edit, folder)['assetInventory'][0]['sha256']), 64)
            self.edit['scenes'][0]['asset'] = '../outside.mp4'
            with self.assertRaises(ValueError): package(self.edit, folder)


if __name__ == '__main__': unittest.main()
