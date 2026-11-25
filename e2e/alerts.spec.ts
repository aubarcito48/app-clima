import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search, changeTheme } from './fixtures';
import { ALERTS_FIXTURE } from './data/alerts-fixture';
import { ALERT_SOURCES } from '../src/react/models/alerts/weather-alerts';
import { chooseLanguage } from './fixtures';

test('cambiar de país selecciona la fuente oficial y conserva el idioma del aviso', async ({
  page,
  api,
}) => {
  await page.goto('/');
  const panel = page.locator('[data-component=app-weather-alerts]');
  for (const [country, city, event, url] of [
    ['AR', 'Córdoba', 'Tormentas en Córdoba de prueba', ALERTS_FIXTURE.alertas[0].url],
    [
      'CL',
      'Santiago',
      'Tormentas en Chile de prueba',
      'https://archivos.meteochile.gob.cl/portaldmc/rss/meteochile_A1_2026_cap.xml',
    ],
    ['AR', 'Córdoba', 'Tormentas en Córdoba de prueba', ALERTS_FIXTURE.alertas[0].url],
    ['BR', 'São Paulo', 'Tempestade de teste', 'https://apiprevmet3.inmet.gov.br/avisos/rss/123'],
    [
      'UY',
      'Montevideo',
      'Tormentas de prueba',
      'https://www.inumet.gub.uy/reportes/riesgo/cap_2026_10_25.xml',
    ],
    [
      'CL',
      'Santiago',
      'Tormentas de prueba',
      'https://archivos.meteochile.gob.cl/portaldmc/rss/meteochile_A1_2026_cap.xml',
    ],
  ]) {
    const provider = ALERT_SOURCES[country];
    api.body = climate(city);
    (api.body as ReturnType<typeof climate>).ubicacion.pais = country;
    api.alertsBody = {
      ...ALERTS_FIXTURE,
      ubicacion: { ...ALERTS_FIXTURE.ubicacion, pais: country },
      fuente: { ...ALERTS_FIXTURE.fuente, nombre: provider.name, url: provider.url },
      alertas: [{ ...ALERTS_FIXTURE.alertas[0], fenomeno: event, url }],
    };
    await search(page, city, country);
    await expect(panel.getByRole('heading', { name: event })).toHaveAttribute(
      'lang',
      provider.language,
    );
    await expect(panel).toContainText(provider.name);
    await expect(panel.locator('.alert-notice')).toHaveCount(1);
    if (country === 'AR') {
      await expect(panel).not.toContainText('Tormentas en Chile de prueba');
      await expect(panel).not.toContainText(ALERT_SOURCES['CL'].name);
    }
    await expect(
      panel.getByRole('link', { name: `Consultar ${provider.short}`, exact: false }),
    ).toHaveAttribute('href', provider.url);
    await expect(panel.getByRole('link', { name: /Consultar SMN/ })).toHaveCount(
      country === 'AR' ? 1 : 0,
    );
  }
  await chooseLanguage(page, 'en');
  await expect(panel.getByRole('heading', { name: 'Weather alerts', exact: true })).toBeVisible();
  await expect(panel).toContainText('Official notices are shown in their original language.');
  await expect(panel.getByRole('heading', { name: 'Tormentas de prueba' })).toHaveAttribute(
    'lang',
    'es',
  );
});

test('un 429 del SMN explica la espera y no declara ausencia de alertas', async ({ page, api }) => {
  api.alertsBody = {
    ...ALERTS_FIXTURE,
    estado: 'parcial',
    alertas: [],
    fuente: {
      ...ALERTS_FIXTURE.fuente,
      verificacion: { fallos: { documento_http_429: 1 } },
    },
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  const panel = page.locator('[data-component=app-weather-alerts]');
  await expect(panel.getByRole('status')).toContainText(
    'La fuente oficial está limitando temporalmente',
  );
  await expect(panel).not.toContainText('Sin alertas reportadas');
});

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
  const panel = page.locator('[data-component=app-weather-alerts]');
  await expect(panel).toContainText('Tormentas de prueba');
  await expect(page.locator('[data-component=app-weather-alerts]')).toHaveCount(1);
  const metrics = page.getByRole('region', { name: 'Detalles del clima', exact: true });
  await expect(metrics.locator('.metric-card')).toHaveCount(4);
  await expect(metrics).toHaveCSS('background-image', /emergency-card-texture\.svg/);
  const metricsBox = (await metrics.boundingBox())!,
    alertsBox = (await panel.boundingBox())!;
  expect(metricsBox.y).toBeGreaterThan(alertsBox.y + alertsBox.height);
  if (page.viewportSize()!.width >= 1280) {
    const currentBox = (await page.locator('.weather-panel').boundingBox())!;
    expect(metricsBox.x).toBeCloseTo(currentBox.x, 0);
    expect(alertsBox.y).toBeGreaterThan(currentBox.y + currentBox.height);
    expect(alertsBox.x).toBeCloseTo(currentBox.x, 0);
    const mapBox = (await page.locator('[data-component=app-weather-map]').boundingBox())!;
    expect(mapBox.x).toBeGreaterThan(alertsBox.x + alertsBox.width);
    expect(mapBox.x + mapBox.width).toBeCloseTo(currentBox.x + currentBox.width, 0);
    const legendBox = (await page
      .locator('[data-component=app-weather-map-legend]')
      .boundingBox())!;
    expect(mapBox.y + mapBox.height).toBeCloseTo(legendBox.y + legendBox.height, 0);
  } else {
    expect(metricsBox.x).toBeCloseTo(alertsBox.x, 0);
  }
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
    if ((await page.locator('html').getAttribute('data-theme')) !== mode) await changeTheme(page);
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
  const panel = page.locator('[data-component=app-weather-alerts]');
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
  api.body = climate('Lima');
  (api.body as ReturnType<typeof climate>).ubicacion.pais = 'PE';
  api.alertsBody = {
    ...structuredClone(ALERTS_FIXTURE),
    ubicacion: { ...ALERTS_FIXTURE.ubicacion, pais: 'PE' },
    estado: 'fuera_cobertura',
    alertas: [],
  };
  await search(page, 'Lima', 'PE');
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
  await expect(page.locator('[data-component=app-weather-alerts]')).toContainText(
    'Consultando avisos oficiales',
  );
  await expect.poll(() => !!release).toBe(true);
  api.body = climate('Mendoza');
  (api.body as ReturnType<typeof climate>).ubicacion.latitud = -32.89;
  try {
    await search(page, 'Mendoza');
    await expect(page.locator('[data-component=app-weather-alerts]')).toContainText(
      'Sin alertas reportadas',
    );
  } finally {
    await release?.();
  }
  await expect(page.locator('[data-component=app-weather-alerts]')).toContainText('para Mendoza');
  await expect(page.locator('[data-component=app-weather-alerts]')).not.toContainText(
    'Tormentas de prueba',
  );
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.locator('[data-component=app-weather-alerts]')).toHaveCount(0);
});
