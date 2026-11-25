import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search, changeTheme, chooseLanguage } from './fixtures';

test('teléfonos útiles: posición, cobertura, enlaces y carrusel accesible en ambos temas', async ({
  page,
  api,
}, info) => {
  await page.goto('/');
  const carousel = page.locator('[data-component=app-emergency-contacts]');
  await expect(carousel).toContainText('Buscá una ciudad');
  await expect(carousel.locator('a[href^="tel:"]')).toHaveCount(0);
  await search(page, 'Córdoba');
  const viewport = page.locator('#emergency-viewport');
  await expect(
    carousel.getByRole('heading', { name: 'Teléfonos útiles · Argentina' }),
  ).toBeVisible();
  const carouselBox = (await carousel.boundingBox())!,
    searchBox = (await page.locator('#pronostico').boundingBox())!;
  expect(carouselBox.y).toBeGreaterThan(searchBox.y + searchBox.height);
  const forecastBox = (await page.locator('[data-component=app-forecast]').boundingBox())!;
  expect(carouselBox.y).toBeGreaterThan(forecastBox.y + forecastBox.height);
  const footerBox = (await page.locator('footer').boundingBox())!;
  expect(carouselBox.y + carouselBox.height).toBeLessThan(footerBox.y);
  const links = carousel.locator('a[href^="tel:"]');
  await expect(links).toHaveCount(5);
  expect(
    await links.evaluateAll((elements) => elements.map((e) => e.getAttribute('href'))),
  ).toEqual(['tel:911', 'tel:100', 'tel:103', 'tel:105', 'tel:106']);
  await expect(carousel.locator('a[href="tel:107"]')).toHaveCount(0);
  await expect(carousel.locator('a[href="tel:911"]')).toHaveAccessibleName(/Cobertura: Argentina/);
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
  expect(api.requests).toHaveLength(1);
  expect(api.alertsRequests).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const data = climate('Montevideo');
  data.ubicacion.pais = 'UY';
  api.body = data;
  await search(page, 'Montevideo', 'UY');
  await expect(carousel.getByRole('heading')).toHaveText('Teléfonos útiles · Uruguay');
  await expect(carousel.locator('a[href^="tel:"]')).toHaveCount(3);
  await expect(carousel.locator('a[href="tel:105"]')).toContainText('SAME');
});

test('los teléfonos nacionales y su fuente cambian con el país, sin reutilizar otro catálogo', async ({
  page,
  api,
}) => {
  await page.goto('/');
  const panel = page.locator('[data-component=app-emergency-contacts]');
  for (const [country, city, countryName, numbers, sourceHost] of [
    ['AR', 'Córdoba', 'Argentina', ['911', '100', '103', '105', '106'], 'www.argentina.gob.ar'],
    ['CL', 'Santiago', 'Chile', ['133', '131', '132'], 'www.chile.gob.cl'],
    ['BR', 'São Paulo', 'Brasil', ['190', '192', '193', '199', '191'], 'www.gov.br'],
    ['UY', 'Montevideo', 'Uruguay', ['911', '104', '105'], 'www.gub.uy'],
    ['AR', 'Córdoba', 'Argentina', ['911', '100', '103', '105', '106'], 'www.argentina.gob.ar'],
  ] as const) {
    const data = climate(city);
    data.ubicacion.pais = country;
    api.body = data;
    await search(page, city, country);
    await expect(panel.getByRole('heading')).toHaveText(`Teléfonos útiles · ${countryName}`);
    const links = panel.locator('a[href^="tel:"]');
    await expect(links).toHaveCount(numbers.length);
    expect(
      await links.evaluateAll((elements) => elements.map((e) => e.getAttribute('href'))),
    ).toEqual(numbers.map((n) => `tel:${n}`));
    await expect(links.first()).toHaveAccessibleName(new RegExp(`Cobertura: ${countryName}`));
    expect(
      new URL((await panel.getByRole('link', { name: /Fuente oficial/ }).getAttribute('href'))!)
        .hostname,
    ).toBe(sourceHost);
    await expect(
      panel.getByRole('button', { name: 'Ver teléfonos anteriores', exact: true }),
    ).toBeDisabled();
  }
  const data = climate('Lima');
  data.ubicacion.pais = 'PE';
  api.body = data;
  await search(page, 'Lima', 'PE');
  await expect(panel).toContainText('Todavía no tenemos teléfonos nacionales verificados');
  await expect(panel.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(panel.getByRole('link', { name: /Fuente oficial/ })).toHaveCount(0);
  await chooseLanguage(page, 'en');
  await expect(panel.getByRole('heading')).toHaveText('Useful numbers');
  await expect(panel).toContainText('We do not yet have verified national numbers');
  await expect(panel.locator('a[href^="tel:"]')).toHaveCount(0);
});
