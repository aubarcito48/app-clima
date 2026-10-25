import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { climatePresentation } from '../service/climate-presentation';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';
import { CurrentWeather } from './current-weather/current-weather';
import { Forecast } from './forecast/forecast';

describe('Current weather and forecast rendering (TK06)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [CurrentWeather, Forecast] }));

  it('shows zero, negative and decimal measurements with their original units', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual = {
      ...data.actual,
      temperatura_c: 0,
      sensacion_c: -4.25,
      humedad_pct: 0,
      viento_kmh: 9.123,
    };
    const fixture = TestBed.createComponent(CurrentWeather);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('.temperature')?.textContent?.replace(/\s/gu, '')).toBe('0°C');
    expect(view.textContent).toContain('-4.25 °C');
    expect(view.querySelectorAll('dd')[0].textContent).toContain('0 %');
    expect(view.querySelectorAll('dd')[1].textContent).toContain('9.123 km/h');
    expect(view.textContent).toContain('OpenWeather');
    expect(view.querySelector('h3')?.textContent).toContain('Córdoba');
  });

  it('shows the observation and consultation separately, with UTC values in datetime attributes', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual.fecha_utc = '2026-10-24T02:30:00Z';
    data.meta.consultado_en_utc = '2026-10-24T03:15:00Z';
    const fixture = TestBed.createComponent(CurrentWeather);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    const times: NodeListOf<HTMLTimeElement> = fixture.nativeElement.querySelectorAll('time');
    expect(times[0].dateTime).toBe(data.actual.fecha_utc);
    expect(times[0].textContent).toContain('23 de octubre de 2026 a las 23:30 h');
    expect(times[1].dateTime).toBe(data.meta.consultado_en_utc);
    expect(times[1].textContent).toContain('24 de octubre de 2026');
    expect(times[1].textContent).toContain('00:15');
    expect(fixture.nativeElement.textContent).toContain('UTC−03:00');
  });

  it('states missing measurements without attaching units or guessing a weather icon', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual = {
      ...data.actual,
      sensacion_c: null,
      humedad_pct: null,
      viento_kmh: null,
      descripcion: null,
    };
    const fixture = TestBed.createComponent(CurrentWeather);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    for (const metric of Array.from(view.querySelectorAll('dd')))
      expect(metric.textContent?.trim()).toBe('No disponible');
    expect(view.textContent).toContain('Descripción no disponible');
    expect(view.textContent).not.toMatch(/null|undefined|NaN/);
    expect(view.querySelector('.weather-art')).toBeNull();
  });

  it('renders every interval grouped by local date, preserving times and temperatures', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.pronostico.intervalos = Array.from({ length: 40 }, (_, index) => ({
      fecha_utc: new Date(Date.parse('2026-12-31T21:00:00Z') + index * 10800000).toISOString(),
      temperatura_c: index - 20,
      descripcion: null,
    }));
    const fixture = TestBed.createComponent(Forecast);
    const presentation = climatePresentation(data);
    fixture.componentRef.setInput('weather', presentation);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelectorAll('ol li')).toHaveLength(2);
    const expand = Array.from(view.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Ver todos los intervalos'),
    )!;
    expand.click();
    await fixture.whenStable();
    const rows = Array.from(view.querySelectorAll('ol li'));
    expect(rows).toHaveLength(40);
    expect(view.querySelectorAll('h3[id^="forecast-day-"]')).toHaveLength(
      new Set(presentation.forecast.map((row) => row.dayKey)).size,
    );
    rows.forEach((row, index) => {
      expect(row.querySelector('time')?.dateTime).toBe(data.pronostico.intervalos[index].fecha_utc);
      expect(row.querySelector('time')?.textContent).toContain(presentation.forecast[index].time);
      expect(row.querySelector('p')?.textContent?.replace(/\s/gu, '')).toBe(`${index - 20}°C`);
    });
    expect(view.textContent).toContain('2027');
    expect(view.textContent).toContain('No son promedios diarios');
  });

  it('has an explicit unavailable forecast instead of an empty list or invented intervals', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.pronostico = { estado: 'no_disponible', intervalos: [] };
    const fixture = TestBed.createComponent(Forecast);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pronóstico no disponible');
  });
});
