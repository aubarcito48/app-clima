import { test as base, expect, type Page, type Route } from '@playwright/test';
import { CLIMATE_FIXTURE } from '../src/app/testing/climate-fixture';
import type { ClimateResponse } from '../src/app/models/climate-response';
import { environment } from '../src/environments/environment';

export function climate(city = 'Córdoba'): ClimateResponse {
  const data = structuredClone(CLIMATE_FIXTURE);
  data.ubicacion.nombre = city;
  data.actual.temperatura_c = 0;
  data.actual.sensacion_c = -3;
  data.actual.humedad_pct = 0;
  data.actual.viento_kmh = 9.123;
  data.recomendacion.texto = `Consejo ficticio de prueba para ${city}.`;
  return data;
}

type ApiMock = {
  requests: URL[];
  body: unknown;
  status: number;
  handler: ((route: Route, url: URL) => Promise<void>) | null;
  fulfill: (route: Route, body: unknown, status?: number) => Promise<void>;
};

export const test = base.extend<{ api: ApiMock }>({
  api: [
    async ({ context, page, baseURL }, use) => {
      const appOrigin = new URL(baseURL!).origin;
      const apiURL = new URL(`${environment.apiBaseUrl}/api/v1/clima/`);
      const unexpected: string[] = [];
      const errors: string[] = [];
      const dialogs: string[] = [];
      const api: ApiMock = {
        requests: [],
        body: climate(),
        status: 200,
        handler: null,
        fulfill: (route, body, status = 200) =>
          route.fulfill({
            status,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': appOrigin },
            body: JSON.stringify(body),
          }),
      };
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });
      // Interceptar antes de navegar. Ningún endpoint llega a Django/proveedores.
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === apiURL.origin && url.pathname === apiURL.pathname) {
          expect(route.request().method()).toBe('GET');
          api.requests.push(url);
          if (api.handler) await api.handler(route, url);
          else await api.fulfill(route, api.body, api.status);
        } else if (url.origin === appOrigin) {
          await route.continue();
        } else {
          unexpected.push(url.origin);
          await route.abort();
        }
      });
      try {
        await use(api);
      } finally {
        expect.soft(unexpected, 'No debe intentar consultar otros servicios').toEqual([]);
        expect.soft(errors, 'Sin errores de ejecución').toEqual([]);
        expect.soft(dialogs, 'Sin código ejecutado desde la respuesta').toEqual([]);
      }
    },
    { auto: true },
  ],
});
export { expect };

export async function search(page: Page, city: string, country = 'AR', region = '') {
  await page.locator('#city').fill(city);
  await page.locator('#country').fill(country);
  await page.locator('#region').fill(region);
  await page.locator('#city').press('Enter');
}
