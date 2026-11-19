import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import * as referenceRuntime from './reference/isa-playback-before-english-v2.mjs';
import { alignEnglishFrames, alignmentAgreement, alignmentCoverage, withEnglishLabelReview, readRhubarbCues, englishAlignmentPolicy } from './isa-english-frame-alignment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'tmp/isa-mouth-preview');
const output = path.join(folder, 'index-3c-cori-seleccion-ingles-v2.html');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/isa-local/cori-english-director-v1/manifest.json'), 'utf8'));
const catalog = JSON.parse(await readFile(path.join(root, 'src/app/shared/assistant/isabel/isa-speech-selection-en.json'), 'utf8'));
const review = JSON.parse(await readFile(path.join(root,'docs/isa-local/english-frame-alignment-v2/visual-label-review.json'),'utf8'));
if (sha256(await readFile(path.join(root,'public/isa-bot',review.source))) !== review.sourceSha256)
  throw new Error('The reviewed English source video has changed');
// Both plans are measured against the same refined, still provisional labels.
const trialCatalog = withEnglishLabelReview(catalog, review);
const runtime = referenceRuntime, cases = [];
for (const sample of manifest.cases) {
  const raw = await readFile(path.join(root, 'docs/isa-local', sample.file));
  if (sha256(raw) !== sample.sha256) throw new Error('Source audio hash mismatch');
  const analysis = runtime.createIsaPlayback(Uint8Array.from(raw).buffer, 'en');
  if (!analysis) throw new Error('Missing real Rhubarb analysis');
  const cues = readRhubarbCues(raw), aligned = alignEnglishFrames(cues, analysis.duration, trialCatalog);
  cases.push({ ...sample, audio: 'data:audio/wav;base64,' + raw.toString('base64'), cues,
    aligned: { cycles: aligned.cycles, events: aligned.events },
    coverage: alignmentCoverage(cues, analysis.duration, trialCatalog),
    metrics: {
      reference: alignmentAgreement(cues, analysis.duration, trialCatalog, analysis.sourceSecondsAt),
      trial: alignmentAgreement(cues, analysis.duration, trialCatalog, aligned.sourceSecondsAt),
    },
  });
}
const data = { experiment: 'english-frame-alignment-v2', text: manifest.text, cases,
  policy: englishAlignmentPolicy, visualReview: review,
  reviewed: false, productionChanged: false };
