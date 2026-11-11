"""Offline tests of literal timing, exclusions, measurement fallback and bounded media lookup."""
import copy
import json
import tempfile
import unittest
import subprocess
from pathlib import Path
from unittest.mock import patch

from editorial_controls import constrain_events, director_input, event_limits, caption_reference_adaptations
from editorial_timing import grounded_beat, graphic_reading_floor, reading_frames, editorial_boundary, event_anchor_frame, event_overlaps, limit_media_duration
from native_layout import editorial_layout, prepare_native_layout, layout_sample_frames, presenter_focus_y, RESERVED_BOX, OVERLAY_BOX, FACE_SLACK, SAMPLE_STEP
from one_shot_worker import find_stock, stock_candidates, stock_queries
from portrait_framing import scene_framing
from sol_model import strict_schema
import test_director_controls as director_tests


def controls(**changes):
    return {'version':1,'presence':'balanced','readingPace':'balanced','emphasisStyle':'overlay',
            'resourceStyle':'mixed','framingStyle':'stable','referenceAspects':[],
            'captionIntent':'both',**changes}


def preferences(**editorial):
    return {'editorial':controls(**editorial),'vibe':'balanced','graphics':'few',
            'graphic_kinds':['steps','compare'],'support_media':'video','emphasis_mode':'overlay'}


