import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {pauseTimeline,pauseAmount} from './isa-audio-pauses.mjs';
import {englishPhaseAt} from './isa-english-rhythm.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const synthetic=`import importlib.util,io,wave,base64,numpy as np
spec=importlib.util.spec_from_file_location('probe','scripts/preview-isa-pauses.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def probe(gap):
 rate=22050;t=np.arange(rate)/rate;pcm=.2*np.sin(2*np.pi*180*t);pcm[int(.4*rate):int((.4+gap)*rate)]=0
 buf=io.BytesIO()
 with wave.open(buf,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes((pcm*32767).astype('<i2').tobytes())
 return m.acoustic_pauses('data:audio/wav;base64,'+base64.b64encode(buf.getvalue()).decode())['pauses']
assert probe(.02)==[]
p=probe(.12);assert len(p)==1 and abs(p[0]['start']-.4)<.02 and abs(p[0]['end']-.52)<.02
print('OK: acoustic detection responds to PCM silence, ignores 20ms gap, no text input')`;
console.log(execFileSync('python',['-c',synthetic],{cwd:root,encoding:'utf8'}).trim());
for(const strength of [0,.2,.4,.8,1]){
 const test=pauseTimeline(2,[{start:.7,end:.85}],strength);let previous=-1;
 for(const row of test.rows){assert.ok(row.phase>previous);previous=row.phase;assert.ok(row.rate>0&&row.rate<=1.06+1e-9);if(strength===0)assert.ok(Math.abs(row.time-row.phase)<1e-9)}
 if(strength){assert.ok(englishPhaseAt(test.rows,.8).rate<1);assert.ok(englishPhaseAt(test.rows,1.6).rate>englishPhaseAt(test.rows,.8).rate)}
 assert.equal(pauseAmount([{start:.7,end:.85}],.1),0);
}
const plain=pauseTimeline(2,[],1);assert.ok(plain.rows.every(r=>Math.abs(r.phase-r.time)<1e-9));
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const parse=async filename=>JSON.parse((await readFile(path.join(folder,filename),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
async function hashes(){const files=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&!n.startsWith('index-3c-pausas')).map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(f))])))}
const before=await hashes(),browser=await chromium.launch({headless:true}),inventory=JSON.parse(await readFile(path.join(folder,'pause-comparison-inventory.json'),'utf8'));
const sources={es:'index-3c-voces-animadas-sharvard-es.html',cori:'index-3c-voces-animadas-cori-1_08.html',amy:'index-3c-voces-animadas-amy-1_08.html',silencio:'index-3c-frases-es-pausa.html'};
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],network=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 for(const sample of inventory.cases){
   const data=await parse(sample.file),original=await parse(sources[sample.id]);
   assert.equal(data.audio,original.audio);assert.deepEqual(data.cues,original.cues);assert.deepEqual(data.frames,original.frames);
   assert.equal(digest(Buffer.from(data.audio.split(',')[1],'base64')),sample.audioSha256);
   if(sample.id==='silencio')assert.ok(data.acoustics.pauses.some(p=>p.start<2.33&&p.end>3.09));
   await page.goto(pathToFileURL(path.join(folder,sample.file)).href);await expect(page.getByRole('status').first()).toContainText('Listo: mismo audio');
   const report=await page.evaluate(()=>{
     let invalid=0,previous=-1,different=0;
     for(let n=0;n<=Math.ceil(data.duration*120);n++){
       const t=Math.min(data.duration,n/120),c=englishPhaseAt(timeline.rows,t),i=englishSourceAt(plan,c.phase,data.fps,data.duration),base=englishSourceAt(plan,t,data.fps,data.duration);
       if(i<previous||i<0||i>=data.frames.length||c.rate<=0||c.rate>1.06+1e-9)invalid++;
       different+=Number(i!==base);previous=i;
     }
     const response=data.acoustics.pauses.map(p=>englishPhaseAt(timeline.rows,(p.start+p.end)/2).rate);
     return{invalid,different,pauses:data.acoustics.pauses.length,minRate:timeline.minRate,maxRate:timeline.maxRate,endPhase:timeline.rows.at(-1).phase,response};
   });assert.equal(report.invalid,0);assert.ok(report.response.every(rate=>rate<1));
   await expect(page.locator('#pauses tr')).toHaveCount(sample.pauses.length);
   await page.getByRole('slider',{name:'Intensidad de las pausas',exact:true}).fill('0');
   assert.equal(await page.evaluate(()=>timeline.rows.every(r=>Math.abs(r.phase-r.time)<1e-9)),true);
   await page.getByRole('slider',{name:'Intensidad de las pausas',exact:true}).fill('0.8');
   await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.2&&!audio.paused);await page.evaluate(()=>audio.pause());
   const mid=(sample.pauses[0].start+sample.pauses[0].end)/2;
   assert.equal(await page.evaluate(t=>{audio.currentTime=t;render();const c=englishPhaseAt(timeline.rows,t),index=englishSourceAt(plan,c.phase,data.fps,data.duration),scratch=document.createElement('canvas');scratch.width=scratch.height=320;draw(scratch,index);const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('adapted').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,j)=>v===b[j])},mid),true);
   await expect(page.locator('#adaptedInfo')).toContainText('sigue en actuación de habla');
   if(sample.id==='es'||sample.id==='amy')await page.screenshot({path:path.join(folder,`comparison-pauses-${sample.id}.png`),fullPage:true});
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación',exact:true}).click();const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
   assert.equal(exported.caseId,sample.id);assert.equal(exported.reviewed,false);assert.equal(exported.experiment,'3C-pauses');
   await page.evaluate(async()=>{audio.currentTime=audio.duration-.8;await audio.play()});await page.waitForFunction(()=>audio.ended);
   reports.push({id:sample.id,...report});
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(await hashes(),before);
 await writeFile(path.join(folder,'pause-comparison-checks.json'),JSON.stringify({reviewed:false,reports},null,2));
 console.log('OK: PCM-derived pauses, short-gap exclusion, exact original audio/cues, zero-intensity identity, monotonic positive clock, native frames, continuous speaking, playback/export/mobile; previous HTMLs/Spanish/runtime retained, no HTTP.');console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}
