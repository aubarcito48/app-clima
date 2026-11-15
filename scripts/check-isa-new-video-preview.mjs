import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-4.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(folder,'index-4.html')).href);
 await expect(page.locator('#status')).toContainText('240 cuadros');
 const report=await page.evaluate(()=>{
  const scratch=document.createElement('canvas');scratch.width=scratch.height=320;
  let differences=0,reverse=0,skips=0,previous=-1,changedTakes=0;
  for(let step=0;step<=360;step++){
   const t=step/60,right=indexAt(clockAt(t).phase);
   if(previous>=0){reverse+=right<previous;skips+=right>previous+1}previous=right;
   if(step%6)continue;
   audio.currentTime=t;render();draw(scratch,data.newFrames,right);
   const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('newRhythm').getContext('2d').getImageData(0,0,320,320).data;
   for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
   const old=$('original').getContext('2d').getImageData(0,0,320,320).data;
   const fixed=$('newFixed').getContext('2d').getImageData(0,0,320,320).data;
   if(old.some((v,i)=>v!==fixed[i]))changedTakes++;
  }
  return {differences,reverse,skips,changedTakes,frames:data.newFrames.length,sourceRange:[data.newFrames[0].source,data.newFrames.at(-1).source]};
 });
 assert.equal(report.differences,0);assert.equal(report.reverse,0);assert.equal(report.skips,0);
 assert.ok(report.changedTakes>50);assert.equal(report.frames,180);assert.deepEqual(report.sourceRange,[24,203]);
 await page.getByRole('slider',{name:'Intensidad del ritmo'}).fill('0');
 assert.equal(await page.evaluate(()=>{audio.currentTime=2.5;render();const a=$('newFixed').getContext('2d').getImageData(0,0,320,320).data,b=$('newRhythm').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,i)=>v===b[i])}),true);
 await page.getByRole('slider',{name:'Intensidad del ritmo'}).fill('1');
 await page.getByLabel('Fondo',{exact:true}).selectOption('#173444');
 await page.getByRole('button',{name:'Reproducir los 6 segundos'}).click();
 await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);
 await page.evaluate(()=>audio.pause());
 await page.screenshot({path:path.join(folder,'comparison-4.png'),fullPage:true});
 await page.getByText('Ver el video nuevo completo · 10 segundos',{exact:true}).click();
 await page.waitForFunction(()=>$('video').getAttribute('src')?.startsWith('data:video/mp4;'));
 await page.evaluate(()=>$('video').play());
 await page.waitForFunction(()=>$('video').currentTime>.15&&!$('video').paused);
 assert.equal(await page.evaluate(()=>audio.paused),true);
 assert.ok(await page.evaluate(()=>$('video').duration>=10&&$('video').duration<10.1));
 await page.getByRole('button',{name:'Reproducir los 6 segundos'}).click();
 await page.waitForFunction(()=>!audio.paused&&$('video').paused);
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});
 await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(folder,'comparison-4-mobile.png'),fullPage:false});
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: new native frames, playback, zero-strength identity, full original video, mobile; runtime and earlier previews unchanged.',report);
}finally{await browser.close()}
