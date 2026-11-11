import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from native_layout import (
    CAPTION_MARGIN,
    EVIDENCE_METHOD,
    FACE_SLACK,
    OVERLAY_BOX,
    RESERVED_BOX,
    SAMPLE_STEP,
    editorial_layout,
    layout_sample_frames,
    longest_safe_run,
    overlay_top,
    prepare_native_layout,
    presenter_focus_y,
    reserve_editorial_layout,
    unmeasured_editorial_layout,
)
class LayoutTest(unittest.TestCase):
 def test_face_band_and_missing_evidence(self):
  scene={'width':1080,'height':1920}
  self.assertEqual(overlay_top([{'faces':[{'bottom':.45}]}],scene),.53)
  self.assertEqual(overlay_top([{'faces':[{'bottom':.52}]}],scene),.585)
  self.assertIsNone(overlay_top([{'faces':[{'bottom':.65}]}],scene))
  self.assertIsNone(overlay_top([{'faces':[]}],scene))
  self.assertIsNone(overlay_top([],scene))
 def test_centered_contain_geometry(self):
  self.assertEqual(overlay_top([{'faces':[{'bottom':.8}]}],{'width':1920,'height':1080}),.6599)
 def test_setup_movement_only_trims_overlay_window(self):
  frames=list(range(0,151,15));tops=[None,None]+[.65]*9
  self.assertEqual(longest_safe_run(frames,tops),(2,10))
  self.assertIsNone(longest_safe_run(frames,[None]*len(frames)))
  self.assertIsNone(longest_safe_run([0,15,30],[.65]*3))
  self.assertIsNone(longest_safe_run(frames,tops[:-1]))
