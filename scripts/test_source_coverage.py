import json,tempfile,pathlib,unittest,copy
from verify_source_coverage import verify
class Coverage(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.folder=pathlib.Path(self.temp.name);(self.folder/'analysis').mkdir()
  self.inputs={'sources':[{'id':str(i),'name':f'{i}.MOV'} for i in [1,2,3]]}
  self.edit={'fps':30,'frames':90,'scenes':[],'captions':[]}
  for i in range(3):
   (self.folder/'analysis'/f'{i+1}.json').write_text(json.dumps({'segments':[{'words':[{'word':f'toma{i+1}','start':.1,'end':.8}]}]}))
   self.edit['scenes'].append({'id':str(i+1),'from':i*30,'frames':30,'sourceSegments':[{'start':0,'end':1,'timelineStart':0}]})
   self.edit['captions'].append({'text':f'toma{i+1}','startMs':i*1000+100,'endMs':i*1000+800})
 def tearDown(self):self.temp.cleanup()
 def test_complete(self):self.assertEqual(len(verify(self.folder,self.inputs,self.edit,False)),3)
 def test_second_missing(self):
  self.edit['scenes'].pop(1)
  with self.assertRaisesRegex(ValueError,'Falta una toma'):verify(self.folder,self.inputs,self.edit,False)
 def test_second_duplicate(self):
  self.edit['scenes'][1]=copy.deepcopy(self.edit['scenes'][0])
  with self.assertRaises(ValueError):verify(self.folder,self.inputs,self.edit,False)
 def test_second_voice_cut(self):
  self.edit['scenes'][1]['sourceSegments'][0]['start']=.5
  with self.assertRaisesRegex(ValueError,'voz'):verify(self.folder,self.inputs,self.edit,False)
 def test_second_word_replaced(self):
  self.edit['captions'][1]['text']='otra'
  with self.assertRaisesRegex(ValueError,'Palabras'):verify(self.folder,self.inputs,self.edit,False)
 def test_second_word_shifted(self):
  self.edit['captions'][1]['startMs']=9999
  with self.assertRaisesRegex(ValueError,'tiempo'):verify(self.folder,self.inputs,self.edit,False)
if __name__=='__main__':unittest.main()
