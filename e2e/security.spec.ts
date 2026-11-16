import { test, expect, climate, search, openNavigation } from './fixtures';

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

for (const payload of [
  "' OR 1=1 --",
  'Madrid; whoami && echo PENTEST_CANARY',
  '<img data-pentest src=x onerror="window.__pentest=1">',
  '<svg data-pentest onload="window.__pentest=1"></svg>',
]) {
  test(`pentest del formulario: conserva como texto ${payload.slice(0, 24)}`, async ({
    page,
    api,
  }) => {
    const body = climate(payload);
    body.actual.descripcion = payload;
    body.recomendacion.texto = payload;
    api.body = body;
    await page.goto('/');
    await search(page, payload);
    await expect(page.locator('#advice-text')).toHaveText(payload);
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].searchParams.get('ciudad')).toBe(payload);
    expect([...api.requests[0].searchParams.keys()]).toEqual(['ciudad', 'pais']);
    await expect(page.locator('[data-pentest]')).toHaveCount(0);
    expect(await page.evaluate(() => '__pentest' in window)).toBe(false);
  });
}

test('pentest: las sugerencias maliciosas no generan HTML y se seleccionan por coordenadas', async ({
  page,
  api,
}) => {
  const payload = '<img data-pentest src=x onerror="window.__pentest=1">';
  api.placesBody = {
    sugerencias: [
      { id: 99, nombre: payload, pais: 'AR', region: null, latitud: -31.42, longitud: -64.18 },
    ],
  };
  await page.goto('/');
  await page.locator('#city').fill('Cor');
  await expect(page.getByRole('option')).toContainText(payload);
  await expect(page.locator('[data-pentest]')).toHaveCount(0);
  await page.locator('#city').press('ArrowDown');
  await page.locator('#city').press('Enter');
  await expect(page.locator('.weather-panel h3')).toContainText('Córdoba');
  expect(api.requests).toHaveLength(1);
  expect(api.requests[0].searchParams.get('latitud')).toBe('-31.42');
  expect(api.requests[0].searchParams.has('ciudad')).toBe(false);
  expect(await page.evaluate(() => '__pentest' in window)).toBe(false);
});

test('pentest: favoritos manipulados en localStorage siguen siendo texto después de recargar', async ({
  page,
}) => {
  const payload = '<img data-pentest src=x onerror="window.__pentest=1">';
  await page.addInitScript(
    (name) =>
      localStorage.setItem(
        'stitchweather.favorites.v1',
        JSON.stringify([
          { name, country: 'AR', region: null, latitude: -31.42, longitude: -64.18 },
        ]),
      ),
    payload,
  );
  await page.goto('/');
  for (let visit = 0; visit < 2; visit++) {
    await openNavigation(page);
    await page.getByRole('button', { name: /Mis lugares/ }).click();
    await expect(page.locator('#favorite-places li').first()).toContainText(payload);
    await expect(page.locator('[data-pentest]')).toHaveCount(0);
    expect(await page.evaluate(() => '__pentest' in window)).toBe(false);
    if (visit === 0) await page.reload();
  }
});

test('pentest: una entrada de diez mil caracteres se rechaza y el formulario se recupera', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await page.locator('#city').fill('A'.repeat(10000) + '!');
  await page.locator('#city').press('Enter');
  await expect(page.locator('#city-error')).toBeVisible();
  expect(api.requests).toHaveLength(0);
  expect(api.placesRequests).toHaveLength(0);
  await search(page, 'Córdoba');
  await expect(page.locator('.weather-panel h3')).toContainText('Córdoba');
  expect(api.requests).toHaveLength(1);
});

test('pentest: un 429 no filtra el mensaje del proveedor y permite reintentar', async ({
  page,
  api,
}) => {
  api.status = 429;
  api.body = {
    codigo: 'LIMITE_ALCANZADO',
    mensaje: '<img data-pentest src=x onerror="window.__pentest=1">PRIVATE_PENTEST',
  };
  await page.goto('/');
  await search(page, 'Córdoba');
  await expect(page.locator('#search-feedback')).toContainText('Se alcanzó el límite');
  await expect(page.getByText('PRIVATE_PENTEST', { exact: false })).toHaveCount(0);
  await expect(page.locator('[data-pentest]')).toHaveCount(0);
  api.status = 200;
  api.body = climate();
  await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
  await expect(page.locator('.weather-panel h3')).toContainText('Córdoba');
});
