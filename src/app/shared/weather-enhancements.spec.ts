import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { climatePresentation, windDirection } from '../service/climate-presentation';
import { readClimateResponse } from '../models/climate-response';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';
import { Forecast } from './forecast/forecast';
import { TemperatureChart } from './temperature-chart/temperature-chart';
import { WeatherMusic, weatherPlaylist } from './weather-music/weather-music';

function multiDay() {
  const data = structuredClone(CLIMATE_FIXTURE);
  data.pronostico.intervalos = [
    { fecha_utc: '2026-12-31T21:00:00Z', temperatura_c: -2, descripcion: null },
    { fecha_utc: '2027-01-01T00:00:00Z', temperatura_c: 0, descripcion: null },
    { fecha_utc: '2027-01-01T03:00:00Z', temperatura_c: 5, descripcion: null },
  ];
  return climatePresentation(data);
}

describe('Días, evolución y música', () => {
  it('maps eight wind directions, wraps north and distinguishes calm from missing direction', () => {
    expect(
      [0, 45, 90, 135, 180, 225, 270, 315, 360].map((deg) => windDirection(deg, 12)?.abbreviation),
    ).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'N']);
    expect(windDirection(22.49, 10)?.abbreviation).toBe('N');
    expect(windDirection(22.5, 10)?.abbreviation).toBe('NE');
    expect(windDirection(337.5, 10)?.abbreviation).toBe('N');
    expect(windDirection(null, 10)).toBeNull();
    expect(windDirection(90, 0)?.label).toBe('En calma');
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual.direccion_viento_grados = 270;
    data.pronostico.intervalos[0].viento_kmh = 18;
    data.pronostico.intervalos[0].direccion_viento_grados = 135;
    const result = climatePresentation(readClimateResponse(data));
    expect(result.windDirection?.label).toBe('Oeste');
    expect(result.forecast[0].windDirection?.label).toBe('Sureste');
    data.actual.direccion_viento_grados = 361;
    expect(() => readClimateResponse(data)).toThrow();
  });
  it('switches variables with their units, keeps zeroes and breaks lines at missing samples', async () => {
    const fixture = TestBed.createComponent(TemperatureChart);
    fixture.componentRef.setInput(
      'intervals',
      multiDay().forecast.map((row, index) => ({
        ...row,
        precipitation: [0, null, 100][index],
        wind: [0, 18, null][index],
      })),
    );
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    const buttons = view.querySelectorAll<HTMLButtonElement>('button');
    buttons[1].click();
    await fixture.whenStable();
    expect(view.querySelector('figcaption')?.textContent).toContain('Probabilidad de lluvia (%)');
    expect(view.querySelectorAll('circle')).toHaveLength(2);
    expect(view.querySelector('polyline')).toBeNull();
    expect(view.querySelector('circle title')?.textContent).toContain('0 %');
    expect(view.querySelector('table')?.textContent).toContain('No disponible');
    expect(fixture.componentInstance.chart()?.ticks.map((tick) => tick.value)).toEqual([
      0, 25, 50, 75, 100,
    ]);
    buttons[2].click();
    await fixture.whenStable();
    expect(view.querySelector('figcaption')?.textContent).toContain('Viento (km/h)');
    expect(view.querySelectorAll('circle')).toHaveLength(2);
    expect(view.querySelectorAll('polyline')).toHaveLength(1);
    expect(view.querySelector('circle title')?.textContent).toContain('0 km/h');
    fixture.componentRef.setInput('intervals', multiDay().forecast);
    await fixture.whenStable();
    expect(view.querySelector('svg')).toBeNull();
    expect(view.textContent).toContain('Viento no disponible');
  });

  it('reads forecast wind as an optional nonnegative km/h value', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.pronostico.intervalos[0].viento_kmh = 0;
    expect(climatePresentation(readClimateResponse(data)).forecast[0].wind).toBe(0);
    expect(climatePresentation(readClimateResponse(data)).forecast[1].wind).toBeNull();
    data.pronostico.intervalos[0].viento_kmh = -1;
    expect(() => readClimateResponse(data)).toThrow();
  });
  it('converts forecast cards, daily ranges and the line together without changing API values', async () => {
    const fixture = TestBed.createComponent(Forecast);
    const data = multiDay();
    fixture.componentRef.setInput('weather', data);
    await fixture.whenStable();
    fixture.componentInstance.unit.set('F');
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('ol li p')?.textContent).toContain('28.4');
    expect(view.querySelector('ol li p')?.textContent).toContain('°F');
    expect(view.querySelector('.day-choice')?.getAttribute('aria-label')).toContain('28.4 a 32');
    expect(view.querySelector('app-temperature-chart figcaption')?.textContent).toContain('°F');
    expect(view.querySelector('app-temperature-chart circle title')?.textContent).toContain(
      '28.4 °F',
    );
    expect(data.forecast[0].temperature).toBe(-2);
  });
  it('changes the day and chart together, exposes all intervals, and resets on a new query', async () => {
    const fixture = TestBed.createComponent(Forecast);
    fixture.componentRef.setInput('weather', multiDay());
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelectorAll('ol li')).toHaveLength(2);
    const days = view.querySelectorAll<HTMLButtonElement>('.day-choice');
    expect(days[0].getAttribute('aria-pressed')).toBe('true');
    days[1].click();
    await fixture.whenStable();
    expect(view.querySelectorAll('ol li')).toHaveLength(1);
    expect(view.querySelector('ol time')?.textContent).toContain('00:00');
    expect(view.querySelector('app-temperature-chart circle title')?.textContent).toContain('5 °C');
    fixture.componentInstance.showAll.set(true);
    await fixture.whenStable();
    expect(view.querySelectorAll('ol li')).toHaveLength(3);
    fixture.componentRef.setInput('weather', multiDay());
    await fixture.whenStable();
    expect(view.querySelectorAll('ol li')).toHaveLength(2);
    expect(fixture.componentInstance.showAll()).toBe(false);
  });

  it('plots negative, zero, equal and single temperatures without inventing samples', async () => {
    const fixture = TestBed.createComponent(TemperatureChart);
    const intervals = multiDay().forecast.slice(0, 2);
    fixture.componentRef.setInput('intervals', intervals);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelectorAll('circle')).toHaveLength(2);
    expect(view.querySelector('polyline')).not.toBeNull();
    expect(view.textContent).toContain('-2°');
    expect(view.textContent).toContain('0°');
    fixture.componentRef.setInput(
      'intervals',
      intervals.map((row) => ({ ...row, temperature: 0 })),
    );
    await fixture.whenStable();
    expect(view.innerHTML).not.toMatch(/NaN|Infinity/);
    fixture.componentRef.setInput('intervals', intervals.slice(0, 1));
    await fixture.whenStable();
    expect(view.querySelectorAll('circle')).toHaveLength(1);
    expect(view.querySelector('polyline')).toBeNull();
    fixture.componentRef.setInput('intervals', []);
    await fixture.whenStable();
    expect(view.querySelector('svg')).toBeNull();
  });

  it('keeps missing hours as gaps in time instead of evenly spacing observations', async () => {
    const fixture = TestBed.createComponent(TemperatureChart);
    const rows = multiDay().forecast;
    fixture.componentRef.setInput('intervals', [
      rows[0],
      rows[1],
      { ...rows[2], dateTime: '2027-01-01T09:00:00Z' },
    ]);
    await fixture.whenStable();
    const points = fixture.componentInstance.chart()!.points;
    expect(points[2].x - points[1].x).toBeCloseTo(3 * (points[1].x - points[0].x));
  });

  it('chooses rain before heat, and handles cold and missing descriptions', () => {
    expect(weatherPlaylist({ temperature: 30, description: 'Lluvia intensa' }).name).toBe(
      'Peaceful Piano',
    );
    expect(weatherPlaylist({ temperature: 0, description: null }).name).toBe('Peaceful Piano');
    expect(weatherPlaylist({ temperature: 26, description: 'Cielo claro' }).name).toBe(
      'Mood Booster',
    );
    expect(weatherPlaylist({ temperature: 20, description: null }).name).toBe('Chill Hits');
  });

  it('loads only a fixed Spotify embed on request and removes it when the query changes', async () => {
    const fixture = TestBed.createComponent(WeatherMusic);
    const data = climatePresentation(CLIMATE_FIXTURE);
    fixture.componentRef.setInput('weather', data);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('iframe')).toBeNull();
    view.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(view.querySelector('iframe')?.src).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L?utm_source=generator',
    );
    fixture.componentRef.setInput('weather', { ...data, city: 'Otro lugar' });
    await fixture.whenStable();
    expect(view.querySelector('iframe')).toBeNull();
  });

  it('reads solar times, provider icons and zero rain without guessing missing fields', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual.amanecer_utc = '2026-10-24T02:30:00Z';
    data.actual.atardecer_utc = '2026-10-24T22:00:00Z';
    data.actual.icono = '01n';
    data.pronostico.intervalos[0].precipitacion_pct = 0;
    data.pronostico.intervalos[0].icono = '13d';
    const result = climatePresentation(readClimateResponse(data));
    expect(result.sunrise).toBe('23:30');
    expect(result.sunset).toBe('19:00');
    expect(result.condition).toBe('moon');
    expect(result.forecast[0].condition).toBe('snow');
    expect(result.forecast[0].precipitation).toBe(0);
    data.pronostico.intervalos[0].precipitacion_pct = 101;
    expect(() => readClimateResponse(data)).toThrow();
    data.pronostico.intervalos[0].precipitacion_pct = 0;
    data.actual.icono = 'https://other.example/icon.svg';
    expect(() => readClimateResponse(data)).toThrow();
  });
});
