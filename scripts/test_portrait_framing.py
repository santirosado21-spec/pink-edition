import unittest
from portrait_framing import framing_for_faces,interpolate_framing
class FramingTests(unittest.TestCase):
 def test_tightens_without_trimming_face_or_creating_gaps(self):
  face={'left':.42,'right':.62,'top':.37,'bottom':.49}
  p=framing_for_faces([face])
  self.assertGreater(p['scale'],1)
  self.assertGreaterEqual(p['x'],1-p['scale']);self.assertGreaterEqual(p['y'],1-p['scale'])
  self.assertLessEqual(p['x'],0);self.assertLessEqual(p['y'],0)
  self.assertGreaterEqual(p['scale']*(face['top']-.07)+p['y'],.025)
  self.assertGreater(p['captionTop'],p['scale']*face['bottom']+p['y'])
  self.assertLess(p['captionTop'],.64)
 def test_missing_faces_do_not_claim_safe_space(self):
  p=framing_for_faces([]);self.assertFalse(p['measured']);self.assertIsNone(p['captionTop']);self.assertEqual(p['scale'],1)
 def test_interpolation_never_claims_measured_when_one_endpoint_missing(self):
  a={'frame':0,**framing_for_faces([{'left':.42,'right':.62,'top':.37,'bottom':.49}])}
  b={'frame':10,**framing_for_faces([])}
  p=interpolate_framing([a,b],5);self.assertIsNone(p['captionTop']);self.assertFalse(p['measured'])
 def test_neighbor_faces_all_protected(self):
  faces=[{'left':.42,'right':.62,'top':.30,'bottom':.42},{'left':.44,'right':.64,'top':.46,'bottom':.60}]
  p=framing_for_faces(faces)
  if p['measured']:
   for f in faces:self.assertGreaterEqual(p['scale']*(f['top']-.07)+p['y'],.025)
if __name__=='__main__':unittest.main()
