import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'PUBLIC_API_BASE_URL_');
  const production = mode === 'production';
  const key = production ? 'PUBLIC_API_BASE_URL_PRODUCTION' : 'PUBLIC_API_BASE_URL_DEVELOPMENT';
  const url = new URL(process.env[key] ?? env[key] ?? (production
    ? 'https://api-clima.example.invalid' : 'http://localhost:8000'));
  if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:') ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`${key} debe ser una URL pública HTTP(S), HTTPS en producción, sin credenciales, parámetros ni fragmentos.`);
  }
  return {
    plugins: [vue({ template: { transformAssetUrls: false } })],
    define: { __API_BASE_URL__: JSON.stringify(url.href.replace(/\/+$/u, '')) },
    server: { host: '127.0.0.1', port: 4200 },
    build: { outDir: 'dist/app-clima/browser' },
  };
});
