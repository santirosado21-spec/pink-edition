import unittest
from speech_cuts import kept_intervals,map_time

class SpeechCuts(unittest.TestCase):
    def test_internal_gap_and_timestamps(self):
        cuts=kept_intervals([(1,2),(4,5)],6)
        self.assertEqual(len(cuts),2)
        self.assertAlmostEqual(map_time(4.5,cuts),cuts[0]['end']-cuts[0]['start']+4.5-cuts[1]['start'])
        self.assertLess(sum(c['end']-c['start'] for c in cuts),3)
    def test_short_pause_preserved(self):
        self.assertEqual(len(kept_intervals([(1,2),(2.4,3)],4)),1)
    def test_word_bridges_vad_gap(self):
        cuts=kept_intervals([(1,2),(4,5),(1.8,4.2)],6)
        self.assertEqual(len(cuts),1)
        self.assertLessEqual(cuts[0]['start'],1)
        self.assertGreaterEqual(cuts[0]['end'],5)
    def test_uncertain_no_speech_keeps_source(self):
        self.assertEqual(kept_intervals([],6),[{'start':0.,'end':6.,'timelineStart':0.}])
    def test_no_mapping_across_removed_gap(self):
        with self.assertRaises(ValueError):map_time(3,kept_intervals([(1,2),(4,5)],6))
    def test_frame_aligned(self):
        for c in kept_intervals([(.333,1.111),(3.123,4.789)],5):
            for key in ['start','end','timelineStart']:self.assertAlmostEqual(c[key]*30,round(c[key]*30))

if __name__=='__main__':unittest.main()
