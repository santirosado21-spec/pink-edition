"""Check waveform continuity across each prepared take, not only three seconds per take."""
import json,pathlib,subprocess,sys
import numpy as np
from scipy.signal import correlate
folder=pathlib.Path(sys.argv[1]);movie=pathlib.Path(sys.argv[2]);edit=json.loads((folder/'edit.json').read_text())
def pcm(file,start,duration):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(file),'-t',str(duration),'-vn','-f','f32le','-ac','1','-ar','16000','-']),dtype=np.float32).copy()
rows=[]
for scene in edit['scenes']:
 duration=scene['frames']/edit['fps'];original=pcm(folder/scene['asset'],0,duration);rendered=pcm(movie,scene['from']/edit['fps'],duration)
 length=min(len(original),len(rendered));minimum=1.;count=0;max_lag=0
 for start in range(0,length-4000,16000):
  end=min(length,start+16000);a=original[start:end];b=rendered[start:end]
  if np.sqrt(np.mean(a*a))<.012:continue
  a=a-a.mean();b=b-b.mean();values=correlate(a,b,method='fft',mode='full');center=len(a)-1
  region=values[center-80:center+81];lag=int(np.argmax(region))-80
  score=float(np.max(region)/max(1e-12,np.linalg.norm(a)*np.linalg.norm(b)))
  minimum=min(minimum,score);max_lag=max(max_lag,abs(lag));count+=1
  assert score>.88,('Voice discontinuity',scene['name'],start/16000,score)
  assert abs(lag)<=80,('Offset exceeds five milliseconds',scene['name'],lag)
 rows.append({'take':scene['name'],'windows':count,'minimumCorrelation':round(minimum,4),'maximumOffsetMs':round(max_lag/16,3)})
report={'scope':'Signal comparison across active one-second windows of every take. Does not certify transcription accuracy or substitute for semantic listening.','takes':rows,'activeWindowsChecked':sum(r['windows']for r in rows),'passed':True}
(folder/'review').mkdir(exist_ok=True);(folder/'review/full-voice-qc.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
