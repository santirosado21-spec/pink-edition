import assert from 'node:assert/strict';
import {captionIndex,captionPage} from '../src/captionPages.ts';
const texts = ['¿Sabes', 'cuánto', 'tiempo', 'te', 'ahorras', 'yendo', 'a', '130', 'kilómetros', 'por', 'hora?'];
const captions = texts.map((text, i) => ({text, startMs: i*300+(i>=6?1000:0), endMs: i*300+250+(i>=6?1000:0)}));
const seen = [];
for (let i=0;i<captions.length;) {
  const page = captionPage(captions,i);
  assert.ok(page.length>0 && page.length<=4);
  assert.ok(page.map(w=>w.text).join(' ').length<=36);
  assert.equal(page.includes(captions[5]) && page.includes(captions[6]),false,'A long pause starts a new page');
  for(let j=i;j<i+page.length;j++) assert.deepEqual(captionPage(captions,j),page,'Stable while the active word advances');
  seen.push(...page);i+=page.length;
}
assert.deepEqual(seen,captions,'No omitted, changed or repeated tokens/timings');
assert.deepEqual(captionPage(captions,-1),[]);
assert.deepEqual(captionPage(captions,99),[]);
assert.equal(captionIndex(captions,275),0,'A short inter-word pause keeps the page readable');
assert.equal(captionIndex(captions,1900),-1,'A long pause does not retain stale text');
assert.equal(captionIndex(captions,-1),-1);
assert.equal(captionIndex(captions,9000),-1);
const long=[{text:'extraordinariamente'.repeat(3),startMs:0,endMs:1000}];
assert.deepEqual(captionPage(long,0),long,'Long words remain present; renderer allows wrapping');
console.log('PASS caption page coverage, boundaries, pauses and stable timing');
const {captionPhrasePage}=await import('../src/captionPages.ts');
const sentence='El tiempo que pierdes en la carretera es importante, pero no todo depende de llegar primero.';
const phraseCaptions=sentence.split(' ').map((text,i)=>({text,startMs:i*200,endMs:i*200+180}));
const phraseSeen=[];
for(let i=0;i<phraseCaptions.length;){
 const page=captionPhrasePage(phraseCaptions,i);assert.ok(page.length && page.length<=5);
 assert.ok(!['en','de','por','la','el','y','me','te'].includes(page.at(-1).text),'No dangling connector at a normal boundary');
 for(let j=i;j<i+page.length;j++)assert.deepEqual(captionPhrasePage(phraseCaptions,j),page);
 phraseSeen.push(...page);i+=page.length;
}
assert.deepEqual(phraseSeen,phraseCaptions,'Phrase grouping preserves every token and timestamp');
console.log('PASS grammatical boundaries and literal timestamp coverage');
