"""Compare samples of the rendered voice against each prepared take, allowing AAC delay."""
import sys,pathlib,json,subprocess
import numpy as np
from scipy.signal import correlate
folder=pathlib.Path(sys.argv[1]);edit=json.loads((folder/'edit.json').read_text());output=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else folder/'review'/'preview.mp4'
def pcm(file, start, duration):
    return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(file),'-t',str(duration),'-vn','-f','f32le','-ac','1','-ar','16000','-']),dtype=np.float32).copy()
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
assert any(s['codec_type']=='audio' for s in probe['streams'])
assert abs(float(probe['format']['duration'])-edit['frames']/edit['fps'])<.1
checks=[]
for scene in edit['scenes']:
    seconds=scene['frames']/edit['fps'];start=max(0,seconds/2-1.5);duration=min(3,seconds-start)
    a=pcm(folder/scene['asset'],start,duration);b=pcm(output,scene['from']/edit['fps']+start,duration);n=min(len(a),len(b));a=a[:n];b=b[:n];a-=a.mean();b-=b.mean()
    values=correlate(a,b,mode='full',method='fft');center=n-1;region=values[max(0,center-1600):center+1601];lag=int(np.argmax(region))-min(center,1600)
    similarity=float(np.max(region)/max(1e-12,np.linalg.norm(a)*np.linalg.norm(b)))
    checks.append({'take':scene['name'],'voiceCorrelation':round(similarity,4),'offsetMs':round(lag/16,2)})
    assert similarity>.9,(scene['name'],similarity)
audio=pcm(output,0,edit['frames']/edit['fps']);peak=float(np.max(np.abs(audio)))
assert peak<1.0,peak
report={'durationSeconds':float(probe['format']['duration']),'audioPresent':True,'peak':peak,'sampledVoiceChecks':checks,'scope':'Technical sample correlation and peak check; not a full semantic listening review.'}
(folder/'review').mkdir(exist_ok=True)
(folder/'review'/'audio-qc.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
