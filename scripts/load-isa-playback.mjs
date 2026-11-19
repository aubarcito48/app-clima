// Bundle the actual runtime, including its language-specific selectors.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export async function loadIsaPlayback() {
  const entry = fileURLToPath(new URL('../src/app/shared/assistant/isabel/isa-playback.ts', import.meta.url));
  const result = await build({
    entryPoints: [entry], bundle: true, write: false,
    platform: 'node', format: 'esm', target: 'es2022',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
