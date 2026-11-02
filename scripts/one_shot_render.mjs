import fs from 'node:fs/promises';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
const [folder, origin] = process.argv.slice(2);
const write = async (file, data) => { await fs.writeFile(path.join(folder, file+'.tmp'), JSON.stringify(data)); await fs.rename(path.join(folder,file+'.tmp'),path.join(folder,file)); };
let statusQueue = Promise.resolve();
const status = (state, stage, error) => (statusQueue = statusQueue.then(() => write('run.json', { state, stage, error, pid:process.pid, updatedAt:Date.now() })));
try {
  for (let i=0;i<100;i++) { if (await fs.stat(path.join(folder,'go')).catch(()=>null)) break; await new Promise(r=>setTimeout(r,100)); }
  const edit = JSON.parse(await fs.readFile(path.join(folder,'edit.json'),'utf8'));
  if (edit.issues.length || !Object.values(edit.checks).every(Boolean)) throw Error('La edición tiene requisitos pendientes.');
  await status('exporting','Preparando exportación');
  const inputProps={ edit, mediaBase:`${origin}/api/local-intake/media?session=${path.basename(folder)}` };
  const serveUrl=await bundle({entryPoint:path.resolve('src/oneShotEntry.tsx'),outDir:path.join(folder,'bundle'),publicDir:null});
  const composition=await selectComposition({serveUrl,id:'OneShot',inputProps});
  let last=0;
  await renderMedia({composition,serveUrl,inputProps,codec:'h264',audioCodec:'aac',outputLocation:path.join(folder,'final.mp4'),concurrency:2,crf:20,onProgress:({progress})=>{const now=Date.now();if(now-last>2000){last=now;void status('exporting',`Exportando ${Math.round(progress*100)}%`);}}});
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(folder,'final.mp4')],{encoding:'utf8'}));
  if (!probe.streams.some(s=>s.codec_type==='audio') || Math.abs(Number(probe.format.duration)-edit.frames/edit.fps)>.2) throw Error('La validación de audio o duración del MP4 falló.');
  await status('exporting','Verificando la voz de cada toma en el MP4');
  execFileSync(path.resolve('.venv-asr/bin/python'), ['scripts/check_one_shot_audio.py',folder,path.join(folder,'final.mp4')], {timeout:120000});
  await write('export-qc.json',{duration:Number(probe.format.duration),audio:true,expected:edit.frames/edit.fps});
  await status('exported','MP4 listo para descargar');
} catch(error) { await status('failed','La exportación no pudo completarse',error.message); }
finally {
  const session=JSON.parse(await fs.readFile(path.join(folder,'session.json'),'utf8'));session.expiresAt=Date.now()+3600000;await write('session.json',session);
  await fs.rm(path.join(folder,'execution.lock'),{force:true});await fs.rm(path.join(folder,'go'),{force:true});
}
