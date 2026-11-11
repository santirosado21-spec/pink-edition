"""Synthetic local library tests; no real media, network, or provider calls."""
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from curated_media import curated_candidates
from one_shot_worker import find_stock


def entry(**changes):
    return {'file':'walking.mp4','source':'Original fixture recording / consent record 001','author':'Fixture author',
            'license':'Owned','tags':['people','walking'],'title':'People walking','description':'Ordinary walking in a park',
            'approved':True,'role':'support',**changes}


class CuratedMediaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.library = self.root/'work/media-library'
        self.library.mkdir(parents=True)
        self.file = self.library/'walking.mp4'
        self.file.write_bytes(b'synthetic video bytes A')
        self.folder = self.root/'session'
        self.folder.mkdir()
        self.index([entry()])
        self.event = {'query':'people walking','anchor':'las personas caminan','quote':'Las personas caminan por el parque.','ownOnly':True}

    def tearDown(self):
        self.tmp.cleanup()

    def index(self, entries, revision='fixture-v1'):
        (self.library/'index.json').write_text(json.dumps({'revision':revision,'entries':entries}))

    def test_approved_support_has_declared_provenance_and_content_fingerprint(self):
        result = curated_candidates(self.library,'people walking')
        self.assertEqual(len(result['candidates']),1)
        candidate = result['candidates'][0]
        self.assertEqual(candidate['source'],entry()['source'])
        self.assertEqual(candidate['sourceFileSha256'],hashlib.sha256(self.file.read_bytes()).hexdigest())
        self.assertEqual(candidate['catalogRevision'],'fixture-v1')
        self.assertEqual(candidate['role'],'support')

    def test_explicit_approval_role_license_and_provenance_are_required(self):
        self.index([entry(approved=False),entry(role='reference'),entry(role='a-roll'),entry(source=''),
                    entry(author=''),entry(license='Unknown copyright'),entry(tags=['clock'],title='Clock',description='Antique clock')])
        result = curated_candidates(self.library,'people walking')
        self.assertEqual(result['candidates'],[])
        self.assertEqual(len(result['rejections']),7)
        self.assertTrue(any('references are excluded' in row['reason'] for row in result['rejections']))

    def test_absolute_traversal_and_symlink_escape_are_rejected(self):
        outside = self.root/'outside.mp4'
        outside.write_bytes(b'outside')
        (self.library/'escape.mp4').symlink_to(outside)
        self.index([entry(file=str(outside)),entry(file='../../outside.mp4'),entry(file='escape.mp4')])
        result = curated_candidates(self.library,'people walking')
        self.assertFalse(result['candidates'])
        self.assertEqual(len(result['rejections']),3)

    def test_catalog_revision_and_content_changes_invalidate_fingerprint(self):
        first = curated_candidates(self.library,'people walking')['fingerprint']
        stat = self.file.stat()
        self.file.write_bytes(b'synthetic video bytes B')
        os.utime(self.file,ns=(stat.st_atime_ns,stat.st_mtime_ns))
        second = curated_candidates(self.library,'people walking')['fingerprint']
        self.assertNotEqual(first,second)
        self.index([entry()],revision='fixture-v2')
        self.assertNotEqual(second,curated_candidates(self.library,'people walking')['fingerprint'])

    def test_only_bounded_declared_relevant_files_are_shortlisted(self):
        self.index([entry(source=f'fixture:{i}') for i in range(140)])
        result = curated_candidates(self.library,'people walking')
        self.assertEqual(len(result['candidates']),12)
        self.assertTrue(any('128' in row['reason'] for row in result['rejections']))

    def test_own_only_empty_library_performs_no_network_or_model_request(self):
        self.index([])
        with patch('one_shot_worker.ROOT',self.root), patch('one_shot_worker.stock_candidates') as remote, patch('one_shot_worker.editorial_model') as model, patch('one_shot_worker.command') as command:
            self.assertIsNone(find_stock(self.folder,self.event,0,set()))
        remote.assert_not_called()
        model.assert_not_called()
        command.assert_not_called()
        self.assertIn('own-only forbids external stock network',json.loads((self.folder/'stock-cache-0.json').read_text())['reason'])

    def review(self, literal=True, duration=8, remote=False):
        commands = []
        def command(args,*_):
            commands.append(args)
            Path(args[-1]).write_bytes(b'Synthetic review frame')
        remote_candidate = {'url':'https://upload.wikimedia.org/walk.mp4','source':'https://commons.wikimedia.org/wiki/File:Walk.mp4','author':'Fixture','license':'CC0','title':'Walking remote','description':'People walking'}
        selected = 1 if remote else 0
        with patch('one_shot_worker.ROOT',self.root), patch('one_shot_worker.stock_candidates',return_value=[remote_candidate]) as network, patch('one_shot_worker.editorial_model',side_effect=[{'indices':[selected]},{'literalMatch':literal,'unsupportedContext':False,'reason':'Literal walking review'}]) as model, patch('one_shot_worker.command',side_effect=command), patch('one_shot_worker.subprocess.check_output',return_value=json.dumps({'format':{'duration':str(duration)}}).encode()):
            resource = find_stock(self.folder,{**self.event,'ownOnly':not remote},0,set())
        return resource, commands, network, model

    def test_local_clip_uses_same_duration_and_sol_visual_review_and_exports_provenance(self):
        resource, commands, network, model = self.review()
        network.assert_not_called()
        self.assertEqual(model.call_count,2)
        self.assertIn(str(self.file.resolve()),commands[0])
        self.assertIn('file,pipe',commands[0])
        self.assertEqual(resource['role'],'support')
        self.assertTrue(resource['approved'])
        self.assertEqual(resource['sourceFileSha256'],hashlib.sha256(self.file.read_bytes()).hexdigest())
        self.assertNotIn('localFile',resource)
        self.assertEqual(resource['catalogRevision'],'fixture-v1')
        self.assertEqual(resource['durationFrames'],240)

    def test_visual_rejection_and_short_duration_leave_zero_own_results(self):
        resource, _, network, _ = self.review(literal=False)
        self.assertIsNone(resource)
        network.assert_not_called()
        (self.folder/'stock-cache-0.json').unlink()
        resource, _, network, model = self.review(duration=3)
        self.assertIsNone(resource)
        self.assertEqual(model.call_count,1)
        network.assert_not_called()

    def test_remote_policy_can_mix_curated_first_and_whitelisted_remote_candidates(self):
        resource, _, network, model = self.review(remote=True)
        network.assert_called_once_with('people walking')
        candidates = json.loads(model.call_args_list[0].args[0][1]['content'])['candidates']
        self.assertEqual(candidates[0]['title'],'People walking')
        self.assertEqual(candidates[1]['title'],'Walking remote')
        self.assertEqual(resource['license'],'CC0')

    def test_stock_cache_includes_catalog_revision_and_content_fingerprint(self):
        with patch('one_shot_worker.ROOT',self.root), patch('one_shot_worker.stock_candidates') as network, patch('one_shot_worker.editorial_model',return_value={'indices':[]}) as model:
            self.assertIsNone(find_stock(self.folder,self.event,0,set()))
            self.assertIsNone(find_stock(self.folder,self.event,0,set()))
            self.assertEqual(model.call_count,1)
            self.index([entry()],revision='fixture-v2')
            self.assertIsNone(find_stock(self.folder,self.event,0,set()))
            self.assertEqual(model.call_count,2)
            self.file.write_bytes(b'modified synthetic video')
            self.assertIsNone(find_stock(self.folder,self.event,0,set()))
            self.assertEqual(model.call_count,3)
        network.assert_not_called()


if __name__ == '__main__':
    unittest.main()
