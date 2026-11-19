import { describe, expect, it } from 'vitest';
import { normalizeCityQuery, serializeCityQuery } from './city-query';

describe('City query encoding', () => {
  it('normalizes surrounding and repeated whitespace while preserving accents', () => {
    expect(
      normalizeCityQuery({ city: '  San\t Miguel\n de  Tucumán\u00a0', country: ' ar ' }),
    ).toEqual({
      city: 'San Miguel de Tucumán',
      country: 'AR',
    });
  });

  it('keeps country names and leaves an omitted country out of the query string', () => {
    expect(normalizeCityQuery({ city: 'Córdoba', country: '  Nueva   Zelanda  ' }).country).toBe(
      'Nueva Zelanda',
    );
    const params = new URLSearchParams(serializeCityQuery({ city: 'Mendoza', country: '  ' }));
    expect(params.get('ciudad')).toBe('Mendoza');
    expect(params.has('pais')).toBe(false);
  });

  it('encodes Unicode and reserved characters without injecting extra parameters', () => {
    const city = "São Tomé & Príncipe + #1/2? '";
    const country = 'Trinidad & Tobago';
    const serialized = serializeCityQuery({ city, country });
    const decoded = new URLSearchParams(serialized);
    expect(decoded.get('ciudad')).toBe(city);
    expect(decoded.get('pais')).toBe(country);
    expect([...decoded.keys()]).toEqual(['ciudad', 'pais']);
    expect(serialized).toContain('%26');
    expect(serialized).toContain('%2B');
    expect(serialized).toContain('%23');
  });

  it('does not double-encode accented city names', () => {
    const serialized = serializeCityQuery({ city: ' Córdoba ', country: ' ar ' });
    expect(serialized).toBe('ciudad=C%C3%B3rdoba&pais=AR');
  });

  it('refuses to serialize a city made only of whitespace', () => {
    expect(() => serializeCityQuery({ city: ' \t\n ', country: 'AR' })).toThrow(
      'La ciudad es obligatoria',
    );
  });
});
