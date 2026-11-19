import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import * as referenceRuntime from './reference/isa-playback-before-english-v2.mjs';
import { loadIsaPlayback } from './load-isa-playback.mjs';
import { alignEnglishFrames, alignedSourceAt, alignmentAgreement, withEnglishLabelReview,
  englishAlignmentPolicy as policy, readRhubarbCues } from './isa-english-frame-alignment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'tmp/isa-mouth-preview'), stem = 'index-3c-cori-seleccion-ingles-v2';
const hash = raw => createHash('sha256').update(raw).digest('hex');
const read = file => readFile(path.join(root, file));
const report = JSON.parse(await read('tmp/isa-mouth-preview/' + stem + '.json'));
const catalog = JSON.parse(await read('src/app/shared/assistant/isabel/isa-speech-selection-en.json'));
const catalogBefore = structuredClone(catalog), trialCatalog = withEnglishLabelReview(catalog,report.visualReview);
assert.deepEqual(catalog, catalogBefore);
assert.equal(catalog.labels[catalog.candidates.indexOf(140)], 'X');
assert.equal(trialCatalog.labels[140], 'X');
assert.equal(trialCatalog.labels[72], 'B');
assert.equal(trialCatalog.labels[86], 'X');
assert.equal(trialCatalog.labels[144], 'X');
const protectedFiles = [
  ...['isa-frame-selector-es.ts', 'isa-frame-selector-en.ts', 'isa-playback.ts', 'isa-portrait.ts',
    'isa-speech-selection.json', 'isa-speech-selection-en.json'].map(n => 'src/app/shared/assistant/isabel/' + n),
  ...['index-3c-cori-director-ingles-v1.html', 'index-3c-cori-texto-calido-lluvia.html',
    'index-3c-cori-texto-calido-lluvia-ajuste.html'].map(n => 'tmp/isa-mouth-preview/' + n),
  ...(await readdir(path.join(root, 'public/isa-bot/runtime'))).map(n => 'public/isa-bot/runtime/' + n),
];
const protectedHashes = async () => Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, hash(await read(file))])));
const before = await protectedHashes(), runtime = referenceRuntime, reports = [];
const production = await loadIsaPlayback();
for (const sample of [...report.cases, {
  id: 'english-long-regression', file: 'reference-2026-11-15/backend/tmp/isa-rhubarb/en_long.wav',
}]) {
  const raw = await read('docs/isa-local/' + sample.file);
  if (sample.sha256) assert.equal(hash(raw), sample.sha256);
  const analysis = runtime.createIsaPlayback(Uint8Array.from(raw).buffer, 'en');
  assert.ok(analysis);
  const cues = readRhubarbCues(raw), plan = alignEnglishFrames(cues, analysis.duration, trialCatalog);
  const active = production.createIsaPlayback(Uint8Array.from(raw).buffer, 'en');
  assert.ok(active);
  assert.deepEqual(active.cycles, plan.cycles);
  assert.deepEqual(active.pauses, analysis.pauses);
  assert.deepEqual(active.micro, analysis.micro);
  const oldSpanish = runtime.createIsaPlayback(Uint8Array.from(raw).buffer, 'es');
  const newSpanish = production.createIsaPlayback(Uint8Array.from(raw).buffer, 'es');
  assert.deepEqual(newSpanish.cycles, oldSpanish.cycles);
  if (sample.aligned) assert.deepEqual({ cycles: plan.cycles, events: plan.events }, sample.aligned);
  for (const cycle of plan.cycles) {
    assert.equal(cycle[0], policy.first);
    if (cycle.length === policy.end - policy.first) assert.equal(cycle.at(-1), policy.end - 1);
    for (let i = 0; i < cycle.length; i++) {
      assert.ok(Number.isInteger(cycle[i]) && cycle[i] >= policy.first && cycle[i] < policy.end);
      assert.ok(Math.abs(cycle[i] - policy.first - i) <= policy.maxDrift);
      if (i) assert.ok(cycle[i] >= cycle[i-1] && cycle[i] - cycle[i-1] <= 2);
    }
  }
  let previous = -1;
  for (let n = 0; n <= Math.ceil(analysis.duration * 240); n++) {
    const t = Math.min(analysis.duration, n/240), source = plan.sourceSecondsAt(t);
    assert.ok(Number.isFinite(source) && source >= previous - 1e-9);
    assert.equal(source, alignedSourceAt(plan.cycles, analysis.duration, t));
    assert.ok(Math.abs(active.sourceSecondsAt(t) - source) < 1e-12);
    assert.equal(newSpanish.sourceSecondsAt(t), oldSpanish.sourceSecondsAt(t));
    assert.equal(active.sourceSecondsAt(t), source);
    assert.equal(newSpanish.sourceSecondsAt(t), oldSpanish.sourceSecondsAt(t));
    if (n) assert.ok(source - previous <= 2/240 + 1e-9);
    previous = source;
  }
  for (let i = 0; i < plan.events.length; i++) {
    const event = plan.events[i];
    if (i && Math.floor(event.time / 7) === Math.floor(plan.events[i-1].time / 7))
      assert.ok(event.time - plan.events[i-1].time >= 5/24 - 1e-9);
    if (event.kind === 'skip') {
      assert.equal(event.to - event.from, 2);
      assert.ok(event.pose <= policy.maxPose && event.motion <= policy.maxMotion);
    } else assert.equal(event.to, event.from);
  }
  const current = alignmentAgreement(cues, analysis.duration, trialCatalog, analysis.sourceSecondsAt);
  const trial = alignmentAgreement(cues, analysis.duration, trialCatalog, plan.sourceSecondsAt);
  if (sample.metrics) {
    assert.deepEqual({ reference: current, trial }, sample.metrics);
    assert.ok(trial.agreement > current.agreement);
    assert.ok(trial.closedMatches >= current.closedMatches);
  }
  reports.push({ id: sample.id, duration: analysis.duration, reference: current, trial, events: plan.events.length });
}
assert.throws(() => alignEnglishFrames([], 1, trialCatalog));
assert.throws(() => withEnglishLabelReview(catalog,{overrides:[{first:0,last:1,shape:''}]}));
assert.equal(production.createIsaPlayback(new ArrayBuffer(0),'en'),undefined);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1100 } });
  const errors = [], network = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  await page.goto(pathToFileURL(path.join(folder, stem + '.html')).href);
  const play = page.getByRole('button', { name: 'Reproducir desde el inicio' });
  await expect(play).toBeEnabled({timeout:20000});
  await expect(page.locator('#text')).toHaveText(report.text);
  for (const side of ['before', 'after'])
    await expect(page.locator('#' + side + ' canvas')).toHaveAttribute('data-isa-speech-language', 'en');
  for (const sample of report.cases) {
    await page.getByLabel('Grabación de Cori').selectOption(sample.id);
    await expect(play).toBeEnabled();
    await expect(page.locator('#duration')).toContainText(sample.duration.toFixed(3));
    await page.locator('#seek').fill('3.1');
    await expect(page.locator('#position')).toContainText('3.100');
    await page.getByLabel('Activar selección inglesa nueva en el retrato derecho').uncheck();
    await expect.poll(() => page.evaluate(() => document.querySelector('#before').dataset.sourceTime === document.querySelector('#after').dataset.sourceTime)).toBe(true);
    await page.getByLabel('Activar selección inglesa nueva en el retrato derecho').check();
    await play.click();
    await expect.poll(() => page.locator('#audio').evaluate(a => a.currentTime)).toBeGreaterThan(.3);
    await expect(page.locator('#after canvas')).toHaveAttribute('data-isa-speaking', 'true');
    assert.equal(await page.locator('#audio').evaluate(a => a.playbackRate), 1);
    await expect(page.locator('#status')).toHaveText('Lectura terminada.', {timeout:20000});
    for (const side of ['before', 'after']) {
      await expect(page.locator('#' + side + ' canvas')).toHaveAttribute('data-isa-speaking', 'false');
      await expect.poll(() => page.locator('#' + side + ' canvas').getAttribute('data-isa-speech-blend')).toBe('0.000');
    }
  }
  await page.locator('#seek').fill('3.1');
  await expect.poll(() => page.locator('#after canvas').getAttribute('data-isa-speech-blend')).toBe('1.000');
  await page.locator('summary').click();
  await page.screenshot({path:path.join(folder,stem+'-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Cambiar tema'}).click();
  await page.screenshot({path:path.join(folder,stem+'-dark.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(folder,stem+'-mobile.png'),fullPage:true});
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Guardar comparación'}).click();
  const artifact = await download, exported = JSON.parse(await readFile(await artifact.path(),'utf8'));
  assert.equal(exported.reviewed,false); assert.equal(exported.productionChanged,false);
  assert.equal(exported.cases[1].sha256,report.cases[1].sha256);
  assert.equal(exported.cases[1].audio,undefined);
  assert.deepEqual(errors,[]); assert.deepEqual(network,[]);
} finally { await browser.close(); }
assert.deepEqual(await protectedHashes(),before);
assert.deepEqual(catalog,catalogBefore);
await writeFile(path.join(folder,stem+'-checks.json'),JSON.stringify({passed:true,reviewed:false,reports},null,2));
console.log('OK: real cues, bounded monotonic plans, loop endpoints, original WAVs, A/B, playback/end, export/mobile/offline; protected files unchanged.');
console.log(JSON.stringify(reports,null,2));
