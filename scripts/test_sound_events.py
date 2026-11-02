import tempfile,unittest
from pathlib import Path
from one_shot_worker import prepare_sound_events
class SoundTests(unittest.TestCase):
 def run_case(self,level):
  edit={'preferences':{'sfx':level,'sound_pack':'soft'},'beats':[{'kind':'card','from':30,'reason':'Entrada ligada a una frase'}],'frames':90,'assets':[]}
  with tempfile.TemporaryDirectory() as tmp:
   folder=Path(tmp);prepare_sound_events(folder,edit)
   if level=='none':self.assertEqual(edit['soundEvents'],[]);self.assertEqual(list(folder.iterdir()),[])
   else:
    event=edit['soundEvents'][0];self.assertEqual(event['from'],30);self.assertGreater(event['frames'],0);self.assertLessEqual(event['frames'],60)
    self.assertEqual(event['volume'],.04 if level=='soft' else .12)
    self.assertEqual((folder/event['asset']).read_bytes()[:4],b'RIFF');self.assertEqual(edit['assets'][0]['license'],'CC0')
 def test_none(self):self.run_case('none')
 def test_soft(self):self.run_case('soft')
 def test_full(self):self.run_case('full')
if __name__=='__main__':unittest.main()
