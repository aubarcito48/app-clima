import { test, expect, climate, search } from './fixtures';

test('los textos maliciosos del clima se muestran como texto y no ejecutan HTML', async ({
  page,
  api,
}) => {
  const payload = '<img data-xss src=x onerror="window.__xss=1">';
  const body = climate(payload);
  body.actual.descripcion = payload;
  body.recomendacion.texto = payload;
  api.body = body;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('#advice-text')).toHaveText(payload);
  await expect(page.locator('[data-xss]')).toHaveCount(0);
  expect(await page.evaluate(() => '__xss' in window)).toBe(false);
});
