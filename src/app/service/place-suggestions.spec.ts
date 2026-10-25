import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, afterEach, it, describe, expect } from 'vitest';
import { PlaceSuggestions } from './place-suggestions';
import { environment } from '../../environments/environment';

describe('Suggestions contract', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('uses only the Django suggestions endpoint and validates names and coordinates', async () => {
    const result = firstValueFrom(TestBed.inject(PlaceSuggestions).search('Cor & +'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/api/v1/lugares/`,
    );
    expect(request.request.params.get('q')).toBe('Cor & +');
    expect(request.request.timeout).toBe(8000);
    request.flush({
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
    });
    expect(await result).toEqual([
      {
        id: 1,
        name: 'Córdoba',
        country: 'AR',
        region: 'Córdoba',
        latitude: -31.42,
        longitude: -64.18,
      },
    ]);
  });
  it('rejects malformed suggestions without inventing a place', async () => {
    const result = firstValueFrom(TestBed.inject(PlaceSuggestions).search('Cor'));
    const assertion = expect(result).rejects.toThrow();
    TestBed.inject(HttpTestingController)
      .expectOne(() => true)
      .flush({
        sugerencias: [
          { id: 1, nombre: 'Córdoba', pais: 'AR', region: null, latitud: 999, longitud: 0 },
        ],
      });
    await assertion;
  });
});
