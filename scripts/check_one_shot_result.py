"""Checks real session outputs without publishing or copying originals."""
import json,sys,pathlib,hashlib,subprocess
folder=pathlib.Path(sys.argv[1]);edit=json.loads((folder/'edit.json').read_text());inputs=json.loads((folder/'input.json').read_text())
assert not edit['issues'],edit['issues'];assert all(edit['checks'].values())
assert [s['id'] for s in edit['scenes']]==[s['id'] for s in inputs['sources']]
assert sum(s['frames'] for s in edit['scenes'])==edit['frames']
expected_words=0
for scene,source in zip(edit['scenes'],inputs['sources']):
    digest=hashlib.sha256()
    with (folder/source['id']).open('rb') as f:
        while chunk:=f.read(1024*1024):digest.update(chunk)
    assert digest.hexdigest()==source['sha256'],'Original changed'
    transcript=json.loads((folder/'analysis'/f"{source['id']}.json").read_text())
    words=[w for segment in transcript['segments'] for w in segment.get('words',[]) if w['word'].strip() and w['end']>w['start']]
    expected_words+=len(words)
    if words:
        from speech_cuts import map_time
        intervals=scene['sourceSegments']
        for w in words:
            assert any(v['start']<=w['start'] and v['end']>=w['end'] for v in intervals),'Speech cut'
            caption=edit['captions'][expected_words-len(words)+words.index(w)]
            assert abs(caption['startMs']-(scene['from']/30+map_time(w['start'],intervals))*1000)<.01
        assert abs(sum(v['end']-v['start'] for v in intervals)-scene['frames']/30)<.001
    assert (folder/scene['asset']).exists()
assert len(edit['captions'])==expected_words,'Words omitted'
for beat in edit['beats']:
    if beat['kind']=='card':assert beat['title'].rstrip('…') in beat['quote']
    if beat['kind'] in ('steps','compare'):assert all(label.lower() in beat['quote'].lower() for label in beat['labels'])
    assert beat['from']>=0 and beat['from']+beat['frames']<=edit['frames']
for a,b in zip(sorted(edit['beats'],key=lambda b:b['from']),sorted(edit['beats'],key=lambda b:b['from'])[1:]):assert a['from']+a['frames']<=b['from']
report={'originalHashesIntact':True,'wordCount':expected_words,'wordCoverage':True,'orderedSources':len(edit['scenes']),'duration':edit['frames']/edit['fps'],'counts':{kind:sum(b['kind']==kind for b in edit['beats']) for kind in ['card','steps','compare','broll']},'groundedText':True,'nonOverlappingBeats':True}
(folder/'review').mkdir(exist_ok=True);(folder/'review'/'manifest-qc.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
