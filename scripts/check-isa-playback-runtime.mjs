// Compare production analysis against the exact approved local algorithms.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { loadIsaPlayback } from './load-isa-playback.mjs';
import * as englishV1Reference from './reference/isa-playback-before-english-v2.mjs';
import {selectForwardSequence} from './isa-forward-sequence-selector.mjs';
import {pauseTimeline} from './isa-audio-pauses.mjs';
import {microPauseTimeline} from './isa-micro-pauses.mjs';
import {englishPhaseAt,englishSourceAt} from './isa-english-rhythm.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const runtime=await loadIsaPlayback();
const toBuffer=bytes=>Uint8Array.from(bytes).buffer;
const reports=[];
for(const key of ['es','cori','amy']){
 const data=JSON.parse((await readFile(path.join(folder,`index-3c-micropausas-${key}.html`),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
 const bytes=Buffer.from(data.audio.split(',')[1],'base64'),actual=runtime.createIsaPlayback(toBuffer(bytes));
 assert.ok(actual);assert.equal(actual.duration,data.duration);
 assert.deepEqual(actual.pauses,data.acoustics.pauses);assert.deepEqual(actual.micro,data.micro.gaps);
 const selection=selectForwardSequence(data,data.labels,{maxSkip:2,minRun:12,weight:1});assert.deepEqual(actual.cycles[0],selection.plan);
 const base=pauseTimeline(data.duration,data.acoustics.pauses,.8),timeline=microPauseTimeline(base,data.micro.gaps,data.acoustics.pauses,1);
 let errors=0;
 for(let n=0;n<Math.floor(data.duration*120);n++){
   const t=n/120,phase=englishPhaseAt(timeline.rows,t).phase,expected=englishSourceAt(selection.plan,phase,data.fps,data.duration);
   const frame=12+Math.floor(actual.sourceSecondsAt(t)*24+1e-7)%180;
   if(frame!==expected)errors++;
 }
 assert.equal(errors,0);reports.push({key,duration:actual.duration,pauses:actual.pauses.length,micro:actual.micro.length,frameDifferences:errors});
 const without=Buffer.from(bytes);const at=without.indexOf(Buffer.from('isav'));assert.ok(at>0);without.write('junk',at);assert.equal(runtime.createIsaPlayback(toBuffer(without)),undefined);
 assert.equal(runtime.createIsaPlayback(toBuffer(bytes.subarray(0,bytes.length-1))),undefined);
}
// Real archived longer recordings exercise the native loop and final partial cycle.
for(const name of ['es_long','en_long']){
 const bytes=await readFile(path.join(root,`docs/isa-local/reference-2026-11-15/backend/tmp/isa-rhubarb/${name}.wav`));
 const actual=runtime.createIsaPlayback(toBuffer(bytes));assert.ok(actual);assert.ok(actual.cycles.length>1);
 assert.deepEqual(actual.cycles[0],Array.from({length:180},(_,i)=>12+i));
 let last=-1,wraps=0;
 for(let n=0;n<=Math.ceil(actual.duration*60);n++){
   const seconds=actual.sourceSecondsAt(Math.min(actual.duration,n/60));assert.ok(seconds>=last-1e-8);last=seconds;
   const frame=12+(seconds*24)%180;assert.ok(frame>=12&&frame<192);
   if(n&&Math.floor(seconds/7.5)>Math.floor(actual.sourceSecondsAt((n-1)/60)/7.5))wraps++;
 }
 assert.ok(wraps>=1);reports.push({key:name,duration:actual.duration,cycles:actual.cycles.length,wraps});
}
assert.equal(runtime.createIsaPlayback(new ArrayBuffer(0)),undefined);
// Preserve the old panel 3 reference; production English v2 is verified against
// the approved frame-alignment trial by check-isa-english-frame-alignment.mjs.
const englishData=JSON.parse((await readFile(path.join(folder,'index-3c-cori-video-ingles.html'),'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
for(const sample of englishData.cases){
 const actual=englishV1Reference.createIsaPlayback(toBuffer(Buffer.from(sample.audio.split(',')[1],'base64')),'en');
 const selection=selectForwardSequence({...englishData.new,...sample},englishData.new.labels);
 assert.deepEqual(actual.cycles[0],selection.plan);
 assert.deepEqual(actual.pauses,sample.acoustics.pauses);assert.deepEqual(actual.micro,sample.micro.gaps);
 const base=pauseTimeline(sample.duration,sample.acoustics.pauses,.8),clock=microPauseTimeline(base,sample.micro.gaps,sample.acoustics.pauses,1);
 for(let n=0;n<sample.duration*120;n++){
  const expected=englishSourceAt(selection.plan,englishPhaseAt(clock.rows,n/120).phase,24,sample.duration);
  assert.equal(12+Math.floor(actual.sourceSecondsAt(n/120)*24+1e-7)%168,expected);
 }
 reports.push({key:sample.id,englishPanel3:true,frameDifferences:0});
}
const englishLong=runtime.createIsaPlayback(toBuffer(await readFile(path.join(root,'docs/isa-local/reference-2026-11-15/backend/tmp/isa-rhubarb/en_long.wav'))),'en');
assert.equal(englishLong.cycles[0].length,168);
assert.equal(englishLong.cycles[0][0],12);
assert.equal(englishLong.cycles[0].at(-1),179);
let lastEnglish=-1;
for(let n=0;n<=englishLong.duration*120;n++){
 const seconds=englishLong.sourceSecondsAt(n/120);assert.ok(seconds>=lastEnglish);lastEnglish=seconds;
 const frame=12+(seconds*24)%168;assert.ok(frame>=12&&frame<180);
}
console.log('OK: Spanish references unchanged; archived English panel 3 preserved; production English loops bounded and monotonic; malformed Rhubarb falls back.');
console.log(JSON.stringify(reports,null,2));
