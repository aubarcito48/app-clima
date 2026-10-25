import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoordinatesQuery } from '../models/city-query';

export class LocationFailure extends Error {
  constructor(readonly reason: 'denied' | 'timeout' | 'unavailable') {
    super(reason);
  }
}

@Injectable({
  providedIn: 'root',
})
export class CurrentLocation {
  get(): Observable<CoordinatesQuery> {
    return new Observable((observer) => {
      if (!globalThis.isSecureContext || !navigator.geolocation) {
        observer.error(new LocationFailure('unavailable'));
        return;
      }
      let active = true;
      const timer = setTimeout(() => {
        if (active) observer.error(new LocationFailure('timeout'));
      }, 12000);
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!active) return;
            observer.next({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            observer.complete();
          },
          (error) => {
            if (active)
              observer.error(
                new LocationFailure(
                  error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
                ),
              );
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      } catch {
        observer.error(new LocationFailure('unavailable'));
      }
      return () => {
        active = false;
        clearTimeout(timer);
      };
    });
  }
}
