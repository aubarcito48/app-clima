import { test, expect, search, changeTheme, chooseLanguage, MAP_PNG } from './fixtures';
import { ALERTS_FIXTURE } from './data/alerts-fixture';

const PNG = MAP_PNG;

test('mapa automático: capas sin clave pública, junto a alertas y sin desbordes', async ({
  page,
  api,
}, info) => {
  const tiles: URL[] = [];
  api.alertsBody = { ...structuredClone(ALERTS_FIXTURE), alertas: [] };
  await page.route('**/api/v1/mapa/**', async (route) => {
    tiles.push(new URL(route.request().url()));
    await route.fulfill({ contentType: 'image/png', body: PNG });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PNG }),
  );
  await page.goto('/');
  expect(tiles).toHaveLength(0);
  await search(page, 'Córdoba');
  const map = page.locator('[data-component=app-weather-map]');
  await expect(map.getByRole('heading', { name: 'Mapa del clima' })).toBeVisible();
  const alertsBox = await page.locator('[data-component=app-weather-alerts]').boundingBox();
  const mapBox = await map.boundingBox();
  expect(alertsBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  if (info.project.name === 'desktop-1440') {
    expect(Math.abs(alertsBox!.y - mapBox!.y)).toBeLessThan(2);
    expect(mapBox!.x).toBeGreaterThan(alertsBox!.x);
    const details = await page.locator('[data-component=app-weather-map-legend]').boundingBox();
    expect(mapBox!.y + mapBox!.height).toBeCloseTo(details!.y + details!.height, 0);
  } else {
    expect(mapBox!.y).toBeGreaterThan(alertsBox!.y);
  }
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  await expect(map.locator('.leaflet-container')).toBeVisible();
  await page
    .locator('.weather-context-grid')
    .screenshot({ path: info.outputPath('aligned-weather.png') });
  await page
    .locator('[data-component=app-current-weather]')
    .screenshot({ path: info.outputPath('current-weather-wide.png') });
  expect(tiles.every((url) => !url.searchParams.has('appid'))).toBe(true);
  await map.getByRole('combobox', { name: 'Mostrar' }).selectOption('wind');
  await expect.poll(() => tiles.some((url) => url.searchParams.get('layer') === 'wind')).toBe(true);
  await expect(map.getByRole('link', { name: 'OpenWeather', exact: true })).toBeVisible();
  await expect(map.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await changeTheme(page);
  await map.scrollIntoViewIfNeeded();
  await map.screenshot({ path: info.outputPath('map-dark.png') });
  await expect(map.getByRole('button', { name: 'Cerrar mapa' })).toHaveCount(0);
  await chooseLanguage(page, 'en');
  await expect(map.getByRole('button', { name: 'Close map', exact: true })).toHaveCount(0);
  await expect(map.locator('.leaflet-container')).toBeVisible();
});

test('un fallo del mapa conserva el clima y las alertas', async ({ page, api }) => {
  let tileRequests = 0;
  api.alertsBody = structuredClone(ALERTS_FIXTURE);
  await page.route('**/api/v1/mapa/**', (route) => {
    tileRequests++;
    return route.fulfill({ status: 503, body: '{}' });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PNG }),
  );
  await page.goto('/');
  await search(page, 'Córdoba');
  const map = page.locator('[data-component=app-weather-map]');
  await expect.poll(() => tileRequests).toBeGreaterThan(0);
  await expect(map.getByRole('status')).toContainText('No se pudo cargar todo el mapa');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tormentas de prueba', exact: true }),
  ).toBeVisible();
});

