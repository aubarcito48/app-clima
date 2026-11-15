import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { rhythmTimeline } from './isa-rhythm-timeline.mjs';

// Check temporal constraints across silence, loudness, alternation and ramps.
for (const energy of [Array(300).fill(0), Array(300).fill(1), Array.from({length:300},(_,i)=>i%2),Array.from({length:300},(_,i)=>i/299)]) {
  for (const strength of [0,.5,1]) {
    const rows=rhythmTimeline(energy,.02,6,strength);
    for(let i=1;i<rows.length;i++){
      assert.ok(rows[i].phase>rows[i-1].phase);
      assert.ok(rows[i].rate>=.9-1e-9&&rows[i].rate<=1.1+1e-9);
      assert.ok(Math.abs(rows[i].rate-rows[i-1].rate)<.004);
      if(strength===0)assert.ok(Math.abs(rows[i].phase-rows[i].time)<1e-9);
    }
  }
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>Object.fromEntries(await Promise.all((await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-ritmo.html').map(async n=>[n,createHash('sha256').update(await readFile(path.join(folder,n))).digest('hex')])));
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(folder,'index-ritmo.html')).href);
 await expect(page.locator('#status')).toContainText('Listo: 6');
 const report=await page.evaluate(()=>{
  let previous=-1,skips=0,reverse=0;const seen=new Set();
  for(let t=0;t<=6;t+=1/60){const i=indexAt(clockAt(t).phase);if(previous>=0){if(i<previous)reverse++;if(i>previous+1)skips++}previous=i;seen.add(i)}
  return {skips,reverse,unique:seen.size,phaseEnd:timeline.at(-1).phase,videoSeconds:data.frames.length/data.fps,audioRate:audio.playbackRate};
 });
 assert.equal(report.skips,0);assert.equal(report.reverse,0);assert.ok(report.unique>120);
 assert.ok(report.phaseEnd<report.videoSeconds);assert.equal(report.audioRate,1);
 await page.getByRole('slider',{name:'Intensidad del ajuste'}).fill('0');
 assert.equal(await page.evaluate(()=>{audio.currentTime=2.5;render();const a=$('original').getContext('2d').getImageData(0,0,320,320).data,b=$('adjusted').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,i)=>v===b[i])}),true);
 await page.getByRole('slider',{name:'Intensidad del ajuste'}).fill('1');
 await page.getByRole('button',{name:'Reproducir los 6 segundos'}).click();
 await page.waitForFunction(()=>audio.currentTime>.4&&!audio.paused);
 await page.evaluate(()=>audio.pause());
 const held=await page.evaluate(()=>audio.currentTime);
 await page.getByRole('slider',{name:'Intensidad del ajuste'}).fill('0.5');
 assert.equal(await page.evaluate(()=>audio.currentTime),held);
 await page.screenshot({path:path.join(folder,'comparison-ritmo.png'),fullPage:true});
 await page.evaluate(async()=>{audio.currentTime=5.9;await audio.play()});
 await page.waitForFunction(()=>audio.ended);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: bounded monotonic clock, native frame order, zero-strength identity, playback/pause/end, mobile and earlier previews.',report);
}finally{await browser.close()}
