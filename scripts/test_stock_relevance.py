"""Exercise literal-vs-metaphor decisions and fallback after a failed candidate."""
import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import subprocess
from one_shot_worker import find_stock, stock_context_conflict
class StockRelevanceTest(unittest.TestCase):
 def run_case(self,verdict,fail_first=False,weather_first=False):
  candidates=[{'url':'https://upload.wikimedia.org/a.mp4','source':'https://commons.wikimedia.org/a','title':'People walking','description':'Walking in a street','author':'Fixture','license':'CC0'}]
  if fail_first or weather_first:candidates.append({**candidates[0],'url':'https://upload.wikimedia.org/b.mp4','source':'https://commons.wikimedia.org/b'})
  if weather_first:candidates[0]={**candidates[0],'title':'People walking during a snowstorm','description':'Snowstorm in Quebec'}
  def command(args,*_):
   if fail_first and 'https://upload.wikimedia.org/a.mp4' in args:raise subprocess.CalledProcessError(1,args)
   Path(args[-1]).write_bytes(b'\xff\xd8\xffSynthetic local fixture')
  with tempfile.TemporaryDirectory() as tmp:
   folder=Path(tmp);used=set()
   with patch('one_shot_worker.stock_candidates',return_value=candidates),patch('one_shot_worker.editorial_model',side_effect=[{'indices':list(range(len(candidates)))},verdict]),patch('one_shot_worker.command',side_effect=command),patch('one_shot_worker.subprocess.check_output',return_value=json.dumps({'format':{'duration':'8'}}).encode()):
    result=find_stock(folder,{'query':'people walking','anchor':'la gente camina','quote':'La gente camina un 15% más rápido.'},0,used)
   return result,used
 def test_literal_illustration_does_not_have_to_prove_the_statistic(self):
  result,used=self.run_case({'literalMatch':True,'unsupportedContext':False,'reason':'Walking illustrates the action; it does not prove the 15%.'})
  self.assertIsNotNone(result);self.assertEqual(len(used),1)
 def test_clock_metaphor_and_unrelated_context_are_rejected(self):
  for verdict in [{'literalMatch':False,'unsupportedContext':False,'reason':'Clock metaphor, no walking'},{'literalMatch':True,'unsupportedContext':True,'reason':'Unrelated dominant advertisement'}]:
   result,used=self.run_case(verdict);self.assertIsNone(result);self.assertFalse(used)
 def test_extreme_weather_is_not_generic_walking(self):
  candidate={'title':'People walking during a snowstorm in Quebec City','description':'People walking outdoors'}
  self.assertTrue(stock_context_conflict(candidate,{'anchor':'la gente camina','quote':'La gente camina un 15% más rápido.'}))
  self.assertFalse(stock_context_conflict(candidate,{'anchor':'caminar durante una nevada','quote':'La tormenta de nieve complica caminar.'}))
  self.assertFalse(stock_context_conflict({'title':'People walking in Quebec City'}, {'quote':'La gente camina.'}))
 def test_unrelated_storm_is_skipped_for_the_ordinary_candidate(self):
  result,used=self.run_case({'literalMatch':True,'unsupportedContext':False,'reason':'Ordinary pedestrian street'},weather_first=True)
  self.assertEqual(result['source'],'https://commons.wikimedia.org/b');self.assertEqual(len(used),1)
 def test_failed_download_does_not_discard_the_second_candidate(self):
  result,used=self.run_case({'literalMatch':True,'unsupportedContext':False,'reason':'People walking'},True)
  self.assertEqual(result['source'],'https://commons.wikimedia.org/b');self.assertEqual(len(used),1)
if __name__=='__main__':unittest.main()
