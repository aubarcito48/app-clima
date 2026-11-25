import type { CoordinatesQuery } from '../models/places/city-query';

export class LocationFailure extends Error {
  constructor(readonly reason: 'denied' | 'timeout' | 'unavailable') {
    super(reason);
  }
}

export function currentLocation(signal: AbortSignal): Promise<CoordinatesQuery> {
  return new Promise((resolve, reject) => {
    if (!globalThis.isSecureContext || !navigator.geolocation)
      return reject(new LocationFailure('unavailable'));
    let active = true;
    const finish = (done: () => void) => {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      done();
    };
    const timer = setTimeout(() => finish(() => reject(new LocationFailure('timeout'))), 12000);
    const abort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return abort();
    try {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          finish(() =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          ),
        (error) =>
          finish(() =>
            reject(
              new LocationFailure(
                error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
              ),
            ),
          ),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      finish(() => reject(new LocationFailure('unavailable')));
    }
  });
}
