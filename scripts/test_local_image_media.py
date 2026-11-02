"""Real local API fixture: authorized images/ranges work; unlisted assets remain blocked."""
import hashlib,json,pathlib,subprocess,tempfile,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1];origin='http://localhost:3001'
config=json.loads((ROOT/'work/fran-loop/opus-improvement-config.json').read_text());brief=config['videos'][0]['brief']
req=urllib.request.Request(origin+'/api/local-intake',data=json.dumps(brief).encode(),headers={'Origin':origin,'Content-Type':'application/json'},method='POST')
session=json.load(urllib.request.urlopen(req))['sessionId']
folder=pathlib.Path(tempfile.gettempdir())/'cutkind-upload-sessions'/hashlib.sha256(str(ROOT).encode()).hexdigest()[:16]/session
try:
 image=subprocess.check_output(['ffmpeg','-v','error','-f','lavfi','-i','color=blue:s=16x16','-frames:v','1','-f','image2pipe','-c:v','mjpeg','-'])
 (folder/'fixture.jpg').write_bytes(image);(folder/'edit.json').write_text(json.dumps({'scenes':[],'assets':[{'file':'fixture.jpg'}]}))
 url=origin+'/api/local-intake/media?session='+session+'&asset=fixture.jpg'
 with urllib.request.urlopen(url) as response:
  assert response.status==200 and response.headers['Content-Type']=='image/jpeg';assert response.read()==image
 with urllib.request.urlopen(urllib.request.Request(url,headers={'Range':'bytes=0-9'})) as response:
  assert response.status==206 and response.read()==image[:10]
 try:urllib.request.urlopen(url.replace('fixture.jpg','unlisted.jpg'))
 except urllib.error.HTTPError as error:assert error.code==404
 else:raise AssertionError('Unlisted resource exposed')
 print('PASS JPEG response, byte ranges, content type and resource allowlist with a disposable synthetic session.')
finally:
 urllib.request.urlopen(urllib.request.Request(origin+'/api/local-intake',headers={'Origin':origin,'x-cutkind-session':session},method='DELETE')).close()
