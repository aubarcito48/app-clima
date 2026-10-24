import { AbstractControl, ValidationErrors } from '@angular/forms';
import { CityQuery } from '../../models/city-query';

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeCityQuery(query: CityQuery): CityQuery {
  const country = normalizeSpaces(query.country);
  return {
    city: normalizeSpaces(query.city),
    country: /^[a-z]{2}$/iu.test(country) ? country.toUpperCase() : country,
  };
}

export function cityRequired(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && normalizeSpaces(control.value)
    ? null
    : { required: true };
}

// Codifica cada valor por separado para no convertir &, + o # en parámetros.
// No realiza HTTP. Se reutilizará al conectar el transporte de TK05.
export function serializeCityQuery(query: CityQuery): string {
  const normalized = normalizeCityQuery(query);
  if (!normalized.city) throw new Error('La ciudad es obligatoria.');
  const params = new URLSearchParams({ ciudad: normalized.city });
  if (normalized.country) params.set('pais', normalized.country);
  return params.toString();
}
