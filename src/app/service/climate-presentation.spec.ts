import { describe, expect, it } from 'vitest';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';
import { climatePresentation } from './climate-presentation';

describe('Weather measurements and city dates (TK06)', () => {
  it('preserves measurements and units without a second wind conversion or rounding', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual = {
      ...data.actual,
      temperatura_c: 0,
      sensacion_c: -4.25,
      humedad_pct: 0,
      viento_kmh: 9.123,
    };
    const result = climatePresentation(data);
    expect(result).toMatchObject({
      city: 'Córdoba',
      country: 'Córdoba, AR',
      temperature: 0,
      feelsLike: -4.25,
      humidity: 0,
      wind: 9.123,
      source: 'OpenWeather',
    });
    expect(data.actual.viento_kmh).toBe(9.123);
  });

  it('distinguishes observation from consultation across the local midnight boundary', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.actual.fecha_utc = '2026-10-24T02:30:00Z';
    data.meta.consultado_en_utc = '2026-10-24T03:15:00Z';
    const result = climatePresentation(data);
    expect(result.dateLabel).toBe('23 de octubre de 2026');
    expect(result.observedTime).toBe('23:30');
    expect(result.updatedAt).toContain('24 de octubre de 2026');
    expect(result.updatedAt).toContain('00:15');
    expect(result.observedAtUtc).toBe(data.actual.fecha_utc);
    expect(result.updatedAtUtc).toBe(data.meta.consultado_en_utc);
    expect(result.timezoneLabel).toBe('UTC−03:00');
  });

  it.each([
    [0, 'UTC+00:00', '18:00'],
    [20700, 'UTC+05:45', '23:45'],
    [-12600, 'UTC−03:30', '14:30'],
  ])('uses the supplied offset %s rather than the device timezone', (offset, label, time) => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.ubicacion.desplazamiento_horario_segundos = offset as number;
    const result = climatePresentation(data);
    expect(result.timezoneLabel).toBe(label);
    expect(result.forecast[0].time).toBe(time);
  });

  it('keeps all forty intervals and their temperatures without daily averages', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.pronostico.intervalos = Array.from({ length: 40 }, (_, index) => ({
      fecha_utc: new Date(Date.parse('2026-12-31T21:00:00Z') + index * 10800000).toISOString(),
      temperatura_c: index - 20,
      descripcion: index % 2 ? null : 'Nublado',
    }));
    const original = structuredClone(data);
    const result = climatePresentation(data);
    expect(result.forecast).toHaveLength(40);
    expect(result.forecast.map((row) => row.temperature)).toEqual(
      data.pronostico.intervalos.map((row) => row.temperatura_c),
    );
    expect(result.forecast[0]).toMatchObject({
      dateTime: '2026-12-31T21:00:00.000Z',
      dayKey: '2026-12-31',
      time: '18:00',
    });
    expect(result.forecast[2]).toMatchObject({ dayKey: '2027-01-01', time: '00:00' });
    expect(data).toEqual(original);
  });

  it('keeps missing region and optional measurements unavailable', () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.ubicacion.region = null;
    data.actual = {
      ...data.actual,
      sensacion_c: null,
      humedad_pct: null,
      viento_kmh: null,
      descripcion: null,
    };
    const result = climatePresentation(data);
    expect(result.country).toBe('AR');
    expect(result).toMatchObject({
      feelsLike: null,
      humidity: null,
      wind: null,
      description: null,
      condition: null,
    });
  });
});
