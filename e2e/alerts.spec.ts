import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search } from './fixtures';
import { ALERTS_FIXTURE } from '../src/app/testing/alerts-fixture';

test('avisos SMN: coordenadas, texto oficial seguro, detalles con teclado y ambos temas', async ({
  page,
  api,
}, info) => {
  api.alertsBody = structuredClone(ALERTS_FIXTURE);
  (api.alertsBody as typeof ALERTS_FIXTURE).alertas[0].descripcion =
    'Aviso ficticio <img src=x onerror=alert(1)>.';
  await page.goto('/');
  expect(api.alertsRequests).toHaveLength(0);
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  const panel = page.locator('app-weather-alerts');
  await expect(panel).toContainText('Tormentas de prueba');
  await expect(panel).toContainText('Severidad: Moderada');
  await expect(panel).toContainText('15:00');
  await expect(panel).toContainText('Aviso ficticio <img src=x onerror=alert(1)>.');
  expect(await panel.locator('img').count()).toBe(0);
  expect([...api.alertsRequests[0].searchParams]).toEqual([
    ['latitud', '-31.42'],
    ['longitud', '-64.18'],
    ['pais', 'AR'],
  ]);
  await panel.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(panel).toContainText('Recomendación ficticia para pruebas.');
  await expect(panel.getByRole('link', { name: /Ver documento oficial/ })).toHaveAttribute(
    'href',
    ALERTS_FIXTURE.alertas[0].url,
  );
  for (const mode of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== mode)
      await page.locator('app-theme-toggle button').click();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await info.attach(`avisos-${mode}`, {
      body: await panel.screenshot(),
      contentType: 'image/png',
    });
  }
  expect(api.requests).toHaveLength(1);
});

test('avisos SMN: vacíos, parciales, caída de fuente y países fuera de cobertura', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await search(page, 'Córdoba');
  const panel = page.locator('app-weather-alerts');
  await expect(panel).toContainText('Sin alertas reportadas');
  await expect(panel).toContainText('no equivale a ausencia de riesgo');
  api.alertsBody = { ...structuredClone(ALERTS_FIXTURE), estado: 'parcial', alertas: [] };
  await panel.getByRole('button', { name: 'Actualizar avisos' }).click();
  await expect(panel).toContainText('Consulta incompleta');
  await expect(panel).not.toContainText('Sin alertas reportadas');
  api.alertsStatus = 503;
  await panel.getByRole('button', { name: 'Actualizar avisos' }).click();
  await expect(panel).toContainText('No pudimos verificar');
  await expect(page.locator('.temperature')).toBeVisible();
  api.alertsStatus = 200;
  api.body = climate('Montevideo');
  (api.body as ReturnType<typeof climate>).ubicacion.pais = 'UY';
  api.alertsBody = {
    ...structuredClone(ALERTS_FIXTURE),
    ubicacion: { ...ALERTS_FIXTURE.ubicacion, pais: 'UY' },
    estado: 'fuera_cobertura',
    alertas: [],
  };
  await search(page, 'Montevideo', 'UY');
  await expect(panel).toContainText('No tenemos alertas verificadas para este país');
  await expect(panel.getByRole('button', { name: 'Actualizar avisos' })).toHaveCount(0);
});

test('una consulta lenta de avisos no bloquea el clima ni reemplaza la ciudad nueva', async ({
  page,
  api,
}) => {
  let release: (() => Promise<void>) | undefined;
  api.alertsHandler = async (route, url) => {
    if (url.searchParams.get('latitud') === '-31.42')
      await new Promise<void>((resolve) => {
        release = async () => {
          try {
            await api.fulfill(route, ALERTS_FIXTURE);
          } catch {
            /* cancelled */
          } finally {
            resolve();
          }
        };
      });
    else
      await api.fulfill(route, {
        ...ALERTS_FIXTURE,
        ubicacion: { ...ALERTS_FIXTURE.ubicacion, latitud: -32.89 },
        alertas: [],
      });
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(page.locator('app-weather-alerts')).toContainText('Consultando avisos oficiales');
  await expect.poll(() => !!release).toBe(true);
  api.body = climate('Mendoza');
  (api.body as ReturnType<typeof climate>).ubicacion.latitud = -32.89;
  try {
    await search(page, 'Mendoza');
    await expect(page.locator('app-weather-alerts')).toContainText('Sin alertas reportadas');
  } finally {
    await release?.();
  }
  await expect(page.locator('app-weather-alerts')).toContainText('para Mendoza');
  await expect(page.locator('app-weather-alerts')).not.toContainText('Tormentas de prueba');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.locator('app-weather-alerts')).toHaveCount(0);
});
