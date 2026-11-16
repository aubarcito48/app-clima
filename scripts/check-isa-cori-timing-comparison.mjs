import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import ts from 'typescript';
import { chromium,expect } from '@playwright/test';
import { createPauseAnchors,sourceAtPhase } from './isa-cori-pause-anchors.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(root,'tmp/isa-mouth-preview');
let source=await readFile(path.join(root,'src/app/shared/isabel/isa-playback.ts'),'utf8');
for(const m of [...source.matchAll(/^import (\w+) from '(.*\.json)';$/gm)])source=source.replace(m[0],`const ${m[1]}=${await readFile(path.join(root,'src/app/shared/isabel',m[2]),'utf8')};`);
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const runtime=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const manifest=JSON.parse(await readFile(path.join(root,'docs/isa-local/cori-timing-variants/manifest.json'),'utf8')),reports=[];
for(const sample of manifest.cases){
 const raw=await readFile(path.join(root,'docs/isa-local',sample.file));
 const analysis=runtime.createIsaPlayback(Uint8Array.from(raw).buffer,'en');assert.ok(analysis);
 const clock=createPauseAnchors(analysis.duration,analysis.pauses,analysis.micro);
 let previous=0,previousSource=0,maxLag=0,minRate=1,maxRate=1;
 const step=.001;
 for(let n=1;n<=Math.ceil(analysis.duration/step);n++){
  const t=Math.min(analysis.duration,n*step),phase=clock.phaseAt(t),dt=t-(n-1)*step;
  const source=sourceAtPhase(analysis,phase),rate=(phase-previous)/dt;
  assert.ok(source>=previousSource-1e-9);assert.ok(phase>=previous-1e-9);
  assert.ok(phase<=t+1e-9);maxLag=Math.max(maxLag,t-phase);minRate=Math.min(minRate,rate);maxRate=Math.max(maxRate,rate);
  previous=phase;previousSource=source;
 }
 assert.ok(maxLag<=.100001);assert.ok(minRate>=.3999);assert.ok(maxRate<=1.1501);
 assert.equal(clock.phaseAt(0),0);assert.equal(clock.phaseAt(analysis.duration),analysis.duration);
 reports.push({voice:sample.id,duration:analysis.duration,pauses:analysis.pauses.length,micro:analysis.micro.length,maxLag,minRate,maxRate,endLag:0});
}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1180,height:1100}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.goto(pathToFileURL(path.join(folder,'index-3c-cori-texto-calido-lluvia-ajuste.html')).href);
 const play=page.getByRole('button',{name:'Reproducir desde el inicio'});
 await expect(play).toBeEnabled({timeout:20000});await expect(page.locator('#text')).toHaveText(manifest.text);
 for(const sample of manifest.cases){
  await page.getByLabel('Grabación de Cori').selectOption(sample.id);await expect(play).toBeEnabled();
  await expect(page.locator('#summary')).toContainText(sample.duration.toFixed(3));
  const report=reports.find(r=>r.voice===sample.id);
  await expect(page.locator('.interval.pause')).toHaveCount(report.pauses);
  await expect(page.locator('.interval.micro')).toHaveCount(report.micro);
  await page.locator('#seek').fill('3.1');
  await expect.poll(()=>page.locator('#position').textContent()).toContain('3.100');
  await page.getByLabel('Activar ajuste de silencios en el retrato derecho').uncheck();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#before').dataset.sourceTime===document.querySelector('#after').dataset.sourceTime)).toBe(true);
  await page.getByLabel('Activar ajuste de silencios en el retrato derecho').check();
  await play.click();await expect(page.locator('#before canvas')).toHaveAttribute('data-isa-speaking','true');
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThan(.2);
  const middle=await page.locator('#cursor').evaluate(e=>parseFloat(e.style.left));assert.ok(middle>0);
  await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-.1});
  await expect(page.locator('#status')).toHaveText('Lectura terminada.');
  await expect(page.locator('#after canvas')).toHaveAttribute('data-isa-speaking','false');
  await expect.poll(()=>page.locator('#after canvas').getAttribute('data-isa-speech-blend')).toBe('0.000');
 }
 await page.locator('#seek').fill('3.1');
 await expect.poll(()=>page.locator('#before canvas').getAttribute('data-isa-speech-blend')).toBe('1.000');
 await expect.poll(()=>page.locator('#after canvas').getAttribute('data-isa-speech-blend')).toBe('1.000');
 await page.screenshot({path:path.join(folder,'cori-timing-comparison-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar comparación'}).click();assert.equal((await download).suggestedFilename(),'isa-cori-timing-comparison.json');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 await writeFile(path.join(folder,'cori-timing-comparison-checks.json'),JSON.stringify({passed:true,reports,reviewed:false},null,2));
}finally{await browser.close()}
console.log(JSON.stringify(reports,null,2));
