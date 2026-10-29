import AxeBuilder from '@axe-core/playwright';
import {
  test,
  expect,
  search,
  changeTheme,
  climate,
  closeNavigation,
  chooseLanguage,
} from './fixtures';

test('Isa permanece visible en el navbar y fuera del menú al cambiar de resolución', async ({
  page,
}) => {
  await page.goto('/');
  const isa = page.locator('app-isabel');
  const avatar = isa.getByRole('button', { name: 'Isa', exact: true });
  await expect(avatar).toBeVisible();
  await avatar.click();
  await expect(avatar).toHaveAttribute('aria-pressed', 'false');

  for (const width of [320, 360, 640, 768, 1023, 1024, 1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(isa).toHaveCount(1);
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute('aria-pressed', 'false');
    if (width < 1024) {
      await expect(page.locator('.mobile-header app-isabel')).toHaveCount(1);
      await expect(page.locator('.mobile-menu app-isabel')).toHaveCount(0);
      const brand = page.locator('.mobile-header > a');
      await expect(brand).toBeVisible();
      await expect(page.locator('.mobile-header .brand-copy')).toBeVisible({
        visible: width > 640,
      });
      const bounds = await Promise.all([
        brand.boundingBox(),
        avatar.boundingBox(),
        page.locator('.mobile-header > .menu-control').boundingBox(),
      ]);
      const [logo, assistant, menu] = bounds;
      expect(logo!.x + logo!.width).toBeLessThanOrEqual(assistant!.x);
      expect(assistant!.x + assistant!.width).toBeLessThanOrEqual(menu!.x);
      expect(assistant!.width).toBeGreaterThanOrEqual(44);
      expect(assistant!.height).toBeGreaterThanOrEqual(44);
    } else {
      await expect(page.locator('.desktop-shell app-isabel')).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('Isa adapta la mirada al girar la pantalla sin reiniciar la solicitud de voz', async ({
  page,
}, info) => {
  let releaseAudio!: () => void;
  let requests = 0;
  const audioReady = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
  await page.route('**/api/v1/voz/', async (route) => {
    requests++;
    await audioReady;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Córdoba');
  const isa = page.locator('app-isabel');
  const svg = isa.locator('.isa-avatar svg');
  await expect(isa.getByRole('status')).toContainText('Isa está preparando');
  for (const width of [768, 1440, 360, 1024, 1023]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute(
      'data-isa-expression',
      width < 1024 ? 'isa-down' : 'isa-right',
    );
    await expect(isa.getByRole('status')).toContainText('Isa está preparando');
    expect(requests).toBe(1);
    if (width === 360) {
      await page.screenshot({ path: info.outputPath('isa-looking-down-mobile.png') });
    }
  }
  releaseAudio();
  await expect(isa.getByRole('status')).toContainText('No pudimos reproducir la voz');
});

test('Isa reads English advice after changing language and keeps mute available', async ({
  page,
  api,
}) => {
  const requests: { texto: string; idioma?: string }[] = [];
  const english = 'Wear a light jacket with 19 °C and wind at 12 km/h.';
  api.handler = async (route, url) => {
    const data = climate();
    if (url.searchParams.get('idioma') === 'en') data.recomendacion.texto = english;
    await api.fulfill(route, data);
  };
  await page.route('**/api/v1/voz/', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: 'audio/wav',
      body: wav(),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect.poll(() => requests.length).toBe(1);
  await chooseLanguage(page, 'en');
  await expect(page.locator('#advice-text')).toHaveText(english);
  const isa = page.locator('app-isabel');
  await expect(isa.getByRole('status')).toContainText('Isa is speaking');
  expect(requests).toEqual([
    { texto: climate().recomendacion.texto },
    { texto: english, idioma: 'en' },
  ]);
  const avatar = isa.getByRole('button', { name: 'Isa', exact: true });
  await expect(avatar).toBeEnabled();
  await expect(avatar).toHaveAttribute('aria-description', 'Mute');
  await avatar.click();
  await expect(avatar).toHaveAttribute('aria-pressed', 'false');
  await chooseLanguage(page, 'es');
  await expect(page.locator('#advice-text')).toHaveText(climate().recomendacion.texto!);
  await expect(avatar).toHaveAttribute('aria-pressed', 'false');
  expect(requests).toHaveLength(2);
});

function wav(seconds = 8) {
  const sampleRate = 22050;
  const dataSize = sampleRate * 2 * seconds;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Alterna voz y pausas para comprobar que la boca sigue el audio real.
  for (let index = 0; index < dataSize / 2; index++) {
    const speaking = Math.floor(index / (sampleRate / 2)) % 2 === 0;
    buffer.writeInt16LE(
      speaking ? Math.round(Math.sin((index * 2 * Math.PI * 220) / sampleRate) * 12000) : 0,
      44 + index * 2,
    );
  }
  return buffer;
}

test('Isa se anima automáticamente sin botones de animación y respeta movimiento reducido', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const isa = page.locator('app-isabel');
  await expect(page.locator('app-weather-sidebar app-isabel')).toHaveCount(1);
  await expect(page.locator('main app-isabel')).toHaveCount(0);
  await expect(isa.locator('.isa-avatar svg')).toBeVisible();
  await expect(isa.locator('.isa-avatar svg')).toHaveAttribute('data-isa-animation', 'isa-sleep');
  await expect(isa.locator('.isa-fallback')).toHaveCount(0);
  await expect(isa.locator('[data-isa-mouth]')).toHaveAttribute('data-opening', '0.00');
  await expect(isa.getByRole('heading')).toHaveCount(0);
  await expect(isa.getByRole('button', { name: /Animar a Isa|Pausar a Isa/u })).toHaveCount(0);
  const shapes = () =>
    isa
      .locator('svg path')
      .evaluateAll((paths) => paths.map((path) => path.getAttribute('d')).join('|'));
  const initialShape = await shapes();
  await expect.poll(shapes).not.toBe(initialShape);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const avatarButton = isa.getByRole('button', { name: 'Isa', exact: true });
  await expect(isa.getByRole('button')).toHaveCount(1);
  await avatarButton.focus();
  await page.keyboard.press('Enter');
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toBeVisible();
  await expect(avatarButton).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toBeVisible();
  await expect(avatarButton).toHaveAttribute('aria-pressed', 'true');
  await expect(isa.locator('.isa-avatar svg')).toHaveAttribute('data-isa-expression', 'isa-sleep');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('isa.png'), fullPage: true });
  const audit = await new AxeBuilder({ page }).include('app-isabel').analyze();
  expect(audit.violations).toEqual([]);
  await changeTheme(page);
  const nightAudit = await new AxeBuilder({ page }).include('app-isabel').analyze();
  expect(nightAudit.violations).toEqual([]);
});

test('Isa lee el texto exacto, se detiene y vuelve a leer una consulta nueva', async ({
  page,
  api,
}) => {
  const texts: string[] = [];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/v1/voz/', async (route) => {
    texts.push(route.request().postDataJSON().texto);
    await route.fulfill({
      contentType: 'audio/wav',
      body: wav(),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  const isa = page.locator('app-isabel');
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(texts).toEqual([]);
  await closeNavigation(page);
  await search(page, 'Córdoba');
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  await expect
    .poll(async () => Number(await isa.locator('[data-isa-mouth]').getAttribute('data-opening')))
    .toBeGreaterThan(0.05);
  await expect
    .poll(async () => Number(await isa.locator('[data-isa-mouth]').getAttribute('data-opening')))
    .toBe(0);
  expect(texts).toEqual([climate().recomendacion.texto]);
  const eyeOpenness = async () =>
    Number(await isa.locator('.isa-avatar svg').getAttribute('data-isa-eye-openness'));
  await expect.poll(eyeOpenness).toBeLessThan(0.9);
  await expect.poll(eyeOpenness).toBeGreaterThan(0.98);
  await expect(isa.getByRole('button', { name: 'Detener', exact: true })).toHaveCount(0);
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await expect(isa.locator('[data-isa-mouth]')).toHaveAttribute('data-opening', '0.00');
  await expect(isa.locator('.isa-avatar svg')).toHaveAttribute('data-isa-eye-openness', '1.000');
  await expect(isa.getByRole('button', { name: 'Escuchar consejo' })).toHaveCount(0);
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  api.body = climate('Mendoza');
  await closeNavigation(page);
  await search(page, 'Mendoza');
  await expect(page.locator('#advice-text')).toContainText('Mendoza');
  expect(texts).toHaveLength(1);
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  expect(texts.at(-1)).toBe(climate('Mendoza').recomendacion.texto);
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await expect(isa.getByRole('button', { name: 'Detener', exact: true })).toHaveCount(0);
  expect(texts).toHaveLength(2);
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await page.reload();
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(texts).toHaveLength(2);
});

test('Isa despierta, mira hacia el contenido según el navbar, habla al frente y vuelve a dormir', async ({
  page,
  api,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let releaseWeather!: () => void;
  const weatherReady = new Promise<void>((resolve) => {
    releaseWeather = resolve;
  });
  api.handler = async (route) => {
    await weatherReady;
    await api.fulfill(route, api.body);
  };
  let releaseAudio!: () => void;
  const audioReady = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
  await page.route('**/api/v1/voz/', async (route) => {
    await audioReady;
    await route.fulfill({
      contentType: 'audio/wav',
      body: wav(4),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  const isa = page.locator('app-isabel');
  const svg = isa.locator('.isa-avatar svg');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-sleep');
  const eyeHeight = () =>
    isa
      .locator('svg g[clip-path] > path')
      .first()
      .evaluate((eye: SVGPathElement) => eye.getBBox().height);
  const closedHeight = await eyeHeight();
  await closeNavigation(page);
  await search(page, 'Córdoba');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-awake');
  await expect
    .poll(async () => Number(await svg.getAttribute('data-isa-eye-transition')))
    .toBeGreaterThan(0.15);
  const openingHeight = await eyeHeight();
  await expect(svg).toHaveAttribute('data-isa-eye-transition', '1.000');
  const openHeight = await eyeHeight();
  expect(openingHeight).toBeGreaterThan(closedHeight);
  expect(openingHeight).toBeLessThan(openHeight);
  releaseWeather();
  await expect(isa.getByRole('status')).toContainText('Isa está preparando');
  await expect(svg).toHaveAttribute(
    'data-isa-animation',
    page.viewportSize()!.width < 1024 ? 'isa-down' : 'isa-right',
  );
  releaseAudio();
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-awake');
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  await expect(isa.getByRole('status')).toHaveText('');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-awake');
  await expect(isa.locator('[data-isa-mouth]')).toHaveAttribute('data-opening', '0.00');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-sleep', { timeout: 7000 });
  await expect
    .poll(async () => Number(await svg.getAttribute('data-isa-eye-transition')))
    .toBeGreaterThan(0.15);
  const closingHeight = await eyeHeight();
  expect(closingHeight).toBeGreaterThan(closedHeight);
  expect(closingHeight).toBeLessThan(openHeight);
  await expect(svg).toHaveAttribute('data-isa-eye-transition', '1.000');
});

test('los ojos se entrecierran realmente durante el audio incluso con movimiento reducido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let releaseAudio!: () => void;
  const audioReady = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
  await page.route('**/api/v1/voz/', async (route) => {
    await audioReady;
    await route.fulfill({
      contentType: 'audio/wav',
      body: wav(6),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await search(page, 'Córdoba');
  const isa = page.locator('app-isabel');
  await expect(isa.locator('svg')).toHaveAttribute(
    'data-isa-expression',
    page.viewportSize()!.width < 1024 ? 'isa-down' : 'isa-right',
  );
  await expect(isa.locator('svg')).toHaveAttribute('data-isa-eye-transition', '1.000');
  releaseAudio();
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  const leftEye = isa.locator('svg g[clip-path] > path').first();
  const height = () => leftEye.evaluate((path: SVGPathElement) => path.getBBox().height);
  await expect(isa.locator('svg')).toHaveAttribute('data-isa-eye-transition', '1.000');
  await expect
    .poll(async () => Number(await isa.locator('svg').getAttribute('data-isa-eye-openness')))
    .toBeGreaterThan(0.98);
  const openHeight = await height();
  await expect.poll(height).toBeLessThan(openHeight * 0.93);
  await expect.poll(height).toBeGreaterThan(openHeight * 0.95);
  await isa.getByRole('button', { name: 'Isa', exact: true }).click();
  await expect(isa.locator('svg')).toHaveAttribute('data-isa-eye-openness', '1.000');
});

test('un fallo de voz conserva el consejo sin botón para repetirlo', async ({ page }) => {
  await page.route('**/api/v1/voz/', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/');
  await search(page, 'Córdoba');
  const isa = page.locator('app-isabel');
  await expect(isa.getByRole('status')).toContainText('No pudimos reproducir la voz');
  await expect(page.locator('#advice-text')).toHaveText(climate().recomendacion.texto!);
  await expect(isa.getByRole('button', { name: 'Escuchar consejo' })).toHaveCount(0);
});
