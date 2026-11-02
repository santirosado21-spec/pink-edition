"""Muestra caras con Apple Vision para proteger overlays; no infiere caras del matte."""
import argparse, json, subprocess, tempfile, math, os
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--source',required=True); p.add_argument('--timeline',required=True); p.add_argument('--out',required=True); a=p.parse_args()
root=Path(__file__).resolve().parents[1]
t=json.loads(Path(a.timeline).read_text()); fps=t.get('fps',30)
s=json.loads((root/'style/pink-demo-v1.json').read_text()); width,height=s['width'],s['height']
binary=root/'work/_tools/detect-faces'; binary.parent.mkdir(parents=True,exist_ok=True)
source=root/'scripts/detect_faces.swift'
if not binary.exists() or binary.stat().st_mtime<source.stat().st_mtime:
    subprocess.run(['swiftc',str(source),'-o',str(binary)],check=True,capture_output=True)
with tempfile.TemporaryDirectory(prefix='cutkind-faces-') as tmp:
    subprocess.run(['ffmpeg','-v','error','-i',a.source,'-vf',f'fps=2,scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},scale=360:640','-q:v','3','-start_number','0',str(Path(tmp)/'frame-%06d.jpg')],check=True,capture_output=True)
    files=sorted(Path(tmp).glob('frame-*.jpg'))
    detected=json.loads(subprocess.run([str(binary),*[str(f) for f in files]],check=True,capture_output=True).stdout)
    clips=[]
    for c in t['clips']:
        lo=max(0,math.floor(c['source_in_frame']/fps*2)-1); hi=min(len(detected),math.ceil((c['source_in_frame']+c['duration_frames'])/fps*2)+1)
        samples=detected[lo:hi]; boxes=[b for frame in samples for b in frame['faces']]
        # Falta detección en cualquier muestra: no afirmar una región libre.
        reliable=bool(samples) and all(frame['faces'] and 'error' not in frame for frame in samples)
        face=None
        if reliable:
            face={'left':min(b['left'] for b in boxes)*width,'right':max(b['right'] for b in boxes)*width,
                  'top':min(b['top'] for b in boxes)*height,'bottom':max(b['bottom'] for b in boxes)*height}
            # Incluye frente/cabello y margen de movimiento entre muestras.
            h=face['bottom']-face['top']; w=face['right']-face['left']
            face={'left':max(0,face['left']-.2*w),'right':min(width,face['right']+.2*w),'top':max(0,face['top']-.5*h),'bottom':min(height,face['bottom']+.2*h)}
        clips.append({'id':c['id'],'source_in_frame':c['source_in_frame'],'duration_frames':c['duration_frames'],'face':face,'sample_count':len(samples),'detected_samples':sum(bool(f['faces']) for f in samples)})
    out={'version':1,'method':'Apple Vision VNDetectFaceRectanglesRequest','sample_fps':2,'source_sha256':t.get('source_sha256'),'clips':clips,'limitation':'Muestreo conservador con margen; no garantiza todos los frames entre muestras.'}
    dest=Path(a.out); temp=dest.with_suffix('.tmp'); temp.write_text(json.dumps(out,indent=2)); os.replace(temp,dest)
