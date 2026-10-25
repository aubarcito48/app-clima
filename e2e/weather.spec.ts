import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search, changeTheme } from './fixtures';
import type { Page } from '@playwright/test';

test('accesibilidad nocturna: contraste hover, foco, sugerencias, menú y ancho reducido', async ({
  page,
  api,
}, info) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const data = climate();
  data.actual.icono = '02d';
  data.pronostico.intervalos = Array.from({ length: 40 }, (_, index) => ({
    ...data.pronostico.intervalos[0],
    fecha_utc: new Date(Date.parse('2026-10-24T09:00:00Z') + index * 10800000).toISOString(),
  }));
  api.body = data;
  await page.goto('/');
  await openNavigation(page);
  const themeButton = page.locator('app-theme-toggle button');
  await expect(themeButton).toHaveAccessibleName('Activar modo claro');
  await page.keyboard.press('Tab');
  await themeButton.focus();
  await expect(themeButton).toBeFocused();
  const focus = await themeButton.evaluate((e) => {
    const style = getComputedStyle(e);
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focus.width).toBeGreaterThanOrEqual(3);
  expect(focus.style).toBe('solid');
  await page.keyboard.press('Space');
  await expect(themeButton).toHaveAccessibleName('Activar modo oscuro');
  await page.keyboard.press('Space');
  await expect(themeButton).toHaveAccessibleName('Activar modo claro');
  await expect(themeButton).toBeFocused();

  await closeNavigation(page);
  const locationButton = page.getByRole('button', { name: 'Usar mi ubicación', exact: true });
  await locationButton.hover();
  // Measure the final hover color, after its CSS transition settles.
  await expect
    .poll(() =>
      locationButton.evaluate(async (e) => {
        getComputedStyle(e).backgroundColor;
        await Promise.all(
          e.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
        );
        const style = getComputedStyle(e);
        const luminance = (color: string) => {
          const rgb = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const c = v / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const a = luminance(style.color),
          b = luminance(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }),
    )
    .toBeGreaterThanOrEqual(4.5);

  await page.locator('#city').fill('Cor');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.locator('#city').press('ArrowDown');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  const audit = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await audit();
  await page.locator('#city').press('Enter');
  await expect(page.locator('.temperature')).toBeVisible();
  await page.getByLabel('Unidad de temperatura').focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('group', { name: 'Elegir un día del pronóstico, desplazables horizontalmente' }),
  ).toBeFocused();
  for (let index = 0; index < (await page.locator('.day-choice').count()); index++) {
    await page.keyboard.press('Tab');
    await expect(page.locator('.day-choice').nth(index)).toBeFocused();
  }
  await expect(page.locator('.day-choice').last()).toBeFocused();
  const focusFits = await page
    .locator('.day-choice')
    .last()
    .evaluate((e) => {
      const button = e.getBoundingClientRect(),
        strip = e.parentElement!.getBoundingClientRect();
      const style = getComputedStyle(e);
      const ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      return (
        parseFloat(style.outlineWidth) >= 3 &&
        button.top - ring >= strip.top &&
        button.bottom + ring <= strip.bottom &&
        button.left - ring >= strip.left &&
        button.right + ring <= strip.right
      );
    });
  expect(focusFits).toBe(true);
  await info.attach('foco-tarjetas-nocturnas', {
    body: await page.locator('section[aria-labelledby="daily-heading"]').screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: /^Guardar .+ en favoritos$/ }).click();
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await expect(page.locator('#favorite-places')).toBeVisible();
  await audit();
  await closeNavigation(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await audit();
  await openNavigation(page);
  await themeButton.focus();
  await expect(themeButton).toBeInViewport();
  await info.attach('foco-modo-oscuro-320', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('modo oscuro: teclado, contraste, persistencia y elección sobre el sistema', async ({
  page,
  api,
}, info) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.weather-panel')).not.toHaveCSS('background-image', 'none');
  await expect(page.locator('#current-heading')).toHaveCSS('color', 'rgb(18, 57, 82)');
  const initialDayAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(initialDayAudit.violations).toEqual([]);
  await openNavigation(page);
  const toggle = page.getByRole('button', { name: 'Activar modo oscuro', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await closeNavigation(page);
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await page.getByRole('button', { name: /^Guardar .+ en favoritos$/ }).click();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await info.attach('modo-oscuro', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await changeTheme(page);
  await expect(page.locator('.temperature')).toHaveCSS('color', 'rgb(18, 57, 82)');
  await expect(page.locator('#advice-text')).toHaveCSS('color', 'rgb(18, 57, 82)');
  await expect(page.locator('.weather-panel')).not.toHaveCSS('background-image', 'none');
  const readyDayAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(readyDayAudit.violations).toEqual([]);
  await info.attach('modo-dia-con-clima', {
    body: await page.locator('app-current-weather').screenshot(),
    contentType: 'image/png',
  });
  await changeTheme(page);
  await page.reload();
  await openNavigation(page);
  await expect(page.getByRole('button', { name: 'Activar modo claro', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await changeTheme(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await openNavigation(page);
  await expect(
    page.getByRole('button', { name: 'Activar modo oscuro', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(api.requests).toHaveLength(1);
});

test('el tema sigue al dispositivo sin preferencia guardada y funciona sin almacenamiento', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      value() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await openNavigation(page);
  await expect(page.getByRole('button', { name: 'Activar modo claro', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await changeTheme(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

async function openNavigation(page: Page) {
  if (
    page.viewportSize()!.width < 1024 &&
    !(await page.getByRole('dialog', { name: 'Navegación principal' }).isVisible())
  ) {
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  }
}
async function closeNavigation(page: Page) {
  const close = page.getByRole('button', { name: 'Cerrar menú', exact: true });
  if (await close.isVisible()) await close.click();
}

test('navegación adaptable: hamburguesa, Escape, fondo y barra contraíble', async ({
  page,
}, info) => {
  await page.goto('/');
  if (page.viewportSize()!.width < 1024) {
    const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Navegación principal' });
    await expect(dialog).not.toBeVisible();
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('link', { name: 'Pronóstico', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).toBeFocused();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await info.attach('menu-abierto', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    await trigger.click();
    await page.mouse.click(page.viewportSize()!.width - 4, 250);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(
      page.getByRole('button', { name: 'Contraer menú lateral', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  }
  const before = (await page.locator('main').boundingBox())!;
  await page.getByRole('button', { name: 'Contraer menú lateral', exact: true }).click();
  await expect(page.locator('#desktop-navigation')).toHaveClass(/is-collapsed/);
  const after = (await page.locator('main').boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width + 100);
  await expect(
    page.getByRole('button', { name: 'Expandir menú lateral', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await expect(
    page.getByRole('button', { name: 'Contraer menú lateral', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#favorite-places')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('favoritos: corazón, contador, persistencia y consulta por coordenadas', async ({
  page,
  api,
}, info) => {
  await page.goto('/');
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await expect(page.locator('#favorite-places')).toContainText('Todavía no guardaste lugares');
  await closeNavigation(page);
  await search(page, 'Córdoba');
  const heart = page.getByRole('button', { name: 'Guardar Córdoba en favoritos', exact: true });
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.click();
  await expect(
    page.getByRole('button', { name: 'Quitar Córdoba de favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await openNavigation(page);
  await expect(page.getByRole('button', { name: /^Mis lugares/ })).toContainText('1');
  await page.reload();
  await expect(page.locator('#city')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await expect(page.locator('#favorite-places li')).toHaveCount(1);
  await info.attach('mis-lugares', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.locator('#favorite-places li').first().getByRole('button').first().click();
  await expect(page.locator('app-current-weather h3')).toHaveText('Córdoba');
  expect(api.requests).toHaveLength(2);
  expect(api.requests[1].searchParams.get('latitud')).toBe('-31.42');
  expect(api.requests[1].searchParams.get('longitud')).toBe('-64.18');
  await expect(page.locator('#city')).toHaveValue('Córdoba, Córdoba, AR');
  await expect(
    page.getByRole('button', { name: 'Quitar Córdoba de favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await page
    .getByRole('button', { name: 'Eliminar Córdoba, AR de Mis lugares', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^Mis lugares/ })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Mis lugares/ })).toContainText('0');
  await closeNavigation(page);
  await expect(
    page.getByRole('button', { name: 'Guardar Córdoba en favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await openNavigation(page);
  await page.getByRole('button', { name: /^Mis lugares/ }).click();
  await expect(page.locator('#favorite-places li')).toHaveCount(0);
});

test('StitchWeather: días, horas y línea sin bloques de IA o Spotify', async ({
  page,
  api,
}, info) => {
  const data = climate();
  data.actual.icono = '02d';
  data.actual.direccion_viento_grados = 270;
  data.actual.amanecer_utc = '2026-10-24T09:00:00Z';
  data.actual.atardecer_utc = '2026-10-24T22:30:00Z';
  data.pronostico.intervalos = Array.from({ length: 40 }, (_, index) => ({
    fecha_utc: new Date(Date.parse('2026-10-24T09:00:00Z') + index * 10800000).toISOString(),
    temperatura_c: (index % 8) - 2,
    descripcion: 'Cielo claro',
    icono: '01d',
    precipitacion_pct: 0,
    viento_kmh: index * 1.5,
    direccion_viento_grados: 45,
  }));
  api.body = data;
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'StitchWeather, inicio' })).toBeVisible();
  await expect(page.locator('app-weather-music iframe')).toHaveCount(0);
  await search(page, 'Córdoba');
  await expect(page.locator('app-current-weather')).toContainText('06:00');
  await expect(page.locator('app-current-weather')).toContainText('19:30');
  await expect(page.locator('.weather-art')).toBeVisible();
  await expect(page.locator('app-current-weather')).toContainText('Oeste (O)');
  await expect(page.locator('app-forecast ol li')).toHaveCount(6);
  const firstDayBox = (await page.locator('.day-choice').nth(0).boundingBox())!;
  const secondDayBox = (await page.locator('.day-choice').nth(1).boundingBox())!;
  expect(secondDayBox.y).toBeCloseTo(firstDayBox.y, 0);
  expect(secondDayBox.x).toBeGreaterThan(firstDayBox.x + firstDayBox.width);
  expect(firstDayBox.height).toBeGreaterThan(firstDayBox.width);
  const hoursBox = (await page.locator('#hourly-intervals').boundingBox())!;
  const currentBox = (await page.locator('app-current-weather').boundingBox())!;
  const chartBox = (await page.locator('app-temperature-chart').boundingBox())!;
  const hoursHeadingBox = (await page.locator('#forecast-heading').boundingBox())!;
  expect(chartBox.y).toBeGreaterThanOrEqual(currentBox.y + currentBox.height);
  expect(chartBox.y + chartBox.height).toBeLessThanOrEqual(hoursHeadingBox.y);
  expect(hoursHeadingBox.y).toBeGreaterThan(firstDayBox.y + firstDayBox.height);
  expect(hoursBox.y).toBeGreaterThan(hoursHeadingBox.y);
  await expect(page.locator('#hourly-intervals')).toContainText('Ahora');
  await page.locator('.day-choice').nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.day-choice').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('app-forecast ol li')).toHaveCount(8);
  await expect(page.locator('app-temperature-chart circle')).toHaveCount(8);
  await expect(page.locator('app-temperature-chart polyline')).toHaveCount(1);
  await page.getByRole('button', { name: 'Precipitaciones', exact: true }).click();
  await expect(page.locator('app-temperature-chart figcaption')).toContainText(
    'Probabilidad de lluvia (%)',
  );
  await expect(page.getByRole('button', { name: 'Precipitaciones', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Viento', exact: true }).click();
  await expect(page.locator('app-temperature-chart figcaption')).toContainText('Viento (km/h)');
  await expect(page.locator('app-temperature-chart circle title').first()).toContainText('Noreste');
  await expect(page.locator('app-temperature-chart circle')).toHaveCount(8);
  await page.getByRole('button', { name: 'Temperatura', exact: true }).click();
  await expect(page.locator('app-forecast ol li').first()).toContainText('Lluvia: 0 %');
  await page.getByLabel('Unidad de temperatura').selectOption('F');
  await expect(page.locator('app-forecast ol li').first()).toContainText('°F');
  await expect(page.locator('app-temperature-chart figcaption')).toContainText('°F');
  await expect(page.locator('app-current-weather .temperature')).toContainText('32');
  await expect(page.locator('app-current-weather .temperature-unit')).toHaveText('°F');
  await expect(page.locator('app-current-weather')).toContainText('26.6 °F');
  await page.getByLabel('Unidad de temperatura').selectOption('C');
  await expect(page.locator('app-current-weather .temperature-unit')).toHaveText('°C');
  expect(api.requests).toHaveLength(1);
  await expect(page.locator('app-weather-sidebar iframe')).toHaveCount(0);
  expect(api.spotifyRequests).toHaveLength(0);
  await info.attach('stitch-dias-horas-musica', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expect(page.locator('main app-recommendation, main app-weather-music')).toHaveCount(0);
  await expect(page.locator('app-current-weather #advice-text')).toHaveText(
    data.recomendacion.texto!,
  );
  await expect(page.locator('a[href="#musica"]')).toHaveCount(0);
  await expect(page.locator('app-weather-music')).toHaveCount(0);
  await page.locator('#city').fill('Otro lugar');
  await expect(page.locator('app-weather-sidebar iframe')).toHaveCount(0);
  await expect(page.locator('.temperature')).toHaveCount(0);
  await expect(page.locator('app-temperature-chart svg')).toHaveCount(0);
});

test('validación y parámetros: teclado, país ASCII y caracteres reservados', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await expect(page.locator('#city')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Pausar presentación ambiental', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  for (let index = 1; index <= 3; index++) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^Ver imagen ${index}:`) }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('button', { name: 'Ver más teléfonos', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#emergency-viewport')).toBeFocused();
  for (const contact of ['911', '100', '103', '105', '106', '107']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`app-emergency-contacts a[href="tel:${contact}"]`)).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('app-emergency-contacts a[target="_blank"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#city')).toBeFocused();
  await page.locator('#city').press('Enter');
  await expect(page.locator('#city-error')).toBeVisible();
  expect(api.requests).toHaveLength(0);
  await search(page, 'Córdoba,', '');
  await expect(page.locator('#city-error')).toBeVisible();
  await expect(page.locator('#city')).toBeFocused();
  expect(api.requests).toHaveLength(0);
  const city = 'São Tomé & Príncipe + #1/2?';
  await search(page, ` ${city} `, ' st ', ' Región Sur ');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  expect([...api.requests[0].searchParams]).toEqual([
    ['ciudad', city],
    ['pais', 'ST'],
    ['region', 'Región Sur'],
  ]);
});

test('flujo principal: clima, unidades y consejo de la misma consulta', async ({
  page,
  api,
}, info) => {
  api.body = climate('Mendoza');
  await page.goto('/');
  expect(api.requests).toHaveLength(0);
  await search(page, 'Mendoza');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  await expect(page.locator('.temperature')).toContainText('0');
  await expect(page.locator('app-current-weather')).toContainText('-3 °C');
  await expect(page.locator('app-current-weather dd').nth(0)).toHaveText('0 %');
  await expect(page.locator('app-current-weather dd').nth(1)).toHaveText('9.123 km/h');
  await expect(page.locator('main app-recommendation, main app-weather-music')).toHaveCount(0);
  await expect(page.locator('app-current-weather #advice-text')).toHaveText(
    'Consejo ficticio de prueba para Mendoza.',
  );
  await expect(page.locator('app-forecast ol li')).toHaveCount(2);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await info.attach('resultado', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('clima disponible con IA no disponible y aviso anunciable', async ({ page, api }, info) => {
  const data = climate();
  data.recomendacion = { estado: 'no_disponible', texto: null };
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(page.locator('app-forecast ol li')).toHaveCount(2);
  await expect(page.locator('app-recommendation')).toHaveCount(0);
  await expect(page.locator('#advice-text')).toHaveCount(0);
  await expect(
    page.getByRole('status', { name: 'Estado de la consulta del clima' }),
  ).not.toContainText('Consejo de IA');
  await info.attach('IA-no-disponible', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('ambos bloques parciales y mediciones opcionales ausentes', async ({ page, api }) => {
  const data = climate();
  data.actual = {
    ...data.actual,
    sensacion_c: null,
    humedad_pct: null,
    viento_kmh: null,
    descripcion: null,
  };
  data.pronostico = { estado: 'no_disponible', intervalos: [] };
  data.recomendacion = { estado: 'no_disponible', texto: null };
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  await expect(page.locator('app-current-weather dd')).toHaveText([
    'No disponible',
    'No disponible',
    'No disponible',
    'No disponible',
  ]);
  await expect(page.locator('app-forecast')).toContainText('Pronóstico no disponible');
  await expect(page.locator('app-forecast ol')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/undefined|NaN/);
});

test('cuarenta intervalos, cambio de año y hora de ciudad independiente del navegador', async ({
  page,
  api,
}) => {
  const data = climate();
  data.actual.fecha_utc = '2026-12-31T02:30:00Z';
  data.meta.consultado_en_utc = '2026-12-31T03:15:00Z';
  data.pronostico.intervalos = Array.from({ length: 40 }, (_, i) => ({
    fecha_utc: new Date(Date.parse('2026-12-31T21:00:00Z') + i * 10800000).toISOString(),
    temperatura_c: i - 20,
    descripcion: null,
  }));
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('app-current-weather time').nth(0)).toContainText(
    '30 de diciembre de 2026 a las 23:30',
  );
  await expect(page.locator('app-current-weather time').nth(1)).toContainText(
    '31 de diciembre de 2026 a las 00:15',
  );
  await page.getByRole('button', { name: 'Ver todos los intervalos' }).click();
  await expect(page.locator('app-forecast li')).toHaveCount(40);
  await expect(page.locator('app-forecast time').nth(0)).toHaveText('18:00 h');
  await expect(page.locator('app-forecast')).toContainText('2027');
  await expect(page.locator('app-forecast')).toContainText('No son promedios diarios');
});

test('409: elegir una región entre candidatos del mismo país', async ({ page, api }) => {
  const candidate = {
    nombre: 'Córdoba',
    pais: 'AR',
    region: 'Córdoba',
    latitud: -31.42,
    longitud: -64.18,
  };
  api.body = {
    codigo: 'CIUDAD_AMBIGUA',
    candidatos: [candidate, { ...candidate, region: 'Otra región', latitud: -32 }],
  };
  api.status = 409;
  await page.goto('/');
  await search(page, 'Córdoba');
  const choice = page.getByRole('button', { name: 'Córdoba, Otra región, AR', exact: true });
  await expect(choice).toBeVisible();
  await expect(page.locator('#city')).toBeFocused();
  api.body = climate();
  api.status = 200;
  await choice.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests[1].searchParams.get('region')).toBe('Otra región');
  await expect(page.locator('#city')).toHaveValue('Córdoba, Otra región, AR');
});

test('404 y 503: corregir y reintentar con teclado sin resultados anteriores', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
  api.status = 404;
  api.body = { codigo: 'CIUDAD_NO_ENCONTRADA' };
  await search(page, 'Inexistente');
  await expect(page.locator('#city')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Corregir búsqueda' })).toBeVisible();
  await expect(page.locator('.temperature')).toHaveCount(0);
  api.status = 503;
  api.body = { codigo: 'SERVICIO_NO_DISPONIBLE' };
  await search(page, 'Mendoza');
  await expect(page.locator('[aria-labelledby="search-feedback"]')).toBeFocused();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  api.status = 200;
  api.body = climate('Mendoza');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reintentar consulta' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  expect(api.requests).toHaveLength(4);
  expect(api.requests.at(-1)!.search).toBe(api.requests.at(-2)!.search);
});

test('una respuesta tardía y un duplicado pendiente no reemplazan la última búsqueda', async ({
  page,
  api,
}) => {
  let release: (() => Promise<void>) | undefined;
  api.handler = async (route, url) => {
    if (url.searchParams.get('ciudad') === 'Córdoba') {
      await new Promise<void>((resolve) => {
        release = async () => {
          try {
            await api.fulfill(route, climate('Córdoba'));
          } catch {
            /* La solicitud anterior ya está cancelada. */
          } finally {
            resolve();
          }
        };
      });
    } else await api.fulfill(route, climate('Mendoza'));
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect.poll(() => api.requests.length).toBe(1);
  await page.locator('#city').press('Enter');
  await expect(page.getByRole('status', { name: 'Estado de la consulta del clima' })).toContainText(
    'Consultando el clima de Córdoba',
  );
  await search(page, 'Mendoza');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  try {
    expect(api.requests).toHaveLength(2);
  } finally {
    await release?.();
  }
  await expect(page.locator('#advice-text')).toHaveText('Consejo ficticio de prueba para Mendoza.');
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
});

test('texto literal, accesibilidad y ausencia de desbordamiento', async ({ page, api }) => {
  const data = climate();
  data.recomendacion.texto = '<script>window.injected=true</script>\n' + 'x'.repeat(500);
  api.body = data;
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('app-current-weather #advice-text')).toHaveText(
    data.recomendacion.texto!,
  );
  await expect(page.locator('#advice-text script, #advice-text img')).toHaveCount(0);
  await expect(page.locator('app-recommendation script, app-recommendation img')).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  api.status = 429;
  api.body = { codigo: 'LIMITE_ALCANZADO' };
  await search(page, 'Mendoza');
  await expect(page.getByRole('alert')).toContainText('límite');
  const errors = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(errors.violations).toEqual([]);
});

test('sugiere al pausar y consulta clima solo al elegir un lugar', async ({ page, api }) => {
  api.body = climate('Mendoza');
  api.placesBody = {
    sugerencias: [
      {
        id: 2,
        nombre: 'Mendoza',
        pais: 'AR',
        region: 'Mendoza',
        latitud: -32.89,
        longitud: -68.84,
      },
    ],
  };
  await page.goto('/');
  await expect(page.locator('input')).toHaveCount(1);
  await expect(page.locator('button[type="submit"]')).toHaveCount(0);
  await page.locator('#city').fill('Men');
  await page.locator('#city').fill('Mendo');
  const option = page.getByRole('option', { name: /Mendoza/ });
  await expect(option).toBeVisible();
  expect(api.placesRequests).toHaveLength(1);
  expect(api.requests).toHaveLength(0);
  await expect(page.getByText('Probá con', { exact: true })).toHaveCount(0);
  await option.click();
  await expect(page.locator('app-current-weather h3')).toHaveText('Mendoza');
  expect(api.requests).toHaveLength(1);
  expect(api.requests[0].searchParams.get('latitud')).toBe('-32.89');
});

test('usa la ubicación del navegador solo al pulsar el botón', async ({ page, context, api }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -31.123456, longitude: -64.654321 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toBeVisible();
  expect(api.requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Usar mi ubicación' }).click();
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  expect([...api.requests[0].searchParams]).toEqual([
    ['latitud', '-31.123456'],
    ['longitud', '-64.654321'],
  ]);
});

test('permiso de ubicación rechazado permite seguir buscando por texto', async ({ page, api }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) =>
          failure({ code: 1 }),
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Usar mi ubicación' }).click();
  await expect(page.getByRole('alert')).toContainText('No diste permiso');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect(api.requests).toHaveLength(0);
  await search(page, 'Córdoba');
  await expect(page.locator('.temperature')).toBeVisible();
});

test('combobox con teclado, Escape y sin consultas de clima al recorrer opciones', async ({
  page,
  api,
}, info) => {
  api.placesBody = {
    sugerencias: Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      nombre: index === 0 ? 'Córdoba' : `Lugar coincidente ${index}`,
      pais: 'AR',
      region: index === 0 ? 'Córdoba' : 'Provincia de prueba',
      latitud: -31.42 - index / 100,
      longitud: -64.18,
    })),
  };
  await page.goto('/');
  await page.locator('#city').fill('Cor');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.locator('#city')).toHaveAttribute('aria-expanded', 'true');
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await info.attach('sugerencias', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.locator('#city').press('ArrowDown');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  expect(api.requests).toHaveLength(0);
  await page.locator('#city').press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.locator('#city')).toHaveValue('Cor');
  await page.locator('#city').press('ArrowDown');
  await page.locator('#city').press('Enter');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
  await expect(page.locator('#city')).toHaveValue('Córdoba, Córdoba, AR');
});

test('una respuesta de sugerencias anterior no reemplaza la lista nueva', async ({ page, api }) => {
  let release: (() => Promise<void>) | undefined;
  api.placesHandler = async (route, url) => {
    if (url.searchParams.get('q') === 'Cor')
      await new Promise<void>((resolve) => {
        release = async () => {
          try {
            await api.fulfill(route, api.placesBody);
          } catch {
            /* petición cancelada */
          } finally {
            resolve();
          }
        };
      });
    else
      await api.fulfill(route, {
        sugerencias: [
          {
            id: 2,
            nombre: 'Mendoza',
            pais: 'AR',
            region: 'Mendoza',
            latitud: -32.89,
            longitud: -68.84,
          },
        ],
      });
  };
  await page.goto('/');
  await page.locator('#city').fill('Cor');
  await expect.poll(() => api.placesRequests.length).toBe(1);
  try {
    await page.locator('#city').fill('Men');
    await expect(page.getByRole('option', { name: /Mendoza/ })).toBeVisible();
  } finally {
    await release?.();
  }
  await expect(page.getByRole('option', { name: /Córdoba/ })).toHaveCount(0);
  expect(api.requests).toHaveLength(0);
});

test('si fallan las sugerencias se puede buscar con Enter', async ({ page, api }) => {
  api.placesStatus = 503;
  await page.goto('/');
  await page.locator('#city').fill('Córdoba');
  await expect(page.locator('#place-status')).toContainText('Podés buscar con Enter');
  expect(api.requests).toHaveLength(0);
  await page.locator('#city').press('Enter');
  await expect(page.locator('.temperature')).toBeVisible();
  expect(api.requests).toHaveLength(1);
});
