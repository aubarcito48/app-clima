import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { chromium,expect } from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-4-fusion.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(folder,'index-4-fusion.html')).href);
 await expect(page.locator('#status')).toContainText('Listo: unión');
 const report=await page.evaluate(()=>{
  const counts={1:0,2:0,3:0};let joins=0,internalErrors=0,mismatches=0;
  const scratch=document.createElement('canvas');scratch.width=scratch.height=320;
  for(let i=0;i<144;i++){
   const f=sequence[i];counts[f.take]++;
   if(i){if(f.take!==sequence[i-1].take)joins++;else if(f.source!==sequence[i-1].source+1)internalErrors++}
   audio.currentTime=(i+.1)/24;render();draw(scratch,f);
   const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('fused').getContext('2d').getImageData(0,0,320,320).data;
   for(let p=0;p<a.length;p++)if(a[p]!==b[p])mismatches++;
  }
  return {counts,joins,internalErrors,mismatches,cuts};
 });
 assert.deepEqual(report.counts,{1:84,2:30,3:30});assert.equal(report.joins,4);
 assert.equal(report.internalErrors,0);assert.equal(report.mismatches,0);
 await page.getByText('Comparar otros puntos de unión',{exact:true}).click();
 await page.getByRole('checkbox',{name:'Incluir toma 2'}).uncheck();
 await page.getByRole('checkbox',{name:'Incluir toma 3'}).uncheck();
 assert.equal(await page.evaluate(()=>{audio.currentTime=2;render();const a=$('original').getContext('2d').getImageData(0,0,320,320).data,b=$('fused').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,i)=>v===b[i])}),true);
 await page.getByRole('checkbox',{name:'Incluir toma 2'}).check();
 await page.getByRole('checkbox',{name:'Incluir toma 3'}).check();
 await page.getByLabel('Enlace de la toma 2',{exact:true}).selectOption('1');
 assert.equal(await page.evaluate(()=>cuts[0].start===data.proposals[2][1].start),true);
 await page.getByLabel('Enlace de la toma 2',{exact:true}).selectOption('0');
 await page.getByText('Comparar otros puntos de unión',{exact:true}).click();
 await page.getByRole('button',{name:'Reproducir la unión'}).click();
 await page.waitForFunction(()=>audio.currentTime>.3&&!audio.paused);
 await page.evaluate(()=>audio.pause());
 await page.getByRole('checkbox',{name:'Aplicar también el ajuste suave de ritmo a ambas vistas'}).check();
 assert.equal(await page.evaluate(()=>{let previous=-1;for(let t=0;t<=6;t+=1/60){const i=frameAt(t);if(previous>i||i>previous+1&&previous>=0)return false;previous=i}return true}),true);
 await page.getByLabel('Fondo',{exact:true}).selectOption('#173444');
 await page.evaluate(()=>{audio.currentTime=cuts[0].target/24+.25;render()});
 await page.screenshot({path:path.join(folder,'comparison-4-fusion.png'),fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección para revisar'}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,'4B');assert.equal(exported.reviewed,false);assert.equal(exported.cuts.length,2);
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: two inserted sequences, four seams, original preserved elsewhere, native pixels, controls/playback/export/mobile; previous HTMLs and runtime unchanged.',report);
}finally{await browser.close()}
