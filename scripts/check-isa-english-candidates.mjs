import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const inventory=JSON.parse(await readFile(path.join(folder,'english-voices-animated-inventory.json'),'utf8'));
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
async function hashes(){const files=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&!n.startsWith('index-3c-voces-animadas')).map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(f))])))}
const before=await hashes(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],network=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-3c-voces-animadas.html')).href);
 await expect(page.getByRole('link',{name:'Sharvard: referencia española',exact:true})).toBeVisible();
 const seenAudio=new Set(),seenCues=new Set();
 for(const sample of inventory.cases){
   if(sample.voice!=='sharvard')assert.equal(sample.text,inventory.text);
   await page.goto(pathToFileURL(path.join(folder,sample.file)).href);await expect(page.getByRole('status').first()).toContainText('Listo:');
   const content=await page.evaluate(()=>({audio:data.audio,cues:data.cues}));
   assert.equal(digest(Buffer.from(content.audio.split(',')[1],'base64')),sample.sha256);
   assert.equal(content.cues.length,sample.mouthCues);assert.ok(Math.abs(content.cues.at(-1).end-sample.duration)<.021);
   assert.ok(!seenAudio.has(sample.sha256));seenAudio.add(sample.sha256);
   const cueHash=digest(JSON.stringify(content.cues));assert.ok(!seenCues.has(cueHash));seenCues.add(cueHash);
   const row=await page.evaluate(()=>{
     let invalid=0;for(let i=0;i<plan.length;i++){
       if(plan[i]<0||plan[i]>=data.frames.length||plan[i]-data.baselineFirst-i>12)invalid++;
       if(i&&(plan[i]<=plan[i-1]||plan[i]-plan[i-1]>3))invalid++;
     }
     let previous=0;for(const e of result.seams){const t=Math.round(e.time*data.fps);if(t-previous<12||count-t<12||e.pose>data.policy.maxPoseDistance||e.motion>data.policy.maxMotionDistance)invalid++;previous=t}
     return{frames:plan.length,invalid,seams:result.seams.length,skipped:result.seams.reduce((n,e)=>n+e.skip,0),cost:result.cost,baselineCost:result.baselineCost};
   });assert.equal(row.invalid,0);assert.equal(row.frames,Math.round(sample.duration*24));
   assert.ok(Math.abs(await page.evaluate(()=>audio.duration)-sample.duration)<.001);
   await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.25&&!audio.paused);
   await page.evaluate(()=>audio.pause());
   assert.equal(await page.evaluate(()=>{audio.currentTime=audio.duration/2;render();const i=plan[Math.min(count-1,Math.floor(audio.currentTime*24+1e-4))],canvas=document.createElement('canvas');canvas.width=canvas.height=320;draw(canvas,i);const a=canvas.getContext('2d').getImageData(0,0,320,320).data,b=$('selected').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,j)=>v===b[j])}),true);
   await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption('0');assert.equal(await page.evaluate(()=>plan.every((i,t)=>i===data.baselineFirst+t)),true);
   await page.getByRole('combobox',{name:'Máximo de cuadros omitidos',exact:true}).selectOption('2');
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección',exact:true}).click();const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
   assert.equal(exported.caseId,sample.id);assert.equal(exported.reviewed,false);assert.equal(exported.experiment,'3C-voces-animadas');
   await page.evaluate(async()=>{audio.currentTime=Math.max(0,audio.duration-.7);await audio.play()});await page.waitForFunction(()=>audio.ended);
   if(sample.id==='cori-1')await page.screenshot({path:path.join(folder,'comparison-cori-animated.png'),fullPage:true});
   reports.push({id:sample.id,duration:sample.duration,...row});
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(await hashes(),before);
 await writeFile(path.join(folder,'english-voices-animated-checks.json'),JSON.stringify({reviewed:false,reports},null,2));
 console.log('OK: six real voice/animation cases, same English text, unique WAV and Rhubarb timelines, native frames, forward limits/spacing, zero-skip control, playback/end/export/mobile, no HTTP, old previews/runtime retained.');
 console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}
