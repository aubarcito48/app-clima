import { HttpErrorResponse } from '@angular/common/http';
import { ClimateResponse, readClimateLocation } from '../models/climate-response';
import { CitySearchFeedback } from '../models/city-query';
import { WeatherPreview, WeatherCondition } from '../models/weather-preview';

function condition(icon?: string | null): WeatherCondition | null {
  if (!icon) return null;
  const icons: Record<string, WeatherCondition> = {
    '01d': 'sun',
    '01n': 'moon',
    '02d': 'cloud-sun',
    '02n': 'cloud-moon',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloud',
    '04n': 'cloud',
    '09d': 'rain',
    '09n': 'rain',
    '10d': 'rain',
    '10n': 'rain',
    '11d': 'storm',
    '11n': 'storm',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'mist',
    '50n': 'mist',
  };
  return icons[icon] ?? null;
}

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
    observedTime: local(data.actual.fecha_utc, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    observedAtUtc: data.actual.fecha_utc,
    observedDayKey: new Date(Date.parse(data.actual.fecha_utc) + offset).toISOString().slice(0, 10),
    sunrise: data.actual.amanecer_utc
      ? local(data.actual.amanecer_utc, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      : null,
    sunset: data.actual.atardecer_utc
      ? local(data.actual.atardecer_utc, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      : null,
    updatedAtUtc: data.meta.consultado_en_utc,
    updatedAt: local(data.meta.consultado_en_utc, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    timezoneLabel: utcOffsetLabel(data.ubicacion.desplazamiento_horario_segundos),
    source: data.meta.fuente_meteorologica,
    temperature: data.actual.temperatura_c,
    feelsLike: data.actual.sensacion_c,
    humidity: data.actual.humedad_pct,
    wind: data.actual.viento_kmh,
    condition: condition(data.actual.icono),
    description: data.actual.descripcion,
    forecast: data.pronostico.intervalos.map((row) => ({
      dateTime: row.fecha_utc,
      dayKey: new Date(Date.parse(row.fecha_utc) + offset).toISOString().slice(0, 10),
      dayLabel: local(row.fecha_utc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: local(row.fecha_utc, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
      temperature: row.temperatura_c,
      precipitation: row.precipitacion_pct ?? null,
      condition: condition(row.icono),
      description: row.descripcion,
    })),
    advice:
      data.recomendacion.estado === 'disponible'
        ? {
            text: data.recomendacion.texto!,
          }
        : null,
  };
}

function utcOffsetLabel(offset: number): string {
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, '0');
  const seconds = absolute % 60;
  return `UTC${offset < 0 ? '−' : '+'}${hours}:${minutes}${seconds ? ':' + String(seconds).padStart(2, '0') : ''}`;
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
          retryable: true,
        };
      }
    }
    if (error.status === 400)
      return {
        kind: 'invalid',
        message: 'Revisá la ciudad, el código de país de dos letras y la región.',
        field: error.error?.errores?.pais
          ? 'country'
          : error.error?.errores?.region
            ? 'region'
            : 'city',
      };
    if (error.status === 404 && error.error?.codigo === 'CIUDAD_NO_ENCONTRADA')
      return {
        kind: 'not-found',
        message: 'No encontramos esa ciudad. Revisá el nombre o precisá país y región.',
      };
    if (error.status === 429)
      return {
        kind: 'rate-limited',
        message: 'Se alcanzó el límite de consultas. Intentá más tarde.',
        retryable: true,
      };
    if (error.status === 0 && error.error?.name === 'TimeoutError')
      return {
        kind: 'timeout',
        message: 'Se agotó el tiempo de espera. Podés volver a intentar la consulta.',
        retryable: true,
      };
    if (error.status === 0)
      return {
        kind: 'connection',
        message: 'No se pudo conectar con el servicio. Revisá tu conexión y volvé a intentar.',
        retryable: true,
      };
  }
  return {
    kind: 'unavailable',
    message: 'El servicio no está disponible o devolvió datos inválidos. Volvé a intentar.',
    retryable: true,
  };
}
