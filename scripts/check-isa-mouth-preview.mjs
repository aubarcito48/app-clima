// Focused, offline browser checks. Does not start Angular or any backend.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = path.resolve(process.argv[2] ?? path.join(root, 'tmp/isa-mouth-preview/index.html'));
const output = path.dirname(preview);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 980 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(preview).href);
  await expect(page.getByRole('status', { name: 'Preparación de la vista' })).toContainText('Listo:');
  await expect(page.getByRole('button', { name: /^Boca [A-HX]$/ })).toHaveCount(9);
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Boca B', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // The canvas must change inside the mouth, never in the hair, eyes or body.
  const sampleCanvas = () => {
    const canvas = document.getElementById('portrait');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let outside = 2166136261, inside = 2166136261;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const mouth = x >= 500 && x <= 645 && y >= 366 && y <= 467;
      const i = (y * canvas.width + x) * 4;
      for (let c = 0; c < 4; c++) {
        if (mouth) inside = Math.imul(inside ^ pixels[i + c], 16777619);
        else outside = Math.imul(outside ^ pixels[i + c], 16777619);
      }
    }
    return { outside, inside };
  };
  const withB = await page.evaluate(sampleCanvas);
  await page.getByLabel('Comparar con la base sin recorte').check();
  const base = await page.evaluate(sampleCanvas);
  assert.equal(withB.outside, base.outside, 'The overlay changed pixels outside the mouth');
  assert.notEqual(withB.inside, base.inside, 'B did not change the mouth');
  await page.getByLabel('Comparar con la base sin recorte').uncheck();
  await page.getByLabel('Fondo de revisión').selectOption('dark');
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Boca D', exact: true }).click();
  assert.notEqual((await page.evaluate(sampleCanvas)).inside, withB.inside, 'D and B are identical');
  await page.locator('#portrait').screenshot({ path: path.join(output, 'mouth-D.png') });

  // Review adjustments are exportable, but not silently applied to production.
  await page.getByLabel('Desplazamiento horizontal').fill('8');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar ajustes', exact: true }).click();
  const download = await downloadEvent;
  const result = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(result.settings.D.dx, 8);
  assert.equal(result.reviewed, false);
  await page.getByRole('button', { name: 'Restablecer esta boca', exact: true }).click();
  await expect(page.getByLabel('Desplazamiento horizontal')).toHaveValue('0');

  // Exercise real HTML audio time, seeking, pause and end of playback.
  await page.evaluate(() => { document.getElementById('audio').currentTime = .4; });
  await page.getByRole('button', { name: 'Seguir el audio', exact: true }).click();
  await page.evaluate(() => document.getElementById('audio').play());
  await page.waitForFunction(() => document.getElementById('audio').currentTime > .6);
  await page.evaluate(() => document.getElementById('audio').pause());
  const held = await page.evaluate(() => document.getElementById('audio').currentTime);
  await page.getByLabel('Mostrar límite del recorte').check();
  assert.equal(await page.evaluate(() => document.getElementById('audio').currentTime), held);
  await page.getByLabel('Mostrar límite del recorte').uncheck();
  await page.evaluate(() => { const audio = document.getElementById('audio'); audio.currentTime = audio.duration - .12; return audio.play(); });
  await page.waitForFunction(() => document.getElementById('audio').ended);
  await expect(page.locator('#shape')).toHaveText('Boca X');
  assert.deepEqual(await page.evaluate(sampleCanvas), base);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  assert.equal(await page.evaluate(() => document.getElementById('audio').currentTime), 0);

  const experimentalCue = await page.evaluate(() => data.cues.findIndex(cue => cue.value === 'G' || cue.value === 'H'));
  if (experimentalCue >= 0) {
    await page.locator('#timeline button').nth(experimentalCue).click();
    await expect(page.locator('#shape')).toContainText('marca');
    await page.getByLabel('Usar G y H en la reproducción').check();
    await expect(page.locator('#shape')).not.toContainText('marca');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile horizontal overflow');
  assert.deepEqual(errors, []);
  console.log('OK: fixed base, distinct mouths, export/reset, real playback, pause, seek/end, experimental mapping and mobile layout.');
} finally {
  await browser.close();
}
