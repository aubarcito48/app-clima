import type { WeatherQuery } from '../models/places/city-query';
import { readClimateResponse } from '../models/weather/climate-response';
import { serializeWeatherQuery } from '../shared/places/city-search/city-query';
import { getJson } from './http';

export async function searchClimate(
  query: WeatherQuery,
  language: 'es' | 'en',
  signal?: AbortSignal,
) {
  const params = new URLSearchParams(serializeWeatherQuery(query));
  if (language === 'en') params.set('idioma', 'en');
  return readClimateResponse(await getJson('/api/v1/clima/', params, signal));
}