class EditorialTimingTests(unittest.TestCase):
    def setUp(self):
        text = 'Ahora las personas leen en casa durante las pausas de la conversación'
        self.sentence = {'text':text,'start':0,'end':400}
        self.words = [{'text':word,'start':index*20,'end':index*20+12} for index,word in enumerate(text.split())]
        self.event = {'kind':'card','labels':['las personas leen en casa'],'reason':'Idea literal','anchor':''}

    def test_selected_headline_is_preserved_and_anchored_to_exact_source_word(self):
        before = copy.deepcopy(self.words)
        beat, warnings, rejected = grounded_beat(self.event,self.sentence,self.words,400,preferences())
        self.assertIsNone(rejected)
        self.assertEqual(beat['headline'],'las personas leen en casa')
        self.assertEqual(beat['labels'],['las personas leen en casa'])
        self.assertEqual(beat['from'],20)
        self.assertNotEqual(beat['headline'],self.sentence['text'])
        self.assertEqual(self.words,before)
        self.assertEqual(beat['textPages'],[{'text':beat['headline'],'from':0,'frames':beat['frames']}])

    def test_reading_duration_varies_by_content_and_pace(self):
        short = reading_frames('las personas', 'balanced')
        long = reading_frames(self.sentence['text'], 'balanced')
        self.assertGreater(long,short)
        self.assertGreater(reading_frames(self.sentence['text'],'calm'),long)
        self.assertLess(reading_frames(self.sentence['text'],'brisk'),long)
        self.assertNotEqual(short,150)

    def test_conflict_stops_at_boundary_and_logs_required_reading_without_moving_voice(self):
        before = copy.deepcopy(self.words)
        beat, warnings, rejected = grounded_beat(self.event,self.sentence,self.words,55,preferences(readingPace='calm'))
        self.assertIsNone(rejected)
        self.assertEqual(beat['from']+beat['frames'],55)
        self.assertGreater(warnings[0]['requiredFrames'],beat['frames'])
        self.assertEqual(self.words,before)
        self.assertEqual(beat['textPages'][0]['frames'],beat['frames'])

    def test_no_display_space_rejects_without_shifting_anchor(self):
        beat, _, rejected = grounded_beat(self.event,self.sentence,self.words,25,preferences())
        self.assertIsNone(beat)
        self.assertIn('boundary',rejected)

    def test_icon_meaning_must_be_in_selected_exact_excerpt(self):
        event = {**self.event,'kind':'icon','icon':'people'}
        beat, _, rejected = grounded_beat(event,self.sentence,self.words,400,preferences())
        self.assertIsNone(rejected)
        self.assertEqual(beat['icon'],'people')
        _, _, rejected = grounded_beat({**event,'labels':['durante las pausas']},self.sentence,self.words,400,preferences())
        self.assertIn('meaning absent',rejected)
        _, _, rejected = grounded_beat({**event,'labels':['todas las personas']},self.sentence,self.words,400,preferences())
        self.assertIn('literal excerpt',rejected)

    def test_presence_changes_media_composition_and_composed_reserves_text(self):
        event = {**self.event,'kind':'broll','labels':[],'anchor':'las personas'}
        beat, _, _ = grounded_beat(event,self.sentence,self.words,400,preferences(presence='presenter'))
        self.assertEqual(beat['presentation'],'inset')
        beat, _, _ = grounded_beat(event,self.sentence,self.words,400,preferences(presence='visual'))
        self.assertEqual(beat['presentation'],'fullscreen')
        beat, _, _ = grounded_beat(self.event,self.sentence,self.words,400,preferences(emphasisStyle='composed'))
        self.assertEqual(beat['presentation'],'reserved')

    def test_question_icon_preserves_literal_question_punctuation(self):
        sentence = {'text':'¿Qué pasó en casa?','start':0,'end':180}
        words = [{'text':word,'start':index*20,'end':index*20+12} for index,word in enumerate(sentence['text'].split())]
        beat, _, rejected = grounded_beat({'kind':'icon','icon':'question','labels':['¿Qué pasó en casa?']},sentence,words,180,preferences())
        self.assertIsNone(rejected)
        self.assertEqual(beat['headline'],'¿Qué pasó en casa?')

    def test_composed_comparison_crosses_source_join_without_cutting_reading_or_voice(self):
        sentence = {'text':'Sus familias, en vez de apoyarlos, los limitan.','start':630,'end':780}
        words = [{'text':text,'start':630+index*18,'end':642+index*18} for index,text in enumerate(sentence['text'].split())]
        scenes = [{'from':0,'frames':713},{'from':713,'frames':300}]
        event = {'kind':'compare','labels':['apoyarlos','los limitan']}
        prefs = preferences(readingPace='calm',emphasisStyle='composed')
        before = copy.deepcopy((words,scenes))
        boundary = editorial_boundary(event,sentence,scenes,950,1013,prefs)
        beat, warnings, rejected = grounded_beat(event,sentence,words,boundary,prefs)
        self.assertIsNone(rejected)
        self.assertGreater(beat['from']+beat['frames'],713)
        self.assertGreaterEqual(beat['from']+beat['frames'],words[-1]['end'])
        self.assertFalse(warnings)
        self.assertEqual((words,scenes),before)
        self.assertLessEqual(boundary,950)
        self.assertEqual(editorial_boundary(event,sentence,scenes,790,1013,prefs),790)
        self.assertEqual(editorial_boundary(event,sentence,scenes,1013,1013,preferences(emphasisStyle='overlay')),713)

    def test_overlay_uses_exact_headline_scene_when_sentence_crosses_source_join(self):
        sentence = {'text':'Primera toma. Las personas leen en casa.','start':600,'end':810}
        words = [{'text':text,'start':600+index*30,'end':620+index*30} for index,text in enumerate(sentence['text'].split())]
        scenes = [{'from':0,'frames':650},{'from':650,'frames':300}]
        event = {'kind':'card','labels':['Las personas']}
        anchor = event_anchor_frame(event,sentence,words)
        self.assertEqual(anchor,660)
        boundary = editorial_boundary(event,sentence,scenes,950,950,preferences(),anchor_frame=anchor)
        self.assertEqual(boundary,950)
        beat, _, rejected = grounded_beat(event,sentence,words,boundary,preferences())
        self.assertIsNone(rejected)
        self.assertEqual(beat['from'],660)

    def test_v1_adjacent_half_open_events_are_accepted_and_legacy_guard_is_retained(self):
        accepted = [{'from':0,'frames':240}]
        self.assertFalse(event_overlaps(240,60,accepted,guard=0))
        self.assertTrue(event_overlaps(239,60,accepted,guard=0))
        self.assertTrue(event_overlaps(240,60,accepted,guard=15))

    def test_long_broll_anchor_cannot_outlive_reviewed_clip(self):
        text = ' '.join('palabra'+str(index) for index in range(25))
        sentence = {'text':text,'start':0,'end':300}
        words = [{'text':word,'start':index*10,'end':index*10+9} for index,word in enumerate(text.split())]
        before = copy.deepcopy(words)
        beat, _, rejected = grounded_beat({'kind':'broll','anchor':text,'labels':[]},sentence,words,390,preferences())
        self.assertIsNone(rejected)
        self.assertGreater(beat['frames'],240)
        beat['id'] = 'long-broll'
        warnings = limit_media_duration(beat,{'durationFrames':240})
        self.assertEqual(beat['frames'],240)
        self.assertGreater(warnings[0]['requiredFrames'],240)
        self.assertIn('Reviewed media duration overrides',warnings[0]['reason'])
        self.assertEqual(words,before)


