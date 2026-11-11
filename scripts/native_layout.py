"""Measure a portrait overlay band on actual proxies; missing faces block overlays and reserve caption space."""
import json, math, subprocess
from pathlib import Path
from portrait_framing import prepare_portrait_framing, interpolate_framing

# Reserved composition: support card in the top band, presenter in the (larger) region below it,
# captions stay over the presenter. Same box as the overlay so the face can never collide with it.
RESERVED_BOX = {'x': .04, 'y': .04, 'width': .82, 'height': .23}


# Support card stays inside platform safe zones (right UI starts near x=.89).
OVERLAY_BOX = {'x': .04, 'y': .04, 'width': .82, 'height': .23}
# Fixed clearance between the card and the worst measured face top. It pays for detector
# jitter, hair above the face box and head motion between samples; a miss falls back to reserved.
FACE_SLACK = .03
# Caption clearance between the support band and the measured band start.
CAPTION_MARGIN = .065
SAMPLE_STEP = 6  # frames between face samples (5 per second at 30 fps)
# Method note recorded in session evidence; derived from the constants so it cannot drift.
EVIDENCE_METHOD = ('Apple Vision, one sample every %d frames + interval end; %.1f%% margin; '
                   'face motion between samples remains unmeasured') % (SAMPLE_STEP, (CAPTION_MARGIN + FACE_SLACK) * 100)


def layout_sample_frames(start, frames):
    return sorted(set([start + n for n in range(0, frames, SAMPLE_STEP)] + [start + frames - 1]))


def _valid_face(face):
    top = face.get('top') if isinstance(face, dict) else None
    return isinstance(top, (int, float)) and not isinstance(top, bool) and math.isfinite(top)


def presenter_focus_y(samples, owners, box):
    """Vertical object-position (0 = top .. 1 = bottom) for the presenter slot below the support box.

    The slot crops the source (object-fit: cover). Protect the head first: the visible window
    starts no lower than hair allowance + .03 above the highest face top, and shows the lowest
    face bottom when it fits. Without a valid face measurement the crop is anchored to the top."""
    slot = 1 - (box['y'] + box['height']) - .025
    tops, bottoms, visible = [], [], None
    for sample, scene in zip(samples, owners):
        faces = sample.get('faces') or []
        if sample.get('error') or not faces or not all(_valid_face(f) and _valid_face({'top': f.get('bottom')}) for f in faces):
            return 0.0
        tops.append(min(f['top'] for f in faces))
        bottoms.append(max(f['bottom'] for f in faces))
        if visible is None:
            cover = max(720 / scene['width'], slot * 1280 / scene['height'])
            visible = min(1.0, slot / (scene['height'] * cover / 1280))
    if not tops or visible is None or visible >= 1:
        return 0.0
    start_max = min(tops) - .10          # .07 hair allowance + .03 margin
    start = min(start_max, 1 - visible)
    start = max(start, max(bottoms) + .03 - visible) if max(bottoms) + .03 - visible <= start_max else start
    return round(min(1.0, max(0.0, max(0.0, start) / (1 - visible))), 4)


def editorial_layout(samples, owners, frames, gentle=False):
    """Return measured upper band or structural reservation, never infer safety from a miss.

    Geometry matches the renderer: presenter is full-bleed (object-fit: cover). A measured pose
    translates and scales from the top-left; without one the presenter stays neutral. Gentle
    motion multiplies the scale by .98 -> 1 around the same origin, so the worse endpoint counts."""
    if not samples or len(samples) != len(frames) or len(owners) != len(frames):
        return 'reserved', dict(RESERVED_BOX), 'Missing layout measurements; reserve presenter/support/captions separately'
    upper_bottom = .27
    for sample, scene, frame in zip(samples, owners, frames):
        faces = sample.get('faces')
        if not faces or sample.get('error') or not all(_valid_face(face) for face in faces):
            return 'reserved', dict(RESERVED_BOX), 'Face detection missing; reserve layout without claiming a measured free band'
        cover = max(720 / scene['width'], 1280 / scene['height'])
        rendered_height = scene['height'] * cover / 1280
        y_offset = (1 - rendered_height) / 2
        pose = interpolate_framing(scene.get('framing', []), frame - scene['from'])
        base_top = min(y_offset + max(0, face['top'] - .07) * rendered_height for face in faces)
        worst = base_top
        for factor in ((.98, 1) if gentle else (1,)):
            if pose['measured']:
                worst = min(worst, pose['y'] + pose['scale'] * factor * base_top)
            else:
                worst = min(worst, .5 + (base_top - .5) * factor)
        if pose['measured'] and not gentle:
            worst = pose['y'] + pose['scale'] * base_top
        if worst < upper_bottom + CAPTION_MARGIN + FACE_SLACK:
            return 'reserved', dict(RESERVED_BOX), 'Measured face/caption space cannot fit upper support band'
    return 'overlay', dict(OVERLAY_BOX), 'Upper support band clear in all measured samples; motion between samples remains unmeasured'


