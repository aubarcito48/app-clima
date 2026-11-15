import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {englishRhythm,englishPhaseAt,englishSourceAt} from './isa-english-rhythm.mjs';
import {selectForwardSequence} from './isa-forward-sequence-selector.mjs';

const fixture={fps:24,duration:2,frames:Array(90).fill({}),candidates:Array.from({length:90},(_,i)=>i),cues:[{start:0,end:.5,value:'X'},{start:.5,end:1,value:'D'},{start:1,end:2,value:'X'}]};
const labels=fixture.frames.map((_,i)=>i>=14&&i<26?'D':'X'),plan=Array.from({length:48},(_,i)=>i);
const shaped=englishRhythm(fixture,plan,labels,1),different=englishRhythm({...fixture,cues:[{start:0,end:2,value:'D'}]},plan,labels,1);
assert.notDeepEqual(shaped.rows,different.rows); // Cues actually influence phase, not only a global speed preset.
for(const strength of [0,.25,.5,.75,1]){
 const result=englishRhythm(fixture,plan,labels,strength);let previous=-1;
 assert.equal(result.rows[0].rate,1);assert.equal(result.rows.at(-1).time,fixture.duration);
 for(let n=0;n<=240;n++){
   const t=n/120,row=englishPhaseAt(result.rows,t);assert.ok(row.phase>=previous);previous=row.phase;
   assert.ok(row.rate>=result.minRate-1e-9&&row.rate<=result.maxRate+1e-9);
   if(strength===0){assert.ok(Math.abs(row.phase-t)<1e-9);assert.equal(englishSourceAt(plan,row.phase,24,2),englishSourceAt(plan,t,24,2))}
 }
 for(const row of result.rows.slice(1,-1)){
   const a=englishPhaseAt(result.rows,row.time-1e-7),b=englishPhaseAt(result.rows,row.time+1e-7);
   assert.ok(Math.abs(a.phase-b.phase)<1e-6);assert.ok(Math.abs(a.rate-b.rate)<1e-6);
 }
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const parse=async filename=>JSON.parse((await readFile(path.join(folder,filename),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
async function hashes(){const files=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&!n.startsWith('index-3c-ingles-ritmo')).map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(f))])))}
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],network=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 for(const voice of ['cori','amy']){
   const original=await parse(`index-3c-voces-animadas-${voice}-1_08.html`),data=await parse(`index-3c-ingles-ritmo-${voice}.html`);
   assert.equal(data.audio,original.audio);assert.deepEqual(data.cues,original.cues);assert.deepEqual(data.frames,original.frames);assert.deepEqual(data.labels,original.labels);
   const base=selectForwardSequence(data,data.labels,{maxSkip:2,minRun:12,weight:1});
   await page.goto(pathToFileURL(path.join(folder,`index-3c-ingles-ritmo-${voice}.html`)).href);await expect(page.getByRole('status').first()).toContainText('Listo: el mismo audio');
   assert.deepEqual(await page.evaluate(()=>plan),base.plan);
   for(const strength of [0,.25,.5,.75,1]){
     await page.getByRole('slider',{name:'Intensidad del ajuste',exact:true}).fill(String(strength));
     const report=await page.evaluate(()=>{
       let invalid=0,previous=-1,previousPhase=-1,differences=0;
       for(let n=0;n<=Math.ceil(data.duration*60);n++){
         const t=Math.min(data.duration,n/60),phase=englishPhaseAt(timeline.rows,t),index=englishSourceAt(plan,phase.phase,data.fps,data.duration),left=englishSourceAt(plan,t,data.fps,data.duration);
         if(index<previous||index<0||index>=data.frames.length||phase.phase<previousPhase||phase.rate<timeline.minRate-1e-9||phase.rate>timeline.maxRate+1e-9)invalid++;
         if(+$('strength').value===0&&index!==left)invalid++;
         previous=index;previousPhase=phase.phase;differences+=Number(index!==left);
       }
       return{strength:timeline.strength,invalid,differences,endPhase:timeline.rows.at(-1).phase,minActualRate:Math.min(...timeline.rows.map(r=>r.rate)),maxActualRate:Math.max(...timeline.rows.map(r=>r.rate)),cost:timeline.cost};
     });assert.equal(report.invalid,0);reports.push({voice,...report});
   }
   await page.getByRole('slider',{name:'Intensidad del ajuste',exact:true}).fill(String(data.initialStrength));
   await expect(page.locator('#summary')).toContainText('Velocidad realmente elegida:');
   await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.25&&!audio.paused);
   await page.evaluate(()=>audio.pause());
   assert.equal(await page.evaluate(()=>{audio.currentTime=audio.duration/2;render();const phase=englishPhaseAt(timeline.rows,audio.currentTime),index=englishSourceAt(plan,phase.phase,data.fps,data.duration),c=document.createElement('canvas');c.width=c.height=320;draw(c,index);const a=c.getContext('2d').getImageData(0,0,320,320).data,b=$('adapted').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,j)=>v===b[j])}),true);
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación',exact:true}).click();const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
   assert.equal(exported.voice,voice);assert.equal(exported.reviewed,false);assert.equal(exported.experiment,'3C-English-rhythm');
   await page.evaluate(async()=>{audio.currentTime=audio.duration-.8;await audio.play()});await page.waitForFunction(()=>audio.ended);
   await page.screenshot({path:path.join(folder,`comparison-english-rhythm-${voice}.png`),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(await hashes(),before);
 await writeFile(path.join(folder,'english-rhythm-checks.json'),JSON.stringify({reviewed:false,reports},null,2));
 console.log('OK: own existing audio/cues, preserved 3C paths, zero-strength identity, monotonic continuous phase/rate, bounded source indices and rates, native pixels, playback/export/mobile, no HTTP; Spanish/earlier trials/runtime intact.');console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}
