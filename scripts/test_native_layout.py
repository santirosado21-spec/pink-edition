import unittest
from native_layout import overlay_top, longest_safe_run
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
if __name__=='__main__':unittest.main()
