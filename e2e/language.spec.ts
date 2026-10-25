import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search } from './fixtures';

test('ES / EN translates the interface and persists after reloading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hola, explorador' })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Hello, explorer' })).toBeVisible();
  await expect(page.getByLabel('City, region or province', { exact: true })).toHaveAttribute(
    'placeholder',
    'Start typing a place',
  );
  await expect(page.getByRole('heading', { name: 'Useful numbers · Argentina' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hello, explorer' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hola, explorador' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('changing language refreshes weather, advice and forecast dates', async ({ page, api }) => {
  api.handler = async (route, url) => {
    const data = climate();
    if (url.searchParams.get('idioma') === 'en') {
      data.actual.descripcion = 'Partly cloudy';
      data.pronostico.intervalos.forEach((row) => (row.descripcion = 'Partly cloudy'));
      data.recomendacion.texto = 'Bring a light jacket for the evening.';
    }
    await api.fulfill(route, data);
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('#advice-text')).toContainText('Consejo ficticio');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('#advice-text')).toHaveText('Bring a light jacket for the evening.');
  await expect(page.getByRole('heading', { name: 'Current weather', exact: true })).toBeVisible();
  await expect(page.locator('.current-details')).toContainText('Partly cloudy');
  await expect(page.locator('.day-choice').first()).toContainText('Oct');
  expect(api.requests.at(-1)?.searchParams.get('idioma')).toBe('en');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.locator('#advice-text')).toContainText('Consejo ficticio');
  expect(api.requests.at(-1)?.searchParams.has('idioma')).toBe(false);
});

test('language switching works when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hello, explorer' })).toBeVisible();
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hola, explorador' })).toBeVisible();
});

test('changing language during a pending search replaces the previous request', async ({
  page,
  api,
}) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => (release = resolve));
  api.handler = async (route, url) => {
    const data = climate();
    if (url.searchParams.get('idioma') === 'en') {
      data.recomendacion.texto = 'English advice from the latest request.';
      await api.fulfill(route, data);
    } else {
      await pending;
      await api.fulfill(route, data).catch(() => undefined);
    }
  };
  try {
    await page.goto('/');
    await search(page, 'Córdoba');
    await expect.poll(() => api.requests.length).toBe(1);
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.locator('#advice-text')).toHaveText(
      'English advice from the latest request.',
    );
    release?.();
    await expect(page.locator('#advice-text')).toHaveText(
      'English advice from the latest request.',
    );
  } finally {
    release?.();
  }
});
