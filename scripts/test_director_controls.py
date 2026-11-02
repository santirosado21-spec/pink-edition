"""Exercise the production director block without media processing or provider calls."""
import ast
import json
import pathlib
import re
import tempfile
import unittest
from editorial_controls import director_input, event_limits, constrain_events

# Execute the real block in main, including cache and schema construction.
source = pathlib.Path(__file__).with_name('one_shot_worker.py').read_text()
main = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'main')
def assigns(node, name):
    return isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets)
start = next(i for i,n in enumerate(main.body) if assigns(n,'compare_ids'))
end = next(i for i,n in enumerate(main.body) if assigns(n,'beats'))
block = compile(ast.Module(body=main.body[start:end],type_ignores=[]),'production-director','exec')

class DirectorTest(unittest.TestCase):
    def run_director(self, folder, patch=None, cached_policy='relevant-only'):
        prefs={'vibe':'balanced','graphics':'few','graphic_kinds':['compare','steps'],'support_media':'video','emphasis_mode':'overlay',**(patch or {})}
        brief={'preferences':prefs,'resourcePolicy':cached_policy,'objective':'Explicar','audience':'General'}
        calls=[]
        def model(messages,schema):
            calls.append((messages,schema))
            return {'cards':[], 'compare':[],'steps':[],'broll':[]}
        context=dict(brief=brief,prefs=prefs,relevant=cached_policy=='relevant-only',sentences=[dict(id=0,start=0,end=300,text='Una frase de prueba.')],directions=[],folder=pathlib.Path(folder),MODEL='test-sol',REVISION='test',STOCK_QUERY_PATTERN='^park$',STOCK_TERMS=['park'],json=json,re=re,editorial_model=model,director_input=director_input,event_limits=event_limits,constrain_events=constrain_events,atomic=lambda p,v:p.write_text(json.dumps(v)))
        exec(block,context)
        return calls,context['proposals']
    def test_clean_skips_provider_and_outputs_no_events(self):
        with tempfile.TemporaryDirectory() as folder:
            calls,result=self.run_director(folder,{'graphics':'none','support_media':'none','emphasis_mode':'none'})
            self.assertEqual(calls,[])
            self.assertEqual(result,{'events':[]})
            self.assertTrue(json.loads((pathlib.Path(folder)/'director.json').read_text())['requestSkipped'])
    def test_actual_schema_and_cache_ignore_renderer_only_settings(self):
        with tempfile.TemporaryDirectory() as folder:
            calls,_=self.run_director(folder)
            self.assertEqual(len(calls),1)
            self.assertEqual(calls[0][1]['properties']['broll']['maxItems'],2)
            self.assertEqual(calls[0][1]['properties']['cards']['minItems'],0)
            self.assertNotIn('preferences',json.loads(calls[0][0][1]['content']))
            calls,_=self.run_director(folder,{'font':'anton','brand_color':'#f36b52'})
            self.assertEqual(calls,[])
            calls,_=self.run_director(folder,{'vibe':'dynamic'})
            self.assertEqual(len(calls),1)
            self.assertEqual(calls[0][1]['properties']['broll']['maxItems'],4)
    def test_disabled_types_have_zero_schema_budget(self):
        with tempfile.TemporaryDirectory() as folder:
            calls,_=self.run_director(folder,{'graphics':'none','emphasis_mode':'none'})
            schema=calls[0][1]['properties']
            for key in ['cards','compare','steps']:
                self.assertEqual(schema[key]['maxItems'],0)

if __name__=='__main__':unittest.main()
