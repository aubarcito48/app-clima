import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const projectRoot = new URL('../', import.meta.url);

async function readOptionalFile(file) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function publicApiUrl(key, localValues, fallback, production) {
  const value = (process.env[key] ?? localValues[key] ?? fallback).trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} debe contener una URL HTTP(S) válida.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
    throw new Error(`${key} debe usar ${production ? 'HTTPS' : 'HTTP o HTTPS'}.`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${key} no admite credenciales, parámetros ni fragmentos.`);
  }
  return url.href.replace(/\/+$/u, '');
}

async function configureEnvironments() {
  const localValues = parseEnv(await readOptionalFile(new URL('.env', projectRoot)));
  // Lista explícita: ninguna otra variable de .env o del sistema llega a Angular.
  const configurations = [
    {
      file: 'src/environments/environment.development.ts',
      apiBaseUrl: publicApiUrl('PUBLIC_API_BASE_URL_DEVELOPMENT', localValues, 'http://localhost:8000', false),
    },
    {
      file: 'src/environments/environment.ts',
      apiBaseUrl: publicApiUrl('PUBLIC_API_BASE_URL_PRODUCTION', localValues, 'https://api-clima.example.invalid', true),
    },
  ];
  for (const { file, apiBaseUrl } of configurations) {
    const destination = new URL(file, projectRoot);
    const content = `// Generado por npm run env:configure. Solo configuración pública.\nexport const environment = ${JSON.stringify({ apiBaseUrl }, null, 2)} as const;\n`;
    if ((await readOptionalFile(destination)) !== content) await writeFile(destination, content);
  }
  console.log('Entornos públicos de Angular preparados.');
}

configureEnvironments().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
