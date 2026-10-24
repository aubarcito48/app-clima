import { HttpErrorResponse } from '@angular/common/http';
import { ClimateResponse, readClimateLocation } from '../models/climate-response';
import { CitySearchFeedback } from '../models/city-query';
import { WeatherPreview } from '../models/weather-preview';

export function climatePresentation(data: ClimateResponse): WeatherPreview {
  const offset = data.ubicacion.desplazamiento_horario_segundos * 1000;
  const local = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-AR', { ...options, timeZone: 'UTC' }).format(
      new Date(Date.parse(date) + offset),
    );
  return {
    city: data.ubicacion.nombre,
    country: [data.ubicacion.region, data.ubicacion.pais].filter(Boolean).join(', '),
    dateLabel: local(data.actual.fecha_utc, { day: 'numeric', month: 'long', year: 'numeric' }),
    updatedAt: local(data.actual.fecha_utc, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    temperature: data.actual.temperatura_c,
    feelsLike: data.actual.sensacion_c,
    humidity: data.actual.humedad_pct,
    wind: data.actual.viento_kmh,
    condition: null,
    description: data.actual.descripcion,
    forecast: data.pronostico.intervalos.map((row) => ({
      time: local(row.fecha_utc, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
      temperature: row.temperatura_c,
      condition: null,
      description: row.descripcion,
    })),
    advice:
      data.recomendacion.estado === 'disponible'
        ? {
            heading: 'Para acompañar tus planes',
            text: data.recomendacion.texto!,
            tips: [],
          }
        : null,
  };
}

export function climateFeedback(error: unknown): CitySearchFeedback {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 409 && error.error?.codigo === 'CIUDAD_AMBIGUA') {
      try {
        const rows: unknown = error.error.candidatos;
        if (!Array.isArray(rows) || rows.length < 2 || rows.length > 5) throw new Error();
        return {
          kind: 'ambiguous',
          message: 'Hay varias ubicaciones posibles. Elegí una o precisá país y región.',
          choices: rows.map((value) => {
            const location = readClimateLocation(value);
            return {
              label: [location.nombre, location.region, location.pais].filter(Boolean).join(', '),
              country: location.pais,
              city: location.nombre,
              region: location.region ?? '',
              id: `${location.pais}:${location.latitud}:${location.longitud}`,
            };
          }),
        };
      } catch {
        return {
          kind: 'unavailable',
          message: 'No se pudo interpretar la respuesta del servicio.',
        };
      }
    }
    if (error.status === 400)
      return {
        kind: 'invalid',
        message: 'Revisá la ciudad, el código de país de dos letras y la región.',
      };
    if (error.status === 404)
      return {
        kind: 'not-found',
        message: 'No encontramos esa ciudad. Revisá el nombre o precisá país y región.',
      };
    if (error.status === 429)
      return {
        kind: 'rate-limited',
        message: 'Se alcanzó el límite de consultas. Intentá más tarde.',
      };
    if (error.status === 0)
      return {
        kind: 'connection',
        message: 'No se pudo conectar con el servicio o se agotó la espera. Volvé a intentar.',
      };
  }
  return {
    kind: 'unavailable',
    message: 'El servicio no está disponible o devolvió datos inválidos. Volvé a intentar.',
  };
}
