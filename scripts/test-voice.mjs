import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import { firstValueFrom } from 'rxjs';

// Bundle the browser transport without starting a server or requesting providers.
await build({ configFile: false, logLevel: 'silent', build: {
  lib: { entry: 'src/react/service/assistant/voice/voice-stream.ts', formats: ['es'], fileName: () => 'transport.mjs' },
  outDir: 'test-results/voice-unit', emptyOutDir: true,
  rolldownOptions: { external: ['rxjs'] },
} });
const { requestVoice } = await import(pathToFileURL(path.resolve('test-results/voice-unit/transport.mjs')).href);
const realFetch = globalThis.fetch;
try {
  const wav = await readFile('e2e/data/isa/es_long.wav');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Accept, 'audio/wav');
    assert.equal(JSON.parse(options.body).texto, 'Consejo de prueba.');
    return new Response(wav, { headers: { 'content-type': 'audio/wav' } });
  };
  const clip = await firstValueFrom(requestVoice('https://voice.example.invalid', { texto: 'Consejo de prueba.' }));
  assert.equal(clip.blob.size, wav.length);
  assert.equal(clip.index, 0); assert.equal(clip.total, 1);

  globalThis.fetch = async () => new Response(JSON.stringify({ type: 'audio', index: 1, total: 2, audio: wav.toString('base64') }) + '\n', { headers: { 'content-type': 'application/x-ndjson' } });
  await assert.rejects(firstValueFrom(requestVoice('https://voice.example.invalid', { texto: 'Prueba' })), /Invalid voice part/);

  let aborted = false;
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
  const pending = requestVoice('https://voice.example.invalid', { texto: 'Prueba' }).subscribe({ error() {} });
  pending.unsubscribe();
  assert.equal(aborted, true);
  console.log('3 voice transport checks passed: WAV, invalid stream order, cancellation.');
} finally { globalThis.fetch = realFetch; }
