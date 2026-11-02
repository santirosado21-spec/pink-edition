#!/usr/bin/env python3
"""Pruebas aisladas del loop Pink; no usan rondas reales ni red."""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import unittest


SCRIPT = pathlib.Path(__file__).with_name('pink_loop.py')


class PinkLoopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        self.rounds = self.root / 'rounds'
        self.state = self.root / 'state'

    def tearDown(self):
        self.temp.cleanup()

    def write_json(self, path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding='utf-8')

    def make_round(self, name, videos, config_videos=None):
        folder = self.rounds / name
        self.write_json(folder / 'config.json', {'videos': config_videos or [{} for _ in videos]})
        for index, video in enumerate(videos, 1):
            target = folder / f'video-{index:02d}'
            quality = {'title': video.get('title', f'Título {index}'), 'durationSeconds': 10,
                       'checks': {'ok': True}, **video.get('quality', {})}
            self.write_json(target / 'quality.json', quality)
            if 'feedback' in video:
                self.write_json(target / 'feedback.json', video['feedback'])
        return folder

    def execute(self, *args, input_text='', state=None):
        env = os.environ.copy()
        env['PINK_LOOP_ROUNDS'] = str(self.rounds)
        env['PINK_LOOP_STATE'] = str(state or self.state)
        return subprocess.run([sys.executable, str(SCRIPT), *args], input=input_text,
                              text=True, capture_output=True, env=env, check=False)

    def test_review_records_new_dimensions_and_approval(self):
        folder = self.make_round('review-ok', [{}])
        done = self.execute('review', 'review-ok', input_text='4\n5\n4\n4\nCambiar el corte del segundo 3\n')
        self.assertEqual(done.returncode, 0, done.stderr)
        feedback = json.loads((folder / 'video-01/feedback.json').read_text())
        self.assertEqual(feedback['scores'], {'editorial': 4, 'visual': 5, 'ritmo': 4, 'publicable': 4})
        self.assertEqual(feedback['comments'], ['Cambiar el corte del segundo 3'])
        quality = json.loads((folder / 'video-01/quality.json').read_text())
        self.assertEqual(quality['aestheticApproval'], 'approved')

        changed = self.make_round('review-change', [{}])
        done = self.execute('review', 'review-change', input_text='3\n4\n4\n4\n\n')
        self.assertEqual(done.returncode, 0, done.stderr)
        quality = json.loads((changed / 'video-01/quality.json').read_text())
        self.assertEqual(quality['aestheticApproval'], 'needs-changes')

    def test_review_is_blind_and_status_reveals_title(self):
        folder = self.make_round('blind-title', [{'title': 'Título secreto', 'quality': {'preset': 'Impacto'}}],
                                 [{'preset': 'Impacto'}])
        reviewed = self.execute('review', 'blind-title', input_text='4\n4\n4\n4\nBien\n')
        self.assertNotIn('Título secreto', reviewed.stdout)
        self.assertNotIn('Impacto', reviewed.stdout)
        blind = json.loads((self.state / 'blind/blind-title.json').read_text())
        self.assertEqual(set(blind.values()), {'video-01'})
        status = self.execute('status', 'blind-title')
        self.assertIn('Título secreto', status.stdout)
        self.assertIn('Video A', status.stdout)

    def test_status_hides_unreviewed_title_and_pending_item(self):
        scored = {'scores': {'editorial': 4, 'visual': 4, 'ritmo': 4, 'publicable': 4}}
        self.make_round('status-blind', [
            {'title': 'Título ya puntuado', 'feedback': scored},
            {'title': 'Título aún secreto'},
        ])
        status = self.execute('status', 'status-blind')
        self.assertIn('Título ya puntuado', status.stdout)
        self.assertNotIn('Título aún secreto', status.stdout)
        self.assertIn('puntuarlo (`review`)', status.stdout)

    def test_blind_order_is_deterministic_for_a_round(self):
        self.make_round('same-seed', [{}, {}, {}])
        first = self.root / 'state-first'
        second = self.root / 'state-second'
        done = self.execute('review', 'same-seed', input_text=('4\n4\n4\n4\n\n' * 3), state=first)
        self.assertEqual(done.returncode, 0, done.stderr)
        done = self.execute('review', 'same-seed', input_text='n\nn\nn\n', state=second)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(
            json.loads((first / 'blind/same-seed.json').read_text()),
            json.loads((second / 'blind/same-seed.json').read_text()),
        )

    def test_next_excludes_holdout_and_refuses_holdout_only(self):
        feedback = {'scores': {'editorial': 2, 'visual': 4, 'ritmo': 4, 'publicable': 4},
                    'nextRoundChanges': ['Mejorar el apoyo']}
        holdout_feedback = {'scores': {'editorial': 1, 'visual': 1, 'ritmo': 1, 'publicable': 1},
                            'nextRoundChanges': ['No trasladar']}
        folder = self.make_round('mixed', [
            {'title': 'Dev', 'feedback': feedback},
            {'title': 'Reservado', 'quality': {'split': 'holdout'}, 'feedback': holdout_feedback},
        ], [{'split': 'dev'}, {'split': 'dev'}])
        done = self.execute('next', 'mixed')
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertIn('Se ignoraron 1 feedback de holdout.', done.stdout)
        next_config = json.loads((self.state / 'next-config.json').read_text())
        self.assertIn('Dev:', next_config['feedback'])
        self.assertNotIn('Reservado', next_config['feedback'])

        holdout_only = self.make_round('holdout-only', [
            {'quality': {'split': 'holdout'}, 'feedback': holdout_feedback},
        ], [{'split': 'dev'}])
        isolated_state = self.root / 'holdout-state'
        done = self.execute('next', holdout_only.name, state=isolated_state)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('Sólo hay feedback de holdout', done.stdout + done.stderr)
        self.assertFalse((isolated_state / 'next-config.json').exists())

        no_feedback = self.make_round('no-feedback', [{}])
        empty_state = self.root / 'empty-state'
        done = self.execute('next', no_feedback.name, state=empty_state)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('No hay feedback que trasladar', done.stdout + done.stderr)
        self.assertNotIn('Sólo hay feedback de holdout', done.stdout + done.stderr)
        self.assertFalse((empty_state / 'next-config.json').exists())

    def test_history_separates_legacy_scores_and_hard_failures(self):
        first = self.make_round('old', [{
            'quality': {'split': 'dev'},
            'feedback': {'scores': {'claridad': 5, 'pertinencia': 4, 'ritmo': 4, 'estilo': 5, 'publicable': 4}},
        }])
        second = self.make_round('new', [{
            'quality': {'split': 'holdout', 'checks': {'voice': False}, 'audioQc': {'exitCode': 1}},
            'feedback': {'scores': {'editorial': 3, 'visual': 4, 'ritmo': 4, 'publicable': 3}},
        }])
        now = time.time()
        os.utime(first, (now - 10, now - 10))
        os.utime(second, (now, now))
        done = self.execute('history')
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertLess(done.stdout.index('old · dev'), done.stdout.index('new · holdout'))
        self.assertIn('antiguas [claridad=5.0, pertinencia=4.0, ritmo=4.0, estilo=5.0, publicable=4.0]', done.stdout)
        self.assertIn('publicable ≥4: 100.0%', done.stdout)
        self.assertIn('new · holdout · puntuados: 1', done.stdout)
        self.assertIn('fallos duros: 1', done.stdout)

    def test_run_without_yes_returns_two_without_running_the_loop(self):
        config = self.root / 'config.json'
        self.write_json(config, {'origin': 'http://127.0.0.1:1'})
        done = self.execute('run', '--config', str(config))
        self.assertEqual(done.returncode, 2)
        self.assertIn('Repite con --yes', done.stdout)


if __name__ == '__main__':
    unittest.main()
