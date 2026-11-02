import unittest
import tempfile
from pathlib import Path
from visual_preferences import allowed_event, use_still, materialize_stills

class VisualPreferencesTest(unittest.TestCase):
    def test_resource_exclusion(self):
        prefs={'graphics':'none','support_media':'none','emphasis_mode':'none'}
        self.assertFalse(any(allowed_event(kind,prefs) for kind in ['card','compare','steps','broll']))
        self.assertTrue(allowed_event('steps',{'graphics':'few','graphic_kinds':['steps']}))
        self.assertFalse(allowed_event('compare',{'graphics':'few','graphic_kinds':['steps']}))
        self.assertTrue(allowed_event('card',{'graphics':'none','emphasis_mode':'fullscreen'}))
    def test_explicit_video_overrides_family_still(self):
        self.assertFalse(use_still({'support_media':'video','editorialFamilyId':'estampa'},{'variantId':'framed'}))
        self.assertTrue(use_still({'support_media':'still','editorialFamilyId':'enlace'},{}))
        self.assertTrue(use_still({'editorialFamilyId':'estampa'},{'variantId':'framed'}))
    def test_fixed_image_preserves_source_and_provenance(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp); calls=[]
            edit={'preferences':{'support_media':'still'},'beats':[{'kind':'broll','asset':'stock.mp4'}],'assets':[{'file':'stock.mp4','source':'source-url','author':'Creator','license':'CC0'}]}
            materialize_stills(folder,edit,lambda args,timeout:calls.append((args,timeout)))
            self.assertEqual(edit['beats'][0]['mediaType'],'image')
            self.assertEqual(edit['assets'][1]['derivedFrom'],'stock.mp4')
            self.assertEqual(edit['assets'][1]['source'],'source-url')
            self.assertEqual(calls[0][0][-1],folder/'stock-plate.jpg')
            materialize_stills(folder,edit,lambda *args:self.fail('Must not convert twice'))

if __name__=='__main__': unittest.main()
