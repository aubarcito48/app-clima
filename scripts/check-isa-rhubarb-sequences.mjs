import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { chromium,expect } from '@playwright/test';
import { fallbackShape,markAt,selectSequences } from './isa-rhubarb-sequence-selector.mjs';

assert.equal(fallbackShape('G'),'B');assert.equal(fallbackShape('H'),'C');assert.equal(fallbackShape('A'),'X');
assert.equal(markAt([{start:0,end:.5,value:'D'}],.5),'X');
// A genuine dependency check: same catalog and transitions, different audio marks.
const tiny={fps:24,frameCount:24,clipLength:12,transitions:[[0,0],[0,0]],baselineCosts:Array.from({length:24},()=>[0,0]),
 clips:['X','D'].map((label,i)=>({take:i+1,start:0,labels:Array(12).fill(label),frames:Array.from({length:12},(_,j)=>({take:i+1,source:j}))}))};
const silence=selectSequences({...tiny,cues:[{start:0,end:1,value:'X'}]},0);
const opened=selectSequences({...tiny,cues:[{start:0,end:1,value:'D'}]},0);
assert.ok(silence.every(f=>f.take===1));assert.ok(opened.every(f=>f.take===2));

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-5.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(folder,'index-5.html')).href);
 await expect(page.locator('#status')).toContainText('marcas reales de Rhubarb');
 const report=await page.evaluate(()=>{
  const counts={1:0,2:0,3:0};let mismatches=0,internalErrors=0,joins=0;
  const scratch=document.createElement('canvas');scratch.width=scratch.height=320;
  for(let i=0;i<144;i++){
   const f=sequence[i];counts[f.take]++;
   if(i%12&&f.source!==sequence[i-1].source+1)internalErrors++;
   if(i&&(f.take!==sequence[i-1].take||f.source!==sequence[i-1].source+1))joins++;
   audio.currentTime=(i+.1)/24;render();draw(scratch,f);
   const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;
   for(let j=0;j<a.length;j++)if(a[j]!==b[j])mismatches++;
  }
  const a=selectSequences({...data,cues:[{start:0,end:6,value:'X'}]},0).map(f=>f.take+':'+f.source).join();
  const b=selectSequences({...data,cues:[{start:0,end:6,value:'D'}]},0).map(f=>f.take+':'+f.source).join();
  return {counts,mismatches,internalErrors,joins,dependsOnCues:a!==b,cueCount:data.cues.length,cueBounds:[data.cues[0].start,data.cues.at(-1).end],frames:sequence.length};
 });
 assert.equal(report.mismatches,0);assert.equal(report.internalErrors,0);assert.equal(report.dependsOnCues,true);
 assert.equal(report.frames,144);assert.deepEqual(report.cueBounds,[0,6]);assert.equal(report.cueCount,39);
 await page.getByText('Ver qué decidió el selector',{exact:true}).click();
 await expect(page.locator('#decisions tr')).toHaveCount(12);
 await page.getByText('Ver qué decidió el selector',{exact:true}).click();
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('3');
 await page.getByRole('slider',{name:'Prioridad de continuidad'}).fill('2');
 await page.getByRole('button',{name:'Reproducir la prueba 5'}).click();
 await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);await page.evaluate(()=>audio.pause());
 await page.getByLabel('Fondo',{exact:true}).selectOption('#173444');
 await page.screenshot({path:path.join(folder,'comparison-5.png'),fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección para revisar'}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,5);assert.equal(exported.reviewed,false);assert.equal(exported.sequence.length,144);
 assert.equal(exported.cues.length,39);
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: real cues drive sequence selection, native frames, consecutive clip interiors, playback, decisions/export/mobile; runtime and previous previews unchanged.',report);
}finally{await browser.close()}
