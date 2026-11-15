// Review the actual renderer and isav reader using existing local Piper audio.
// An ephemeral loopback-only server and a headless browser are always closed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wav = path.resolve(
  process.argv[2] ?? path.join(root, '../app-clima-backend/tmp/isa-rhubarb/es_long.wav'),
);
const output = path.join(root, 'tmp/isa-runtime-review');
await mkdir(output, { recursive: true });
const audio = await readFile(wav);
const bundle = await build({
  stdin: {
    contents: `
import {createIsaPortrait} from './src/app/shared/isabel/isa-portrait';
import {readIsaMouthTimeline,isaMouthAt} from './src/app/models/isa-mouth';
const audio=document.querySelector('audio');
const buffer=await (await fetch('/sample.wav')).arrayBuffer();
const cues=readIsaMouthTimeline(buffer);
const controller=await createIsaPortrait(document.querySelector('#avatar'),{lipSync:!location.search.includes('fallback')});
controller.play('isa-awake');
await controller.prepareLipSync();
window.runtime={controller,cues};
for(const shape of 'ABCDEFGHX'){
const b=document.createElement('button');b.textContent=shape;b.setAttribute('aria-label','Boca '+shape);
b.onclick=()=>{audio.pause();controller.setMouthShape(shape);controller.setSpeaking(true)};
document.querySelector('#controls').append(b);
}
let frame;
function tick(){controller.setMouthShape(isaMouthAt(cues,audio.currentTime));if(!audio.paused)frame=requestAnimationFrame(tick)}
audio.onplaying=()=>{cancelAnimationFrame(frame);controller.setMouthShape(isaMouthAt(cues,audio.currentTime));controller.setSpeaking(true);tick()};
audio.onended=()=>{cancelAnimationFrame(frame);controller.setSpeaking(false)};
window.addEventListener('pagehide',()=>controller.destroy());
document.querySelector('#ready').textContent='Listo';
`,
    resolveDir: root,
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
});
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Isa runtime</title>
<style>body{font:16px system-ui;background:#d9eff6;color:#173c50;padding:20px}#avatar{width:320px;height:320px;background:#173444;border-radius:14px}button{padding:8px;margin:4px}audio{display:block;margin:16px 0}</style>
<h1>Isa: renderizador real</h1><p id="ready">Preparando</p><div id="avatar"></div><audio src="/sample.wav" controls></audio><div id="controls"></div><script type="module" src="/renderer.js"></script></html>`;
const runtimeRoot = path.join(root, 'public/isa-bot/runtime');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(html);
    } else if (pathname === '/renderer.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(bundle.outputFiles[0].text);
    } else if (pathname === '/sample.wav') {
      response.setHeader('Content-Type', 'audio/wav');
      response.end(audio);
    } else if (/^\/isa-bot\/runtime\/[a-z0-9-]+\.webp$/.test(pathname)) {
      response.setHeader('Content-Type', 'image/webp');
      response.end(await readFile(path.join(runtimeRoot, path.basename(pathname))));
    } else {
      response.writeHead(404);
      response.end();
    }
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('#ready')).toHaveText('Listo');
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.isaTransition === '1.000',
  );
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-isa-speech-mode', 'rhubarb');
  await page.waitForFunction(
    () => document.querySelector('canvas').dataset.isaSpeechBlend === '1.000',
  );
  const fixed = await page.evaluate(() => {
    const { controller } = window.runtime,
      canvas = document.querySelector('canvas'),
      ctx = canvas.getContext('2d');
    controller.setMouthShape('X');
    const a = ctx.getImageData(0, 0, 320, 320).data;
    controller.setMouthShape('D');
    const b = ctx.getImageData(0, 0, 320, 320).data;
    let inside = 0,
      outside = 0;
    for (let y = 0; y < 320; y++)
      for (let x = 0; x < 320; x++)
        for (let c = 0; c < 4; c++)
          if (a[(y * 320 + x) * 4 + c] !== b[(y * 320 + x) * 4 + c]) {
            if (x >= 125 && x < 173 && y >= 119 && y < 159) inside++;
            else outside++;
          }
    return { inside, outside };
  });
  assert.equal(fixed.outside, 0);
  assert.ok(fixed.inside > 0);
  await page.locator('canvas').screenshot({ path: path.join(output, 'mouth-D.png') });
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'runtime-B.png') });
  await page.evaluate(() => document.querySelector('audio').play());
  await page.waitForFunction(() => document.querySelector('audio').currentTime > 0.3);
  await page.evaluate(() => {
    const a = document.querySelector('audio');
    a.currentTime = a.duration - 0.1;
  });
  await page.waitForFunction(() => document.querySelector('audio').ended);
  await page.waitForFunction(
    () => document.querySelector('canvas').dataset.isaSpeechMode === 'idle',
  );
  await page.locator('canvas').screenshot({ path: path.join(output, 'closed.png') });
  assert.deepEqual(errors, []);
  await page.goto(url + '?fallback');
  await expect(page.locator('#ready')).toHaveText('Listo');
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-isa-speech-mode', 'video');
  await page.route('**/isa-mouths-v1.webp', (route) => route.fulfill({ status: 404 }));
  await page.goto(url);
  await expect(page.locator('#ready')).toHaveText('Listo');
  await page.getByRole('button', { name: 'Boca B', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-isa-speech-mode', 'video');
  assert.deepEqual(errors, []);
  console.log(
    'OK: real native renderer, fixed pixels outside lips, WAV playback/end, explicit video mode and missing-atlas fallback.',
  );
  console.log(output);
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
