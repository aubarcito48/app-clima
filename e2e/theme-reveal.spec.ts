import { test, expect } from './fixtures';

async function openTheme(page: import('@playwright/test').Page) {
  if (page.viewportSize()!.width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  return page.locator('app-theme-toggle button');
}

test('revelado circular: nace en el control, completa ambos temas y tolera clics rápidos', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (options && typeof options === 'object' && options.pseudoElement === '::view-transition-new(root)') {
        animation.pause();
        animation.currentTime = 300;
      }
      return animation;
    };
  });
  await page.goto('/');
  const button = await openTheme(page);
  await page.evaluate(() => document.addEventListener('click', event => {
    const control = (event.target as Element)?.closest('app-theme-toggle button');
    if (!control) return;
    const rect = control.getBoundingClientRect();
    document.documentElement.dataset['testThemeOrigin'] = JSON.stringify([rect.left + rect.width / 2, rect.top + rect.height / 2]);
  }, { capture: true }));
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const reveal = () => page.evaluate(() => document.getAnimations().find(animation =>
    animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement === '::view-transition-new(root)')?.playState ?? null);
  await expect.poll(reveal).toBe('paused');
  const frames = await page.evaluate(() => {
    const animation = document.getAnimations().find(animation => animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement === '::view-transition-new(root)')!;
    return (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame['clipPath']));
  });
  const expectedOrigin = await page.evaluate(() => JSON.parse(document.documentElement.dataset['testThemeOrigin']!) as number[]);
  const origin = frames[0].match(/at ([\d.]+)px ([\d.]+)px/)!;
  expect(Number(origin[1])).toBeCloseTo(expectedOrigin[0], 2);
  expect(Number(origin[2])).toBeCloseTo(expectedOrigin[1], 2);
  await info.attach('circulo-a-mitad', { body: await page.screenshot(), contentType: 'image/png' });
  const finishReveal = () => page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement === '::view-transition-new(root)') animation.finish();
    }
  });
  await finishReveal();
  await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
  await button.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(reveal).toBe('paused');
  await finishReveal();
  await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
  // Restore normal playback for the rapid interaction check.
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) { const animation = original.call(this, frames, options); animation.play(); return animation; };
  });
  await button.evaluate(element => { const control = element as HTMLButtonElement; control.click(); control.click(); control.click(); });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
  expect(await page.evaluate(() => localStorage.getItem('stitchweather.theme'))).toBe('dark');
});

test('revelado circular: movimiento reducido cambia el tema inmediatamente', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/');
  await (await openTheme(page)).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
});

test('revelado circular: navegador sin View Transitions conserva el cambio y la preferencia', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await page.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined }));
  await page.goto('/');
  await (await openTheme(page)).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
