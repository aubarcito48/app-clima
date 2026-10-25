import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search } from './fixtures';

test('validación y parámetros: teclado, país ASCII y caracteres reservados', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await expect(page.locator('#city')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#city')).toBeFocused();
  await page.locator('#city').press('Enter');
  await expect(page.locator('#city-error')).toBeVisible();
  expect(api.requests).toHaveLength(0);
  await search(page, 'Córdoba', 'Argentina');
  await expect(page.locator('#country-error')).toBeVisible();
  await expect(page.locator('#country')).toBeFocused();
  expect(api.requests).toHaveLength(0);
  const city = 'São Tomé & Príncipe + #1/2?';
  await search(page, ` ${city} `, ' st ', ' Región Sur ');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  expect([...api.requests[0].searchParams]).toEqual([
    ['ciudad', city],
    ['pais', 'ST'],
    ['region', 'Región Sur'],
  ]);
});

test('flujo principal: clima, unidades y consejo de la misma consulta', async ({
  page,
  api,
}, info) => {
  api.body = climate('Mendoza');
  await page.goto('/');
  expect(api.requests).toHaveLength(0);
  await search(page, 'Mendoza');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  await expect(page.locator('.temperature')).toContainText('0');
  await expect(page.locator('app-current-weather')).toContainText('-3 °C');
  await expect(page.locator('app-current-weather dd').nth(0)).toHaveText('0 %');
  await expect(page.locator('app-current-weather dd').nth(1)).toHaveText('9.123 km/h');
  await expect(page.locator('#advice-location')).toContainText('Mendoza');
  await expect(page.locator('#advice-text')).toHaveText('Consejo ficticio de prueba para Mendoza.');
  await expect(page.locator('app-forecast ol li')).toHaveCount(2);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await info.attach('resultado', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('clima disponible con IA no disponible y aviso anunciable', async ({ page, api }, info) => {
  const data = climate();
  data.recomendacion = { estado: 'no_disponible', texto: null };
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(page.locator('app-forecast ol li')).toHaveCount(2);
  await expect(page.locator('app-recommendation')).toContainText('No disponible');
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Consejo de IA no disponible');
  await info.attach('IA-no-disponible', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('ambos bloques parciales y mediciones opcionales ausentes', async ({ page, api }) => {
  const data = climate();
  data.actual = {
    ...data.actual,
    sensacion_c: null,
    humedad_pct: null,
    viento_kmh: null,
    descripcion: null,
  };
  data.pronostico = { estado: 'no_disponible', intervalos: [] };
  data.recomendacion = { estado: 'no_disponible', texto: null };
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(page.locator('app-current-weather dd')).toHaveText([
    'No disponible',
    'No disponible',
  ]);
  await expect(page.locator('app-forecast')).toContainText('Pronóstico no disponible');
  await expect(page.locator('app-forecast ol')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/undefined|NaN/);
});

test('cuarenta intervalos, cambio de año y hora de ciudad independiente del navegador', async ({
  page,
  api,
}) => {
  const data = climate();
  data.actual.fecha_utc = '2026-12-31T02:30:00Z';
  data.meta.consultado_en_utc = '2026-12-31T03:15:00Z';
  data.pronostico.intervalos = Array.from({ length: 40 }, (_, i) => ({
    fecha_utc: new Date(Date.parse('2026-12-31T21:00:00Z') + i * 10800000).toISOString(),
    temperatura_c: i - 20,
    descripcion: null,
  }));
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('app-current-weather time').nth(0)).toContainText(
    '30 de diciembre de 2026 a las 23:30',
  );
  await expect(page.locator('app-current-weather time').nth(1)).toContainText(
    '31 de diciembre de 2026 a las 00:15',
  );
  await expect(page.locator('app-forecast li')).toHaveCount(40);
  await expect(page.locator('app-forecast time').nth(0)).toHaveText('18:00 h');
  await expect(page.locator('app-forecast')).toContainText('2027');
  await expect(page.locator('app-forecast')).toContainText('No son promedios diarios');
});

test('409: elegir una región entre candidatos del mismo país', async ({ page, api }) => {
  const candidate = {
    nombre: 'Córdoba',
    pais: 'AR',
    region: 'Córdoba',
    latitud: -31.42,
    longitud: -64.18,
  };
  api.body = {
    codigo: 'CIUDAD_AMBIGUA',
    candidatos: [candidate, { ...candidate, region: 'Otra región', latitud: -32 }],
  };
  api.status = 409;
  await page.goto('/');
  await search(page, 'Córdoba');
  const choice = page.getByRole('button', { name: 'Córdoba, Otra región, AR', exact: true });
  await expect(choice).toBeVisible();
  await expect(page.locator('#region')).toBeFocused();
  api.body = climate();
  api.status = 200;
  await choice.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests[1].searchParams.get('region')).toBe('Otra región');
  await expect(page.locator('#city')).toHaveValue('Córdoba');
});

test('404 y 503: corregir y reintentar con teclado sin resultados anteriores', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  api.status = 404;
  api.body = { codigo: 'CIUDAD_NO_ENCONTRADA' };
  await search(page, 'Inexistente');
  await expect(page.locator('#city')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Corregir búsqueda' })).toBeVisible();
  await expect(page.locator('.temperature')).toHaveCount(0);
  api.status = 503;
  api.body = { codigo: 'SERVICIO_NO_DISPONIBLE' };
  await search(page, 'Mendoza');
  await expect(page.getByRole('group')).toBeFocused();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  api.status = 200;
  api.body = climate('Mendoza');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reintentar consulta' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  expect(api.requests).toHaveLength(4);
  expect(api.requests.at(-1)!.search).toBe(api.requests.at(-2)!.search);
});

test('una respuesta tardía y un duplicado pendiente no reemplazan la última búsqueda', async ({
  page,
  api,
}) => {
  let release: (() => Promise<void>) | undefined;
  api.handler = async (route, url) => {
    if (url.searchParams.get('ciudad') === 'Córdoba') {
      await new Promise<void>((resolve) => {
        release = async () => {
          try {
            await api.fulfill(route, climate('Córdoba'));
          } catch {
            /* La solicitud anterior ya está cancelada. */
          } finally {
            resolve();
          }
        };
      });
    } else await api.fulfill(route, climate('Mendoza'));
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect.poll(() => api.requests.length).toBe(1);
  await page.locator('#city').press('Enter');
  await expect(page.getByRole('status')).toContainText('Consultando el clima de Córdoba');
  await search(page, 'Mendoza');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  try {
    expect(api.requests).toHaveLength(2);
  } finally {
    await release?.();
  }
  await expect(page.locator('#advice-text')).toHaveText('Consejo ficticio de prueba para Mendoza.');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
});

test('texto literal, accesibilidad y ausencia de desbordamiento', async ({ page, api }) => {
  const data = climate();
  data.recomendacion.texto = '<script>window.injected=true</script>\n' + 'x'.repeat(500);
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('#advice-text')).toHaveText(data.recomendacion.texto);
  await expect(page.locator('app-recommendation script, app-recommendation img')).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  api.status = 429;
  api.body = { codigo: 'LIMITE_ALCANZADO' };
  await search(page, 'Mendoza');
  await expect(page.getByRole('alert')).toContainText('límite');
  const errors = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(errors.violations).toEqual([]);
});