class GraphicCompositionTests(unittest.TestCase):
    def setUp(self):
        text = 'Ahora las personas leen en casa durante las pausas de la conversación'
        self.sentence = {'text':text,'start':0,'end':400}
        self.words = [{'text':word,'start':index*20,'end':index*20+12} for index,word in enumerate(text.split())]

    def beat(self, kind, labels, boundary=400, **editorial):
        beat, _, rejected = grounded_beat({'kind':kind,'labels':labels,'reason':'Literal','anchor':''},
                                          self.sentence,self.words,boundary,preferences(**editorial))
        self.assertIsNone(rejected)
        return beat

    def test_fullscreen_preference_keeps_the_presenter_for_structured_graphics_only(self):
        self.assertEqual(self.beat('compare',['las personas','la conversación'],emphasisStyle='fullscreen')['presentation'],'overlay')
        self.assertEqual(self.beat('steps',['las personas','leen en casa','las pausas'],emphasisStyle='fullscreen')['presentation'],'overlay')
        self.assertEqual(self.beat('card',['las personas leen en casa'],emphasisStyle='fullscreen')['presentation'],'fullscreen')
        self.assertEqual(self.beat('compare',['las personas','la conversación'],emphasisStyle='composed')['presentation'],'reserved')

    def test_structured_graphic_has_a_reading_floor_even_at_brisk_pace(self):
        self.assertEqual(graphic_reading_floor('uno dos',30),66)
        self.assertEqual(graphic_reading_floor(' '.join(['palabra']*12),30),150)
        self.assertGreaterEqual(self.beat('compare',['las personas','la conversación'],readingPace='brisk')['frames'],66)
        steps = self.beat('steps',['las personas','leen en casa','las pausas'],readingPace='brisk')
        self.assertGreaterEqual(steps['frames'],graphic_reading_floor('las personas leen en casa las pausas',30))

    def test_floor_boundary_is_exact_in_frames(self):
        labels = ['las personas','la conversación']
        floor = graphic_reading_floor('las personas la conversación',30)
        start = 20  # first label starts at the word 'las'
        _, _, rejected = grounded_beat({'kind':'compare','labels':labels,'reason':'Literal','anchor':''},self.sentence,self.words,start+floor-1,preferences())
        self.assertIn('minimum reading time',rejected)
        beat, _, rejected = grounded_beat({'kind':'compare','labels':labels,'reason':'Literal','anchor':''},self.sentence,self.words,start+floor,preferences())
        self.assertIsNone(rejected)
        self.assertEqual(beat['frames'],floor)

    def test_structured_graphic_below_its_floor_is_rejected_not_truncated(self):
        beat, warnings, rejected = grounded_beat({'kind':'compare','labels':['las personas','la conversación'],'reason':'Literal','anchor':''},
                                                 self.sentence,self.words,55,preferences())
        self.assertIsNone(beat)
        self.assertEqual(warnings,[])
        self.assertIn('minimum reading time',rejected)
        # A text headline keeps the existing behaviour: stop at the boundary and warn.
        card, card_warnings, card_rejected = grounded_beat({'kind':'card','labels':['las personas leen en casa'],'reason':'Literal','anchor':''},
                                                           self.sentence,self.words,55,preferences(readingPace='calm'))
        self.assertIsNone(card_rejected)
        self.assertEqual(card['from']+card['frames'],55)
        self.assertTrue(card_warnings)


