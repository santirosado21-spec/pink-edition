"""Verify actual proxy audio against source speech on both sides of internal cuts."""
import json,pathlib,sys,subprocess
import numpy as np
from scipy.signal import correlate
folder=pathlib.Path(sys.argv[1]);edit=json.loads((folder/'edit.json').read_text());checks=[]
decoded={}
def pcm(file,start,duration):
 # Decode from the beginning: QuickTime edit lists make input seeking unreliable.
 if file not in decoded:
  decoded[file]=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-vn','-f','f32le','-ac','1','-ar','16000','-']),dtype=np.float32)
 return decoded[file][round(start*16000):round((start+duration)*16000)].copy()
for scene in edit['scenes']:
 for i,cut in enumerate(scene['sourceSegments']):
  length=cut['end']-cut['start']
  for local in sorted(set([min(.15,length/4),max(.15,length-1.15)])):
   duration=min(1,length-local-.03)
   if duration<.1:continue
   a=pcm(folder/scene['id'],cut['start']+local,duration);b=pcm(folder/scene['asset'],cut['timelineStart']+local,duration)
   n=min(len(a),len(b));a=a[:n];b=b[:n];a-=a.mean();b-=b.mean()
   values=correlate(a,b,mode='full',method='fft');center=n-1;radius=min(800,center);region=values[center-radius:center+radius+1]
   correlation=float(np.max(region)/max(1e-12,np.linalg.norm(a)*np.linalg.norm(b)));lag=(int(np.argmax(region))-radius)/16
   # loudnorm can vary gain or limit a transient within this one-second window.
   # Compare short aligned blocks so gain changes do not masquerade as missing audio.
   shift=int(round(lag*16))
   aa=a[max(0,shift):];bb=b[max(0,-shift):];aligned=min(len(aa),len(bb))
   blocks=[]
   for k in range(0,aligned-1599,1600):
    x=aa[k:k+1600];y=bb[k:k+1600];den=float(np.linalg.norm(x)*np.linalg.norm(y))
    if den>1e-8:blocks.append(float(np.dot(x,y)/den))
   block_correlation=float(np.median(blocks)) if blocks else correlation
   assert correlation>.9 or block_correlation>.95,(scene['name'],i,local,correlation,block_correlation)
   assert abs(lag)<35,(scene['name'],i,lag)
   checks.append({'take':scene['name'],'segment':i,'correlation':round(correlation,4),'medianBlockCorrelation':round(block_correlation,4),'offsetMs':lag})
report={'checks':checks,'internalCuts':sum(len(s['sourceSegments'])-1 for s in edit['scenes']),'internalRemovedSeconds':sum(s['internalRemovedSeconds'] for s in edit['scenes'])}
(folder/'review'/'cuts-audio-qc.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
