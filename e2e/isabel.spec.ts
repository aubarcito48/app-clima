import AxeBuilder from '@axe-core/playwright';
import {
  test,
  expect,
  search,
  changeTheme,
  climate,
  openNavigation,
  closeNavigation,
} from './fixtures';

function wav(seconds = 8) {
  const dataSize = 24000 * 2 * seconds;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(24000, 24);
  buffer.writeUInt32LE(48000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Alterna voz y pausas para comprobar que la boca sigue el audio real.
  for (let index = 0; index < dataSize / 2; index++) {
    const speaking = Math.floor(index / 12000) % 2 === 0;
    buffer.writeInt16LE(
      speaking ? Math.round(Math.sin((index * 2 * Math.PI * 220) / 24000) * 12000) : 0,
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
  await openNavigation(page);
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
  await openNavigation(page);
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
  await openNavigation(page);
  const isa = page.locator('app-isabel');
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(texts).toEqual([]);
  await closeNavigation(page);
  await search(page, 'Córdoba');
  await openNavigation(page);
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
  await openNavigation(page);
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
  await openNavigation(page);
  await expect(isa.getByRole('button', { name: 'Isa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(texts).toHaveLength(2);
});

test('Isa despierta al consultar, mira a la derecha, habla al frente y duerme cinco segundos después', async ({
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
  await openNavigation(page);
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
  await openNavigation(page);
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
  await openNavigation(page);
  await expect(isa.getByRole('status')).toContainText('Isa está preparando');
  await expect(svg).toHaveAttribute('data-isa-animation', 'isa-right');
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
  await page.route('**/api/v1/voz/', (route) =>
    route.fulfill({
      contentType: 'audio/wav',
      body: wav(6),
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/');
  await search(page, 'Córdoba');
  await openNavigation(page);
  const isa = page.locator('app-isabel');
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
  await openNavigation(page);
  const isa = page.locator('app-isabel');
  await expect(isa.getByRole('status')).toContainText('No pudimos reproducir la voz');
  await expect(page.locator('#advice-text')).toHaveText(climate().recomendacion.texto!);
  await expect(isa.getByRole('button', { name: 'Escuchar consejo' })).toHaveCount(0);
});
