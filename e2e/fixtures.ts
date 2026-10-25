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
  spotifyRequests: string[];
  body: unknown;
  status: number;
  placesRequests: URL[];
  placesBody: unknown;
  placesStatus: number;
  placesHandler: ((route: Route, url: URL) => Promise<void>) | null;
  alertsRequests: URL[];
  alertsBody: unknown;
  alertsStatus: number;
  alertsHandler: ((route: Route, url: URL) => Promise<void>) | null;
  handler: ((route: Route, url: URL) => Promise<void>) | null;
  fulfill: (route: Route, body: unknown, status?: number) => Promise<void>;
};

export const test = base.extend<{ api: ApiMock }>({
  api: [
    async ({ context, page, baseURL }, use) => {
      const appOrigin = new URL(baseURL!).origin;
      const apiURL = new URL(`${environment.apiBaseUrl}/api/v1/clima/`);
      const placesURL = new URL(`${environment.apiBaseUrl}/api/v1/lugares/`);
      const unexpected: string[] = [];
      const errors: string[] = [];
      const dialogs: string[] = [];
      const api: ApiMock = {
        requests: [],
        spotifyRequests: [],
        body: climate(),
        status: 200,
        placesRequests: [],
        placesBody: {
          sugerencias: [
            {
              id: 1,
              nombre: 'Córdoba',
              pais: 'AR',
              region: 'Córdoba',
              latitud: -31.42,
              longitud: -64.18,
            },
          ],
        },
        placesStatus: 200,
        placesHandler: null,
        alertsRequests: [],
        alertsBody: null,
        alertsStatus: 200,
        alertsHandler: null,
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
        } else if (url.origin === apiURL.origin && url.pathname === '/api/v1/alertas/') {
          expect(route.request().method()).toBe('GET');
          api.alertsRequests.push(url);
          if (api.alertsHandler) await api.alertsHandler(route, url);
          else
            await api.fulfill(
              route,
              api.alertsBody ?? {
                ubicacion: {
                  latitud: Number(url.searchParams.get('latitud')),
                  longitud: Number(url.searchParams.get('longitud')),
                  pais: url.searchParams.get('pais'),
                },
                estado: 'disponible',
                alertas: [],
                fuente: {
                  nombre: 'Servicio Meteorológico Nacional',
                  url: 'https://www.smn.gob.ar/alertas',
                  consultado_en_utc: '2026-10-25T12:00:00Z',
                  publicado_en_utc: '2026-10-25T12:00:00Z',
                },
              },
              api.alertsStatus,
            );
        } else if (url.origin === placesURL.origin && url.pathname === placesURL.pathname) {
          expect(route.request().method()).toBe('GET');
          api.placesRequests.push(url);
          if (api.placesHandler) await api.placesHandler(route, url);
          else await api.fulfill(route, api.placesBody, api.placesStatus);
        } else if (
          url.origin === 'https://open.spotify.com' &&
          /^\/embed\/playlist\/[A-Za-z0-9]+$/u.test(url.pathname)
        ) {
          api.spotifyRequests.push(url.href);
          await route.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><html lang="es"><title>Spotify de prueba</title><body>Reproductor simulado</body></html>',
          });
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
  await page.locator('#city').fill([city, region, country].filter(Boolean).join(', '));
  await page.locator('#city').press('Enter');
}