const filter = (await readFile(path.join(root, 'src/app/shared/assistant/isabel/isabel.html'), 'utf8')).match(/<filter id="isa-dark-edge"[\s\S]*?<\/filter>/)[0];
const entry = `
import {createIsaPortrait} from './src/app/shared/assistant/isabel/isa-portrait.ts';
import {createIsaPlayback} from './scripts/reference/isa-playback-before-english-v2.mjs';
import {alignedSourceAt} from './scripts/isa-english-frame-alignment.mjs';
const data=${JSON.stringify(data)};
const $=id=>document.getElementById(id),audio=$('audio');
let controllers=[],sample,reference,ready=false,raf,generation=0;
function stopClock(){if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined}
function update(){if(!ready)return;const t=Math.min(sample.duration,audio.currentTime),old=reference.sourceSecondsAt(t),next=$('enabled').checked?alignedSourceAt(sample.aligned.cycles,sample.duration,t):old;
 controllers[0].setSpeechTime(old);controllers[1].setSpeechTime(next);
 $('before').dataset.sourceTime=old;$('after').dataset.sourceTime=next;
 const cue=sample.cues.find(c=>c.start<=t&&t<c.end);
 $('cue').textContent='Rhubarb en este instante: '+(cue?.value??'X');
 $('beforeInfo').textContent='Cuadro '+(12+Math.floor(old*24+1e-7)%168);
 $('afterInfo').textContent=($('enabled').checked?'Seguimiento nuevo':'Control actual')+' · cuadro '+(12+Math.floor(next*24+1e-7)%168);
 $('seek').value=t;$('position').textContent=t.toFixed(3)+' / '+sample.duration.toFixed(3)+' s';
}
function tick(){update();if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(tick)}
function seek(t){if(!ready)return;audio.pause();audio.currentTime=Math.max(0,Math.min(sample.duration,t));for(const c of controllers){c.setWorking(false);c.setSpeaking(true)}update();$('status').textContent='En pausa.'}
async function changeVoice(){const token=++generation;ready=false;stopClock();audio.pause();for(const c of controllers){c.setSpeaking(false);c.setWorking(true)}$('play').disabled=$('export').disabled=true;
 sample=data.cases.find(c=>c.id===$('voice').value);const raw=Uint8Array.from(atob(sample.audio.split(',')[1]),c=>c.charCodeAt(0));reference=createIsaPlayback(raw.buffer,'en');if(!reference)throw new Error('Faltan marcas Rhubarb');
 const loaded=new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',()=>reject(new Error('No se pudo cargar el audio')),{once:true})});audio.src=sample.audio;audio.load();await loaded;if(token!==generation)return;ready=true;
 $('seek').max=sample.duration;$('duration').textContent=sample.duration.toFixed(3)+' s · '+sample.cues.length+' marcas Rhubarb · audio original a 1×';
 const fmt=m=>(m.agreement*100).toFixed(1)+'% ('+m.matches+'/'+m.total+')';
 $('metrics').textContent='Coincidencia de etiquetas: actual '+fmt(sample.metrics.reference)+'; ensayo '+fmt(sample.metrics.trial)+'. Es una medida diagnóstica con etiquetas visuales provisionales; no mide calidad perceptual.';
 $('events').textContent=sample.aligned.events.filter(e=>e.kind==='hold').length+' retenciones de un cuadro y '+sample.aligned.events.filter(e=>e.kind==='skip').length+' saltos de un cuadro.';
 $('coverage').textContent='Cierres solicitados por Rhubarb: '+sample.coverage.closedTotal+' instantes; solo '+sample.coverage.closedAvailable+' tienen una boca cerrada a ocho cuadros o menos de la secuencia nativa, aun antes de limitar los saltos de pose.';
 $('play').disabled=$('export').disabled=false;update();$('status').textContent='Listo para comparar.';
}
async function init(){try{$('text').textContent=data.text;for(const id of ['before','after']){const c=await createIsaPortrait($(id));c.setSpeechLanguage('en');c.play('isa-awake');controllers.push(c)}await changeVoice()}catch(e){$('status').textContent=e.message}}
audio.addEventListener('play',()=>{for(const c of controllers){c.setWorking(false);c.setSpeaking(true)}stopClock();tick();$('status').textContent='Reproduciendo.'});
audio.addEventListener('pause',()=>{stopClock();update()});audio.addEventListener('seeked',update);audio.addEventListener('timeupdate',update);
audio.addEventListener('ended',()=>{stopClock();update();for(const c of controllers)c.setSpeaking(false);$('status').textContent='Lectura terminada.'});
$('play').addEventListener('click',async()=>{audio.currentTime=0;try{await audio.play()}catch(e){$('status').textContent=e.message}});
$('voice').addEventListener('change',()=>changeVoice().catch(e=>$('status').textContent=e.message));$('seek').addEventListener('input',()=>seek(+$('seek').value));$('enabled').addEventListener('change',update);
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});
$('export').addEventListener('click',()=>{const report={...data,cases:data.cases.map(({audio,...c})=>c),selected:sample.id,enabled:$('enabled').checked};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='isa-english-frame-alignment-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
window.addEventListener('pagehide',()=>{audio.pause();for(const c of controllers)c.destroy()},{once:true});init();
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true,
  write: false, platform: 'browser', format: 'iife', target: 'es2022', plugins: [{ name: 'embed-atlases', setup(b) {
    b.onLoad({ filter: /isa-(portrait|speech)-manifest(?:-en)?\.json$/ }, async ({ path: filename }) => {
      const m = JSON.parse(await readFile(filename, 'utf8'));
      const image = async f => 'data:image/webp;base64,' + (await readFile(path.join(root, 'public', f))).toString('base64');
      if (m.image) m.image = await image(m.image);
      if (m.pages) for (const p of m.pages) p.image = await image(p.image);
      return { contents: JSON.stringify(m), loader: 'json' };
    });
  } }] });
let html = await readFile(path.join(root, 'scripts/isa-english-frame-alignment.html'), 'utf8');
html = html.replace('<!--FILTER-->', filter).replace('/*BUNDLE*/', bundle.outputFiles[0].text.replaceAll('</script', '<\\/script'));
await mkdir(folder, { recursive: true }); await writeFile(output, html);
const report = { ...data, cases: data.cases.map(({ audio, ...c }) => c) };
await writeFile(output.replace(/\.html$/, '.json'), JSON.stringify(report, null, 2));
console.log(output); console.log(JSON.stringify(cases.map(({ id, metrics, aligned }) => ({ id, metrics, events: aligned.events.length })), null, 2));
