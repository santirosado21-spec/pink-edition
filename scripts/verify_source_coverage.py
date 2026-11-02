"""Fail closed if any received take, speech word or prepared stream is absent."""
import json,subprocess,pathlib
from speech_cuts import map_time

def verify(folder, inputs, edit, probe=True):
    expected=[s['id'] for s in inputs['sources']]
    scenes=edit['scenes']
    if not expected or len(set(expected))!=len(expected) or [s['id'] for s in scenes]!=expected:
        raise ValueError('Falta una toma, está duplicada o cambió el orden de los archivos.')
    offset=0;cursor=0;report=[]
    for source,scene in zip(inputs['sources'],scenes):
        if scene['from']!=offset or scene['frames']<=0:raise ValueError('La secuencia tiene un hueco o una toma vacía: '+source['name'])
        transcript=json.loads((folder/'analysis'/f"{source['id']}.json").read_text())
        words=[w for seg in transcript['segments'] for w in seg.get('words',[]) if w['word'].strip() and w['end']>w['start']]
        cuts=scene['sourceSegments']
        for w in words:
            if not any(c['start']<=w['start'] and c['end']>=w['end'] for c in cuts):raise ValueError('Se recortó voz de '+source['name'])
            if cursor>=len(edit['captions']):raise ValueError('Faltan palabras de '+source['name'])
            caption=edit['captions'][cursor];cursor+=1
            if caption['text'].strip()!=w['word'].strip():raise ValueError('Palabras cambiadas en '+source['name'])
            for key,wordkey in [('startMs','start'),('endMs','end')]:
                if abs(caption[key]-(offset/edit['fps']+map_time(w[wordkey],cuts))*1000)>.1:raise ValueError('Texto fuera de tiempo en '+source['name'])
        if probe:
            info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(folder/scene['asset'])]))
            if not all(any(s['codec_type']==kind for s in info['streams']) for kind in ['video','audio']):raise ValueError('Falta audio o imagen en '+source['name'])
            if abs(float(info['format']['duration'])-scene['frames']/edit['fps'])>.12:raise ValueError('Duración incompleta en '+source['name'])
        report.append({'id':source['id'],'name':source['name'],'from':offset,'frames':scene['frames'],'words':len(words)})
        offset+=scene['frames']
    if offset!=edit['frames'] or cursor!=len(edit['captions']):raise ValueError('La cobertura total no coincide.')
    return report
