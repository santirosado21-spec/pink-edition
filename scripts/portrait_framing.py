"""Conservative face-anchored framing on prepared proxies; never changes audio/timing."""
import json
import statistics
import subprocess
from pathlib import Path


def framing_for_faces(faces):
    if not faces:
        return {'scale': 1.0, 'x': 0.0, 'y': 0.0, 'captionTop': None, 'measured': False}
    center_x = statistics.median((f['left'] + f['right']) / 2 for f in faces)
    center_y = statistics.median((f['top'] + f['bottom']) / 2 for f in faces)
    for zoom in [1.30, 1.25, 1.20, 1.15, 1.10, 1.05, 1.0]:
        x = max(1 - zoom, min(0, .5 - zoom * center_x))
        y = max(1 - zoom, min(0, .28 - zoom * center_y))
        # Include hair and movement margin, not just the face rectangle.
        if all(zoom * max(0,f['top']-.07) + y >= .025 and
               zoom * f['bottom'] + y <= .76 and
               zoom * max(0,f['left']-.025) + x >= .02 and
               zoom * min(1,f['right']+.025) + x <= .98 for f in faces):
            bottom = max(zoom * f['bottom'] + y for f in faces)
            return {'scale': zoom, 'x': round(x,5), 'y': round(y,5),
                    'captionTop': round(max(.46, bottom + .075),5) if bottom + .075 <= .64 else None,
                    'measured': True}
    return {'scale': 1.0, 'x': 0.0, 'y': 0.0, 'captionTop': None, 'measured': False}


def interpolate_framing(keys, frame):
    if not keys:
        return {'scale':1,'x':0,'y':0,'captionTop':None,'measured':False}
    before = max((k for k in keys if k['frame'] <= frame), key=lambda k:k['frame'], default=keys[0])
    after = min((k for k in keys if k['frame'] >= frame), key=lambda k:k['frame'], default=keys[-1])
    ratio = (frame-before['frame']) / max(1,after['frame']-before['frame'])
    result = {key: before[key]+(after[key]-before[key])*ratio for key in ['scale','x','y']}
    result['measured'] = before['measured'] and after['measured']
    result['captionTop'] = max(before['captionTop'],after['captionTop']) if before['captionTop'] is not None and after['captionTop'] is not None else None
    return result


def prepare_portrait_framing(folder, edit, binary):
    out = folder/'analysis/portrait-framing';out.mkdir(parents=True,exist_ok=True)
    reports=[]
    for scene in edit['scenes']:
        target=out/scene['id'];target.mkdir(exist_ok=True)
        # A single decode pass at 3fps. All media remain on the Mac.
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(folder/scene['asset']),'-vf','select=not(mod(n\\,10)),scale=360:-2','-fps_mode','vfr','-q:v','4','-start_number','0',str(target/'%05d.jpg')],check=True,capture_output=True,timeout=120)
        paths=sorted(target.glob('*.jpg'))
        samples=json.loads(subprocess.check_output([str(binary),*map(str,paths)],timeout=120))
        keys=[]
        for i,sample in enumerate(samples):
            neighbors=samples[max(0,i-1):i+2]
            reliable=all(row.get('faces') and not row.get('error') for row in neighbors)
            faces=[face for row in neighbors for face in row['faces']] if reliable else []
            key=framing_for_faces(faces)
            key['frame']=min(scene['frames']-1,i*10)
            keys.append(key)
        if keys:
            keys.append({**keys[-1],'frame':scene['frames']-1}) if keys[-1]['frame'] != scene['frames']-1 else None
        scene['framing']=keys
        reports.append({'sceneId':scene['id'],'samples':samples,'keyframes':keys})
        for path in paths:path.unlink(missing_ok=True)
    edit['visualLayoutVersion']=3
    edit['captionLayoutVersion']=3
    (out/'evidence.json').write_text(json.dumps({'method':'Apple Vision at 3fps; neighbor union with hair margin; missing evidence reserves caption shelf. Frame interpolation is not proof of unmeasured motion.','scenes':reports},indent=2))
