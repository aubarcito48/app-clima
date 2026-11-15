import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { chromium,expect } from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const hashes=async()=>{
 const files=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-6.html').map(n=>path.join(folder,n));
 files.push(...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n)));
 files.push(...['isa-portrait.ts','isa-motion.ts','isa-speech-manifest.json'].map(n=>path.join(root,'src/app/shared/isabel',n)));
 return Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(/^https?:/.test(req.url()))external.push(req.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-6.html')).href);
 await expect(page.locator('#status')).toContainText('Listo: dos planes reales');
 const report=await page.evaluate(()=>({text:data.report.text,local:data.report.local.map(s=>s.text).join(' '),groq:data.report.groq.map(s=>s.text).join(' '),
  cues:{local:cues.local.length,groq:cues.groq.length},planCounts:{local:data.report.local.length,groq:data.report.groq.length},durations:{local:players.local.duration,groq:players.groq.duration},usage:data.report.usage,
  timelinesReadFromWav:modes.every(mode=>Math.abs(cues[mode].at(-1).until-players[mode].duration)<.001)}));
 assert.equal(report.text,report.local);assert.equal(report.text,report.groq);assert.equal(report.timelinesReadFromWav,true);
 assert.deepEqual(report.cues,report.planCounts);assert.ok(report.usage.total_tokens>0);
 assert.equal(report.usage.total_tokens,report.usage.prompt_tokens+report.usage.completion_tokens);
 await page.getByRole('button',{name:'Escuchar director local'}).click();
 await page.waitForFunction(()=>players.local.currentTime>.6&&!players.local.paused);
 assert.equal(await page.evaluate(()=>players.groq.paused),true);
 await expect(page.locator('#portrait-local canvas')).toHaveAttribute('data-isa-speaking','true');
 await page.waitForFunction(()=>Number(document.querySelector('#portrait-local canvas').dataset.isaSpeechFrame)>12);
 await page.evaluate(()=>players.local.pause());
 const paused=await page.evaluate(()=>players.local.currentTime);
 assert.equal(await page.evaluate(()=>players.local.paused),true);
 assert.ok(paused>.6);
 await page.evaluate(()=>players.local.play());await page.waitForFunction(()=>players.local.ended);
 await expect(page.locator('#portrait-local canvas')).toHaveAttribute('data-isa-speaking','false');
 await page.getByRole('button',{name:'Escuchar director Groq'}).click();
 await page.waitForFunction(()=>players.groq.currentTime>.6&&!players.groq.paused);
 assert.equal(await page.evaluate(()=>players.local.paused),true);
 await expect(page.locator('#portrait-groq canvas')).toHaveAttribute('data-isa-speaking','true');
 await page.screenshot({path:path.join(folder,'comparison-6.png'),fullPage:true});
 await page.waitForFunction(()=>players.groq.ended);
 await expect(page.locator('#portrait-groq canvas')).toHaveAttribute('data-isa-speaking','false');
 await page.getByRole('button',{name:'Escuchar director local'}).click();await page.waitForFunction(()=>!players.local.paused);
 await page.getByRole('button',{name:'Escuchar director Groq'}).click();await page.waitForFunction(()=>!players.groq.paused&&players.local.paused);
 await page.getByRole('button',{name:'Detener ambas'}).click();assert.equal(await page.evaluate(()=>modes.every(m=>players[m].paused)),true);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar datos de la comparación'}).click();
 const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
 assert.equal(exported.experiment,6);assert.equal(exported.reviewed,false);assert.equal(exported.requestCount,1);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(folder,'comparison-6-mobile.png'),fullPage:false});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(await hashes(),before);
 console.log('OK: same exact text, real WAV timelines, actual portrait playback/pause/end, single active voice, export/mobile/offline; previous previews and production sources unchanged.',report);
}finally{await browser.close()}
