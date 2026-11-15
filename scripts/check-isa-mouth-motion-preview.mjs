// Local checks for HTML 2 only; never changes HTML 1 or starts app servers.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'tmp/isa-mouth-preview');
const first = path.join(folder, 'index.html');
const hash = async () => createHash('sha256').update(await readFile(first)).digest('hex');
const before = await hash();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(folder, 'index-2.html')).href);
  await expect(page.getByRole('status', { name: 'Preparación de la prueba 2' })).toContainText('Listo: 48');
  await page.getByLabel('Boca', { exact: true }).selectOption('D');
  const report = await page.evaluate(() => {
    const original = document.getElementById('original').getContext('2d');
    const adjusted = document.getElementById('adjusted').getContext('2d');
    let outside = 0, changedFrames = 0, fallbackFrames = 0;
    let initial, moved;
    for (let index = 0; index < data.frames.length; index++) {
      audio.currentTime = index / data.fps; render(true);
      const a = original.getImageData(0, 0, 320, 320).data;
      const b = adjusted.getImageData(0, 0, 320, 320).data;
      let inside = 0, bodyHash = 2166136261;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
        const lips = x >= 108 && x < 197 && y >= 108 && y < 175;
        const offset = (y * 320 + x) * 4;
        for (let c = 0; c < 4; c++) {
          if (!lips) bodyHash = Math.imul(bodyHash ^ a[offset+c], 16777619);
          if (a[offset+c] !== b[offset+c]) { if(lips) inside++; else outside++; }
        }
      }
      if (index === 0) initial = bodyHash;
      if (index === 24) moved = bodyHash;
      if (data.tracking[index].stable) { if (inside > 0) changedFrames++; }
      else { if (inside !== 0) throw new Error('An unstable frame was altered'); fallbackFrames++; }
    }
    return { outside, changedFrames, fallbackFrames, bodyMoves: initial !== moved };
  });
  assert.equal(report.outside, 0, 'Pixels outside lips changed between comparison views');
  assert.equal(report.bodyMoves, true, 'The video was frozen');
  assert.equal(report.changedFrames + report.fallbackFrames, 48);
  await page.getByLabel('Cuadro del fragmento').fill('12');
  await page.getByLabel('Fondo', { exact: true }).selectOption('dark');
  await page.screenshot({ path: path.join(folder, 'comparison-2.png'), fullPage: true });
  await page.getByLabel('Aplicar el recorte cuando el seguimiento sea estable').uncheck();
  assert.equal(await page.evaluate(() => {
    const a=contexts.original.getImageData(0,0,320,320).data,b=contexts.adjusted.getImageData(0,0,320,320).data;
    return a.every((value,index)=>value===b[index]);
  }), true);
  await page.getByLabel('Aplicar el recorte cuando el seguimiento sea estable').check();
  await page.getByLabel('Boca', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Reproducir los 2 segundos' }).click();
  await page.waitForFunction(() => document.getElementById('audio').currentTime > .3);
  await page.evaluate(() => audio.pause());
  const pausedTime = await page.evaluate(() => audio.currentTime);
  await page.getByLabel('Mostrar los tres puntos y el límite del recorte').check();
  assert.equal(await page.evaluate(() => audio.currentTime), pausedTime);
  await page.getByLabel('Mostrar los tres puntos y el límite del recorte').uncheck();
  await page.evaluate(() => { audio.currentTime = audio.duration - .1; return audio.play(); });
  await page.waitForFunction(() => audio.ended);
  await page.getByText('Ajustar este ensayo', { exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar ajustes de la prueba 2' }).click();
  const download = await downloadEvent;
  const settings = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(settings.experiment, 2); assert.equal(settings.reviewed, false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(folder, 'comparison-2-mobile.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  assert.equal(await hash(), before, 'HTML 1 was modified');
  console.log('OK:', JSON.stringify(report), '; playback, pause, frame selection, export, mobile and HTML 1 preservation.');
} finally {
  await browser.close();
}
