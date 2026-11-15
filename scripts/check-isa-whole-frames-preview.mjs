import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'tmp/isa-mouth-preview');
const hashes = async () => Promise.all(['index.html', 'index-2.html'].map(async name =>
  createHash('sha256').update(await readFile(path.join(folder, name))).digest('hex')));
const before = await hashes();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(folder, 'index-3.html')).href);
  await expect(page.locator('#status')).toContainText('Listo: 51');
  const report = await page.evaluate(() => {
    const scratch = document.createElement('canvas'); scratch.width = scratch.height = 320;
    let mismatches = 0;
    for (let t = 0; t < count; t++) {
      audio.currentTime = t / data.fps; render();
      draw(scratch, data.candidates[plan[t]]);
      const a = scratch.getContext('2d').getImageData(0, 0, 320, 320).data;
      const b = $('selected').getContext('2d').getImageData(0, 0, 320, 320).data;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches++;
    }
    return { mismatches, unique: new Set(plan).size, length: plan.length };
  });
  assert.equal(report.mismatches, 0, 'Every selected image must be a whole native frame');
  assert.equal(report.length, 48);
  assert.ok(report.unique > 1, 'Selection must not be a fixed portrait');
  await page.getByLabel('Prioridad de continuidad').fill('2');
  await page.getByRole('button', { name: 'Reproducir los 2 segundos' }).click();
  await page.waitForFunction(() => audio.currentTime > .4 && !audio.paused);
  await page.evaluate(() => audio.pause());
  await page.screenshot({ path: path.join(folder, 'comparison-3.png'), fullPage: true });
  await page.getByText('Revisar las 51 formas de boca propuestas', { exact: true }).click();
  await page.getByLabel('Boca del cuadro 12', { exact: true }).selectOption('');
  assert.equal(await page.evaluate(() => plan.includes(0)), false);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar selección para revisar' }).click();
  const artifact = await download;
  const exported = JSON.parse(await readFile(await artifact.path(), 'utf8'));
  assert.equal(exported.experiment, 3); assert.equal(exported.reviewed, false);
  assert.equal(exported.labels[0].shape, '');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(folder, 'comparison-3-mobile.png'), fullPage: false });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(await hashes(), before);
  console.log('OK: whole native frames, editable selection, playback, export, mobile; HTML 1/2 unchanged.', report);
} finally { await browser.close(); }
