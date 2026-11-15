import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {pauseTimeline} from './isa-audio-pauses.mjs';
import {microPauseTimeline} from './isa-micro-pauses.mjs';
import {englishPhaseAt} from './isa-english-rhythm.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const synthetic=`import importlib.util,base64,io,wave,numpy as np
spec=importlib.util.spec_from_file_location('probe','scripts/preview-isa-micro-pauses.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def probe(gap,pauses=[]):
 rate=22050;t=np.arange(rate)/rate;pcm=.2*np.sin(2*np.pi*180*t);pcm[int(.4*rate):int((.4+gap)*rate)]=0
 out=io.BytesIO()
 with wave.open(out,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes((pcm*32767).astype('<i2').tobytes())
 return m.micro_gaps('data:audio/wav;base64,'+base64.b64encode(out.getvalue()).decode(),{'threshold':.005,'pauses':pauses})['gaps']
assert probe(0)==[] and probe(.008)==[] and probe(.1)==[]
p=probe(.03);assert len(p)==1 and abs(p[0]['start']-.4)<.01
assert probe(.03,[{'start':.39,'end':.45}])==[]
print('OK: short PCM gap detection, no fabricated gap in continuous tone, old-pause exclusion')`;
console.log(execFileSync('python',['-c',synthetic],{cwd:root,encoding:'utf8'}).trim());
const base=pauseTimeline(2,[{start:1,end:1.2}],.8),gaps=[{start:.5,end:.53}];
assert.equal(microPauseTimeline(base,gaps,[],0).rows,base.rows);
assert.equal(microPauseTimeline(base,[],[],1).rows,base.rows);
const slowed=microPauseTimeline(base,gaps,[{start:1,end:1.2}],1);let previous=-1;
for(const row of slowed.rows){assert.ok(row.phase>=previous);previous=row.phase;assert.ok(row.rate>=0&&row.rate<=1.085+1e-9)}
assert.ok(englishPhaseAt(slowed.rows,.515).rate<englishPhaseAt(base.rows,.515).rate);
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const parse=async name=>JSON.parse((await readFile(path.join(folder,name),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
async function hashes(){const files=[...(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&!n.startsWith('index-3c-micropausas')).map(n=>path.join(folder,n)),...(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n))];return Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(f))])))}
const before=await hashes(),inventory=JSON.parse(await readFile(path.join(folder,'micro-pause-inventory.json'),'utf8')),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[],network=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 for(const sample of inventory.cases){
   const data=await parse(sample.file),old=await parse(`index-3c-pausas-${sample.id}.html`);
   assert.equal(data.audio,old.audio);assert.deepEqual(data.cues,old.cues);assert.deepEqual(data.frames,old.frames);assert.deepEqual(data.acoustics,old.acoustics);
   assert.equal(digest(Buffer.from(data.audio.split(',')[1],'base64')),sample.audioSha256);
   for(const gap of data.micro.gaps){assert.ok(gap.end-gap.start>=.018&&gap.end-gap.start<.05);assert.ok(!data.acoustics.pauses.some(p=>gap.start<p.end+.015&&gap.end>p.start-.015))}
   await page.goto(pathToFileURL(path.join(folder,sample.file)).href);await expect(page.getByRole('status').first()).toContainText('Listo: pausas anteriores');
   assert.deepEqual(await page.evaluate(()=>baseline.rows),pauseTimeline(data.duration,data.acoustics.pauses,.8).rows);
   const row=await page.evaluate(()=>{
     let invalid=0,previous=-1,differences=0,minRate=Infinity,maxLag=0;
     for(let n=0;n<=Math.ceil(data.duration*120);n++){
       const t=Math.min(data.duration,n/120),a=englishPhaseAt(baseline.rows,t),b=englishPhaseAt(timeline.rows,t),i=englishSourceAt(plan,b.phase,data.fps,data.duration),left=englishSourceAt(plan,a.phase,data.fps,data.duration);
       if(i<previous||i<0||i>=data.frames.length||b.rate<0)invalid++;previous=i;differences+=Number(i!==left);maxLag=Math.max(maxLag,a.phase-b.phase);minRate=Math.min(minRate,b.rate);
     }
     return{invalid,differences,minRate,maxLag,gaps:data.micro.gaps.length,extraFinalLag:timeline.extraLag};
   });assert.equal(row.invalid,0);assert.ok(row.maxLag<=.081);
   await expect(page.locator('#gaps tr')).toHaveCount(sample.microGaps.length);
   await page.getByRole('slider',{name:'Intensidad de micropausas',exact:true}).fill('0');assert.equal(await page.evaluate(()=>timeline.rows===baseline.rows),true);
   await page.getByRole('slider',{name:'Intensidad de micropausas',exact:true}).fill('1');
   await page.getByRole('button',{name:'Reproducir comparación',exact:true}).click();await page.waitForFunction(()=>audio.currentTime>.2&&!audio.paused);await page.evaluate(()=>audio.pause());
   const midpoint=(sample.microGaps[0].start+sample.microGaps[0].end)/2;
   assert.equal(await page.evaluate(t=>{audio.currentTime=t;render();const c=englishPhaseAt(timeline.rows,t),i=englishSourceAt(plan,c.phase,data.fps,data.duration),scratch=document.createElement('canvas');scratch.width=scratch.height=320;draw(scratch,i);const a=scratch.getContext('2d').getImageData(0,0,320,320).data,b=$('adapted').getContext('2d').getImageData(0,0,320,320).data;return a.every((v,j)=>v===b[j])},midpoint),true);
   await expect(page.locator('#adaptedInfo')).toContainText('estado de habla');
   if(sample.id==='cori')await page.screenshot({path:path.join(folder,'comparison-micro-pauses-cori.png'),fullPage:true});
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación',exact:true}).click();const artifact=await download,exported=JSON.parse(await readFile(await artifact.path(),'utf8'));
   assert.equal(exported.caseId,sample.id);assert.equal(exported.reviewed,false);assert.equal(exported.experiment,'3C-micro-pauses');
   await page.evaluate(async()=>{audio.currentTime=audio.duration-.7;await audio.play()});await page.waitForFunction(()=>audio.ended);
   reports.push({id:sample.id,...row});
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(await hashes(),before);
 await writeFile(path.join(folder,'micro-pause-checks.json'),JSON.stringify({reviewed:false,reports},null,2));
 console.log('OK: acoustic micro gaps, no fabricated word pauses, exact old pause baseline/audio, zero-strength identity, bounded monotonic phase and source frames, speaking state, pixels/playback/export/mobile; Spanish/earlier HTML/runtime intact, no HTTP.');console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}
