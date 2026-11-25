import { Observable } from 'rxjs';
import { getJson } from '../../api/http';

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

let selection: { city: string; lat: number; lng: number } | null = null;
export function createMapPointApi() {
  return {
    remember(city: string, lat: number, lng: number) {
      selection = { city, lat, lng };
    },
    selectedFor(city: string) {
      if (selection?.city !== city) selection = null;
      return selection;
    },
    query(latitude: number, longitude: number, language: 'es' | 'en' = 'es') {

      return new Observable<MapPointWeather>((subscriber) => {
        const controller = new AbortController();
        const params = new URLSearchParams({
          latitud: latitude.toFixed(5),
          longitud: longitude.toFixed(5),
          idioma: language,
        });
        getJson('/api/v1/mapa/punto/', params, controller.signal, 15000)
          .then(readPoint)
          .then((point) => {
            subscriber.next(point);
            subscriber.complete();
          })
          .catch((error) => {
            if (!controller.signal.aborted) subscriber.error(error);
          });
        return () => controller.abort();
      });
    },
  };
}
