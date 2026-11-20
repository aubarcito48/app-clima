import { test, expect, search, climate } from './fixtures';
import { readFileSync } from 'node:fs';

test('Isa gira y reproduce solo después de mostrar el consejo', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const state = window as unknown as { isaPlays: boolean[]; isaLooks: boolean[] };
    state.isaPlays = [];
    state.isaLooks = [];
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      override play(): Promise<void> {
        state.isaPlays.push(!!document.querySelector('#advice-text'));
        return super.play();
      }
    };
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((changes) => {
        for (const change of changes) {
          const pose = (change.target as HTMLElement).getAttribute('data-isa-expression');
          if (pose === 'isa-right' || pose === 'isa-down')
            state.isaLooks.push(!!document.querySelector('#advice-text'));
        }
      }).observe(document.documentElement, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-isa-expression'],
      });
    });
  });
  let voices = 0;
  const audio = readFileSync('e2e/data/isa/es_long.wav');
  await page.route('**/api/v1/voz/', async (route) => {
    voices++;
    await route.fulfill({
      contentType: 'audio/wav',
      body: audio,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => voices).toBe(1);
  await page.clock.fastForward(3500);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { isaPlays: boolean[] }).isaPlays),
  ).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { isaLooks: boolean[] }).isaLooks),
  ).toEqual([]);
  await page.clock.fastForward(2000);
  await expect(page.locator('#advice-text')).toBeVisible();
  await page.clock.fastForward(400);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { isaPlays: boolean[] }).isaPlays.length))
    .toBe(1);
  const result = await page.evaluate(() => {
    const state = window as unknown as { isaPlays: boolean[]; isaLooks: boolean[] };
    return { plays: state.isaPlays, looks: state.isaLooks };
  });
  expect(result.plays).toEqual([true]);
  expect(result.looks.length).toBeGreaterThan(0);
  expect(result.looks.every(Boolean)).toBe(true);
});

test('Isa prepara la voz mientras el clima espera su presentación', async ({ page }) => {
  await page.clock.install();
  let voices = 0;
  await page.route('**/api/v1/voz/', async (route) => {
    voices++;
    await route.fulfill({
      status: 503,
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => voices).toBe(1);
  await expect(page.locator('app-weather-loading')).toBeVisible();
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await page.clock.fastForward(3500);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await page.clock.fastForward(2000);
  await expect(page.locator('#advice-text')).toHaveText(climate().recomendacion.texto!);
  expect(voices).toBe(1);
});

test('la preparación de cinco segundos empieza cuando llega la respuesta', async ({
  page,
  api,
}) => {
  await page.clock.install();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  api.handler = async (route) => {
    await pending;
    await api.fulfill(route, climate());
  };
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => api.requests.length).toBe(1);
  await page.clock.fastForward(6000);
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/clima/');
  const preparing = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/v1/voz/');
  release();
  await response;
  await preparing;
  await page.clock.fastForward(3500);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await page.clock.fastForward(2000);
  await expect(page.locator('#advice-text')).toHaveText(climate().recomendacion.texto!);
});

test('cancelar durante la presentación no deja reaparecer el resultado', async ({ page }) => {
  await page.clock.install();
  let voices = 0;
  await page.route('**/api/v1/voz/', async (route) => {
    voices++;
    await route.fulfill({
      status: 503,
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => voices).toBe(1);
  await page.getByRole('button', { name: 'Cancelar búsqueda', exact: true }).click();
  await page.clock.fastForward(10000);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await expect(page.locator('app-weather-loading')).toHaveCount(0);
  expect(voices).toBe(1);
});

test('cambiar de ciudad descarta la presentación pendiente anterior', async ({ page, api }) => {
  await page.clock.install();
  let voices = 0;
  await page.route('**/api/v1/voz/', async (route) => {
    voices++;
    await route.fulfill({
      status: 503,
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => voices).toBe(1);
  await page.clock.fastForward(3000);
  api.body = climate('Mendoza');
  await search(page, 'Mendoza');
  await expect.poll(() => voices).toBe(2);
  await page.clock.fastForward(2500);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await page.clock.fastForward(3000);
  await expect(page.locator('#advice-text')).toHaveText(climate('Mendoza').recomendacion.texto!);
  expect(voices).toBe(2);
});

test('los errores del clima se muestran sin demora artificial', async ({ page, api }) => {
  await page.clock.install();
  api.status = 503;
  api.body = { codigo: 'PROVEEDOR_NO_DISPONIBLE', mensaje: 'No disponible.' };
  await page.goto('/');
  await search(page, 'Cordoba');
  await expect.poll(() => api.requests.length).toBe(1);
  await expect(page.locator('#clima-contenido')).toHaveAttribute('aria-busy', 'false', {
    timeout: 1500,
  });
  await expect(page.locator('app-weather-loading')).toHaveCount(0);
});
