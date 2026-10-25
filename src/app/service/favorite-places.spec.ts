import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FavoritePlaces, FAVORITES_KEY } from './favorite-places';
import { ClimateLocation } from '../models/climate-response';

const location: ClimateLocation = {
  nombre: 'Córdoba',
  pais: 'AR',
  region: 'Córdoba',
  latitud: -31.42,
  longitud: -64.18,
};
describe('Favorite places stored in this browser', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('persists only location fields, restores them and toggles without duplicates', () => {
    const store = TestBed.inject(FavoritePlaces);
    store.toggle(location);
    expect(store.contains(location)).toBe(true);
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY)!);
    expect(Object.keys(stored[0]).sort()).toEqual(
      ['id', 'name', 'country', 'region', 'latitude', 'longitude'].sort(),
    );
    TestBed.resetTestingModule();
    const restored = TestBed.inject(FavoritePlaces);
    expect(restored.places()).toHaveLength(1);
    expect(restored.places()[0].name).toBe('Córdoba');
    restored.toggle(location);
    expect(restored.contains(location)).toBe(false);
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([]);
  });

  it('distinguishes places with the same name and accepts zero coordinates', () => {
    const store = TestBed.inject(FavoritePlaces);
    store.toggle(location);
    store.toggle({ ...location, region: 'Otra región', latitud: 0, longitud: 0 });
    expect(store.places()).toHaveLength(2);
    store.remove(store.places()[0].id);
    expect(store.places()[0].latitude).toBe(0);
  });

  it('ignores corrupt storage and validates and deduplicates restored data', () => {
    localStorage.setItem(FAVORITES_KEY, '{broken');
    expect(TestBed.inject(FavoritePlaces).places()).toEqual([]);
    TestBed.resetTestingModule();
    const saved = { name: 'Córdoba', country: 'AR', region: null, latitude: 0, longitude: 0 };
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify([saved, saved, { ...saved, latitude: 91 }, { ...saved, longitude: '0' }]),
    );
    expect(TestBed.inject(FavoritePlaces).places()).toHaveLength(1);
  });

  it('keeps session favorites and explains a storage failure instead of throwing', () => {
    const store = TestBed.inject(FavoritePlaces);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    expect(() => store.toggle(location)).not.toThrow();
    expect(store.contains(location)).toBe(true);
    expect(store.storageWarning()).toContain('solo durante esta sesión');
    store.toggle(location);
    expect(store.places()).toHaveLength(0);
  });

  it('updates from changes in another tab', () => {
    const store = TestBed.inject(FavoritePlaces);
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify([{ name: 'Ciudad', country: 'AR', region: null, latitude: 0, longitude: 0 }]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_KEY }));
    expect(store.places()[0].name).toBe('Ciudad');
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.places()).toEqual([]);
  });
});