class EditorialLayoutTests(unittest.TestCase):
    def setUp(self):
        self.face = {'left':.42,'right':.62,'top':.6,'bottom':.72}
        self.scene = {'from':0,'frames':120,'width':720,'height':1280,
                      'framing':[{'frame':0,'scale':1,'x':0,'y':0,'captionTop':.70,'measured':True}]}

    def test_missing_measurement_reserves_and_does_not_claim_clear_band(self):
        result = editorial_layout([{'faces':[]}],[self.scene],[0])
        self.assertEqual(result[0],'reserved')
        self.assertEqual(result[1],RESERVED_BOX)
        self.assertIn('without claiming',result[2])

    def test_only_fully_measured_upper_band_is_overlay(self):
        result = editorial_layout([{'faces':[self.face]}],[self.scene],[0])
        self.assertEqual(result[0],'overlay')
        self.assertLessEqual(result[1]['y']+result[1]['height'],self.face['top']-.07-.065)
        result = editorial_layout([{'faces':[self.face]}, {'faces':[]}],[self.scene,self.scene],[0,60])
        self.assertEqual(result[0],'reserved')

    def box(self, top):
        return {'left':.42,'right':.62,'top':top,'bottom':min(1,top+.15)}

    def test_geometry_follows_full_bleed_presenter_not_the_legacy_76_percent_slot(self):
        # Legacy 76% slot would put this face at (.5-.07)*.76 = .33 and reserve; full-bleed keeps .43.
        result = editorial_layout([{'faces':[self.box(.5)]}],[self.scene],[0])
        self.assertEqual(result[0],'overlay')
        self.assertLessEqual(result[1]['y']+result[1]['height'],.5-.07-.065-FACE_SLACK+1e-9)

    def test_fixed_slack_turns_a_thin_margin_into_reserved(self):
        threshold = .27 + .065 + FACE_SLACK
        self.assertEqual(editorial_layout([{'faces':[self.box(.07+threshold+.002)]}],[self.scene],[0])[0],'overlay')
        self.assertEqual(editorial_layout([{'faces':[self.box(.07+threshold-.002)]}],[self.scene],[0])[0],'reserved')
        # Measured case from a real neutral wide shot: 0.413 left only 0.008 of clearance.
        self.assertEqual(editorial_layout([{'faces':[self.box(.413)]}],[self.scene],[0])[0],'reserved')

    def test_measured_zoom_pose_can_push_the_face_into_the_band(self):
        zoomed = {**self.scene,'framing':[{'frame':0,'scale':1.2,'x':0,'y':-.2,'captionTop':.7,'measured':True}]}
        self.assertEqual(editorial_layout([{'faces':[self.box(.5)]}],[zoomed],[0])[0],'reserved')

    def test_animated_pose_is_checked_at_every_sample_not_only_at_the_start(self):
        moving = {**self.scene,'framing':[{'frame':0,'scale':1,'x':0,'y':0,'captionTop':.7,'measured':True},
                                          {'frame':60,'scale':1.3,'x':0,'y':-.2,'captionTop':.7,'measured':True}]}
        frames = layout_sample_frames(0,61)
        self.assertEqual(editorial_layout([{'faces':[self.box(.5)]}]*len(frames),[moving]*len(frames),frames)[0],'reserved')
        self.assertEqual(editorial_layout([{'faces':[self.box(.5)]}],[moving],[0])[0],'overlay')

    def test_gentle_motion_scales_from_the_renderer_origin(self):
        # Measured pose: the renderer scales from the top-left, so .98 pulls the face upward.
        scene = {**self.scene,'framing':[{'frame':0,'scale':1.2,'x':0,'y':.01,'captionTop':.7,'measured':True}]}
        face = self.box(.37)
        self.assertEqual(editorial_layout([{'faces':[face]}],[scene],[0],gentle=False)[0],'overlay')
        self.assertEqual(editorial_layout([{'faces':[face]}],[scene],[0],gentle=True)[0],'reserved')

    def test_sampling_is_dense_and_covers_the_last_frame(self):
        frames = layout_sample_frames(100,145)
        self.assertEqual(frames[0],100)
        self.assertEqual(frames[-1],244)
        self.assertTrue(all(b-a <= SAMPLE_STEP for a,b in zip(frames,frames[1:])))

    def test_a_dip_between_two_clear_samples_is_caught_only_if_a_sample_lands_on_it(self):
        scene = self.scene
        clear, dip = self.box(.5), self.box(.35)
        self.assertEqual(editorial_layout([{'faces':[clear]},{'faces':[dip]},{'faces':[clear]}],[scene]*3,[0,6,12])[0],'reserved')

    def test_highest_face_wins_and_invalid_boxes_never_authorize_a_band(self):
        self.assertEqual(editorial_layout([{'faces':[self.box(.6),self.box(.35)]}],[self.scene],[0])[0],'reserved')
        for bad in (float('nan'),float('inf'),None,'0.6'):
            self.assertEqual(editorial_layout([{'faces':[{'top':bad,'bottom':.7}]}],[self.scene],[0])[0],'reserved',bad)
        self.assertEqual(editorial_layout([{'faces':[{'bottom':.7}]}],[self.scene],[0])[0],'reserved')
        self.assertEqual(editorial_layout([{'faces':[self.box(.6)],'error':'x'}],[self.scene],[0])[0],'reserved')

    def test_unmeasured_pose_is_neutral_and_never_blocks_a_fully_measured_band(self):
        neutral = {**self.scene,'framing':[{'frame':0,'scale':1,'x':0,'y':0,'captionTop':None,'measured':False}]}
        self.assertEqual(editorial_layout([{'faces':[self.box(.5)]}],[neutral],[0])[0],'overlay')
        self.assertEqual(editorial_layout([{'faces':[]}],[neutral],[0])[0],'reserved')

    def test_reserved_box_is_the_top_band_and_shares_the_overlay_geometry(self):
        self.assertEqual(RESERVED_BOX,OVERLAY_BOX)
        self.assertEqual(editorial_layout([{'faces':[self.box(.31)]}],[self.scene],[0])[1],RESERVED_BOX)

    def test_crop_anchor_protects_the_head_in_the_presenter_slot_below_the_card(self):
        # Slot below the card is .705 of the canvas; a 9:16 source shows .705 of its height.
        visible = (1 - (RESERVED_BOX['y'] + RESERVED_BOX['height']) - .025)
        def window(top, bottom):
            samples = [{'faces':[{'top':top,'bottom':bottom}]}]
            focus = presenter_focus_y(samples,[self.scene],RESERVED_BOX)
            start = focus * (1 - visible)
            return focus, start
        # Typical head: window starts above hair allowance + margin and still shows the chin.
        focus, start = window(.30,.50)
        self.assertLessEqual(start,.30-.10+1e-4)
        self.assertGreaterEqual(start+visible,.50+.03-1e-4)
        # Very high head: window clamps to the top of the source, never cuts the hair.
        focus, start = window(.05,.25)
        self.assertEqual((focus,start),(0.0,0.0))
        # Low head: window moves down but never past the bottom of the source.
        focus, start = window(.55,.80)
        self.assertLessEqual(focus,1.0)
        self.assertGreaterEqual(start+visible,.80+.03-1e-4)
        # Head taller than the window: protect the head, accept losing the chin.
        focus, start = window(.10,.95)
        self.assertLessEqual(start,.10-.10+1e-4)

    def test_crop_anchor_defaults_to_the_top_without_a_valid_measurement(self):
        for samples in ([{'faces':[]}],[{'faces':[{'top':.3}]}],[{'faces':[{'top':float('nan'),'bottom':.5}]}],[{'faces':[self.box(.3)],'error':'x'}]):
            self.assertEqual(presenter_focus_y(samples,[self.scene],RESERVED_BOX),0.0)

    def test_overlay_box_stays_inside_platform_safe_zones(self):
        self.assertLessEqual(OVERLAY_BOX['x']+OVERLAY_BOX['width'],.86)
        self.assertGreaterEqual(OVERLAY_BOX['x'],.04)
        result = editorial_layout([{'faces':[self.face]}],[self.scene],[0])
        self.assertEqual(result[1],OVERLAY_BOX)

    def test_one_brief_face_miss_keeps_same_pose_and_caption_reservation_all_scene(self):
        keys = scene_framing([{'faces':[self.face]},{'faces':[]},{'faces':[self.face]}],120)
        self.assertEqual(keys[0]['scale'],1)
        self.assertEqual(keys[0]['scale'],keys[-1]['scale'])
        self.assertTrue(all(not key['measured'] and key['captionTop'] is None for key in keys))
        self.assertEqual([key['frame'] for key in keys],[0,119])

    def test_unavailable_detector_keeps_event_and_all_voice_timing_in_reserved_layout(self):
        edit = {'editorialVersion':1,'width':720,'height':1280,'preferences':preferences(),
                'scenes':[copy.deepcopy(self.scene)],'beats':[{'id':'b','kind':'card','from':30,'frames':60,'headline':'Una idea','presentation':'overlay','textPages':[{'text':'Una idea','from':0,'frames':60}]}],
                'captions':[{'text':'Una','startMs':1000,'endMs':1200}],
                'editorialReview':{'version':1,'proposals':[],'warnings':[],'aestheticApproval':'pending'}}
        timing = [(scene['from'],scene['frames']) for scene in edit['scenes']]
        captions = copy.deepcopy(edit['captions'])
        with tempfile.TemporaryDirectory() as folder, patch('native_layout.subprocess.run'), patch('native_layout.prepare_portrait_framing',side_effect=subprocess.CalledProcessError(1,'detect')):
            prepare_native_layout(Path(folder),edit)
        self.assertEqual(edit['beats'][0]['presentation'],'reserved')
        self.assertEqual(edit['beats'][0]['layoutBox'],RESERVED_BOX)
        self.assertEqual((edit['beats'][0]['from'],edit['beats'][0]['frames']),(30,60))
        self.assertEqual([(scene['from'],scene['frames']) for scene in edit['scenes']],timing)
        self.assertEqual(edit['captions'],captions)
        self.assertFalse(edit['layoutReview']['measuredFreeBand'])


