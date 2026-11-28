import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadConfigFromFile } from 'vite';

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));

async function configure(url) {
  const previous = process.env.PUBLIC_API_BASE_URL_PRODUCTION;
  process.env.PUBLIC_API_BASE_URL_PRODUCTION = url;
  try {
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      configFile,
      undefined,
      'silent',
    );
    assert.ok(loaded);
    return JSON.parse(loaded.config.define.__API_BASE_URL__);
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_API_BASE_URL_PRODUCTION;
    else process.env.PUBLIC_API_BASE_URL_PRODUCTION = previous;
  }
}

for (const url of [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://[::1]:8000',
  'https://api.example.com/',
]) {
  test(`production config accepts ${url}`, async () => {
    assert.equal(await configure(url), url.replace(/\/+$/u, ''));
  });
}

for (const url of [
  'http://api.example.com',
  'http://localhost.evil.example',
  'https://user:pass@api.example.com',
  'https://api.example.com?key=test',
]) {
  test(`production config rejects ${url}`, async () => {
    await assert.rejects(() => configure(url));
  });
}
