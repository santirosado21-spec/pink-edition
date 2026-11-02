import unittest
from editorial_recipes import decorate, CATALOG
class EditorialTests(unittest.TestCase):
    def test_all_families_grounded_and_varied(self):
        for family in CATALOG['families']:
            beats=[dict(kind='card',id=str(i),**{'from':i*90},frames=90,reason='Frase literal') for i in range(2)]
            captions=[dict(startMs=0,endMs=3000),dict(startMs=3000,endMs=6000)]
            transitions=decorate(beats,[dict(frames=90,**{'from':0}),dict(frames=90,**{'from':90})],captions,{'editorialFamilyId':family['id']})
            self.assertNotEqual(beats[0]['variantId'],beats[1]['variantId'])
            self.assertEqual(beats[1]['sourceWordIds'],[1]);self.assertEqual(transitions[0]['from_'],90)
    def test_cards_do_not_count_as_transitions(self):
        self.assertEqual(decorate([],[],[],{}),[])
    def test_unknown_family_rejected(self):
        with self.assertRaises(ValueError): decorate([],[],[],{'editorialFamilyId':'made-up'})
    def test_no_ungrounded_resource(self):
        with self.assertRaises(ValueError): decorate([dict(kind='card',frames=90,**{'from':0})],[],[],{})
if __name__=='__main__':unittest.main()