test('leyenda independiente, zoom local y consulta compacta sin controles adicionales', async ({
  page,
  api,
}) => {
  const requests: URL[] = [];
  let failPoint = false;
  await page.route('**/api/v1/mapa/punto/**', async (route) => {
    requests.push(new URL(route.request().url()));
    await api.fulfill(
      route,
      {
        latitud: -31.42,
        longitud: -64.18,
        fuente: 'OpenWeather',
        actual: {
          fecha_utc: '2026-11-24T09:00:00Z',
          temperatura_c: 0,
          viento_kmh: 0,
          humedad_pct: 0,
          lluvia_ultima_hora_mm: null,
        },
      },
      failPoint ? 503 : 200,
    );
  });
  const tiles: URL[] = [];
  await page.route('**/api/v1/mapa/?**', (route) => {
    tiles.push(new URL(route.request().url()));
    return route.fulfill({ contentType: 'image/png', body: PNG });
  });
  await page.goto('/');
  await search(page, 'Córdoba');
  const map = page.locator('[data-component=app-weather-map]');
  const legend = page.locator('[data-component=app-weather-map-legend]');
  await expect(map.locator('.leaflet-container')).toBeVisible();
  await expect(map.locator('.map-tools')).toHaveCount(0);
  await expect(map.locator('[data-component=app-weather-map-legend]')).toHaveCount(0);
  const detailsBox = await page.locator('[data-component=app-weather-details]').boundingBox();
  const legendBox = await legend.boundingBox();
  expect(legendBox!.y).toBeGreaterThan(detailsBox!.y + detailsBox!.height);
  const mapHeight = (await map.boundingBox())!.height;
  await expect(legend.locator('.map-legend')).toContainText('°C');
  await map.getByRole('combobox', { name: 'Mostrar' }).selectOption('wind');
  await expect(legend.locator('.map-legend')).toContainText('km/h');
  for (let i = 0; i < 7; i++) await map.locator('.leaflet-control-zoom-in').click();
  // Streets can zoom beyond the weather imagery's native resolution.
  await expect(map.locator('.leaflet-container')).toHaveClass(/leaflet-container/);
  await expect
    .poll(async () => map.locator('img.leaflet-tile[src*="tile.openstreetmap.org/12/"]').count())
    .toBeGreaterThan(0);
  expect(tiles.every((url) => Number(url.searchParams.get('z')) <= 8)).toBe(true);
  const climateRequests = api.requests.length;
  await map.locator('.map-canvas').click({ position: { x: 150, y: 120 } });
  await expect(map.locator('.weather-point-popup')).toContainText('0 km/h');
  expect(requests[0].searchParams.has('latitud')).toBe(true);
  expect(requests[0].searchParams.has('longitud')).toBe(true);
  await map.locator('.leaflet-popup-close-button').click();
  await map.locator('.map-canvas').click({ position: { x: 150, y: 120 } });
  const result = map.locator('.weather-point-popup');
  await expect(result).toContainText('0 km/h');
  await expect(result).toContainText(/24\/11\/2026.*09:00.*UTC/);
  expect(api.requests.length).toBe(climateRequests);
  expect(requests[0].searchParams.has('appid')).toBe(false);
  failPoint = true;
  await map.locator('.leaflet-popup-close-button').click();
  await map.locator('.map-canvas').click({ position: { x: 150, y: 120 } });
  await expect(result).toContainText('No se pudo consultar este punto');
  failPoint = false;
  await result.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(result).toContainText('0 km/h');
  expect((await map.boundingBox())!.height).toBeCloseTo(mapHeight, 0);
  await chooseLanguage(page, 'en');
  await expect(map.getByRole('button', { name: 'Expand map' })).toHaveCount(0);
  await expect(legend.getByRole('heading', { name: 'How to read the map' })).toBeVisible();
  await map.getByRole('combobox', { name: 'Show', exact: true }).selectOption('rain');
  await expect(map.locator('.weather-point-popup')).toContainText('Rain in the last hour');
  await expect(map.locator('.weather-point-popup')).toContainText('No data');
  await expect(map.locator('.map-point')).toHaveCount(0);
  await expect(map.locator('.weather-point-popup')).not.toContainText('Humidity');
  await map.getByRole('combobox', { name: 'Show', exact: true }).selectOption('temperature');
  await expect(map.locator('.weather-point-popup')).toContainText('0 °C');
  await map.scrollIntoViewIfNeeded();
  await map.screenshot({ path: test.info().outputPath('map-controls-and-point.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
