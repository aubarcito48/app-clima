import { test, expect, search, changeTheme, chooseLanguage, MAP_PNG } from './fixtures';
import { ALERTS_FIXTURE } from '../src/app/testing/alerts-fixture';

const PNG = MAP_PNG;

test('mapa automático: capas sin clave pública, junto a alertas y sin desbordes', async ({
  page,
  api,
}, info) => {
  const tiles: URL[] = [];
  api.alertsBody = structuredClone(ALERTS_FIXTURE);
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
  const map = page.locator('app-weather-map');
  await expect(map.getByRole('heading', { name: 'Mapa del clima' })).toBeVisible();
  const alertsBox = await page.locator('app-weather-alerts').boundingBox();
  const mapBox = await map.boundingBox();
  expect(alertsBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  if (info.project.name === 'desktop-1440') {
    expect(Math.abs(alertsBox!.y - mapBox!.y)).toBeLessThan(2);
    expect(mapBox!.x).toBeGreaterThan(alertsBox!.x);
  } else {
    expect(mapBox!.y).toBeGreaterThan(alertsBox!.y);
  }
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  await expect(map.locator('.leaflet-container')).toBeVisible();
  expect(tiles.every((url) => !url.searchParams.has('appid'))).toBe(true);
  await map.getByRole('combobox', { name: 'Mostrar' }).selectOption('wind');
  await expect.poll(() => tiles.some((url) => url.searchParams.get('layer') === 'wind')).toBe(true);
  await expect(map.getByRole('link', { name: 'OpenWeather', exact: true })).toBeVisible();
  await expect(map.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await changeTheme(page);
  await map.scrollIntoViewIfNeeded();
  await map.screenshot({ path: info.outputPath('map-dark.png') });
  await map.getByRole('button', { name: 'Cerrar mapa' }).click();
  await expect(map.getByRole('button', { name: 'Abrir mapa' })).toBeVisible();
  await chooseLanguage(page, 'en');
  await expect(map.getByRole('button', { name: 'Close map', exact: true })).toBeVisible();
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
  const map = page.locator('app-weather-map');
  await expect.poll(() => tileRequests).toBeGreaterThan(0);
  await expect(map.getByRole('status')).toContainText('No se pudo cargar todo el mapa');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tormentas de prueba', exact: true }),
  ).toBeVisible();
});
