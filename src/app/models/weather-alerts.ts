import { ClimateLocation } from './climate-response';

export const ALERT_SOURCES: Record<
  string,
  {
    name: string;
    url: string;
    short: string;
    language: string;
    document: RegExp;
  }
> = {
  AR: {
    name: 'Servicio Meteorológico Nacional',
    url: 'https://www.smn.gob.ar/alertas',
    short: 'SMN',
    language: 'es',
    document:
      /^https:\/\/ssl\.smn\.gob\.ar\/feeds\/CAP\/(xml_generados|cap_salida|avisocortoplazo)\/[A-Za-z0-9_.-]+\.xml$/u,
  },
  CL: {
    name: 'Dirección Meteorológica de Chile',
    url: 'https://www.meteochile.gob.cl/PortalDMC-web/index.xhtml',
    short: 'DMC',
    language: 'es',
    document:
      /^https:\/\/archivos\.meteochile\.gob\.cl\/portaldmc\/rss\/meteochile_[A-Za-z0-9_-]+_cap\.xml$/u,
  },
  UY: {
    name: 'Instituto Uruguayo de Meteorología',
    url: 'https://www.inumet.gub.uy/alerta',
    short: 'INUMET',
    language: 'es',
    document: /^https:\/\/www\.inumet\.gub\.uy\/reportes\/riesgo\/cap_[0-9_]+\.xml$/u,
  },
  BR: {
    name: 'Instituto Nacional de Meteorologia',
    url: 'https://avisos.inmet.gov.br/',
    short: 'INMET',
    language: 'pt',
    document: /^https:\/\/apiprevmet3\.inmet\.gov\.br\/avisos\/rss\/[0-9]+$/u,
  },
};

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
export interface WeatherAlert {
  identificador: string;
  fenomeno: string;
  severidad: AlertSeverity;
  urgencia: string;
  certeza: string;
  inicio_utc: string;
  fin_utc: string;
  emitido_en_utc: string;
  descripcion: string;
  recomendaciones: string;
  zona: string;
  url: string;
}
export interface WeatherAlertsResponse {
  ubicacion: { latitud: number; longitud: number; pais: string };
  estado: 'disponible' | 'parcial' | 'no_disponible' | 'fuera_cobertura';
  alertas: WeatherAlert[];
  fuente: {
    nombre: string;
    url: string;
    consultado_en_utc: string;
    publicado_en_utc: string | null;
    consultas_limitadas?: boolean;
  };
}
export function readWeatherAlerts(
  value: unknown,
  expected: ClimateLocation,
): WeatherAlertsResponse {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid alerts');
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, max = 20000): string => {
    if (typeof v !== 'string' || v.length > max) throw new Error('Invalid alert text');
    return v;
  };
  const date = (v: unknown): string => {
    const result = text(v, 40);
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/u.test(result) ||
      !Number.isFinite(Date.parse(result))
    )
      throw new Error('Invalid alert date');
    return result;
  };
  const data = object(value),
    location = object(data['ubicacion']),
    source = object(data['fuente']);
  if (
    location['latitud'] !== expected.latitud ||
    location['longitud'] !== expected.longitud ||
    location['pais'] !== expected.pais
  )
    throw new Error('Alerts for another location');
  const state = data['estado'];
  const provider = Object.hasOwn(ALERT_SOURCES, expected.pais)
    ? ALERT_SOURCES[expected.pais]
    : null;
  if (
    !['disponible', 'parcial', 'no_disponible', 'fuera_cobertura'].includes(String(state)) ||
    !Array.isArray(data['alertas']) ||
    data['alertas'].length > 128
  )
    throw new Error('Invalid alerts state');
  if (
    (!provider && state !== 'fuera_cobertura') ||
    source['nombre'] !== (provider ?? ALERT_SOURCES['AR']).name ||
    source['url'] !== (provider ?? ALERT_SOURCES['AR']).url
  )
    throw new Error('Invalid alerts source');
  const alerts = data['alertas'].map((row: unknown): WeatherAlert => {
    const alert = object(row),
      severity = alert['severidad'];
    if (!['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'].includes(String(severity)))
      throw new Error('Invalid severity');
    const url = text(alert['url'], 2048);
    if (!provider?.document.test(url)) throw new Error('Invalid source link');
    const start = date(alert['inicio_utc']),
      end = date(alert['fin_utc']);
    if (Date.parse(end) <= Date.parse(start)) throw new Error('Invalid validity period');
    return {
      identificador: text(alert['identificador'], 512),
      fenomeno: text(alert['fenomeno'], 200),
      severidad: severity as AlertSeverity,
      urgencia: text(alert['urgencia'], 100),
      certeza: text(alert['certeza'], 100),
      inicio_utc: start,
      fin_utc: end,
      emitido_en_utc: date(alert['emitido_en_utc']),
      descripcion: text(alert['descripcion']),
      recomendaciones: text(alert['recomendaciones']),
      zona: text(alert['zona'], 5000),
      url,
    };
  });
  if ((state === 'no_disponible' || state === 'fuera_cobertura') && alerts.length)
    throw new Error('Inconsistent alerts state');
  return {
    estado: state as WeatherAlertsResponse['estado'],
    ubicacion: { latitud: expected.latitud, longitud: expected.longitud, pais: expected.pais },
    alertas: alerts,
    fuente: {
      nombre: source['nombre'] as string,
      consultas_limitadas: (() => {
        const verification = source['verificacion'];
        if (!verification || typeof verification !== 'object') return false;
        const failures = (verification as Record<string, unknown>)['fallos'];
        return (
          !!failures &&
          typeof failures === 'object' &&
          ['indice_http_429', 'documento_http_429'].some(
            (key) => Number((failures as Record<string, unknown>)[key]) > 0,
          )
        );
      })(),
      url: source['url'] as string,
      consultado_en_utc: date(source['consultado_en_utc']),
      publicado_en_utc:
        source['publicado_en_utc'] == null ? null : date(source['publicado_en_utc']),
    },
  };
}
