import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Language } from '../preferences/language';

export interface MapPointWeather {
  latitud: number;
  longitud: number;
  actual: {
    fecha_utc: string;
    temperatura_c: number;
    viento_kmh: number | null;
    humedad_pct: number | null;
    lluvia_ultima_hora_mm: number | null;
  };
  fuente: 'OpenWeather';
}

function readPoint(value: unknown): MapPointWeather {
  const root = value as MapPointWeather | null;
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const optional = (n: unknown, min: number, max = Infinity) =>
    n === null || (finite(n) && n >= min && n <= max);
  if (
    !root ||
    !finite(root.latitud) ||
    Math.abs(root.latitud) > 90 ||
    !finite(root.longitud) ||
    Math.abs(root.longitud) > 180 ||
    root.fuente !== 'OpenWeather' ||
    !root.actual ||
    !finite(root.actual.temperatura_c) ||
    !optional(root.actual.viento_kmh, 0) ||
    !optional(root.actual.humedad_pct, 0, 100) ||
    !optional(root.actual.lluvia_ultima_hora_mm, 0) ||
    typeof root.actual.fecha_utc !== 'string' ||
    !root.actual.fecha_utc.endsWith('Z') ||
    !Number.isFinite(Date.parse(root.actual.fecha_utc))
  ) {
    throw new Error('Invalid map point response');
  }
  return root;
}

@Injectable({
  providedIn: 'root',
})
export class MapPointApi {
  private selection: { city: string; lat: number; lng: number } | null = null;
  private readonly http = inject(HttpClient);
  private readonly language = inject(Language);

  remember(city: string, lat: number, lng: number): void {
    this.selection = { city, lat, lng };
  }

  selectedFor(city: string) {
    if (this.selection?.city !== city) this.selection = null;
    return this.selection;
  }

  query(latitude: number, longitude: number) {
    const params = new HttpParams({
      fromObject: {
        latitud: latitude.toFixed(5),
        longitud: longitude.toFixed(5),
        idioma: this.language.code(),
      },
    });
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/v1/mapa/punto/`, {
        params,
        timeout: 15000,
      })
      .pipe(map(readPoint));
  }
}
