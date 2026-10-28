import { EMPTY } from 'rxjs';
import { WeatherAlertsApi } from '../../service/weather-alerts-api';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoordinatesQuery } from '../../models/city-query';
import { CurrentLocation, LocationFailure } from '../../service/current-location';
import { CLIMATE_FIXTURE } from '../../testing/climate-fixture';
import { Weather } from './weather';
import { IsabelVoice } from '../../service/isabel-voice';

describe('Location and automatic search cannot overwrite one another', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Weather],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WeatherAlertsApi, useValue: { search: () => EMPTY } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(IsabelVoice).setEnabled(false); // La lectura se verifica en las pruebas de Isa.
  });
  afterEach(() => http.verify());
  it('sends browser coordinates only to Django', async () => {
    const coordinates = new Subject<CoordinatesQuery>();
    vi.spyOn(TestBed.inject(CurrentLocation), 'get').mockReturnValue(coordinates);
    const f = TestBed.createComponent(Weather);
    await f.whenStable();
    http.expectNone(() => true);
    f.componentInstance.locate();
    expect(f.componentInstance.locating()).toBe(true);
    coordinates.next({ latitude: 0, longitude: 0 });
    coordinates.complete();
    const request = http.expectOne(
      (r) => r.params.get('latitud') === '0' && r.params.get('longitud') === '0',
    );
    expect(request.request.params.keys()).toEqual(['latitud', 'longitud']);
    request.flush(CLIMATE_FIXTURE);
    await f.whenStable();
    expect(f.componentInstance.locating()).toBe(false);
    expect(f.componentInstance.state()).toBe('ready');
  });
  it('a pending location never overwrites a newer typed place', async () => {
    const coordinates = new Subject<CoordinatesQuery>();
    vi.spyOn(TestBed.inject(CurrentLocation), 'get').mockReturnValue(coordinates);
    const f = TestBed.createComponent(Weather);
    await f.whenStable();
    f.componentInstance.locate();
    f.componentInstance.editQuery();
    f.componentInstance.search({ city: 'Mendoza', country: 'AR' });
    coordinates.next({ latitude: -31, longitude: -64 });
    const data = structuredClone(CLIMATE_FIXTURE);
    data.ubicacion.nombre = 'Mendoza';
    http.expectOne((r) => r.params.get('ciudad') === 'Mendoza').flush(data);
    await f.whenStable();
    http.expectNone((r) => r.params.has('latitud'));
    expect(f.componentInstance.weather()?.city).toBe('Mendoza');
  });
  it('permission denial ends loading and offers the text search without an API call', async () => {
    vi.spyOn(TestBed.inject(CurrentLocation), 'get').mockReturnValue(
      throwError(() => new LocationFailure('denied')),
    );
    const f = TestBed.createComponent(Weather);
    await f.whenStable();
    f.componentInstance.locate();
    await f.whenStable();
    expect(f.componentInstance.state()).toBe('initial');
    expect(f.componentInstance.locating()).toBe(false);
    expect(f.nativeElement.textContent).toContain('No diste permiso');
    http.expectNone(() => true);
    expect(f.nativeElement.querySelector('#city').getAttribute('aria-invalid')).not.toBe('true');
  });
});
