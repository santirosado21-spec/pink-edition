import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
from media_intake import route
from fran_loop import preflight, main, validate_corpus_config
import json
from one_shot_worker import main as worker_main
import media_intake


def analysis(kind, confidence=.99, signal='no-editorial-overlays'):
    return {'classification': kind, 'confidence': confidence,
            'observations': [{'sample': i, 'signal': signal} for i in range(3)]}


class MediaIntakeTest(unittest.TestCase):
    def test_corpus_round_cannot_mix_splits_or_repeat_a_clip(self):
        base = {'corpusSha256': 'a' * 64, 'split': 'dev'}
        with self.assertRaisesRegex(ValueError, 'único split'):
            validate_corpus_config({'videos': [base, {**base, 'corpusSha256': 'b' * 64, 'split': 'holdout'}]})
        with self.assertRaisesRegex(ValueError, 'repetir'):
            validate_corpus_config({'videos': [base, dict(base)]})

    def test_raw_and_edited_routes(self):
        self.assertEqual(route(analysis('raw'), 12), 'edit')
        self.assertEqual(route(analysis('edited', signal='burned-captions'), 12), 'reference')

    def test_uncertainty_cannot_enter_editing(self):
        for value in [analysis('uncertain'), analysis('raw', .7), analysis('raw', signal='unclear'),
                      analysis('raw', signal='shot-change'), analysis('raw', True)]:
            self.assertEqual(route(value, 12), 'review')

    def test_physical_text_and_watermark_are_not_editorial_proof(self):
        for signal in ('physical-text', 'watermark', 'shot-change'):
            self.assertEqual(route(analysis('edited', signal=signal), 12), 'review')
        self.assertEqual(route(analysis('raw', signal='physical-text'), 12), 'edit')

    def test_raw_camera_turn_does_not_block_a_clean_take(self):
        value = analysis('raw', .98)
        value['observations'].append({'sample': 3, 'signal': 'shot-change'})
        self.assertEqual(route(value, 12), 'edit')
        # A camera change never overrides actual editorial evidence/uncertainty.
        for signal in ('burned-captions', 'editorial-graphics', 'unclear'):
            mixed = {**value, 'observations': [*value['observations'], {'sample': 4, 'signal': signal}]}
            self.assertEqual(route(mixed, 12), 'review')
        self.assertEqual(route({**value, 'classification': 'uncertain'}, 12), 'review')

    def test_cached_raw_verdict_is_rerouted_without_another_model_call(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'camera.mov'
            source.write_bytes(b'fixture')
            sha = media_intake.digest(source)
            cache = root / 'cache'
            folder = cache / sha
            folder.mkdir(parents=True)
            value = analysis('raw', .98)
            value['observations'].append({'sample': 3, 'signal': 'shot-change'})
            (folder / 'classification.json').write_text(json.dumps({'version': media_intake.VERSION,
                'model': media_intake.MODEL, 'revision': media_intake.REVISION, 'sha256': sha,
                'route': 'review', 'samples': list(range(12)), 'analysis': value}))
            with patch('media_intake.CACHE', cache), patch('media_intake.request') as model:
                self.assertEqual(media_intake.inspect(source)['route'], 'edit')
                model.assert_not_called()

    def test_invalid_or_single_frame_evidence_is_blocked(self):
        value = analysis('edited', signal='editorial-graphics')
        value['observations'][0]['sample'] = 99
        self.assertEqual(route(value, 12), 'review')
        value['observations'] = [{'sample': 0, 'signal': 'editorial-graphics'}]*3
        self.assertEqual(route(value, 12), 'review')

    def test_mixed_project_blocks_whole_batch_without_uploads(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            sources = [folder/'a.mov', folder/'b.mov']
            for source in sources:
                source.write_bytes(b'fixture')
            reports = [{'route': role, 'patterns': [], 'durationSeconds': 1} for role in ('edit', 'reference')]
            with patch('fran_loop.inspect_media', side_effect=reports), patch('fran_loop.request') as api:
                _, report = preflight({'sources': [str(s) for s in sources]}, folder)
                self.assertEqual(report['role'], 'review')
                self.assertTrue((folder/'intake.json').exists())
                api.assert_not_called()

    def test_main_never_uploads_or_renders_references_or_uncertain_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            a, b = folder/'a.mov', folder/'b.mov'
            a.write_bytes(b'a'); b.write_bytes(b'b')
            config = folder/'config.json'
            config.write_text(json.dumps({'videos': [{'source': str(a)}, {'source': str(b)}]}))
            reports = [{'route': role, 'patterns': [], 'durationSeconds': 1} for role in ('reference', 'review')]
            with patch('sys.argv', ['fran_loop.py', '--config', str(config)]), patch('fran_loop.ROOT', folder), patch('fran_loop.inspect_media', side_effect=reports), patch('fran_loop.request') as api, patch('fran_loop.subprocess.run') as render:
                main()
                api.assert_not_called()
                render.assert_not_called()

    def test_worker_also_blocks_direct_calls_before_transcription(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder/'input.json').write_text(json.dumps({'brief': {'preferences': {}}, 'sources': [{'id': 'fixture'}]}))
            with patch('one_shot_worker.assert_ready'), patch('one_shot_worker.inspect_media', return_value={'route': 'reference', 'patterns': []}), patch('one_shot_worker.command') as asr, patch('one_shot_worker.editorial_model') as director:
                with self.assertRaisesRegex(ValueError, 'fixture: ya tiene edición'):
                    worker_main(folder)
                asr.assert_not_called()
                director.assert_not_called()
                self.assertTrue((folder/'source-intake.json').exists())

    def test_rejected_patterns_do_not_reach_next_direction(self):
        with tempfile.TemporaryDirectory() as temp:
            cache = Path(temp)
            sha = 'a'*64
            folder = cache/sha
            folder.mkdir()
            report = {'version': media_intake.VERSION, 'model': media_intake.MODEL,
                'sha256': sha, 'route': 'reference', 'patterns': [
                    {'name': name, 'adaptation': name, 'description': 'Observed', 'evidenceSeconds': [1,2]}
                    for name in ('short-caption-pages','keyword-emphasis')]}
            (folder/'classification.json').write_text(json.dumps(report))
            with patch('media_intake.CACHE', cache):
                media_intake.record_feedback(sha, 'short-caption-pages', 'rejected', 'Prefiero otra agrupación')
                media_intake.record_feedback(sha, 'keyword-emphasis', 'liked')
                candidates = media_intake.reference_directions()
                self.assertEqual([p['adaptation'] for p in candidates], ['keyword-emphasis'])
                self.assertEqual(candidates[0]['userApproval'], 'liked')


if __name__ == '__main__':
    unittest.main()
