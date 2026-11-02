// Render evidence into the temporary session; no user media is published or retained in work/.
import fs from 'node:fs/promises';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill, renderMedia } from '@remotion/renderer';
const [folder,origin='http://localhost:3001']=process.argv.slice(2);
const edit=JSON.parse(await fs.readFile(path.join(folder,'edit.json'),'utf8'));
const inputProps={edit,mediaBase:`${origin}/api/local-intake/media?session=${path.basename(folder)}`};
const serveUrl=await bundle({entryPoint:path.resolve('src/oneShotEntry.tsx'),outDir:path.join(folder,'bundle'),publicDir:null});
const composition=await selectComposition({serveUrl,id:'OneShot',inputProps});
await fs.mkdir(path.join(folder,'review'),{recursive:true});
for (const kind of ['card','compare','steps','broll']) {
 const beat=edit.beats.find(b=>b.kind===kind);if(!beat)continue;
 await renderStill({composition,serveUrl,inputProps,frame:Math.min(beat.from+beat.frames-1,Math.round(((edit.captions.find(c=>c.startMs>=(beat.from+12)/edit.fps*1000 && c.startMs<(beat.from+beat.frames-4)/edit.fps*1000)?.startMs ?? (beat.from+30)/edit.fps*1000)+60)/1000*edit.fps)),output:path.join(folder,'review',`${kind}.png`)});
 console.log(`Rendered ${kind}`);
}

const evidence=[];
for (const scene of edit.scenes) {
 const frame=scene.from+Math.floor(scene.frames/2);
 await renderStill({composition,serveUrl,inputProps,frame,output:path.join(folder,'review',`take-${edit.scenes.indexOf(scene)+1}.png`)});
 evidence.push({kind:'take-midpoint',sceneId:scene.id,frame,seconds:frame/edit.fps});
}
for (const beat of edit.beats) {
 for (const [label,frame] of [['entry',beat.from+Math.min(12,beat.frames-1)],['exit',beat.from+beat.frames-1]]) {
  await renderStill({composition,serveUrl,inputProps,frame,output:path.join(folder,'review',`${beat.id}-${label}.png`)});
  evidence.push({kind:beat.kind,beatId:beat.id,boundary:label,frame,seconds:frame/edit.fps});
 }
}
await fs.writeFile(path.join(folder,'review','frame-evidence.json'),JSON.stringify({fps:edit.fps,scope:'Rendered samples, not aesthetic approval or full listening',frames:evidence},null,2));

if (process.argv.includes('--video')) {
 let lastMilestone = -1;
 await renderMedia({composition,serveUrl,inputProps,codec:'h264',audioCodec:'aac',outputLocation:path.join(folder,'review','preview.mp4'),concurrency:2,crf:22,onProgress:({progress})=>{const milestone=Math.floor(progress*10)*10;if(milestone>lastMilestone){lastMilestone=milestone;console.log(`Preview ${milestone}%`);}}});
 console.log('Rendered full temporary preview');
}
