import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { selectForwardSequence } from './isa-forward-sequence-selector.mjs';
import { pauseTimeline } from './isa-audio-pauses.mjs';
import { microPauseTimeline } from './isa-micro-pauses.mjs';
import { englishPhaseAt, englishSourceAt } from './isa-english-rhythm.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'tmp/isa-mouth-preview');
const file=path.join(folder,'index-3c-cori-video-ingles.html');
const parse=async file=>JSON.parse((await readFile(file,'utf8')).split('const data=')[1].split(/;\r?\nconst \$=/)[0]);
const data=await parse(file),approved=await parse(path.join(folder,'index-3c-micropausas-cori.html'));
assert.deepEqual(data.old.frames,approved.frames);
assert.deepEqual(data.old.labels,approved.labels);
assert.notDeepEqual(data.new.labels,data.old.labels);
assert.equal(data.new.frames.length,204);
assert.equal(createHash('sha256').update(await readFile(path.join(root,'public/isa-bot/isa-video-ingles.mp4'))).digest('hex'),data.videoSha256);
const reports=[];
for(const sample of data.cases){
  assert.equal(createHash('sha256').update(Buffer.from(sample.audio.split(',')[1],'base64')).digest('hex'),sample.sha256);
  if(sample.id==='cori-1_08'){
    assert.equal(sample.audio,approved.audio);
    assert.deepEqual(sample.cues,approved.cues);
    assert.deepEqual(sample.acoustics,approved.acoustics);
    assert.deepEqual(sample.micro,approved.micro);
  }
  const plan=selectForwardSequence({...data.new,...sample},data.new.labels);
  for(let i=1;i<plan.plan.length;i++)assert.ok(plan.plan[i]>plan.plan[i-1]&&plan.plan[i]-plan.plan[i-1]<=3);
  for(const seam of plan.seams){assert.ok(seam.pose<=.04);assert.ok(seam.motion<=.025)}
  const base=pauseTimeline(sample.duration,sample.acoustics.pauses,.8);
  const clock=microPauseTimeline(base,sample.micro.gaps,sample.acoustics.pauses,1);
  let previous=-1;
  for(let i=0;i<=sample.duration*120;i++){
    const phase=englishPhaseAt(clock.rows,i/120).phase;
    const frame=englishSourceAt(plan.plan,phase,24,sample.duration);
    assert.ok(phase>=previous);assert.ok(frame>=0&&frame<data.new.frames.length);previous=phase;
  }
  reports.push({voice:sample.id,pauses:sample.acoustics.pauses.length,micro:sample.micro.gaps.length,seams:plan.seams.length});
}
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[],network=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
  await page.goto(pathToFileURL(file).href);
  const play=page.getByRole('button',{name:'Reproducir desde el inicio'});
  await expect(play).toBeEnabled({timeout:20000});
  await expect(page.locator('canvas')).toHaveCount(3);
  const before=await page.locator('#selected').getAttribute('data-frame');
  await play.click();
  await expect.poll(()=>page.locator('#selected').getAttribute('data-frame')).not.toBe(before);
  await expect(page.locator('#status')).toContainText('Lectura terminada',{timeout:10000});
  await page.getByLabel('Voz de Cori').selectOption('cori-1');
  await expect(play).toBeEnabled();
  await expect(page.locator('#summary')).toContainText('propios de este audio');
  await page.locator('#time').fill('1.5');
  await expect.poll(()=>page.locator('#timeValue').textContent()).toBe('1.500 s');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Guardar comparación'}).click();
  assert.equal((await download).suggestedFilename(),'isa-cori-english-video-review.json');
  await page.screenshot({path:path.join(folder,'english-take-1/desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(folder,'english-take-1/mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  await writeFile(path.join(folder,'english-take-1/checks.json'),JSON.stringify({passed:true,reports,browser:'Chromium desktop/mobile',reviewed:false},null,2));
}finally{await browser.close()}
console.log('OK: real Cori audio/cues, preserved reference, new labels, forward-only selection, acoustic clocks, playback/end/voice/export/mobile, no network.');
console.log(JSON.stringify(reports,null,2));
