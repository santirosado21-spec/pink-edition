"""Measure a portrait overlay band on actual proxies; missing faces block overlays and reserve caption space."""
import json, math, subprocess
from pathlib import Path
from portrait_framing import prepare_portrait_framing, interpolate_framing


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
        return
    root = Path(__file__).resolve().parents[1]
    binary = root / 'work/_tools/detect-faces'
    binary.parent.mkdir(parents=True, exist_ok=True)
    source = root / 'scripts/detect_faces.swift'
    if not binary.exists() or binary.stat().st_mtime < source.stat().st_mtime:
        subprocess.run(['swiftc', str(source), '-o', str(binary)], check=True, capture_output=True, timeout=120)
    out = folder / 'analysis/native-layout'
    out.mkdir(parents=True, exist_ok=True)
    evidence = []
    prepare_portrait_framing(folder, edit, binary)
    for beat in edit['beats']:
        if beat['kind']=='card' and edit['preferences'].get('emphasis_mode')=='fullscreen':
            beat['overlayTop']=0
            evidence.append({'beatId':beat['id'],'presentation':'intentional-fullscreen-text','voicePreserved':True,'displayedRange':[beat['from'],beat['from']+beat['frames']]})
            continue
        paths, owners = [], []
        # Two samples per second, including the end of the overlay interval.
        frames = sorted(set([beat['from'] + n for n in range(0, beat['frames'], 15)] + [beat['from'] + beat['frames'] - 1]))
        for frame in frames:
            scene = next((s for s in edit['scenes'] if s['from'] <= frame < s['from'] + s['frames']), None)
            if not scene:
                continue
            image = out / f"{beat['id']}-{frame}.jpg"
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str((frame - scene['from']) / edit['fps']), '-i', str(folder / scene['asset']), '-frames:v', '1', '-vf', 'scale=360:-2', str(image)], check=True, capture_output=True, timeout=30)
            paths.append(image); owners.append(scene)
        samples = json.loads(subprocess.check_output([str(binary), *map(str, paths)], timeout=60)) if paths else []
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
    blocked = [b for b in edit['beats'] if 'overlayTop' not in b]
    edit['layoutReview'] = {'blockedBeatIds': [b['id'] for b in blocked], 'reason': 'No measured free band below all detected faces; keep original footage without that overlay.'}
    edit['beats'] = [b for b in edit['beats'] if 'overlayTop' in b]
    relevant = edit.get('resourcePolicy') == 'relevant-only'
    for kind, check, minimum in [('card', 'cards', 0 if relevant else 2), ('broll', 'broll', 0 if relevant else 2)]:
        edit['checks'][check] = sum(b['kind'] == kind and (kind != 'broll' or b.get('mediaType') != 'image') for b in edit['beats']) >= minimum
    edit['checks']['graphics'] = relevant or all(any(b['kind'] == kind for b in edit['beats']) for kind in ['compare', 'steps'])
    for check in ['cards', 'broll', 'graphics']:
        if not edit['checks'][check]:
            edit['issues'].append('Requisito pendiente tras medir el rostro: ' + check)
    edit['visualLayoutVersion'] = 3
    (out / 'evidence.json').write_text(json.dumps({'method': 'Apple Vision, 2fps + interval end; 6.5% margin; face motion between samples remains unmeasured', 'beats': evidence}, indent=2))
