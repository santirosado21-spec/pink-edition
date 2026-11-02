"""No network calls: subscription enforcement, model identity, images and failures."""
import base64
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import sol_model


class SolModelTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.schema = {'type': 'object', 'properties': {'ok': {'type': 'boolean'}}, 'required': ['ok']}
        self.messages = [{'role': 'user', 'content': 'synthetic private marker'}]
        self.patch_root = patch.object(sol_model, 'ROOT', self.root)
        self.patch_root.start()
        self.addCleanup(self.patch_root.stop)

    def runner(self, args, **kwargs):
        if args[1:3] == ['login', 'status']:
            return SimpleNamespace(returncode=0, stdout='', stderr='Logged in using ChatGPT')
        self.assertEqual(args[args.index('--model') + 1], 'gpt-5.6-sol')
        self.assertIn('--ignore-user-config', args)
        self.assertIn('--ephemeral', args)
        self.assertNotIn('OPENAI_API_KEY', kwargs['env'])
        self.assertNotIn('ANTHROPIC_API_KEY', kwargs['env'])
        self.assertNotIn('synthetic private marker', ' '.join(args))
        self.assertIn('synthetic private marker', kwargs['input'])
        self.inference_folder = Path(args[args.index('--cd') + 1])
        schema = json.loads(Path(args[args.index('--output-schema') + 1]).read_text())
        self.assertFalse(schema['additionalProperties'])
        if '--image' in args:
            self.assertTrue(Path(args[args.index('--image') + 1]).exists())
        Path(args[args.index('--output-last-message') + 1]).write_text('{"ok":true}')
        return SimpleNamespace(returncode=0, stdout=json.dumps({'type': 'turn.completed', 'usage': {'input_tokens': 10, 'output_tokens': 3}}), stderr='')

    def test_subscription_identity_receipt_and_ephemeral_images(self):
        self.messages[0]['images'] = [base64.b64encode(b'\x89PNG\r\n\x1a\nsynthetic').decode()]
        with patch.object(sol_model.shutil, 'which', return_value='/fixture/codex'), patch.object(sol_model.subprocess, 'run', side_effect=self.runner), patch.dict(sol_model.os.environ, {'OPENAI_API_KEY': 'fixture-key', 'ANTHROPIC_API_KEY': 'fixture-key'}):
            self.assertEqual(sol_model.request(self.messages, self.schema), {'ok': True})
        self.assertFalse(self.inference_folder.exists())
        receipts = list((self.root/'work/_editor-ai/sol').glob('*.json'))
        self.assertEqual(len(receipts), 1)
        receipt = json.loads(receipts[0].read_text())
        self.assertEqual(receipt['model'], 'gpt-5.6-sol')
        self.assertEqual(receipt['usage']['output_tokens'], 3)
        self.assertNotIn('synthetic private marker', receipts[0].read_text())

    def test_api_login_is_rejected_without_inference(self):
        with patch.object(sol_model.shutil, 'which', return_value='/fixture/codex'), patch.object(sol_model.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='Logged in using an API key', stderr='')) as run:
            with self.assertRaisesRegex(ValueError, 'no se usará facturación API'):
                sol_model.request(self.messages, self.schema)
            self.assertEqual(run.call_count, 1)

    def test_cloud_is_rejected(self):
        with patch.dict(sol_model.os.environ, {'VERCEL': '1'}):
            with self.assertRaisesRegex(ValueError, 'equipo local'):
                sol_model.environment()

    def test_model_failure_never_retries_or_changes_provider(self):
        def run(args, **kwargs):
            if args[1:3] == ['login', 'status']:
                return SimpleNamespace(returncode=0, stdout='Logged in using ChatGPT', stderr='')
            return SimpleNamespace(returncode=1, stdout='{"type":"turn.failed","error":{"code":"model_not_found"}}', stderr='private provider detail')
        with patch.object(sol_model.shutil, 'which', return_value='/fixture/codex'), patch.object(sol_model.subprocess, 'run', side_effect=run) as calls:
            with self.assertRaisesRegex(ValueError, 'No se cambió de modelo'):
                sol_model.request(self.messages, self.schema)
        self.assertEqual(sum('exec' in call.args[0] for call in calls.call_args_list), 1)
        receipt = json.loads(next((self.root/'work/_editor-ai/sol').glob('*.json')).read_text())
        self.assertEqual(receipt['outcome'], 'failed')

    def test_incomplete_response_is_rejected(self):
        def run(args, **kwargs):
            result = self.runner(args, **kwargs)
            if 'exec' in args:
                result.stdout = '{"type":"turn.started"}'
            return result
        with patch.object(sol_model.shutil, 'which', return_value='/fixture/codex'), patch.object(sol_model.subprocess, 'run', side_effect=run):
            with self.assertRaisesRegex(ValueError, 'respuesta completa'):
                sol_model.request(self.messages, self.schema)

    def test_optional_schema_rejected_before_inference(self):
        with self.assertRaisesRegex(ValueError, 'obligatorios'):
            sol_model.strict_schema({**self.schema, 'required': []})


    def test_busy_queue_waits_without_launching_duplicate_inference(self):
        with patch.object(sol_model, 'assert_ready', return_value='/fixture/codex'), patch.object(sol_model.fcntl, 'flock', side_effect=[BlockingIOError(), None]), patch.object(sol_model.time, 'sleep') as sleep, patch.object(sol_model, '_request', return_value={'ok':True}) as call:
            self.assertEqual(sol_model.request(self.messages,self.schema),{'ok':True})
            sleep.assert_called_once();call.assert_called_once()

    def test_busy_queue_timeout_does_not_change_model_or_bill_elsewhere(self):
        with patch.object(sol_model, 'assert_ready', return_value='/fixture/codex'), patch.object(sol_model.fcntl, 'flock', side_effect=BlockingIOError()), patch.object(sol_model, '_request') as call:
            with self.assertRaisesRegex(ValueError,'cola de Sol'):
                sol_model.request(self.messages,self.schema,timeout=0)
            call.assert_not_called()


if __name__ == '__main__':
    unittest.main()