def reserve_editorial_layout(edit, reason):
    for beat in edit['beats']:
        if beat.get('presentation') == 'fullscreen':
            continue
        requested = beat.get('presentation', 'overlay')
        beat['presentation'] = 'inset' if beat.get('presentation') == 'inset' else 'reserved'
        beat['layoutBox'] = dict(RESERVED_BOX)
        explanation = ('Requested ' + requested + ' overridden by ' + beat['presentation'] + ': ' if requested != beat['presentation'] else 'Applied reserved composition: ') + reason
        edit.setdefault('editorialReview', {}).setdefault('warnings', []).append({'beatId':beat['id'],'from':beat['from'],'frames':beat['frames'],'reason':explanation})


def unmeasured_editorial_layout(edit, reason):
    reserve_editorial_layout(edit, reason)
    for scene in edit['scenes']:
        scene['framing'] = [{'frame':frame,'scale':1,'x':0,'y':0,'captionTop':None,'measured':False}
                            for frame in (0,max(0,scene['frames']-1))]
    edit['layoutReview'] = {'blockedBeatIds':[],'measuredFreeBand':False,'reason':reason,
                            'fallback':'Presenter/support/caption regions separated by composition'}


def overlay_top(samples, scene, frame=0):
    if not samples or any(not s.get('faces') or s.get('error') for s in samples):
        return None
    # object-fit:contain, centered, unchanged source aspect ratio.
    scale = min(720 / scene['width'], 1280 / scene['height'])
    y_offset = (1280 - scene['height'] * scale) / 2
    bottom = max(b['bottom'] for s in samples for b in s['faces'])
    if scene.get('framing'):
        pose = interpolate_framing(scene['framing'], frame - scene['from'])
        if pose['captionTop'] is None:
            return None
        bottom = (y_offset / 1280 + bottom * scene['height'] * scale / 1280) * pose['scale'] + pose['y']
        top = max(.65, bottom + .075, pose['captionTop'] + .16)
        return round(top,4) if top <= .70 else None
    top = max(.53, (y_offset + bottom * scene['height'] * scale) / 1280 + .065)
    return round(top, 4) if top <= .68 else None



def longest_safe_run(frames, tops, minimum=60):
    if len(frames) != len(tops):return None
    runs=[];begin=None
    for i,value in enumerate(tops+[None]):
        if value is not None and begin is None:begin=i
        if value is None and begin is not None:
            if frames[i-1]-frames[begin]>=minimum:runs.append((begin,i-1))
            begin=None
    return max(runs,key=lambda pair:frames[pair[1]]-frames[pair[0]]) if runs else None

