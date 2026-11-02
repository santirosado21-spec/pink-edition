import copy
import unittest
from editorial_controls import director_input, event_limits, constrain_events

class ControlsTest(unittest.TestCase):
    def setUp(self):
        self.brief={'resourcePolicy':'relevant-only','objective':'Explicar','audience':'Adultos','preferences':{'vibe':'balanced','graphics':'few','graphic_kinds':['steps'],'support_media':'still','emphasis_mode':'none','topic':'Hábitos','brand_name':'Marca','notes':'No inventar'},'resourceNotes':'Evitar tráfico'}
    def test_exclusions_before_search(self):
        events=[{'kind':k} for k in ['compare','steps','steps','broll','broll','broll','card','unknown']]
        self.assertEqual(constrain_events(events,self.brief),[{'kind':'steps'},{'kind':'broll'},{'kind':'broll'}])
    def test_legacy(self):
        del self.brief['resourcePolicy']
        self.assertEqual(event_limits(self.brief),({'card':2,'compare':1,'steps':1,'broll':4},180))
    def test_context_preserves_constraints_and_evidence(self):
        sentences=[{'id':0,'start':0,'end':90,'text':'Una frase literal.'}]
        context=director_input(self.brief,[{'adaptation':'implemented'}],sentences)
        self.assertEqual(context['sentences'],sentences)
        self.assertEqual(context['intent']['resourceNotes'],'Evitar tráfico')
        self.assertEqual(context['intent']['notes'],'No inventar')
        self.assertEqual(context['supportMedia'],'still')
        other=copy.deepcopy(self.brief)
        other['preferences'].update(font='anton',brand_color='#ff0000',sfx='none',vocabulary='Palabra')
        other['musicMood']='energetic'
        self.assertEqual(context,director_input(other,[{'adaptation':'implemented'}],sentences))

if __name__=='__main__':unittest.main()
