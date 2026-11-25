import { test, expect, climate, search } from './fixtures';
import type { Route } from '@playwright/test';

test('Vue: muestra clima actual con ceros y contenido de texto seguro', async ({ page, api }) => {
  api.body = climate('Córdoba');
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toContainText('0');
  await expect(page.getByRole('heading', { name: 'Córdoba', exact: true })).toBeVisible();
  await expect(page.locator('#advice-text')).toHaveText('Consejo ficticio de prueba para Córdoba.');
  expect(api.requests[0].searchParams.get('ciudad')).toBe('Córdoba');
});

test('Vue: valida el lugar antes de consultar', async ({ page, api }) => {
  await page.goto('/');
  await page.locator('#city').fill('Córdoba,');
  await page.locator('#city').press('Enter');
  await expect(page.locator('#city-error')).toBeVisible();
  expect(api.requests).toHaveLength(0);
});

test('Vue: rechaza una respuesta inválida y permite reintentar', async ({ page, api }) => {
  api.body = {};
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('#search-feedback')).toContainText('datos inválidos');
  api.body = climate();
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(page.locator('.temperature')).toBeVisible();
});

test('Vue: conserva la respuesta más reciente', async ({ page, api }) => {
  let previous: Route | undefined;
  api.handler = async (route, url) => {
    if (url.searchParams.get('ciudad') === 'Primera') previous = route;
    else await api.fulfill(route, climate('Segunda'));
  };
  await page.goto('/');
  await search(page, 'Primera');
  await expect.poll(() => !!previous).toBe(true);
  await search(page, 'Segunda');
  await expect(page.getByRole('heading', { name: 'Segunda', exact: true })).toBeVisible();
  await api.fulfill(previous!, climate('Primera')).catch(() => undefined);
  await expect(page.getByRole('heading', { name: 'Segunda', exact: true })).toBeVisible();
});
