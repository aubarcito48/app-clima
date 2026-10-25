import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search, changeTheme } from './fixtures';

test('teléfonos útiles: posición, cobertura, enlaces y carrusel accesible en ambos temas', async ({
  page,
  api,
}, info) => {
  await page.goto('/');
  const carousel = page.locator('app-emergency-contacts');
  const viewport = page.locator('#emergency-viewport');
  await expect(
    carousel.getByRole('heading', { name: 'Teléfonos útiles · Argentina' }),
  ).toBeVisible();
  const carouselBox = (await carousel.boundingBox())!,
    searchBox = (await page.locator('#pronostico').boundingBox())!;
  expect(carouselBox.y + carouselBox.height).toBeLessThanOrEqual(searchBox.y);
  const links = carousel.locator('a[href^="tel:"]');
  await expect(links).toHaveCount(6);
  expect(
    await links.evaluateAll((elements) => elements.map((e) => e.getAttribute('href'))),
  ).toEqual(['tel:911', 'tel:100', 'tel:103', 'tel:105', 'tel:106', 'tel:107']);
  await expect(carousel.locator('a[href="tel:107"]')).toContainText(
    'CABA y localidades de la provincia de Buenos Aires',
  );
  await expect(carousel.locator('a[href="tel:107"]')).toHaveAccessibleName(/Cobertura: CABA/);
  const previous = carousel.getByRole('button', { name: 'Ver teléfonos anteriores', exact: true });
  const next = carousel.getByRole('button', { name: 'Ver más teléfonos', exact: true });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  const initial = await viewport.evaluate((e) => e.scrollLeft);
  await page.waitForTimeout(200);
  expect(await viewport.evaluate((e) => e.scrollLeft)).toBe(initial);
  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => viewport.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect(previous).toBeDisabled();
  await next.click();
  await viewport.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(next).toBeDisabled();
  await expect(links.last()).toBeInViewport();
  await previous.click();
  await viewport.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await expect(previous).toBeDisabled();
  for (const mode of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== mode) await changeTheme(page);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await info.attach(`telefonos-${mode}`, {
      body: await carousel.screenshot(),
      contentType: 'image/png',
    });
  }
  expect(api.requests).toHaveLength(0);
  expect(api.alertsRequests).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const data = climate('Montevideo');
  data.ubicacion.pais = 'UY';
  api.body = data;
  await search(page, 'Montevideo', 'UY');
  await expect(carousel).toContainText('Consultaste una ubicación fuera de Argentina');
});
