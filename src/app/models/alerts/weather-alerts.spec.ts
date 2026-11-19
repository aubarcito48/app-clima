import { describe, expect, it } from 'vitest';
import { ALERT_SOURCES, readWeatherAlerts } from './weather-alerts';
import { ALERTS_FIXTURE } from '../../testing/alerts/alerts-fixture';
import { CLIMATE_FIXTURE } from '../../testing/weather/climate-fixture';

describe('Official weather alerts contract', () => {
  it.each([
    ['BR', 'https://apiprevmet3.inmet.gov.br/avisos/rss/123'],
    ['CL', 'https://archivos.meteochile.gob.cl/portaldmc/rss/meteochile_A1_2026_cap.xml'],
    ['UY', 'https://www.inumet.gub.uy/reportes/riesgo/cap_2026_10_25.xml'],
  ])('accepts only the matching official source and CAP links for %s', (country, url) => {
    const data = structuredClone(ALERTS_FIXTURE);
    data.ubicacion.pais = country;
    data.fuente.nombre = ALERT_SOURCES[country].name;
    data.fuente.url = ALERT_SOURCES[country].url;
    data.alertas[0].url = url;
    const place = { ...CLIMATE_FIXTURE.ubicacion, pais: country };
    expect(readWeatherAlerts(data, place).alertas).toHaveLength(1);
    for (const link of [
      ALERTS_FIXTURE.alertas[0].url,
      url + '?redirect=1',
      url.replace('https://', 'https://evil.test/'),
    ]) {
      data.alertas[0].url = link;
      expect(() => readWeatherAlerts(data, place)).toThrow();
    }
    data.alertas[0].url = url;
    data.fuente = { ...ALERTS_FIXTURE.fuente };
    expect(() => readWeatherAlerts(data, place)).toThrow();
  });
  it('does not accept an all-clear for a country without an integrated source', () => {
    const data = {
      ...ALERTS_FIXTURE,
      ubicacion: { ...ALERTS_FIXTURE.ubicacion, pais: 'PE' },
      alertas: [],
    };
    const place = { ...CLIMATE_FIXTURE.ubicacion, pais: 'PE' };
    expect(() => readWeatherAlerts(data, place)).toThrow();
    expect(readWeatherAlerts({ ...data, estado: 'fuera_cobertura' }, place).estado).toBe(
      'fuera_cobertura',
    );
  });
  it('recognizes SMN rate limiting without treating it as an all-clear', () => {
    const data = {
      ...ALERTS_FIXTURE,
      estado: 'parcial',
      fuente: {
        ...ALERTS_FIXTURE.fuente,
        verificacion: { fallos: { documento_http_429: 2 } },
      },
    };
    const result = readWeatherAlerts(data, CLIMATE_FIXTURE.ubicacion);
    expect(result.fuente.consultas_limitadas).toBe(true);
    expect(result.estado).toBe('parcial');
    expect(result.alertas).toHaveLength(1);
  });
  it('accepts short-term notices from the official SMN directory', () => {
    const data = structuredClone(ALERTS_FIXTURE);
    data.alertas[0].url = 'https://ssl.smn.gob.ar/feeds/CAP/avisocortoplazo/test_cap_es.xml';
    expect(readWeatherAlerts(data, CLIMATE_FIXTURE.ubicacion).alertas).toHaveLength(1);
  });
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
