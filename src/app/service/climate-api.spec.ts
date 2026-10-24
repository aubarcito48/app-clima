import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';
import { ClimateApi } from './climate-api';

describe('ClimateApi contract and transport', () => {
  let http: HttpTestingController;
  let api: ClimateApi;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ClimateApi);
  });
  afterEach(() => http.verify());

  it('uses one GET to Django, encoded values, no credentials, and an explicit timeout', async () => {
    const city = 'São Tomé & Príncipe + #1/2?';
    const promise = firstValueFrom(api.search({ city, country: ' st ', region: '  Región  Sur ' }));
    const request = http.expectOne((req) => req.url === `${environment.apiBaseUrl}/api/v1/clima/`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['ciudad', 'pais', 'region']);
    expect(request.request.params.get('ciudad')).toBe(city);
    expect(request.request.params.get('pais')).toBe('ST');
    expect(request.request.params.get('region')).toBe('Región Sur');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.timeout).toBe(45000);
    request.flush(CLIMATE_FIXTURE);
    expect(await promise).toEqual(CLIMATE_FIXTURE);
  });

  it('omits empty optional filters and never subscribes for an empty city', async () => {
    expect(() => api.search({ city: ' ', country: '' })).toThrow();
    const result = firstValueFrom(api.search({ city: 'Mendoza', country: '', region: ' ' }));
    const req = http.expectOne((r) => r.params.get('ciudad') === 'Mendoza');
    expect(req.request.params.keys()).toEqual(['ciudad']);
    req.flush(CLIMATE_FIXTURE);
    await result;
  });

  it('preserves zero, negative temperatures and missing optional fields as null', async () => {
    const fixture = structuredClone(CLIMATE_FIXTURE) as unknown as Record<string, any>;
    fixture['actual'] = {
      fecha_utc: CLIMATE_FIXTURE.actual.fecha_utc,
      temperatura_c: 0,
      sensacion_c: -4,
      humedad_pct: 0,
    };
    fixture['pronostico'] = { estado: 'no_disponible', intervalos: [] };
    fixture['recomendacion'] = { estado: 'no_disponible', texto: null };
    const promise = firstValueFrom(api.search({ city: 'Córdoba', country: 'AR' }));
    http.expectOne(() => true).flush(fixture);
    const data = await promise;
    expect(data.actual).toMatchObject({
      temperatura_c: 0,
      sensacion_c: -4,
      humedad_pct: 0,
      viento_kmh: null,
      descripcion: null,
    });
    expect(data.recomendacion).toEqual({ estado: 'no_disponible', texto: null });
  });

  it.each(['missing-current', 'bad-unit', 'bad-date', 'bad-partial'])(
    'rejects malformed success: %s',
    async (kind) => {
      const fixture = structuredClone(CLIMATE_FIXTURE) as unknown as Record<string, any>;
      if (kind === 'missing-current') delete fixture['actual'];
      if (kind === 'bad-unit') fixture['meta'].unidades.viento = 'm/s';
      if (kind === 'bad-date') fixture['actual'].fecha_utc = '2026-02-30T00:00:00Z';
      if (kind === 'bad-partial')
        fixture['recomendacion'] = { estado: 'no_disponible', texto: 'inventado' };
      const promise = firstValueFrom(api.search({ city: 'Córdoba', country: 'AR' }));
      const assertion = expect(promise).rejects.toThrow();
      http.expectOne(() => true).flush(fixture);
      await assertion;
    },
  );

  it('does not retry a provider limit', async () => {
    const promise = firstValueFrom(api.search({ city: 'Córdoba', country: 'AR' }));
    const assertion = expect(promise).rejects.toMatchObject({ status: 429 });
    http
      .expectOne(() => true)
      .flush({ codigo: 'LIMITE_ALCANZADO' }, { status: 429, statusText: 'Too Many Requests' });
    await assertion;
    http.expectNone(() => true);
  });
});
