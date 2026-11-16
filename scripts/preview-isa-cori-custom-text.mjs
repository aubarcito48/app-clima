// Standalone timing check using the current production renderer and audio clock.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argument=(name,fallback)=>{const at=process.argv.indexOf(name);return at<0?fallback:process.argv[at+1]};
const wav=path.resolve(root,argument('--wav','docs/isa-local/cori-warm-rain.wav'));
const textFile=path.resolve(root,argument('--text-file','docs/isa-local/cori-warm-rain.txt'));
const output=path.resolve(root,argument('--output','tmp/isa-mouth-preview/index-3c-cori-texto-calido-lluvia.html'));
const text=(await readFile(textFile,'utf8')).trim(),bytes=await readFile(wav);
const audioUri='data:audio/wav;base64,'+bytes.toString('base64');
const template=await readFile(path.join(root,'src/app/shared/isabel/isabel.html'),'utf8');
const filter=template.match(/<filter id="isa-dark-edge"[\s\S]*?<\/filter>/)[0];
const metadata={text,audioSha256:createHash('sha256').update(bytes).digest('hex'),voice:'en_GB-cori-medium',synthesisScale:1.08,language:'en',reviewed:false};
const entry=`
import {createIsaPlayback} from './src/app/shared/isabel/isa-playback.ts';
import {createIsaPortrait} from './src/app/shared/isabel/isa-portrait.ts';
const metadata=${JSON.stringify(metadata)};
const uri=${JSON.stringify(audioUri)};
const $=id=>document.getElementById(id),audio=$('audio');
let controller,analysis,raf;
function sync(){if(!analysis||!controller)return;controller.setSpeechTime(analysis.sourceSecondsAt(audio.currentTime));$('position').textContent=audio.currentTime.toFixed(3)+' / '+analysis.duration.toFixed(3)+' s'}
function stopClock(){if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined}
function tick(){sync();if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(tick)}
async function init(){try{
const raw=Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0));analysis=createIsaPlayback(raw.buffer,'en');
if(!analysis)throw new Error('El WAV necesita marcas Rhubarb válidas para esta prueba');
controller=await createIsaPortrait($('avatar'));controller.setSpeechLanguage('en');controller.play('isa-awake');controller.setWorking(true);
const loaded=new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',()=>reject(new Error('No se pudo abrir el WAV')),{once:true})});
audio.src=uri;await loaded;
$('text').textContent=metadata.text;$('summary').textContent=analysis.duration.toFixed(3)+' segundos · '+analysis.pauses.length+' pausas · '+analysis.micro.length+' microhuecos · '+analysis.cycles.length+' tramos de animación';
for(const [kind,rows] of [['Pausa',analysis.pauses],['Microhueco',analysis.micro]])for(const row of rows){const tr=document.createElement('tr');for(const value of [kind,row.start.toFixed(3)+' s',row.end.toFixed(3)+' s',Math.round((row.end-row.start)*1000)+' ms']){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('gaps').append(tr)}
$('play').disabled=$('export').disabled=false;$('status').textContent='Listo: voz y animación actuales con tu texto.';sync();
}catch(e){$('status').textContent='No se pudo preparar: '+e.message}}
audio.addEventListener('play',()=>{controller.setWorking(false);controller.setSpeaking(true);stopClock();tick();$('status').textContent='Reproduciendo Cori · velocidad 1×'});
audio.addEventListener('pause',()=>{stopClock();sync()});audio.addEventListener('seeked',sync);audio.addEventListener('timeupdate',sync);
audio.addEventListener('ended',()=>{stopClock();sync();controller.setSpeaking(false);$('status').textContent='Lectura terminada.'});
$('play').addEventListener('click',async()=>{audio.currentTime=0;try{await audio.play()}catch(e){$('status').textContent=e.message}});
$('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme').textContent=dark?'Ver en claro':'Ver en oscuro'});
$('export').addEventListener('click',()=>{const report={...metadata,duration:analysis.duration,pauses:analysis.pauses,micro:analysis.micro,cycles:analysis.cycles,time:audio.currentTime};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='isa-cori-warm-rain-timing.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
window.addEventListener('pagehide',()=>{audio.pause();controller?.destroy()},{once:true});init();
`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'js'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',plugins:[{
 name:'embed-preview-atlases',setup(builder){builder.onLoad({filter:/isa-(portrait|speech)-manifest(?:-en)?\.json$/},async({path:filename})=>{
  const manifest=JSON.parse(await readFile(filename,'utf8'));
  const image=async file=>'data:image/webp;base64,'+(await readFile(path.join(root,'public',file))).toString('base64');
  if(manifest.image)manifest.image=await image(manifest.image);
  if(manifest.pages)for(const page of manifest.pages)page.image=await image(page.image);
  return{contents:JSON.stringify(manifest),loader:'json'};
 })}
}]});
const html=`<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa 3C · Cori · texto cálido y lluvia</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf8fc;color:#173c50;font:17px/1.6 'Segoe UI',sans-serif}main{max-width:1000px;padding:24px;margin:auto}h1{line-height:1.2}.stage{width:320px;height:320px;max-width:100%;margin:20px auto;background:#d7edf3;border-radius:18px}.controls{padding:18px;background:#fff;border:1px solid #aac8d6;border-radius:14px}audio{width:100%}button{font:inherit;padding:10px 14px;color:inherit;background:transparent;border:1px solid #698c9d;border-radius:8px;cursor:pointer;margin:8px 5px 8px 0}:focus-visible{outline:3px solid #c25b1b}blockquote{border-left:4px solid #698c9d;padding:12px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #aac8d6;text-align:left}.table{overflow:auto}html[data-theme=dark] body{background:#0c1b2b;color:#d9eef7}html[data-theme=dark] .stage{background:#112d3d}html[data-theme=dark] .stage canvas{filter:url(#isa-dark-edge)}html[data-theme=dark] .controls{background:#152d3f}a{color:inherit}
</style></head><body><main><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${filter}</defs></svg><h1>Isa 3C inglesa · tiempos de Cori</h1><blockquote id="text"></blockquote><p>Texto exacto, sin saludo ni despedida añadidos. Cori actual, con síntesis pausada × 1,08 y dirección local. Se analiza el WAV de esta frase y sus propias marcas Rhubarb. Se usa el renderizador y reloj de la app actual, incluido el ciclo inglés y el cierre.</p><div class="stage" id="avatar"></div><div class="controls"><audio id="audio" controls preload="metadata"></audio><button id="play" disabled>Reproducir desde el inicio</button><button id="theme">Ver en oscuro</button><button id="export" disabled>Guardar tiempos</button><p id="status" role="status">Preparando…</p><p id="summary"></p><p id="position"></p></div><p>El audio conserva sus pausas naturales y las del director local. No se agregan pausas artificiales para esta prueba ni se cambia la velocidad de reproducción. Los microhuecos acústicos no identifican necesariamente límites entre palabras.</p><details><summary>Ver pausas y microsilencios del WAV</summary><div class="table"><table><thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr></thead><tbody id="gaps"></tbody></table></div></details><p><a href="index-3c-cori-video-ingles.html">Volver a la comparación inglesa anterior</a> · Prueba aislada, sin modificar producción.</p></main><script>${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,html);
await writeFile(output.replace(/\.html$/,'.json'),JSON.stringify(metadata,null,2));
console.log(output);console.log(JSON.stringify({...metadata,htmlBytes:Buffer.byteLength(html)},null,2));
