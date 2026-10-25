import { AbstractControl, ValidationErrors } from '@angular/forms';
import { CityQuery, WeatherQuery } from '../../models/city-query';

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

export function parsePlaceInput(value: string): CityQuery {
  const parts = value
    .normalize('NFC')
    .split(',')
    .map((part) => normalizeSpaces(part));
  if (parts.some((part) => !part)) throw new Error('Completá el lugar después de cada coma.');
  const country =
    parts.length > 1 && /^[A-Za-z]{2}$/u.test(parts.at(-1)!) ? parts.pop()!.toUpperCase() : '';
  if (parts.length > 2 || parts.some((part) => part.length > 100))
    throw new Error('Usá ciudad, región y, opcionalmente, código de país.');
  return normalizeCityQuery({ city: parts[0], country, ...(parts[1] ? { region: parts[1] } : {}) });
}

export function serializeWeatherQuery(query: WeatherQuery): string {
  if ('city' in query) return serializeCityQuery(query);
  if (
    !Number.isFinite(query.latitude) ||
    !Number.isFinite(query.longitude) ||
    Math.abs(query.latitude) > 90 ||
    Math.abs(query.longitude) > 180
  )
    throw new Error('Coordenadas inválidas.');
  return new URLSearchParams({
    latitud: String(query.latitude),
    longitud: String(query.longitude),
  }).toString();
}
