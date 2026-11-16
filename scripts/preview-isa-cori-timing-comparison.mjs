import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'docs/isa-local/cori-timing-variants/manifest.json'),'utf8'));
const cases=await Promise.all(manifest.cases.map(async sample=>{
 const raw=await readFile(path.join(root,'docs/isa-local',sample.file));
 if(createHash('sha256').update(raw).digest('hex')!==sample.sha256)throw new Error('Audio hash mismatch');
 return {...sample,audio:'data:audio/wav;base64,'+raw.toString('base64')};
}));
const template=await readFile(path.join(root,'src/app/shared/isabel/isabel.html'),'utf8');
const filter=template.match(/<filter id="isa-dark-edge"[\s\S]*?<\/filter>/)[0];
const entry=`
import {createIsaPortrait} from './src/app/shared/isabel/isa-portrait.ts';
import {createIsaPlayback} from './src/app/shared/isabel/isa-playback.ts';
import {createPauseAnchors,sourceAtPhase} from './scripts/isa-cori-pause-anchors.mjs';
const data=${JSON.stringify({text:manifest.text,cases})};
const $=id=>document.getElementById(id),audio=$('audio');
let controllers=[],sample,analysis,anchors,raf,ready=false,generation=0;
function stopClock(){if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined}
function update(){if(!ready)return;const t=Math.min(analysis.duration,audio.currentTime),old=analysis.sourceSecondsAt(t),phase=anchors.phaseAt(t),next=$('anchors').checked?sourceAtPhase(analysis,phase):old;
controllers[0].setSpeechTime(old);controllers[1].setSpeechTime(next);
$('beforeInfo').textContent='Reloj actual · cuadro '+($('before').querySelector('canvas').dataset.isaSpeechFrame??'—');
$('afterInfo').textContent=($('anchors').checked?'Anclaje por pausa':'Control sin cambios')+' · retención local '+Math.round((t-phase)*1000)+' ms';
$('after').dataset.sourceTime=String(next);$('before').dataset.sourceTime=String(old);
$('cursor').style.left=t/analysis.duration*100+'%';$('seek').value=t;$('position').textContent=t.toFixed(3)+' / '+analysis.duration.toFixed(3)+' s';}
function tick(){update();if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(tick)}
function seek(time){if(!ready)return;audio.pause();audio.currentTime=Math.max(0,Math.min(analysis.duration,time));for(const c of controllers)c.setSpeaking(true);update();$('status').textContent='En pausa: continu? con el control de audio.'}
function drawIntervals(){const bar=$('bar');bar.querySelectorAll('.interval').forEach(e=>e.remove());$('gaps').replaceChildren();
for(const [kind,rows]of [['pause',analysis.pauses],['micro',analysis.micro]])for(const p of rows){const span=document.createElement('span');span.className='interval '+kind;span.style.left=p.start/analysis.duration*100+'%';span.style.width=(p.end-p.start)/analysis.duration*100+'%';span.title=kind+' '+p.start.toFixed(3)+'–'+p.end.toFixed(3)+' s';bar.append(span);
const tr=document.createElement('tr');for(const value of [kind==='pause'?'Pausa':'Microhueco',p.start.toFixed(3)+' s',p.end.toFixed(3)+' s',Math.round((p.end-p.start)*1000)+' ms']){const td=document.createElement('td');td.textContent=value;tr.append(td)}const td=document.createElement('td'),button=document.createElement('button');button.textContent='Escuchar desde aquí';button.addEventListener('click',async()=>{seek(Math.max(0,p.start-.25));await audio.play()});td.append(button);tr.append(td);$('gaps').append(tr)}}
async function changeVoice(){const token=++generation;ready=false;stopClock();audio.pause();for(const c of controllers){c.setSpeaking(false);c.setWorking(true)}$('play').disabled=$('export').disabled=true;
sample=data.cases.find(s=>s.id===$('voice').value);const raw=Uint8Array.from(atob(sample.audio.split(',')[1]),c=>c.charCodeAt(0));analysis=createIsaPlayback(raw.buffer,'en');if(!analysis)throw new Error('Faltan las marcas propias de Rhubarb');anchors=createPauseAnchors(analysis.duration,analysis.pauses,analysis.micro);
const loaded=new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',()=>reject(new Error('Audio no disponible')),{once:true})});audio.src=sample.audio;audio.load();await loaded;if(token!==generation)return;ready=true;
$('seek').max=analysis.duration;$('summary').textContent=analysis.duration.toFixed(3)+' s · '+analysis.pauses.length+' pausas · '+analysis.micro.length+' microhuecos · Cori × '+sample.scale.toFixed(2);drawIntervals();update();$('status').textContent='Listo: ambos retratos comparten exactamente este WAV.';$('play').disabled=$('export').disabled=false;}
async function init(){try{$('text').textContent=data.text;for(const id of ['before','after']){const controller=await createIsaPortrait($(id));controller.setSpeechLanguage('en');controller.play('isa-awake');controllers.push(controller)}await changeVoice()}catch(e){$('status').textContent=e.message}}
audio.addEventListener('play',()=>{for(const c of controllers){c.setWorking(false);c.setSpeaking(true)}stopClock();tick();$('status').textContent='Reproduciendo · velocidad del audio 1×'});
audio.addEventListener('pause',()=>{stopClock();update()});audio.addEventListener('seeked',update);audio.addEventListener('timeupdate',update);audio.addEventListener('ended',()=>{stopClock();update();for(const c of controllers)c.setSpeaking(false);$('status').textContent='Lectura terminada.'});
$('play').addEventListener('click',async()=>{audio.currentTime=0;try{await audio.play()}catch(e){$('status').textContent=e.message}});
$('voice').addEventListener('change',()=>changeVoice().catch(e=>$('status').textContent=e.message));$('anchors').addEventListener('change',update);$('seek').addEventListener('input',()=>seek(+$('seek').value));$('bar').addEventListener('click',event=>{const box=$('bar').getBoundingClientRect();seek((event.clientX-box.left)/box.width*analysis.duration)});
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});
$('export').addEventListener('click',()=>{const result={text:data.text,voice:sample.id,audioSha256:sample.sha256,duration:analysis.duration,pauses:analysis.pauses,micro:analysis.micro,anchors:anchors.events,enabled:$('anchors').checked,reviewed:false};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='isa-cori-timing-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
window.addEventListener('pagehide',()=>{audio.pause();for(const c of controllers)c.destroy()},{once:true});init();
`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'js'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',plugins:[{name:'embed-atlases',setup(b){b.onLoad({filter:/isa-(portrait|speech)-manifest(?:-en)?\.json$/},async({path:filename})=>{const m=JSON.parse(await readFile(filename,'utf8'));const image=async f=>'data:image/webp;base64,'+(await readFile(path.join(root,'public',f))).toString('base64');if(m.image)m.image=await image(m.image);if(m.pages)for(const p of m.pages)p.image=await image(p.image);return{contents:JSON.stringify(m),loader:'json'}})}}]});
const html=await readFile(path.join(root,'scripts/isa-cori-timing-comparison.html'),'utf8');
const output=path.join(root,'tmp/isa-mouth-preview/index-3c-cori-texto-calido-lluvia-ajuste.html');
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,html.replace('<!--FILTER-->',filter).replace('/*BUNDLE*/',bundle.outputFiles[0].text.replaceAll('</script','<\\/script')));
console.log(output);console.log(JSON.stringify(cases.map(({id,duration})=>({id,duration})),null,2));
