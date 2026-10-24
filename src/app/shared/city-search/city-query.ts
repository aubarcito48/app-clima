import { AbstractControl, ValidationErrors } from '@angular/forms';
import { CityQuery } from '../../models/city-query';

function normalizeSpaces(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function normalizeCityQuery(query: CityQuery): CityQuery {
  const country = normalizeSpaces(query.country);
  return {
    city: normalizeSpaces(query.city),
    country: /^[A-Za-z]{2}$/u.test(country) ? country.toUpperCase() : country,
    ...(normalizeSpaces(query.region ?? '') ? { region: normalizeSpaces(query.region!) } : {}),
  };
}

export function cityRequired(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && normalizeSpaces(control.value)
    ? null
    : { required: true };
}

export function countryCode(control: AbstractControl): ValidationErrors | null {
  const value = normalizeSpaces(String(control.value ?? ''));
  return !value || /^[A-Za-z]{2}$/u.test(value) ? null : { countryCode: true };
}

export function nameLength(control: AbstractControl): ValidationErrors | null {
  return normalizeSpaces(String(control.value ?? '')).length <= 100 ? null : { maxlength: true };
}

// Codifica cada valor por separado para no convertir &, + o # en parámetros.
// Se reutiliza en el servicio HTTP y en la identificación de consultas pendientes.
export function serializeCityQuery(query: CityQuery): string {
  const normalized = normalizeCityQuery(query);
  if (!normalized.city) throw new Error('La ciudad es obligatoria.');
  const params = new URLSearchParams({ ciudad: normalized.city });
  if (normalized.country) params.set('pais', normalized.country);
  if (normalized.region) params.set('region', normalized.region);
  return params.toString();
}
