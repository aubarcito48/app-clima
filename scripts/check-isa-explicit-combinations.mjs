import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {selectExplicitCombination} from './isa-explicit-combination-selector.mjs';

const takes=Object.fromEntries([1,2,3].map(t=>[t,Array.from({length:108},(_,i)=>({take:t,source:t===1?100+i:i}))]));
const fixture={takes,frameCount:96,blockSize:12,fps:24,labels:{1:Array(108).fill('X'),2:Array(108).fill('X'),3:Array(108).fill('X')},
 cues:[{start:0,end:4,value:'X'}],policy:{maxPoseDistance:.06,maxMotionDistance:.04,minimumLabelGain:2},
 eventsByBase:{1:[2,3].map((take,i)=>({take,target:i?60:12,start:0,length:24,entry:.01,exit:.01,entryMotion:.01,exitMotion:.01}))}};
assert.deepEqual(selectExplicitCombination(fixture,1,[2,3]).events.map(e=>e.take),[2,3]);
const required=selectExplicitCombination(fixture,1,[3]);assert.equal(required.counts[3],24);
assert.equal(required.sequence[60].source,0); // Independent take clocks.
assert.equal(selectExplicitCombination(fixture,1,[2,3],1,true).events.length,0); // No label gain: automatic needn't vary.
const blocked={...fixture,eventsByBase:{1:fixture.eventsByBase[1].map(e=>({...e,entry:.061}))}};
assert.equal(selectExplicitCombination(blocked,1,[3],0).available,false); // No silent fallback, even with zero penalty.
assert.equal(selectExplicitCombination({...fixture,eventsByBase:{1:fixture.eventsByBase[1].slice(0,1)}},1,[2,3]).available,false);
for(const base of [1,2,3])assert.deepEqual(selectExplicitCombination(fixture,base).sequence.map(f=>f.source),takes[base].slice(0,96).map(f=>f.source));

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
async function hashes(){const paths=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-5d.html').map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])))}
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-5d.html')).href);
 await expect(page.getByRole('status').first()).toContainText('Listo: ocho variantes');
 const report=await page.evaluate(()=>Object.fromEntries(Object.entries(results).map(([key,r])=>{
   let invalid=0;const counts={1:0,2:0,3:0};
   if(r.available){
     if(r.sequence.length!==144)invalid++;
     for(let i=0;i<r.sequence.length;i++){
       const f=r.sequence[i];counts[f.take]++;if(!variants[key].includes(f.take))invalid++;
       const e=r.events.find(e=>e.target<=i&&i<e.target+e.length),source=e?data.takes[e.take][e.start+i-e.target]:data.takes[r.base][i];
       if(f.take!==source.take||f.source!==source.source||f.page!==source.page||f.local!==source.local)invalid++;
       if(i&&r.sequence[i-1].take===f.take&&f.source!==r.sequence[i-1].source+1)invalid++;
     }
     if(key!=='auto'&&variants[key].some(t=>!counts[t]))invalid++;
     for(const e of r.events)if(e.entry>data.policy.maxPoseDistance||e.exit>data.policy.maxPoseDistance||e.entryMotion>data.policy.maxMotionDistance||e.exitMotion>data.policy.maxMotionDistance)invalid++;
   }else if(r.sequence.length)invalid++;
   return[key,{available:r.available,counts,cuts:r.events.length*2,invalid}];
 })));
 for(const r of Object.values(report))assert.equal(r.invalid,0);
 for(const key of Object.keys(report)){
   await page.getByRole('combobox',{name:'Variante',exact:true}).selectOption(key);
   if(report[key].available){
     await expect(page.getByRole('button',{name:'Reproducir variante',exact:true})).toBeEnabled();
     assert.equal(await page.evaluate(()=>{audio.currentTime=.8;render();const f=current.sequence[Math.floor(audio.currentTime*24+1e-4)],c=document.createElement('canvas');c.width=c.height=320;draw(c,f);const a=c.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,i)=>v===b[i])}),true);
   }else{
     await expect(page.getByRole('button',{name:'Reproducir variante',exact:true})).toBeDisabled();
     await expect(page.locator('#audio')).toBeHidden();
   }
 }
 await expect(page.locator('#comparisonTable tr')).toHaveCount(8);
 await page.getByRole('combobox',{name:'Variante',exact:true}).selectOption('13');
 await page.getByRole('button',{name:'Reproducir variante',exact:true}).click();
 await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);
 await page.getByRole('combobox',{name:'Variante',exact:true}).selectOption('23');assert.equal(await page.evaluate(()=>audio.paused),true);
 await page.getByRole('slider',{name:'Prioridad de continuidad',exact:true}).fill('4');
 await page.getByRole('slider',{name:'Prioridad de continuidad',exact:true}).fill('1');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación',exact:true}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,'5D');assert.equal(exported.reviewed,false);assert.equal(Object.keys(exported.results).length,8);
 await page.getByRole('combobox',{name:'Variante',exact:true}).selectOption('auto');
 await page.evaluate(async()=>{audio.currentTime=5.8;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.screenshot({path:path.join(folder,'comparison-5d.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: required take presence or explicit rejection, automatic fallback, native frames and independent clocks, playback/export/mobile, no external requests; previous HTML/runtime preserved.');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
