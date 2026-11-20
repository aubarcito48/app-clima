import { defineConfig } from '@playwright/test';

// ng e2e inicia una instancia aislada; no reutilizar Angular de desarrollo.
const baseURL = process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://127.0.0.1:4300';
const origin = new URL(baseURL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:') {
  throw new Error('Las pruebas de regresión requieren un servidor HTTP local.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: process.env['CI'] ? 1 : 2,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    locale: 'es-AR',
    timezoneId: 'Asia/Tokyo',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-360', use: { viewport: { width: 360, height: 1000 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1000 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
