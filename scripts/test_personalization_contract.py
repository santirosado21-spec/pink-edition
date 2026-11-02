"""Contratos con datos sintéticos: nunca se llama al motor ni a servicios reales."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch
import plan_io
import pink_edit
import worker

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT / 'scripts/fixtures/personalization-profiles.json').read_text())
BASE = CASES[0]['value']

class PersonalizationContract(unittest.TestCase):
    def test_shared_fixtures(self):
        for case in CASES:
            with self.subTest(case=case['name']):
                self.assertEqual(not plan_io.check_preferences(case['value']), case['valid'])

    def test_file_absence_is_distinct(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'profile.json'
            self.assertIsNone(plan_io.read_preferences_file(p, optional=True))
            with self.assertRaisesRegex(ValueError, 'No se encontró'):
                plan_io.read_preferences_file(p)
            for data in ['null', '{}', 'false', '[]', '{']:
                p.write_text(data)
                with self.assertRaisesRegex(ValueError, 'necesita revisión'):
                    plan_io.read_preferences_file(p, optional=True)
            with patch.object(Path, 'read_text', side_effect=PermissionError('denied')):
                with self.assertRaises(PermissionError):
                    plan_io.read_preferences_file(p, optional=True)

    def test_worker_does_not_run_engine_with_invalid_profile(self):
        for case in CASES:
            if case['valid'] or case['value'] is None:
                continue
            store = Mock()
            store.get_preferences.return_value = case['value']
            with patch.object(worker, 'run_engine') as run:
                with self.assertRaises(ValueError):
                    worker.analyze(store, {}, {'id': 'fixture', 'owner_id': 'owner'}, Path('/unused/source.mp4'))
                run.assert_not_called()

    def test_worker_adapters_reject_present_null(self):
        cloud = worker.Cloud.__new__(worker.Cloud)
        cloud.rows = Mock(return_value=[{'preferences': None}])
        with self.assertRaises(ValueError): cloud.get_preferences('owner')
        cloud.rows.return_value = []
        self.assertIsNone(cloud.get_preferences('owner'))
        with tempfile.TemporaryDirectory() as folder:
            local = worker.Local.__new__(worker.Local)
            local.root = Path(folder)
            (local.root / 'profiles').mkdir()
            (local.root / 'profiles/owner.json').write_text('null')
            with self.assertRaises(ValueError): local.get_preferences('owner')
            self.assertIsNone(local.get_preferences('missing'))

    def test_empty_plan_rejects_invalid(self):
        for case in CASES:
            if case['valid']:
                self.assertEqual(plan_io.empty_plan('test', case['value'])['preferences'], case['value'])
            elif case['value'] is not None:
                with self.assertRaises(ValueError): plan_io.empty_plan('test', case['value'])
        self.assertNotIn('preferences', plan_io.empty_plan('test'))

    def test_cli_validates_before_any_stage(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            args = SimpleNamespace(job='fixture', execution_id=None, style=ROOT / 'style/pink-demo-v1.json', allow_model_download=False,
                                   preferences=None, plan=None, language=None, model=None)
            for value in [None, {}, False, {**BASE, 'profile_version': 2}]:
                (work / 'plan.json').write_text(json.dumps({'preferences': value}))
                stage = Mock()
                with patch.object(pink_edit, 'conform') as conform, patch.object(pink_edit, 'run') as run:
                    with self.assertRaisesRegex(ValueError, 'necesita revisión'):
                        pink_edit.main(args, work, stage)
                    stage.assert_not_called(); conform.assert_not_called(); run.assert_not_called()
            (work / 'plan.json').write_text(json.dumps({'preferences': BASE}))
            args.preferences = work / 'missing.json'
            with self.assertRaisesRegex(ValueError, 'No se encontró'):
                pink_edit.main(args, work, Mock())
            args.preferences = None
            for invalid_plan in [None, False, []]:
                (work / 'plan.json').write_text(json.dumps(invalid_plan))
                with self.assertRaisesRegex(ValueError, 'plan guardado no es válido'):
                    pink_edit.main(args, work, Mock())
            for snapshot in [{'preferences': BASE}, {}]:
                (work / 'plan.json').write_text(json.dumps(snapshot))
                stage = Mock(side_effect=RuntimeError('reached conform'))
                with self.assertRaisesRegex(RuntimeError, 'reached conform'): pink_edit.main(args, work, stage)
                stage.assert_called_once_with('conform')
                self.assertEqual(json.loads((work / 'plan.json').read_text()), snapshot)

if __name__ == '__main__': unittest.main()