class EditorialControlsAndStockTests(unittest.TestCase):
    def test_non_caption_references_preserve_default_caption_paging(self):
        self.assertIsNone(caption_reference_adaptations([]))
        self.assertIsNone(caption_reference_adaptations([{'adaptation':'semantic-icons'},{'adaptation':'headline-scenes'}]))
        self.assertEqual(caption_reference_adaptations([{'adaptation':'semantic-icons'},{'adaptation':'short-caption-pages'}]),['short-caption-pages'])
        self.assertEqual(caption_reference_adaptations([{'adaptation':'keyword-emphasis'},{'adaptation':'short-caption-pages'}]),['keyword-emphasis','short-caption-pages'])

    def test_literal_caption_intent_excludes_text_cards_but_keeps_grounded_graphics(self):
        brief = {'resourcePolicy':'relevant-only','preferences':preferences(captionIntent='literal')}
        self.assertEqual(event_limits(brief)[0]['card'],0)
        self.assertEqual(constrain_events([{'kind':'card'},{'kind':'icon'},{'kind':'steps'}],brief),[{'kind':'icon'},{'kind':'steps'}])

    def test_resource_exclusions_apply_before_search_with_recorded_reason(self):
        brief = {'resourcePolicy':'relevant-only','preferences':preferences(resourceStyle='diagram')}
        rejected = []
        accepted = constrain_events([{'kind':'broll','sentence':0},{'kind':'icon','sentence':1}],brief,rejected)
        self.assertEqual([event['kind'] for event in accepted],['icon'])
        self.assertEqual(rejected[0]['status'],'rejected')
        self.assertIn('excluded',rejected[0]['reason'])
        self.assertEqual(event_limits(brief)[0]['broll'],0)
        brief['preferences']['editorial']['resourceStyle'] = 'real'
        self.assertEqual(constrain_events([{'kind':'icon'},{'kind':'steps'},{'kind':'compare'}],brief),[])

    def test_director_cache_fingerprints_supported_controls_but_not_font(self):
        runner = director_tests.DirectorTest()
        with tempfile.TemporaryDirectory() as folder:
            calls,_ = runner.run_director(folder,{'editorial':controls()})
            self.assertEqual(len(calls),1)
            calls,_ = runner.run_director(folder,{'editorial':controls(),'font':'anton'})
            self.assertEqual(calls,[])
            calls,_ = runner.run_director(folder,{'editorial':controls(readingPace='calm')})
            self.assertEqual(len(calls),1)
            context = json.loads(calls[0][0][1]['content'])
            self.assertEqual(context['editorial']['readingPace'],'calm')

    def test_actual_director_schema_passes_real_strict_sol_validation(self):
        runner = director_tests.DirectorTest()
        for options in (controls(),controls(resourceStyle='diagram'),controls(captionIntent='literal')):
            with self.subTest(options=options), tempfile.TemporaryDirectory() as folder:
                calls, _ = runner.run_director(folder,{'editorial':options})
                schema = strict_schema(calls[0][1])
                self.assertIn('icons',schema['required'])
                self.assertFalse(schema['additionalProperties'])
                self.assertEqual(set(schema['required']),set(schema['properties']))
                self.assertIn('icon',schema['properties']['icons']['items']['required'])

    def test_media_cache_fingerprint_includes_controls_and_zero_results_skip_model(self):
        event = {'query':'people walking','quote':'Las personas caminan','anchor':'personas caminan','editorial':controls()}
        with tempfile.TemporaryDirectory() as tmp, patch('one_shot_worker.stock_candidates',return_value=[]) as search, patch('one_shot_worker.editorial_model') as model:
            folder = Path(tmp)
            self.assertIsNone(find_stock(folder,event,0,set()))
            self.assertIsNone(find_stock(folder,event,0,set()))
            self.assertEqual(search.call_count,1)
            self.assertIsNone(find_stock(folder,{**event,'editorial':controls(resourceStyle='real')},0,set()))
            self.assertEqual(search.call_count,2)
            model.assert_not_called()
            self.assertIn('bounded relevant',json.loads((folder/'stock-cache-0.json').read_text())['reason'])

    def test_bounded_variants_keep_literal_action_and_check_license_provenance(self):
        queries = stock_queries('people walking')
        self.assertGreater(len(queries),1)
        self.assertLessEqual(len(queries),4)
        self.assertTrue(all('walking' in query for query in queries))
        self.assertEqual(stock_queries('private customer name'),[])
        data = {'query':{'pages':{'1':{'title':'Walking','videoinfo':[{'url':'https://upload.wikimedia.org/walk.mp4','descriptionurl':'https://commons.wikimedia.org/wiki/File:Walking.mp4','size':100,'extmetadata':{'LicenseShortName':{'value':'CC0'}}}]},
                                 '2':{'title':'Unapproved','videoinfo':[{'url':'https://upload.wikimedia.org/a.mp4','extmetadata':{'LicenseShortName':{'value':'Copyright'}}}]}}}}
        with patch('one_shot_worker.get_json',return_value=data) as network:
            candidates = stock_candidates('people walking')
        self.assertLessEqual(network.call_count,4)
        self.assertEqual(len(candidates),1)
        self.assertEqual(candidates[0]['license'],'CC0')
        self.assertEqual(candidates[0]['searchQuery'],'people walking')
        self.assertTrue(candidates[0]['source'].startswith('https://commons.wikimedia.org/'))


if __name__ == '__main__':
    unittest.main()
