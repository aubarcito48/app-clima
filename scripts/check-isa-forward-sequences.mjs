import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {selectForwardSequence} from './isa-forward-sequence-selector.mjs';

const fixture={duration:2,fps:24,baselineFirst:0,frames:Array.from({length:64},(_,source)=>({source})),candidates:Array.from({length:64},(_,i)=>i),
 cues:[{start:0,end:.5,value:'X'},{start:.5,end:1,value:'D'},{start:1,end:2,value:'X'}],
 jumps:Object.fromEntries(Array.from({length:64},(_,i)=>[i,Array.from({length:4},()=>({pose:0,motion:0}))])),policy:{maxDrift:12,maxPoseDistance:.04,maxMotionDistance:.025}};
const labels=fixture.frames.map((_,i)=>i>=14&&i<26?'D':'X');
const selected=selectForwardSequence(fixture,labels,{weight:0});
assert.ok(selected.seams.length>0);assert.ok(selected.cost<selected.baselineCost);
const plain=Array.from({length:48},(_,i)=>i);
assert.deepEqual(selectForwardSequence(fixture,labels,{maxSkip:0}).plan,plain);
assert.deepEqual(selectForwardSequence(fixture,labels.map(()=>null)).plan,plain);
const blocked={...fixture,jumps:Object.fromEntries(Object.keys(fixture.jumps).map(i=>[i,Array.from({length:4},()=>({pose:.041,motion:0}))]))};
assert.deepEqual(selectForwardSequence(blocked,labels,{weight:0}).plan,plain);
const motionBlocked={...fixture,jumps:Object.fromEntries(Object.keys(fixture.jumps).map(i=>[i,Array.from({length:4},()=>({pose:0,motion:.026}))]))};
assert.deepEqual(selectForwardSequence(motionBlocked,labels,{weight:0}).plan,plain);
for(const maxSkip of [0,1,2,4])for(const minRun of [8,12,16]){
 const result=selectForwardSequence(fixture,labels,{maxSkip,minRun,weight:0});assert.equal(result.plan[0],0);
 for(let i=1;i<result.plan.length;i++){assert.ok(result.plan[i]>result.plan[i-1]);assert.ok(result.plan[i]-result.plan[i-1]<=maxSkip+1);assert.ok(result.plan[i]-i<=12)}
 let previous=0;for(const seam of result.seams){const t=Math.round(seam.time*24);assert.ok(t-previous>=minRun);assert.ok(48-t>=minRun);previous=t}
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
async function hashes(){const paths=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-3c.html').map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])))}
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-3c.html')).href);await expect(page.getByRole('status').first()).toContainText('Listo: original');
 const oldHtml=await readFile(path.join(folder,'index-3b.html'),'utf8'),oldData=JSON.parse(oldHtml.split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
 assert.equal(await page.evaluate(()=>data.audio),oldData.audio);assert.deepEqual(await page.evaluate(()=>data.cues),oldData.cues);
 const reports=[];
 for(const skip of [0,1,2,4])for(const run of [8,12,16]){
   await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption(String(skip));
   await page.getByRole('combobox',{name:'Mínimo de cuadros consecutivos',exact:true}).selectOption(String(run));
   const report=await page.evaluate(()=>{
     let bad=0,skipped=0;for(let i=1;i<plan.length;i++){const step=plan[i]-plan[i-1];if(step<1||step>+$('skip').value+1||plan[i]-data.baselineFirst-i>12)bad++;skipped+=step-1}
     const canvas=document.createElement('canvas');canvas.width=canvas.height=320;audio.currentTime=.8;render();draw(canvas,plan[Math.floor(audio.currentTime*24+1e-4)]);
     const a=canvas.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;
     return{skip:+$('skip').value,run:+$('run').value,bad,seams:result.seams.length,skipped,cost:result.cost,baselineCost:result.baselineCost,pixels:a.every((v,i)=>v===b[i])};
   });assert.equal(report.bad,0);assert.equal(report.pixels,true);if(skip===0)assert.equal(report.seams,0);reports.push(report);
 }
 await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption('2');
 await page.getByRole('combobox',{name:'Mínimo de cuadros consecutivos',exact:true}).selectOption('12');
 await page.getByRole('slider',{name:'Prioridad de continuidad',exact:true}).fill('0');
 const zero=await page.evaluate(()=>({seams:result.seams.length,skipped:result.seams.reduce((n,e)=>n+e.skip,0)}));
 await page.getByRole('slider',{name:'Prioridad de continuidad',exact:true}).fill('1');
 await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);
 await page.evaluate(()=>audio.pause());
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección',exact:true}).click();const artifact=await download;
 const exported=JSON.parse(await readFile(await artifact.path(),'utf8'));assert.equal(exported.experiment,'3C');assert.equal(exported.reviewed,false);assert.equal(exported.sequence.length,48);
 await page.evaluate(async()=>{audio.currentTime=1.8;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.screenshot({path:path.join(folder,'comparison-3c.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: forward-only selection, zero-skip control, causal Rhubarb fixture, hard pose/motion rejection at zero weight, native pixels, same 3B audio, playback/export/mobile; old HTMLs/runtime preserved.');
 console.log(JSON.stringify({reports,weightZero:zero},null,2));
}finally{await browser.close()}
