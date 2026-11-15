// Compare production analysis against the exact approved local algorithms.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {selectForwardSequence} from './isa-forward-sequence-selector.mjs';
import {pauseTimeline} from './isa-audio-pauses.mjs';
import {microPauseTimeline} from './isa-micro-pauses.mjs';
import {englishPhaseAt,englishSourceAt} from './isa-english-rhythm.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
const catalog=JSON.parse(await readFile(path.join(root,'src/app/shared/isabel/isa-speech-selection.json'),'utf8'));
let source=await readFile(path.join(root,'src/app/shared/isabel/isa-playback.ts'),'utf8');
source=source.replace(/^import catalog.*$/m,`const catalog=${JSON.stringify(catalog)};`);
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const runtime=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
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
console.log('OK: production PCM detection/clock/3C matches all approved samples, no per-frame differences; real long audio loops remain bounded and native; missing or malformed Rhubarb falls back.');
console.log(JSON.stringify(reports,null,2));
