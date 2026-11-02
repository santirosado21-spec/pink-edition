import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
const out='public/style-demos';
await fs.mkdir(out,{recursive:true});
for(const [name,bg,wall,orb] of [['scene-a','#193b45','#365c64','#e5b65e'],['scene-b','#4a354c','#78556b','#dbc9a8']]) {
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><defs><linearGradient id="wall" x2=".8" y2="1"><stop stop-color="${wall}"/><stop offset="1" stop-color="${bg}"/></linearGradient><radialGradient id="orb" cx=".3" cy=".25"><stop stop-color="#fff2d5"/><stop offset="1" stop-color="${orb}"/></radialGradient></defs><rect width="720" height="1280" fill="url(#wall)"/><path d="M80 470V240a140 140 0 0 1 280 0v230" stroke="#ffffff18" stroke-width="2" fill="none"/><path d="M0 820Q360 710 720 820V1280H0" fill="${bg}"/><ellipse cx="430" cy="456" rx="170" ry="24" fill="#0003"/><path d="M300 330h260v120H300z" fill="${orb}"/><ellipse cx="430" cy="330" rx="130" ry="25" fill="#f7dfae"/><ellipse cx="430" cy="450" rx="130" ry="25" fill="${orb}"/><circle cx="430" cy="250" r="80" fill="url(#orb)"/><rect x="100" y="410" width="130" height="22" rx="3" fill="#b4c6be" transform="rotate(-9 100 410)"/><rect x="110" y="435" width="130" height="18" rx="3" fill="#eee2d3"/><path d="M0 930H720M0 1080H720" stroke="#ffffff08"/><path d="M170 800V1280M550 800V1280" stroke="#ffffff08"/></svg>`;
 await fs.writeFile(`${out}/${name}.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`${out}/${name}.png`);
 const result=spawnSync('ffmpeg',['-v','error','-y','-loop','1','-i',`${out}/${name}.png`,'-t','8','-r','30','-vf','format=yuv420p','-an','-c:v','libx264','-preset','fast','-crf','22','-movflags','+faststart',`${out}/${name}.mp4`],{encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr);
}
await sharp(`${out}/scene-b.png`).jpeg().toFile(`${out}/plate.jpg`);
await fs.writeFile(`${out}/provenance.json`,JSON.stringify({author:'Project-authored vector demonstration',source:'scripts/setup-style-demos.mjs',scope:'Synthetic demonstration; no Fran footage, private transcripts or third-party media. MP4/JPG derived locally.',durationSeconds:8,audio:false},null,2));
