import { describe, expect, it } from 'vitest';
import { readWeatherAlerts } from './weather-alerts';
import { ALERTS_FIXTURE } from '../testing/alerts-fixture';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';

describe('Official weather alerts contract', () => {
  it('preserves official severity and text, including literal markup', () => {
    const data = structuredClone(ALERTS_FIXTURE);
    data.alertas[0].descripcion = '<img src=x onerror=alert(1)>';
    const result = readWeatherAlerts(data, CLIMATE_FIXTURE.ubicacion);
    expect(result.alertas[0].severidad).toBe('Moderate');
    expect(result.alertas[0].descripcion).toBe(data.alertas[0].descripcion);
  });
  it('rejects a response for another location and unknown severity or state', () => {
    for (const change of [
      { ubicacion: { ...ALERTS_FIXTURE.ubicacion, latitud: 0 } },
      { estado: 'seguro' },
      { alertas: [{ ...ALERTS_FIXTURE.alertas[0], severidad: 'inventada' }] },
      { estado: 'no_disponible' },
    ])
      expect(() =>
        readWeatherAlerts({ ...ALERTS_FIXTURE, ...change }, CLIMATE_FIXTURE.ubicacion),
      ).toThrow();
  });
  it('rejects untrusted links, wrong dates and oversized source text', () => {
    for (const change of [
      { url: 'javascript:alert(1)' },
      { url: 'https://ssl.smn.gob.ar.evil/feeds/CAP/xml_generados/test.xml' },
      { fin_utc: '2026-10-24T01:00:00Z' },
      { inicio_utc: 'not-a-date' },
      { descripcion: 'x'.repeat(20001) },
    ])
      expect(() =>
        readWeatherAlerts(
          { ...ALERTS_FIXTURE, alertas: [{ ...ALERTS_FIXTURE.alertas[0], ...change }] },
          CLIMATE_FIXTURE.ubicacion,
        ),
      ).toThrow();
  });
});
