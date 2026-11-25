import { test, expect, openNavigation, closeNavigation, chooseLanguage } from './fixtures';

test('React: carga directa de la página informativa y regreso con teclado', async ({ page }) => {
  await page.goto('/sobre-nosotros');
  await expect(page.getByRole('heading', { name: 'Sobre nosotros', exact: true })).toHaveCount(1);
  await expect(page.locator('#main-content')).toBeFocused();
  await openNavigation(page);
  const forecast = page.getByRole('link', { name: 'Pronóstico', exact: true });
  await forecast.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#city')).toBeVisible();
  await expect(page.locator('.mobile-menu')).not.toBeVisible();
});

test('React: la página informativa respeta el idioma y una ruta desconocida vuelve al inicio', async ({
  page,
}) => {
  await page.goto('/sobre-nosotros');
  await chooseLanguage(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#main-content h1')).toHaveText('About us');
  await page.goto('/ruta-inexistente');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Hello, explorer' })).toBeVisible();
});

test('React: elegir un favorito desde la página informativa consulta sus coordenadas', async ({
  page,
  api,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'stitchweather.favorites.v1',
      JSON.stringify([
        { name: 'Córdoba', country: 'AR', region: 'Córdoba', latitude: -31.42, longitude: -64.18 },
      ]),
    ),
  );
  await page.goto('/sobre-nosotros');
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await page.locator('#favorite-places li').first().getByRole('button').first().click();
  await closeNavigation(page);
  await expect(page).toHaveURL('/');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  expect(api.requests[0].searchParams.get('latitud')).toBe('-31.42');
  expect(api.requests[0].searchParams.get('longitud')).toBe('-64.18');
});
