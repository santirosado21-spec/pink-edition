"""Detect internal pauses locally; protect every VAD span and transcribed word."""
import sys,json,subprocess
import numpy as np
from faster_whisper.vad import get_speech_timestamps, VadOptions
from speech_cuts import kept_intervals
source,transcript,output=sys.argv[1:]
audio=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',source,'-f','f32le','-ac','1','-ar','16000','-']),dtype=np.float32)
spans=get_speech_timestamps(audio,VadOptions(threshold=.5,min_speech_duration_ms=100,min_silence_duration_ms=150,speech_pad_ms=0))
words=[w for s in json.load(open(transcript))['segments'] for w in s.get('words',[])]
protected=[(s['start']/16000,s['end']/16000) for s in spans]+[(float(w['start']),float(w['end'])) for w in words]
duration=len(audio)/16000
intervals=kept_intervals(protected,duration)
result={'version':3,'start':intervals[0]['start'],'end':intervals[-1]['end'],'intervals':intervals,'method':'Union of local Silero VAD and all Whisper words; pauses >=450ms shortened with 100ms padding per side; frame aligned','speechSpans':len(spans),'originalAudioSeconds':duration,'internalRemovedSeconds':sum(b['start']-a['end'] for a,b in zip(intervals,intervals[1:]))}
with open(output,'w') as out:json.dump(result,out)
