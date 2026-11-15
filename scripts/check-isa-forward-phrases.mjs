import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const inventory=JSON.parse(await readFile(path.join(folder,'forward-phrases-inventory.json'),'utf8'));
const dataFrom=async name=>JSON.parse((await readFile(path.join(folder,name),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
function wavPcm(uri){const bytes=Buffer.from(uri.split(',')[1],'base64');let rate=0,stride=0;for(let o=12;o+8<=bytes.length;){const tag=bytes.toString('ascii',o,o+4),size=bytes.readUInt32LE(o+4);if(tag==='fmt '){rate=bytes.readUInt32LE(o+12);stride=bytes.readUInt16LE(o+20)}if(tag==='data')return{pcm:bytes.subarray(o+8,o+8+size),rate,stride};o+=8+size+(size%2)}throw new Error('No PCM chunk')}
async function hashes(){const paths=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&!n.startsWith('index-3c-frases')).map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])))}
const original=await dataFrom('index-3c.html'),control=await dataFrom('index-3c-frases-control.html');
assert.equal(control.audio,original.audio);assert.deepEqual(control.cues,original.cues);
const short=await dataFrom('index-3c-frases-es-corto.html'),pause=await dataFrom('index-3c-frases-es-pausa.html');
const shortPcm=wavPcm(short.audio),pausePcm=wavPcm(pause.audio),pauseRange=inventory.cases.find(c=>c.id==='es-pausa').syntheticPause;
const start=Math.round(pauseRange.start*pausePcm.rate)*pausePcm.stride,end=Math.round(pauseRange.end*pausePcm.rate)*pausePcm.stride;
assert.ok(pausePcm.pcm.subarray(start,end).every(b=>b===0));
assert.ok(Buffer.concat([pausePcm.pcm.subarray(0,start),pausePcm.pcm.subarray(end)]).equals(shortPcm.pcm));
const longA=wavPcm((await dataFrom('index-3c-frases-es-largo-1.html')).audio),longB=wavPcm((await dataFrom('index-3c-frases-es-largo-2.html')).audio);
const longBytes=await readFile(path.join(root,'../app-clima-backend/tmp/isa-rhubarb/es_long.wav'));
assert.ok(Buffer.concat([longA.pcm,longB.pcm]).equals(wavPcm('data:audio/wav;base64,'+longBytes.toString('base64')).pcm));

const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],requests=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-3c-frases.html')).href);
 await expect(page.getByRole('link',{name:'Español: consejo corto completo',exact:true})).toBeVisible();
 for(const sample of inventory.cases){
   await page.goto(pathToFileURL(path.join(folder,sample.file)).href);await expect(page.getByRole('status').first()).toContainText('Listo: comparación');
   const report=await page.evaluate(()=>{
     let invalid=0,restTotal=0,restClosed=0;const nearest=i=>{let j=-1,d=Infinity;data.candidates.forEach((n,k)=>{if(labels[k]&&Math.abs(n-i)<d){j=k;d=Math.abs(n-i)}});return labels[j]};
     for(let t=0;t<plan.length;t++){
       const index=plan[t];if(index<0||index>=data.frames.length||index-data.baselineFirst-t>12)invalid++;
       if(t&&(index<=plan[t-1]||index-plan[t-1]>3))invalid++;
       if(cueAt((t+.5)/data.fps)==='X'){restTotal++;if(nearest(index)==='X')restClosed++}
     }
     let previous=0;for(const e of result.seams){const t=Math.round(e.time*data.fps);if(t-previous<12||plan.length-t<12||e.pose>data.policy.maxPoseDistance||e.motion>data.policy.maxMotionDistance)invalid++;previous=t}
     return{count:plan.length,duration:data.duration,seams:result.seams.length,skipped:result.seams.reduce((n,e)=>n+e.skip,0),cost:result.cost,baselineCost:result.baselineCost,invalid,restTotal,restClosed};
   });assert.equal(report.invalid,0);assert.equal(report.count,Math.round(sample.duration*24));
   assert.ok(Math.abs(await page.evaluate(()=>audio.duration)-sample.duration)<.001);
   await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption('0');
   assert.equal(await page.evaluate(()=>plan.every((i,t)=>i===data.baselineFirst+t)),true);
   await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption('2');
   await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.25&&!audio.paused);
   await page.evaluate(()=>audio.pause());
   const at=sample.syntheticPause?sample.syntheticPause.start+.4:sample.duration/2;
   const pixelCheck=await page.evaluate(t=>{audio.currentTime=t;render();const i=plan[Math.min(count-1,Math.floor(audio.currentTime*data.fps+1e-4))],scratch=document.createElement('canvas');scratch.width=scratch.height=320;draw(scratch,i);const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,j)=>v===b[j])},at);
   assert.equal(pixelCheck,true);
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección',exact:true}).click();const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
   assert.equal(exported.caseId,sample.id);assert.equal(exported.reviewed,false);assert.equal(exported.experiment,'3C-frases');assert.equal(exported.sequence.length,report.count);
   // Play the last second to exercise final frame bounds for nonintegral durations.
   await page.evaluate(async()=>{audio.currentTime=Math.max(0,audio.duration-.9);await audio.play()});await page.waitForFunction(()=>audio.ended);
   if(sample.id==='es-pausa')await page.screenshot({path:path.join(folder,'comparison-3c-pause.png'),fullPage:true});
   reports.push({id:sample.id,...report});
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual(await hashes(),before);
 await writeFile(path.join(folder,'forward-phrases-checks.json'),JSON.stringify({reviewed:false,reports},null,2));
 console.log('OK: six cases, original audio/control retained, long PCM coverage without gaps, synthetic silence only, forward bounds/spacing, native pixels, zero-skip control, audio playback/end/export/mobile, no HTTP; previous HTML/runtime preserved.');
 console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}
