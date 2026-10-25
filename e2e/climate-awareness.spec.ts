import AxeBuilder from '@axe-core/playwright';
import { test, expect, changeTheme } from './fixtures';

test('slider ambiental: imágenes locales, posición, teclado, navegación y ambos temas', async ({
  page,
  api,
}, info) => {
  await page.goto('/');
  const slider = page.locator('app-climate-awareness');
  const active = slider.locator('figure:not([hidden])');
  await expect(active.getByRole('heading')).toHaveText('Cuidemos nuestros bosques');
  const sliderBox = (await slider.boundingBox())!,
    contacts = (await page.locator('app-emergency-contacts').boundingBox())!;
  expect(sliderBox.y + sliderBox.height).toBeLessThan(contacts.y);
  if (page.viewportSize()!.width >= 1280) {
    const greeting = (await page.locator('h1').boundingBox())!;
    expect(sliderBox.x).toBeGreaterThan(greeting.x + greeting.width);
  }
  await expect(slider.locator('.slider-button')).toHaveCount(0);
  await expect(slider.locator('.slide-dot')).toHaveCount(3);
  const water = slider.locator('.slide-dot').nth(1);
  await water.focus();
  await page.keyboard.press('Enter');
  await expect(active.getByRole('heading')).toHaveText('Cada gota cuenta');
  await expect(active.getByRole('img')).toHaveAttribute('alt', /Agua cristalina/);
  await expect
    .poll(() =>
      active
        .getByRole('img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect(active.getByRole('heading')).toHaveText('Un futuro con energía limpia');
  await slider.locator('.slide-dot').first().click();
  await expect(active.getByRole('heading')).toHaveText('Cuidemos nuestros bosques');
  for (const theme of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme) await changeTheme(page);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await info.attach(`slider-${theme}`, {
      body: await page.locator('main > header').screenshot(),
      contentType: 'image/png',
    });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(api.requests).toHaveLength(0);
});

test('slider ambiental: avance automático sin controles flotantes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  const slider = page.locator('app-climate-awareness');
  const active = slider.locator('figure:not([hidden])');
  await expect(active.getByRole('heading')).toHaveText('Cuidemos nuestros bosques');
  await page.clock.runFor(5100);
  await expect(active.getByRole('heading')).toHaveText('Cada gota cuenta');
  await slider.getByRole('button', { name: 'Pausar presentación ambiental', exact: true }).click();
  await page.clock.runFor(16000);
  await expect(active.getByRole('heading')).toHaveText('Cada gota cuenta');
  await slider
    .getByRole('button', { name: 'Reanudar presentación ambiental', exact: true })
    .click();
  await page.clock.runFor(5100);
  await expect(active.getByRole('heading')).toHaveText('Un futuro con energía limpia');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(5100);
  await expect(active.getByRole('heading')).toHaveText('Cuidemos nuestros bosques');
});
