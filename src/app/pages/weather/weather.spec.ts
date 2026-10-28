import { EMPTY } from 'rxjs';
import { WeatherAlertsApi } from '../../service/weather-alerts-api';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CLIMATE_FIXTURE } from '../../testing/climate-fixture';
import { Weather } from './weather';
import { IsabelVoice } from '../../service/isabel-voice';

describe('Weather Django integration', () => {
  it('shares Celsius/Fahrenheit across current weather and forecast without refetching, and keeps the preference', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual.temperatura_c = 12.59;
    data.actual.sensacion_c = 11.97;
    http.expectOne(() => true).flush(data);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    const selector = view.querySelector<HTMLSelectElement>('#forecast-unit')!;
    selector.value = 'F';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(view.querySelector('.temperature')?.textContent?.replace(/\s/g, '')).toBe('54.7°F');
    expect(view.querySelector('app-current-weather')?.textContent).toContain('53.5 °F');
    expect(view.querySelector('app-forecast ol li')?.textContent).toContain('77');
    expect(view.querySelector('app-temperature-chart figcaption')?.textContent).toContain('°F');
    expect(view.querySelector('#advice-text')?.textContent).toBe(data.recomendacion.texto);
    expect(fixture.componentInstance.weather()?.temperature).toBe(12.59);
    http.expectNone(() => true);
    fixture.componentInstance.search({ city: 'Mendoza', country: 'AR' });
    data.ubicacion.nombre = 'Mendoza';
    data.actual.temperatura_c = 0;
    data.actual.sensacion_c = null;
    http.expectOne(() => true).flush(data);
    await fixture.whenStable();
    expect(view.querySelector('.temperature')?.textContent?.replace(/\s/g, '')).toBe('32°F');
    expect(view.querySelector('app-current-weather')?.textContent).toContain(
      'Sensación térmica: No disponible',
    );
    const newSelector = view.querySelector<HTMLSelectElement>('#forecast-unit')!;
    expect(newSelector.value).toBe('F');
    newSelector.value = 'C';
    newSelector.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(view.querySelector('.temperature')?.textContent?.replace(/\s/g, '')).toBe('0°C');
    http.expectNone(() => true);
  });
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
    TestBed.inject(IsabelVoice).setEnabled(false); // Estas pruebas consultan el clima con Isa silenciada.
  });
  afterEach(() => http.verify());

  it('starts without fabricated data or an automatic request', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
    expect(fixture.nativeElement.querySelector('label[for="city"]')).toBeTruthy();
    http.expectNone(() => true);
  });

  it('submits through the form and adapts a real contract response', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    const city = view.querySelector<HTMLInputElement>('#city')!;
    city.value = '  Córdoba  ';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    view
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.state()).toBe('loading');
    const req = http.expectOne((r) => r.params.get('ciudad') === 'Córdoba');
    req.flush(CLIMATE_FIXTURE);
    await fixture.whenStable();
    expect(view.querySelector('app-current-weather h3')?.textContent).toContain('Córdoba');
    expect(view.querySelector('app-forecast ol')?.children.length).toBe(
      CLIMATE_FIXTURE.pronostico.intervalos.length,
    );
    expect(view.querySelector('app-recommendation')).toBeNull();
    expect(view.querySelector('main app-weather-music')).toBeNull();
    expect(view.textContent).not.toContain('Datos ficticios');
    expect(city.value).toBe('  Córdoba  ');
  });

  it('cancels an older search, ignores duplicates in flight and keeps the latest city', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: ' Córdoba ', country: 'ar' });
    const old = http.expectOne((r) => r.params.get('ciudad') === 'Córdoba');
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectNone(() => true);
    fixture.componentInstance.search({ city: 'Mendoza', country: 'AR' });
    expect(old.cancelled).toBe(true);
    const latest = structuredClone(CLIMATE_FIXTURE);
    latest.ubicacion.nombre = 'Mendoza';
    latest.actual.temperatura_c = 0;
    http.expectOne((r) => r.params.get('ciudad') === 'Mendoza').flush(latest);
    expect(() => old.flush(CLIMATE_FIXTURE)).toThrow();
    await fixture.whenStable();
    expect(fixture.componentInstance.response()?.ubicacion.nombre).toBe('Mendoza');
    expect(fixture.nativeElement.querySelector('app-current-weather h3').textContent).toContain(
      'Mendoza',
    );
  });

  it('cancels on reset and component destruction', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const first = http.expectOne(() => true);
    fixture.componentInstance.reset();
    expect(first.cancelled).toBe(true);
    expect(fixture.componentInstance.weather()).toBeNull();
    fixture.componentInstance.search({ city: 'Mendoza', country: 'AR' });
    const second = http.expectOne(() => true);
    fixture.destroy();
    expect(second.cancelled).toBe(true);
  });

  it('keeps current data and shows unavailable optional blocks without invented values', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual = {
      ...data.actual,
      temperatura_c: 0,
      sensacion_c: -2,
      humedad_pct: 0,
      viento_kmh: null,
      descripcion: null,
    };
    data.pronostico = { estado: 'no_disponible', intervalos: [] };
    data.recomendacion = { estado: 'no_disponible', texto: null };
    http.expectOne(() => true).flush(data);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance.state()).toBe('ready');
    expect(view.querySelector('.temperature')?.textContent).toContain('0');
    expect(view.querySelector('app-current-weather')?.textContent).toContain('-2 °C');
    expect(view.querySelector('app-current-weather')?.textContent).toContain('0 %');
    expect(view.querySelector('app-current-weather')?.textContent).toContain('No disponible');
    expect(view.querySelector('app-forecast')?.textContent).toContain('Pronóstico no disponible');
    expect(view.querySelector('app-recommendation')).toBeNull();
    expect(view.textContent).not.toMatch(/undefined|NaN/);
  });

  it('refines a 409 using the candidate country and region even within the same country', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const candidate = {
      nombre: 'Córdoba',
      pais: 'AR',
      region: 'Córdoba',
      latitud: -31.42,
      longitud: -64.18,
    };
    http
      .expectOne(() => true)
      .flush(
        {
          codigo: 'CIUDAD_AMBIGUA',
          candidatos: [candidate, { ...candidate, region: 'Otra región', latitud: -32 }],
        },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    const choice = fixture.nativeElement.querySelector('ul button') as HTMLButtonElement;
    expect(choice.textContent).toContain('Córdoba, Córdoba, AR');
    choice.click();
    const req = http.expectOne(
      (r) => r.params.get('region') === 'Córdoba' && r.params.get('pais') === 'AR',
    );
    req.flush(CLIMATE_FIXTURE);
    await fixture.whenStable();
    expect(fixture.componentInstance.state()).toBe('ready');
  });

  it('can retry after an error and never sends a blank city', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: ' ', country: '' });
    http.expectNone(() => true);
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.componentInstance.feedback()?.kind).toBe('unavailable');
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush(CLIMATE_FIXTURE);
    await fixture.whenStable();
    expect(fixture.componentInstance.feedback()).toBeNull();
  });

  it('renders clothing advice safely inside current weather without separate blocks', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const data = structuredClone(CLIMATE_FIXTURE);
    data.recomendacion.texto = '<img src=x onerror="alert(1)">';
    http.expectOne(() => true).flush(data);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-recommendation img')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-recommendation')).toBeNull();
    expect(fixture.nativeElement.querySelector('main app-weather-music')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('app-current-weather #advice-text')?.textContent,
    ).toBe(data.recomendacion.texto);
    expect(fixture.nativeElement.querySelector('#advice-text img')).toBeNull();
  });

  it('never mixes an earlier recommendation with the latest city when AI is unavailable', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush(CLIMATE_FIXTURE);
    await fixture.whenStable();
    expect(fixture.componentInstance.weather()?.advice?.text).toBe(
      CLIMATE_FIXTURE.recomendacion.texto,
    );
    expect(
      fixture.nativeElement.querySelector('app-current-weather #advice-text')?.textContent,
    ).toBe(CLIMATE_FIXTURE.recomendacion.texto);
    fixture.componentInstance.search({ city: 'Buenos Aires', country: 'AR' });
    const older = http.expectOne(() => true);
    fixture.componentInstance.search({ city: 'Mendoza', country: 'AR' });
    expect(older.cancelled).toBe(true);
    expect(fixture.componentInstance.weather()).toBeNull();
    const latest = structuredClone(CLIMATE_FIXTURE);
    latest.ubicacion.nombre = 'Mendoza';
    latest.ubicacion.region = 'Mendoza';
    latest.recomendacion = { estado: 'no_disponible', texto: null };
    http.expectOne(() => true).flush(latest);
    expect(() => older.flush(CLIMATE_FIXTURE)).toThrow();
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('app-current-weather h3')?.textContent).toContain('Mendoza');
    expect(view.querySelector('app-forecast ol')).not.toBeNull();
    expect(fixture.componentInstance.weather()?.advice).toBeNull();
    expect(view.querySelector('app-recommendation')).toBeNull();
    expect(view.querySelector('#advice-text')).toBeNull();
    expect(view.textContent).not.toContain(CLIMATE_FIXTURE.recomendacion.texto);
  });
});
