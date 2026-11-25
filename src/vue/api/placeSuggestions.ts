import { getJson } from './http';
import type { PlaceSuggestion } from '../models/places/city-query';
import { readClimateLocation } from '../models/weather/climate-response';

export async function searchPlaces(text: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const value = await getJson('/api/v1/lugares/', new URLSearchParams({ q: text }), signal, 8000);
  if (!value || typeof value !== 'object' || !('sugerencias' in value) ||
      !Array.isArray(value.sugerencias) || value.sugerencias.length > 5) throw new Error('Sugerencias inválidas');
  const seen = new Set<number>();
  return value.sugerencias.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('id' in row) || !Number.isSafeInteger(row.id) ||
        Number(row.id) <= 0 || seen.has(Number(row.id))) throw new Error('Lugar inválido');
    const place = readClimateLocation(row);
    seen.add(Number(row.id));
    return { id: Number(row.id), name: place.nombre, country: place.pais, region: place.region,
      latitude: place.latitud, longitude: place.longitud };
  });
}
