import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ClimateLocation } from '../models/climate-response';
import { SavedPlace } from '../models/saved-place';

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

@Injectable({
  providedIn: 'root',
})
export class FavoritePlaces {
  private readonly document = inject(DOCUMENT);
  private readonly saved = signal<readonly SavedPlace[]>(this.read());
  readonly places = this.saved.asReadonly();
  readonly announcement = signal('');
  readonly storageWarning = signal('');
  constructor() {
    const window = this.document.defaultView;
    const listener = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY || event.key === null) this.saved.set(this.read());
    };
    window?.addEventListener('storage', listener);
    inject(DestroyRef).onDestroy(() => window?.removeEventListener('storage', listener));
  }
  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
  private read(): readonly SavedPlace[] {
    try {
      const raw = this.storage()?.getItem(FAVORITES_KEY);
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
  contains(location: ClimateLocation | null): boolean {
    return (
      !!location &&
      this.places().some((place) => place.id === placeId(location.latitud, location.longitud))
    );
  }
  toggle(location: ClimateLocation): void {
    const id = placeId(location.latitud, location.longitud);
    if (this.places().some((place) => place.id === id)) {
      this.remove(id);
      return;
    }
    if (this.places().length >= MAX_PLACES) {
      this.announcement.set('Llegaste al límite de 50 lugares. Quitá uno para guardar otro.');
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
    this.save([...this.places(), place]);
    this.announcement.set(`${place.name} se guardó en Mis lugares.`);
  }
  remove(id: string): void {
    const place = this.places().find((place) => place.id === id);
    if (!place) return;
    this.save(this.places().filter((place) => place.id !== id));
    this.announcement.set(`${place.name} se quitó de Mis lugares.`);
  }
  private save(places: readonly SavedPlace[]): void {
    this.saved.set(places);
    try {
      const storage = this.storage();
      if (!storage) throw new Error();
      storage.setItem(FAVORITES_KEY, JSON.stringify(places));
      this.storageWarning.set('');
    } catch {
      this.storageWarning.set(
        'El navegador no permite guardar los favoritos. Se conservarán solo durante esta sesión.',
      );
    }
  }
}
