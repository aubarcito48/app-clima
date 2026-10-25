import AxeBuilder from '@axe-core/playwright';
import { test, expect, climate, search } from './fixtures';

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
  expect(secondDayBox.y).toBeGreaterThan(firstDayBox.y);
  expect(secondDayBox.x).toBeCloseTo(firstDayBox.x, 0);
  const hoursBox = (await page.locator('#hourly-intervals').boundingBox())!;
  const currentBox = (await page.locator('app-current-weather').boundingBox())!;
  const chartBox = (await page.locator('app-temperature-chart').boundingBox())!;
  const hoursHeadingBox = (await page.locator('#forecast-heading').boundingBox())!;
  expect(chartBox.y).toBeGreaterThanOrEqual(currentBox.y + currentBox.height);
  expect(chartBox.y + chartBox.height).toBeLessThanOrEqual(hoursHeadingBox.y);
  expect(hoursBox.y).toBeLessThan(firstDayBox.y);
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
  await page.getByLabel('Unidad de temperatura del pronóstico').selectOption('F');
  await expect(page.locator('app-forecast ol li').first()).toContainText('°F');
  await expect(page.locator('app-temperature-chart figcaption')).toContainText('°F');
  await page.getByLabel('Unidad de temperatura del pronóstico').selectOption('C');
  expect(api.requests).toHaveLength(1);
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
  await expect(page.locator('app-weather-sidebar app-weather-music')).toContainText(
    'Peaceful Piano',
  );
  await expect(
    page.locator(
      'app-weather-sidebar a[href="#pronostico"], app-weather-sidebar a[href="#evolucion"]',
    ),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Cargar reproductor de Spotify' }).click();
  const player = page.locator('app-weather-sidebar iframe');
  await player.scrollIntoViewIfNeeded();
  await expect(player).toHaveAttribute('src', /open\.spotify\.com\/embed\/playlist/);
  await expect.poll(() => api.spotifyRequests.length).toBe(1);
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
  await expect(page.getByRole('status')).not.toContainText('Consejo de IA');
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
  await expect(page.getByRole('group')).toBeFocused();
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
  await expect(page.getByRole('status')).toContainText('Consultando el clima de Córdoba');
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
