import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from brand_reference import analyze
from one_shot_worker import session_directions


class BrandReferenceTests(unittest.TestCase):
    def test_analysis_preserves_evidence_and_does_not_create_edit_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            asset = 'a' * 8 + '-aaaa-aaaa-aaaa-' + 'a' * 12
            report = {'route': 'reference', 'analysis': {'reason': 'Subtítulos observados'}, 'patterns': [
                {'name': 'Bloques cortos', 'evidenceSeconds': [0.5, 1.5], 'implementation': 'available'}]}
            with patch('brand_reference.measure', return_value={'picture': {'strongChangeSeconds': [1.5]}}), patch('brand_reference.inspect', return_value=report) as inspect:
                analyze(folder, asset)
            inspect.assert_called_once_with(folder / asset, sample_hints=[1.5])
            result = json.loads((folder / f'analysis-{asset}.json').read_text())
            self.assertEqual(result['state'], 'ready')
            self.assertEqual(result['patterns'][0]['evidenceSeconds'], [0.5, 1.5])
            self.assertFalse((folder / 'input.json').exists())
            self.assertEqual(result['evidence']['picture']['strongChangeSeconds'], [1.5])

    def test_failure_has_retriable_status_without_private_error_details(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            asset = 'a' * 8 + '-aaaa-aaaa-aaaa-' + 'a' * 12
            with patch('brand_reference.inspect', side_effect=RuntimeError('private text')):
                analyze(folder, asset)
            text = (folder / f'analysis-{asset}.json').read_text()
            self.assertEqual(json.loads(text)['state'], 'failed')
            self.assertNotIn('private text', text)

    def test_only_the_current_brands_approved_implemented_patterns_are_used(self):
        selected = {'adaptation': 'short-caption-pages', 'implementation': 'available', 'userApproval': 'liked', 'sourceSha256': 'own'}
        with patch('one_shot_worker.reference_directions') as global_references:
            self.assertEqual(session_directions({'referenceScope': 'brand-only'}), [])
            data = {'brand': {'patterns': [selected, {**selected, 'userApproval': 'pending'},
                    {**selected, 'adaptation': 'needs-new-renderer'}, {**selected, 'implementation': 'not-implemented'}]}}
            self.assertEqual(session_directions(data), [selected])
            global_references.assert_not_called()


if __name__ == '__main__':
    unittest.main()