class EditorialLayoutTest(unittest.TestCase):
 def test_sample_frames_step_and_end(self):
  self.assertEqual(layout_sample_frames(10,13),[10,16,22])
  self.assertEqual(layout_sample_frames(0,1),[0])
  self.assertEqual(layout_sample_frames(0,60),list(range(0,60,SAMPLE_STEP))+[59])
 def test_missing_or_mismatched_measurements_reserve(self):
  scene={'from':0,'frames':300,'width':720,'height':1280,'framing':[]}
  self.assertEqual(editorial_layout([],[],[])[0],'reserved')
  self.assertEqual(editorial_layout([{'faces':[{'top':.5,'bottom':.7}]}],[scene],[0,6])[0],'reserved')
  self.assertEqual(editorial_layout([{'error':'x','faces':[{'top':.5,'bottom':.7}]}],[scene],[0])[0],'reserved')
  self.assertEqual(editorial_layout([{'faces':[]}],[scene],[0])[0],'reserved')
  self.assertEqual(editorial_layout([{'faces':[{'top':float('nan'),'bottom':.7}]}],[scene],[0])[0],'reserved')
 def test_clear_band_overlays_and_close_face_reserves(self):
  scene={'from':0,'frames':300,'width':720,'height':1280,'framing':[]}
  presentation,box,_=editorial_layout([{'faces':[{'top':.5,'bottom':.7}]}],[scene],[0])
  self.assertEqual((presentation,box),('overlay',OVERLAY_BOX))
  self.assertEqual(editorial_layout([{'faces':[{'top':.35,'bottom':.55}]}],[scene],[0])[0],'reserved')
 def test_gentle_motion_counts_worse_endpoint(self):
  framing=[{'frame':0,'scale':1.0,'x':0,'y':0.0,'captionTop':None,'measured':True}]
  scene={'from':0,'frames':300,'width':720,'height':1280,'framing':framing}
  sample=[{'faces':[{'top':.437,'bottom':.6}]}]
  self.assertEqual(editorial_layout(sample,[scene],[0],gentle=False)[0],'overlay')
  self.assertEqual(editorial_layout(sample,[scene],[0],gentle=True)[0],'reserved')
 def test_presenter_focus_y(self):
  owner={'width':720,'height':1280,'from':0}
  self.assertEqual(presenter_focus_y([{'faces':[{'top':.3,'bottom':.5}]}],[owner],RESERVED_BOX),.678)
  self.assertEqual(presenter_focus_y([{'error':'x','faces':[{'top':.3,'bottom':.5}]}],[owner],RESERVED_BOX),0.0)
  self.assertEqual(presenter_focus_y([{'faces':[]}],[owner],RESERVED_BOX),0.0)
  self.assertEqual(presenter_focus_y([{'faces':[{'top':.3,'bottom':'x'}]}],[owner],RESERVED_BOX),0.0)
 def test_reserve_keeps_fullscreen_and_inset(self):
  edit={'beats':[{'id':'f','from':0,'frames':10,'presentation':'fullscreen'},
                 {'id':'i','from':0,'frames':10,'presentation':'inset'},
                 {'id':'o','from':0,'frames':10,'presentation':'overlay'}]}
  reserve_editorial_layout(edit,'prueba')
  beats={b['id']:b for b in edit['beats']}
  self.assertNotIn('layoutBox',beats['f'])
  self.assertEqual(beats['i']['presentation'],'inset')
  self.assertEqual(beats['o']['presentation'],'reserved')
  self.assertEqual(beats['o']['layoutBox'],RESERVED_BOX)
 def test_reserve_retains_warnings_without_existing_review(self):
  edit={'beats':[{'id':'o','from':0,'frames':10,'presentation':'overlay'}]}
  reserve_editorial_layout(edit,'sin medicion')
  warnings=edit['editorialReview']['warnings']
  self.assertEqual(len(warnings),1)
  self.assertEqual(warnings[0]['beatId'],'o')
 def test_unmeasured_layout_marks_scenes_and_review(self):
  edit={'beats':[{'id':'b1','from':0,'frames':90,'presentation':'overlay'}],
        'scenes':[{'from':0,'frames':90}]}
  unmeasured_editorial_layout(edit,'sin detector')
  self.assertEqual([k['frame'] for k in edit['scenes'][0]['framing']],[0,89])
  self.assertFalse(any(k['measured'] for k in edit['scenes'][0]['framing']))
  self.assertFalse(edit['layoutReview']['measuredFreeBand'])
  self.assertEqual(edit['beats'][0]['presentation'],'reserved')
 def test_evidence_method_tracks_constants(self):
  self.assertIn('every %d frames' % SAMPLE_STEP,EVIDENCE_METHOD)
  self.assertIn('%.1f%% margin' % ((CAPTION_MARGIN+FACE_SLACK)*100),EVIDENCE_METHOD)
 def test_prepare_landscape_reserves_without_measurement(self):
  edit={'width':1920,'height':1080,'editorialVersion':1,
        'beats':[{'id':'b1','from':0,'frames':10,'presentation':'overlay'}],
        'scenes':[{'from':0,'frames':10}]}
  with tempfile.TemporaryDirectory() as folder, patch('native_layout.subprocess.run') as run:
   prepare_native_layout(Path(folder),edit)
   run.assert_not_called()
  self.assertEqual(edit['beats'][0]['presentation'],'reserved')
  self.assertFalse(edit['layoutReview']['measuredFreeBand'])
 def test_prepare_portrait_detector_failure_fails_closed(self):
  edit={'width':720,'height':1280,'editorialVersion':1,
        'beats':[{'id':'b1','from':0,'frames':10,'presentation':'overlay'}],
        'scenes':[{'from':0,'frames':10,'asset':'a.mp4'}]}
  with tempfile.TemporaryDirectory() as folder, patch('native_layout.subprocess.run',side_effect=OSError('no swiftc')):
   prepare_native_layout(Path(folder),edit)
   evidence=json.loads((Path(folder)/'analysis/native-layout/evidence.json').read_text())
  self.assertEqual(edit['beats'][0]['presentation'],'reserved')
  self.assertFalse(edit['layoutReview']['measuredFreeBand'])
  self.assertEqual(len(edit['editorialReview']['warnings']),1)
  self.assertIn('Face measurement unavailable',evidence['reason'])
if __name__=='__main__':unittest.main()
