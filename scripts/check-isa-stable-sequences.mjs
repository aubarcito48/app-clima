import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { chromium,expect } from '@playwright/test';
import { selectStableSequences } from './isa-stable-sequence-selector.mjs';

const clips=[];
for(const take of [1,2])for(const start of [0,2,4,6])clips.push({take,start,
 labels:Array(2).fill(take===1?'X':'D'),frames:Array.from({length:2},(_,i)=>({take,source:start+i}))});
const sample={fps:2,clipLength:2,frameCount:8,frames:[{source:0}],clips,
 transitions:clips.map(()=>clips.map(()=>0)),baselineCosts:Array.from({length:8},()=>clips.map(()=>0)),
 stablePolicy:{maxPoseDistance:.035,maxForwardSkip:0,holdBlocks:2}};
const silence=selectStableSequences({...sample,cues:[{start:0,end:4,value:'X'}]},0);
const speech=selectStableSequences({...sample,cues:[{start:0,end:1,value:'X'},{start:1,end:4,value:'D'}]},0);
assert.ok(silence.every(f=>f.take===1));assert.equal(speech[2].take,2);
assert.equal(speech[0].source,0);assert.equal(speech[0].take,1);
const incompatible=sample.transitions.map((row,k)=>row.map((cost,j)=>clips[k].take===clips[j].take?cost:.1));
const fallback=selectStableSequences({...sample,transitions:incompatible,cues:[{start:0,end:4,value:'D'}]},0);
assert.ok(fallback.every(f=>f.take===1));
// A tempting overlapping clip cannot be used even with zero continuity weight.
const overlapping={take:1,start:1,labels:['D','D'],frames:[{take:1,source:1},{take:1,source:2}]};
const augmented={...sample,clips:[...clips,overlapping],transitions:Array.from({length:9},()=>Array(9).fill(.1)),
 baselineCosts:Array.from({length:8},()=>Array(9).fill(0)),cues:[{start:0,end:4,value:'D'}]};
const safe=selectStableSequences(augmented,0);
assert.ok(safe.every((f,i)=>f.source===i));

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-5b.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(folder,'index-5b.html')).href);
 await expect(page.locator('#status')).toContainText('marcas reales de Rhubarb');
 const report=await page.evaluate(()=>{
  const describe=seq=>({counts:seq.reduce((a,f)=>(a[f.take]=(a[f.take]||0)+1,a),{}),cuts:seq.filter((f,i)=>i&&(f.take!==seq[i-1].take||f.source!==seq[i-1].source+1)).length});
  const old=describe(selectSequences(data,2)),current=describe(sequence);
  let reverses=0,invalidLinks=0,mismatches=0;
  const scratch=document.createElement('canvas');scratch.width=scratch.height=320;
  for(let i=0;i<sequence.length;i++){
   const f=sequence[i];
   if(i){const prior=sequence[i-1];if(f.source<=prior.source)reverses++;
    if(f.take===prior.take&&f.source!==prior.source+1)invalidLinks++;
    if(f.take!==prior.take&&data.transitions[prior.clip][f.clip]>data.stablePolicy.maxPoseDistance)invalidLinks++}
   audio.currentTime=(i+.1)/24;render();draw(scratch,f);
   const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;
   for(let j=0;j<a.length;j++)if(a[j]!==b[j])mismatches++;
  }
  const constrainedAtZero=selectStableSequences(data,0);
  return {old,current,reverses,invalidLinks,mismatches,frames:sequence.length,
   safeAtZero:constrainedAtZero.every((f,i)=>!i||f.source>constrainedAtZero[i-1].source)};
 });
 assert.equal(report.old.cuts,4);assert.equal(report.current.cuts,0);assert.deepEqual(report.current.counts,{1:144});
 assert.equal(report.reverses,0);assert.equal(report.invalidLinks,0);assert.equal(report.mismatches,0);
 assert.equal(report.frames,144);assert.equal(report.safeAtZero,true);
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('0');
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('2');
 await page.getByRole('button',{name:'Reproducir la prueba 5'}).click();
 await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);await page.evaluate(()=>audio.pause());
 await page.screenshot({path:path.join(folder,'comparison-5b.png'),fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección para revisar'}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,'5B');assert.equal(exported.reviewed,false);assert.equal(exported.policy.maxPoseDistance,.035);
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: hard continuity constraints, cue-driven allowed branches, incompatible-link rejection, continuous fallback, native pixels and playback; previous HTMLs/runtime unchanged.',report);
}finally{await browser.close()}
