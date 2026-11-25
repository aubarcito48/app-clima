import { createChannel } from './store';
const { atom: ref, derived: computed, useVersion } = createChannel();
const disposers: (() => void)[] = [];
const cleanup = (dispose: () => void) => disposers.push(dispose);
if (import.meta.hot) import.meta.hot.dispose(() => disposers.splice(0).forEach((stop) => stop()));
import { ClimateLocation } from '../models/weather/climate-response';
import { SavedPlace } from '../models/places/saved-place';
export const FAVORITES_KEY = 'stitchweather.favorites.v1';
const MAX_PLACES = 50;
function placeId(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}
function readPlace(value: unknown): SavedPlace | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row['name'] !== 'string' ||
    !row['name'].trim() ||
    row['name'].length > 200 ||
    typeof row['country'] !== 'string' ||
    !/^[A-Z]{2}$/u.test(row['country']) ||
    (row['region'] != null && (typeof row['region'] !== 'string' || row['region'].length > 200)) ||
    typeof row['latitude'] !== 'number' ||
    !Number.isFinite(row['latitude']) ||
    Math.abs(row['latitude']) > 90 ||
    typeof row['longitude'] !== 'number' ||
    !Number.isFinite(row['longitude']) ||
    Math.abs(row['longitude']) > 180
  )
    return null;
  return {
    id: placeId(row['latitude'], row['longitude']),
    name: row['name'].trim(),
    country: row['country'],
    region: (row['region'] as string | null) ?? null,
    latitude: row['latitude'],
    longitude: row['longitude'],
  };
}
const document = globalThis.document;
const saved = ref<readonly SavedPlace[]>(read());
const places = saved;
const announcement = ref('');
const storageWarning = ref('');
function storage(): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}
function read(): readonly SavedPlace[] {
  try {
    const raw = storage()?.getItem(FAVORITES_KEY);
    if (!raw || raw.length > 65536) return [];
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length > MAX_PLACES) return [];
    const places = new Map<string, SavedPlace>();
    for (const value of values) {
      const place = readPlace(value);
      if (place) places.set(place.id, place);
    }
    return [...places.values()];
  } catch {
    return [];
  }
}
function contains(location: ClimateLocation | null): boolean {
  return (
    !!location &&
    places.value.some((place) => place.id === placeId(location.latitud, location.longitud))
  );
}
function toggle(location: ClimateLocation): void {
  const id = placeId(location.latitud, location.longitud);
  if (places.value.some((place) => place.id === id)) {
    remove(id);
    return;
  }
  if (places.value.length >= MAX_PLACES) {
    announcement.value = 'Llegaste al límite de 50 lugares. Quitá uno para guardar otro.';
    return;
  }
  const place = readPlace({
    name: location.nombre,
    country: location.pais,
    region: location.region,
    latitude: location.latitud,
    longitude: location.longitud,
  });
  if (!place) return;
  save([...places.value, place]);
  announcement.value = `${place.name} se guardó en Mis lugares.`;
}
function remove(id: string): void {
  const place = places.value.find((place) => place.id === id);
  if (!place) return;
  save(places.value.filter((place) => place.id !== id));
  announcement.value = `${place.name} se quitó de Mis lugares.`;
}
function save(places: readonly SavedPlace[]): void {
  saved.value = places;
  try {
    const browserStorage = storage();
    if (!browserStorage) throw new Error();
    browserStorage.setItem(FAVORITES_KEY, JSON.stringify(places));
    storageWarning.value = '';
  } catch {
    storageWarning.value =
      'El navegador no permite guardar los favoritos. Se conservarán solo durante esta sesión.';
  }
}
const window = document.defaultView;
const listener = (event: StorageEvent) => {
  if (event.key === FAVORITES_KEY || event.key === null) saved.value = read();
};
window?.addEventListener('storage', listener);
cleanup(() => window?.removeEventListener('storage', listener));

export function useFavoritePlaces() {
  useVersion();
  return {
    places: places.value,
    announcement: announcement.value,
    storageWarning: storageWarning.value,
    contains,
    toggle,
    remove,
  };
}
