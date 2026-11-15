import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { chromium,expect } from '@playwright/test';
import { selectCombination } from './isa-combination-selector.mjs';

// Independent clocks: source 111 may legitimately link to source 0 of take 2.
const frames=Array.from({length:108},(_,i)=>({take:1,source:100+i}));
const makeTake=(take,source)=>Array.from({length:84},(_,i)=>({take,source:source+i}));
const sample={frames,takes:{2:makeTake(2,0),3:makeTake(3,200)},frameCount:96,blockSize:12,fps:24,
 labels:{1:Array(108).fill('X'),2:Array(84).fill('D'),3:Array(84).fill('D')},
 policy:{maxPoseDistance:.06,maxMotionDistance:.04,minimumLabelGain:2},
 cues:[{start:0,end:.5,value:'X'},{start:.5,end:1.5,value:'D'},{start:1.5,end:2.5,value:'X'},{start:2.5,end:3.5,value:'D'},{start:3.5,end:4,value:'X'}],
 events:[2,3].map((take,i)=>({take,target:i?60:12,start:0,length:24,entry:.01,exit:.01,entryMotion:.01,exitMotion:.01}))};
assert.equal(selectCombination(sample,[1]).events.length,0);
assert.deepEqual(selectCombination(sample,[1,2]).events.map(e=>e.take),[2]);
assert.deepEqual(selectCombination(sample,[1,3]).events.map(e=>e.take),[3]);
const both=selectCombination(sample,[1,2,3]);assert.deepEqual(both.events.map(e=>e.take),[2,3]);
assert.equal(both.sequence[11].source,111);assert.equal(both.sequence[12].source,0);
assert.equal(both.sequence[36].source,136);
const blocked={...sample,events:sample.events.map(e=>({...e,entry:.061}))};
assert.equal(selectCombination(blocked,[1,2,3],0).events.length,0);
const reversedMotion={...sample,events:sample.events.map(e=>({...e,exitMotion:.041}))};
assert.equal(selectCombination(reversedMotion,[1,2,3],0).events.length,0);
assert.equal(selectCombination({...sample,cues:[{start:0,end:4,value:'X'}]},[1,2,3],0).events.length,0);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-5c.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(folder,'index-5c.html')).href);
 await expect(page.locator('#status')).toContainText('Listo: cuatro combinaciones');
 const report=await page.evaluate(()=>Object.fromEntries(Object.entries(results).map(([key,result])=>{
  const allowed=combinations[key],counts={1:0,2:0,3:0};let errors=0;
  for(let i=0;i<result.sequence.length;i++){
   const f=result.sequence[i];counts[f.take]++;if(!allowed.includes(f.take))errors++;
   const event=result.events.find(e=>e.target<=i&&i<e.target+e.length);
   if(!event){if(f.take!==1||f.source!==data.frames[i].source)errors++}
   else if(f.take!==event.take||f.source!==data.takes[event.take][event.start+i-event.target].source)errors++;
  }
  const takes=result.events.map(e=>e.take);if(new Set(takes).size!==takes.length)errors++;
  for(let i=1;i<result.events.length;i++)if(result.events[i].target<result.events[i-1].target+result.events[i-1].length+12)errors++;
  return [key,{counts,events:result.events.length,errors}];
 })));
 for(const row of Object.values(report))assert.equal(row.errors,0);
 assert.equal(report['1'].events,0);assert.equal(report['12'].events,1);
 assert.equal(report['13'].events,0);assert.equal(report['123'].events,1);
 for(const key of ['1','12','13','123']){
  await page.getByRole('combobox',{name:'Combinación de tomas'}).selectOption(key);
  assert.equal(await page.evaluate(()=>{audio.currentTime=.8;render();const f=current.sequence[Math.floor(audio.currentTime*24+1e-4)],canvas=document.createElement('canvas');canvas.width=canvas.height=320;draw(canvas,f);const a=canvas.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,i)=>v===b[i])}),true);
 }
 await expect(page.locator('#comparisonTable tr')).toHaveCount(4);
 await page.getByRole('button',{name:'Reproducir esta combinación'}).click();await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);
 await page.evaluate(()=>audio.pause());
 await page.getByRole('combobox',{name:'Fondo',exact:true}).selectOption('#173444');
 await page.screenshot({path:path.join(folder,'comparison-5c.png'),fullPage:true});
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('0');
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('1');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación para revisar'}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,'5C');assert.equal(exported.reviewed,false);assert.equal(Object.keys(exported.results).length,4);
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: independent clocks, four combinations, rejection of pose/motion mismatches, Rhubarb dependency, native frames and original retention, playback/export/mobile; earlier HTMLs/runtime intact.',report);
}finally{await browser.close()}
