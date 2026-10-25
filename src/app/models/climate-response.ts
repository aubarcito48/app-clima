// Contrato JSON v1 de Django, independiente del modelo de presentación.
export interface ClimateLocation {
  nombre: string;
  pais: string;
  region: string | null;
  latitud: number;
  longitud: number;
}
export interface ClimateResponse {
  ubicacion: ClimateLocation & { desplazamiento_horario_segundos: number };
  actual: {
    fecha_utc: string;
    amanecer_utc?: string | null;
    atardecer_utc?: string | null;
    icono?: string | null;
    temperatura_c: number;
    sensacion_c: number | null;
    humedad_pct: number | null;
    viento_kmh: number | null;
    descripcion: string | null;
  };
  pronostico: {
    estado: 'disponible' | 'no_disponible';
    intervalos: {
      fecha_utc: string;
      temperatura_c: number;
      descripcion: string | null;
      precipitacion_pct?: number | null;
      icono?: string | null;
    }[];
  };
  recomendacion: { estado: 'disponible' | 'no_disponible'; texto: string | null };
  meta: {
    fuente_meteorologica: 'OpenWeather';
    consultado_en_utc: string;
    unidades: { temperatura: '°C'; viento: 'km/h'; humedad: '%'; fecha: 'UTC' };
  };
}
export class InvalidClimateResponse extends Error {}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidClimateResponse();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new InvalidClimateResponse();
  return value;
}
function number(value: unknown, min = -Infinity, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new InvalidClimateResponse();
  return value;
}
function optionalNumber(value: unknown, min = -Infinity, max = Infinity): number | null {
  return value == null ? null : number(value, min, max);
}
function optionalText(value: unknown): string | null {
  return value == null ? null : text(value);
}
function icon(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || !/^(01|02|03|04|09|10|11|13|50)[dn]$/u.test(value))
    throw new InvalidClimateResponse();
  return value;
}
function utc(value: unknown): string {
  const result = text(value);
  const date = new Date(result);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/u.test(result) ||
    !Number.isFinite(date.valueOf()) ||
    date.toISOString().slice(0, 19) !== result.slice(0, 19)
  )
    throw new InvalidClimateResponse();
  return result;
}
function state(value: unknown): 'disponible' | 'no_disponible' {
  if (value !== 'disponible' && value !== 'no_disponible') throw new InvalidClimateResponse();
  return value;
}
export function readClimateLocation(value: unknown): ClimateLocation {
  const location = record(value);
  const country = text(location['pais']);
  if (!/^[A-Z]{2}$/u.test(country)) throw new InvalidClimateResponse();
  return {
    nombre: text(location['nombre']),
    pais: country,
    region: optionalText(location['region']),
    latitud: number(location['latitud'], -90, 90),
    longitud: number(location['longitud'], -180, 180),
  };
}
export function readClimateResponse(value: unknown): ClimateResponse {
  const root = record(value);
  const location = record(root['ubicacion']);
  const offset = number(location['desplazamiento_horario_segundos'], -50400, 50400);
  if (!Number.isInteger(offset)) throw new InvalidClimateResponse();
  const current = record(root['actual']);
  const forecast = record(root['pronostico']);
  const advice = record(root['recomendacion']);
  const meta = record(root['meta']);
  const units = record(meta['unidades']);
  if (
    meta['fuente_meteorologica'] !== 'OpenWeather' ||
    units['temperatura'] !== '°C' ||
    units['viento'] !== 'km/h' ||
    units['humedad'] !== '%' ||
    units['fecha'] !== 'UTC'
  )
    throw new InvalidClimateResponse();
  const forecastState = state(forecast['estado']);
  const rows = forecast['intervalos'];
  if (
    !Array.isArray(rows) ||
    rows.length > 40 ||
    (forecastState === 'disponible' ? !rows.length : rows.length !== 0)
  )
    throw new InvalidClimateResponse();
  const adviceState = state(advice['estado']);
  const adviceText = adviceState === 'disponible' ? text(advice['texto']) : null;
  if (
    (adviceState === 'no_disponible' && advice['texto'] !== null) ||
    (adviceText && adviceText.length > 600)
  )
    throw new InvalidClimateResponse();
  return {
    ubicacion: { ...readClimateLocation(location), desplazamiento_horario_segundos: offset },
    actual: {
      fecha_utc: utc(current['fecha_utc']),
      ...('icono' in current ? { icono: icon(current['icono']) } : {}),
      ...('amanecer_utc' in current
        ? { amanecer_utc: current['amanecer_utc'] == null ? null : utc(current['amanecer_utc']) }
        : {}),
      ...('atardecer_utc' in current
        ? { atardecer_utc: current['atardecer_utc'] == null ? null : utc(current['atardecer_utc']) }
        : {}),
      temperatura_c: number(current['temperatura_c']),
      sensacion_c: optionalNumber(current['sensacion_c']),
      humedad_pct: optionalNumber(current['humedad_pct'], 0, 100),
      viento_kmh: optionalNumber(current['viento_kmh'], 0),
      descripcion: optionalText(current['descripcion']),
    },
    pronostico: {
      estado: forecastState,
      intervalos: rows.map((value: unknown) => {
        const row = record(value);
        return {
          fecha_utc: utc(row['fecha_utc']),
          ...('icono' in row ? { icono: icon(row['icono']) } : {}),
          ...('precipitacion_pct' in row
            ? { precipitacion_pct: optionalNumber(row['precipitacion_pct'], 0, 100) }
            : {}),
          temperatura_c: number(row['temperatura_c']),
          descripcion: optionalText(row['descripcion']),
        };
      }),
    },
    recomendacion: { estado: adviceState, texto: adviceText },
    meta: {
      fuente_meteorologica: 'OpenWeather',
      consultado_en_utc: utc(meta['consultado_en_utc']),
      unidades: { temperatura: '°C', viento: 'km/h', humedad: '%', fecha: 'UTC' },
    },
  };
}
