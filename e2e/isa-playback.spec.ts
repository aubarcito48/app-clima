import { readFileSync } from 'node:fs';
import { test, expect, search, chooseLanguage, changeTheme } from './fixtures';

for (const language of ['es', 'en'] as const) {
  test(`Isa conserva el ciclo y termina una lectura real en ${language}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      localStorage.setItem('stitchweather.theme', 'dark');
      const NativeAudio = window.Audio;
      window.Audio = class extends NativeAudio {
        constructor(src?: string) {
          super(src);
          (window as unknown as { isaTestAudio: HTMLAudioElement }).isaTestAudio = this;
        }
      };
    });
    const audio = readFileSync(
      `e2e/data/isa/${language}_long.wav`,
    );
    await page.route('**/api/v1/voz/', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: audio,
        headers: { 'access-control-allow-origin': '*' },
      }),
    );
    await page.goto('/');
    if (language === 'en') await chooseLanguage(page, 'en');
    await search(page, 'Cordoba');
    const canvas = page.locator('app-isabel canvas');
    await expect(canvas).toHaveAttribute('data-isa-speaking', 'true', { timeout: 15000 });
    await expect(canvas).toHaveAttribute('data-isa-speech-language', language);
    await expect(page.locator('app-isabel .isa-avatar')).toHaveCSS('filter', /isa-dark-edge/);
    await page.evaluate(() => {
      (window as unknown as { isaTestAudio: HTMLAudioElement }).isaTestAudio.currentTime = 8;
    });
    await expect(canvas).toHaveAttribute('data-isa-speaking', 'true');
    await expect.poll(() => canvas.getAttribute('data-isa-speech-blend')).toBe('1.000');
    await page.evaluate(() => {
      const audio = (window as unknown as { isaTestAudio: HTMLAudioElement }).isaTestAudio;
      audio.currentTime = audio.duration - 0.15;
    });
    await expect(canvas).toHaveAttribute('data-isa-speaking', 'false');
    await expect.poll(() => canvas.getAttribute('data-isa-speech-blend')).toBe('0.000');
    await changeTheme(page);
    await expect(page.locator('app-isabel .isa-avatar')).toHaveCSS('filter', 'none');
  });
}
