import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

for (const url of [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://[::1]:8000',
  'https://weather.example.com',
]) {
  test(`production build accepts ${url}`, () => {
    const result = configure(url);
    assert.equal(result.error, undefined);
    assert.ok(result.content.includes(JSON.stringify(url)));
  });
}

for (const url of [
  'http://weather.example.com',
  'http://localhost.evil.example',
  'https://user:pass@weather.example.com',
  'file:///tmp/api',
]) {
  test(`production build rejects ${url}`, () => {
    assert.ok(configure(url).error);
  });
}

function configure(url) {
  const root = mkdtempSync(join(tmpdir(), 'stitchweather-env-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'src/environments'), { recursive: true });
    copyFileSync(
      new URL('./configure-env.mjs', import.meta.url),
      join(root, 'scripts/configure-env.mjs'),
    );
    try {
      execFileSync(process.execPath, [join(root, 'scripts/configure-env.mjs')], {
        env: {
          ...process.env,
          PUBLIC_API_BASE_URL_DEVELOPMENT: 'http://localhost:8000',
          PUBLIC_API_BASE_URL_PRODUCTION: url,
        },
        stdio: 'pipe',
      });
      return { content: readFileSync(join(root, 'src/environments/environment.ts'), 'utf8') };
    } catch (error) {
      return { error };
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
