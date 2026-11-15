import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'tmp/isa-mouth-preview');
const hashes = async () => Promise.all(['index.html', 'index-2.html', 'index-3.html'].map(async name =>
  createHash('sha256').update(await readFile(path.join(folder, name))).digest('hex')));
const before = await hashes();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(folder, 'index-3b.html')).href);
  await expect(page.locator('#status')).toContainText('Listo: 8 tramos de 6');
  const reports = [];
  for (const length of [4, 6, 8]) {
    await page.getByLabel('Cuadros por tramo').selectOption(String(length));
    const report = await page.evaluate(() => {
      const length = +$('length').value;
      const scratch = document.createElement('canvas'); scratch.width = scratch.height = 320;
      let mismatches = 0, internalErrors = 0, boundaries = 0;
      for (let t = 0; t < count; t++) {
        if (t && t % length && plan[t] !== plan[t - 1] + 1) internalErrors++;
        if (t && !(t % length) && plan[t] !== plan[t - 1] + 1) boundaries++;
        audio.currentTime = t / data.fps; render(); draw(scratch, plan[t]);
        const a = scratch.getContext('2d').getImageData(0, 0, 320, 320).data;
        const b = $('selected').getContext('2d').getImageData(0, 0, 320, 320).data;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches++;
      }
      return { length, frames: plan.length, unique: new Set(plan).size, internalErrors, boundaries, mismatches };
    });
    assert.equal(report.frames, 48); assert.equal(report.internalErrors, 0);
    assert.equal(report.mismatches, 0); reports.push(report);
  }
  await page.getByLabel('Cuadros por tramo').selectOption('6');
  await page.getByRole('button', { name: 'Reproducir los 2 segundos' }).click();
  await page.waitForFunction(() => audio.currentTime > .4 && !audio.paused);
  await page.evaluate(() => audio.pause());
  await page.screenshot({ path: path.join(folder, 'comparison-3b.png'), fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar selección para revisar' }).click();
  const artifact = await download;
  const exported = JSON.parse(await readFile(await artifact.path(), 'utf8'));
  assert.equal(exported.experiment, '3B'); assert.equal(exported.framesPerClip, 6);
  assert.equal(exported.reviewed, false); assert.equal(exported.sequence.length, 48);
  for (let i = 1; i < 48; i++) if (i % 6) assert.equal(exported.sequence[i].sourceFrame, exported.sequence[i - 1].sourceFrame + 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []); assert.deepEqual(await hashes(), before);
  console.log('OK: consecutive native frames, playback, export, mobile; HTML 1/2/3 unchanged.', reports);
} finally { await browser.close(); }