def prepare_native_layout(folder, edit):
    if edit['width'] >= edit['height']:
        if edit.get('editorialVersion') == 1:
            unmeasured_editorial_layout(edit, 'Landscape layout uses reserved composition; no face measurement claimed')
        return
    root = Path(__file__).resolve().parents[1]
    binary = root / 'work/_tools/detect-faces'
    binary.parent.mkdir(parents=True, exist_ok=True)
    source = root / 'scripts/detect_faces.swift'
    out = folder / 'analysis/native-layout'
    out.mkdir(parents=True, exist_ok=True)
    evidence = []
    try:
        if not binary.exists() or binary.stat().st_mtime < source.stat().st_mtime:
            subprocess.run(['swiftc', str(source), '-o', str(binary)], check=True, capture_output=True, timeout=120)
        prepare_portrait_framing(folder, edit, binary)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        if edit.get('editorialVersion') != 1:
            raise
        reason = 'Face measurement unavailable (' + type(error).__name__ + '); reserved composition without measured-safety claim'
        unmeasured_editorial_layout(edit, reason)
        (out / 'evidence.json').write_text(json.dumps({'method':'Measurement unavailable; source/audio timing unchanged','reason':reason,'beats':edit['beats']},indent=2))
        return
    for beat in edit['beats']:
        if edit.get('editorialVersion') == 1 and beat.get('presentation') in ('fullscreen', 'reserved', 'inset'):
            if beat['presentation'] != 'fullscreen':
                beat['layoutBox'] = dict(RESERVED_BOX)
            evidence.append({'beatId':beat['id'],'presentation':beat['presentation'],'voicePreserved':True,
                             'measuredFreeBand':False,'reason':'Explicit composition separates presenter, support and captions',
                             'displayedRange':[beat['from'],beat['from']+beat['frames']]})
            continue
        if beat['kind']=='card' and edit['preferences'].get('emphasis_mode')=='fullscreen':
            beat['overlayTop']=0
            evidence.append({'beatId':beat['id'],'presentation':'intentional-fullscreen-text','voicePreserved':True,'displayedRange':[beat['from'],beat['from']+beat['frames']]})
            continue
        paths, owners, sampled_frames = [], [], []
        # SAMPLE_STEP frames between samples (5 per second at 30 fps), including the interval end.
        frames = layout_sample_frames(beat['from'], beat['frames'])
        for frame in frames:
            scene = next((s for s in edit['scenes'] if s['from'] <= frame < s['from'] + s['frames']), None)
            if not scene:
                continue
            image = out / f"{beat['id']}-{frame}.jpg"
            try:
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str((frame - scene['from']) / edit['fps']), '-i', str(folder / scene['asset']), '-frames:v', '1', '-vf', 'scale=360:-2', str(image)], check=True, capture_output=True, timeout=30)
            except (OSError, subprocess.SubprocessError):
                if edit.get('editorialVersion') != 1:
                    raise
                image.unlink(missing_ok=True)
                continue
            paths.append(image); owners.append(scene); sampled_frames.append(frame)
        try:
            samples = json.loads(subprocess.check_output([str(binary), *map(str, paths)], timeout=60)) if paths else []
        except (OSError, ValueError, subprocess.SubprocessError):
            if edit.get('editorialVersion') != 1:
                raise
            samples = []
        if edit.get('editorialVersion') == 1:
            requested = beat.get('presentation', 'overlay')
            presentation, box, reason = editorial_layout(samples, owners, sampled_frames, gentle=edit.get('preferences', {}).get('editorial', {}).get('framingStyle') == 'gentle')
            # A skipped source frame is missing evidence, too.
            if len(sampled_frames) != len(frames):
                presentation, box, reason = 'reserved', dict(RESERVED_BOX), 'Scene ownership missing for one or more layout samples'
            beat.update(presentation=presentation, layoutBox=box)
            if presentation == 'reserved':
                beat['presenterFocusY'] = presenter_focus_y(samples, owners, box)
            else:
                beat.pop('presenterFocusY', None)
            review = edit.setdefault('editorialReview', {'version':1,'proposals':[],'warnings':[],'aestheticApproval':'pending'})
            if presentation == 'reserved':
                review['warnings'].append({'beatId':beat['id'],'from':beat['from'],'frames':beat['frames'],'reason':'Requested ' + requested + ' overridden by reserved composition: ' + reason})
            evidence.append({'beatId':beat['id'],'requestedPresentation':requested,'presentation':presentation,'layoutBox':box,'frames':frames,'samples':samples,
                             'measuredFreeBand':presentation=='overlay','reason':reason,'voicePreserved':True,
                             'displayedRange':[beat['from'],beat['from']+beat['frames']]})
            for image in paths:
                image.unlink(missing_ok=True)
            continue
        tops = [overlay_top([sample], owner, frame) for sample, owner, frame in zip(samples, owners, frames)]
        top = max(tops) if tops and len(samples) == len(frames) and all(t is not None for t in tops) else None
        # A brief setup movement must not discard an otherwise safe whole event.
        # Trim the overlay, never the underlying video or its voice.
        if top is None:
            run=longest_safe_run(frames,tops)
            if run:
                lo,hi=run
                beat['from']=frames[lo]
                beat['frames']=frames[hi]-frames[lo]+1
                top=max(tops[lo:hi+1])
        beat.pop('overlayTop', None)
        if top is not None:
            beat['overlayTop'] = top
        evidence.append({'beatId': beat['id'], 'overlayTop': top, 'displayedRange': [beat['from'], beat['from']+beat['frames']], 'frames': frames, 'samples': samples, 'fallback': top is None})
        for image in paths:
            image.unlink(missing_ok=True)
    blocked = [b for b in edit['beats'] if 'overlayTop' not in b and not (edit.get('editorialVersion') == 1 and b.get('presentation') in ('fullscreen','reserved','inset','overlay') and (b.get('presentation')=='fullscreen' or b.get('layoutBox')))]
    edit['layoutReview'] = {'blockedBeatIds': [b['id'] for b in blocked], 'reason': 'No measured free band below all detected faces; keep original footage without that overlay.'}
    if edit.get('editorialVersion') == 1:
        edit['layoutReview'] = {'blockedBeatIds':[b['id'] for b in blocked],
                                'reservedBeatIds':[b['id'] for b in edit['beats'] if b.get('presentation') in ('reserved','inset')],
                                'measuredOverlayBeatIds':[b['id'] for b in edit['beats'] if b.get('presentation') == 'overlay'],
                                'reason':'Measured upper bands or reserved composition; no measurement claim for reserved regions'}
    edit['beats'] = [b for b in edit['beats'] if b not in blocked]
    relevant = edit.get('resourcePolicy') == 'relevant-only'
    for kind, check, minimum in [('card', 'cards', 0 if relevant else 2), ('broll', 'broll', 0 if relevant else 2)]:
        edit['checks'][check] = sum(b['kind'] == kind and (kind != 'broll' or b.get('mediaType') != 'image') for b in edit['beats']) >= minimum
    edit['checks']['graphics'] = relevant or all(any(b['kind'] == kind for b in edit['beats']) for kind in ['compare', 'steps'])
    for check in ['cards', 'broll', 'graphics']:
        if not edit['checks'][check]:
            edit['issues'].append('Requisito pendiente tras medir el rostro: ' + check)
    edit['visualLayoutVersion'] = 3
    (out / 'evidence.json').write_text(json.dumps({'method': EVIDENCE_METHOD, 'beats': evidence}, indent=2))
