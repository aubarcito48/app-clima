import { CLIMATE_FIXTURE } from './climate-fixture';
import { WeatherAlertsResponse } from '../models/weather-alerts';

// Fictional notices for tests and visual review, never a live emergency warning.
export const ALERTS_FIXTURE: WeatherAlertsResponse = {
  ubicacion: {
    latitud: CLIMATE_FIXTURE.ubicacion.latitud,
    longitud: CLIMATE_FIXTURE.ubicacion.longitud,
    pais: 'AR',
  },
  estado: 'disponible',
  fuente: {
    nombre: 'Servicio Meteorológico Nacional',
    url: 'https://www.smn.gob.ar/alertas',
    consultado_en_utc: '2026-10-25T12:00:00Z',
    publicado_en_utc: '2026-10-25T11:00:00Z',
  },
  alertas: [
    {
      identificador: 'synthetic-test-notice',
      fenomeno: 'Tormentas de prueba',
      severidad: 'Moderate',
      urgencia: 'Future',
      certeza: 'Likely',
      inicio_utc: '2026-10-25T18:00:00Z',
      fin_utc: '2026-10-26T03:00:00Z',
      emitido_en_utc: '2026-10-25T11:00:00Z',
      descripcion: 'Aviso ficticio para probar la interfaz. No es una alerta real.',
      recomendaciones: 'Recomendación ficticia para pruebas.',
      zona: 'Área de prueba',
      url: 'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/synthetic-test.xml',
    },
  ],
};
