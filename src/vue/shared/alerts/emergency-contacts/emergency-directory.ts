/** Official national dialing codes, checked 2026-11-17. No municipal directory. */
export interface EmergencyDirectory {
  country: string;
  name: string;
  source: string;
  contacts: ReadonlyArray<{ number: string; name: string; detail: string }>;
}

const DIRECTORIES: Readonly<Record<string, EmergencyDirectory>> = {
  AR: {
    country: 'AR',
    name: 'Argentina',
    source: 'https://www.argentina.gob.ar/tema/emergencias',
    contacts: [
      {
        number: '911',
        name: 'Policía y emergencias',
        detail: 'Ayuda policial y coordinación de emergencias.',
      },
      {
        number: '100',
        name: 'Bomberos',
        detail: 'Incendios en viviendas, comercios e industrias.',
      },
      {
        number: '103',
        name: 'Defensa Civil',
        detail: 'Asistencia ante inundaciones y otros desastres.',
      },
      {
        number: '105',
        name: 'Emergencia ambiental',
        detail: 'Avisos sobre posibles catástrofes ambientales.',
      },
      { number: '106', name: 'Prefectura Naval', detail: 'Emergencias en ríos, lagos y costas.' },
    ],
  },
  BR: {
    country: 'BR',
    name: 'Brasil',
    source:
      'https://www.gov.br/mcom/pt-br/noticias/2026/setembro/emergencia-voce-sabe-para-quem-ligar-quando-precisa-de-ajuda/',
    contacts: [
      {
        number: '190',
        name: 'Polícia Militar',
        detail: 'Emergencias policiales y seguridad pública.',
      },
      { number: '192', name: 'SAMU · Emergencias médicas', detail: 'Atención médica de urgencia.' },
      { number: '193', name: 'Corpo de Bombeiros', detail: 'Incendios, rescates y salvamentos.' },
      {
        number: '199',
        name: 'Defesa Civil',
        detail: 'Asistencia ante inundaciones y otros desastres.',
      },
      {
        number: '191',
        name: 'Polícia Rodoviária Federal',
        detail: 'Emergencias en rutas federales.',
      },
    ],
  },
  CL: {
    country: 'CL',
    name: 'Chile',
    source:
      'https://www.chile.gob.cl/chile/sobre-chile/informacion-turistica/condiciones-de-seguridad/condiciones-de-seguridad',
    contacts: [
      { number: '133', name: 'Carabineros', detail: 'Emergencias policiales y seguridad pública.' },
      { number: '131', name: 'SAMU · Emergencias médicas', detail: 'Atención médica de urgencia.' },
      { number: '132', name: 'Bomberos', detail: 'Incendios, rescates y salvamentos.' },
    ],
  },
  UY: {
    country: 'UY',
    name: 'Uruguay',
    source:
      'https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/documentos/publicaciones/GUIA%20DE%20RESPUESTA%20EN%20CASO%20DE%20EMERGENCIA%202016.pdf',
    contacts: [
      {
        number: '911',
        name: 'Central de emergencias',
        detail: 'Coordinación de policía, bomberos y asistencia médica.',
      },
      { number: '104', name: 'Bomberos', detail: 'Incendios, rescates y salvamentos.' },
      { number: '105', name: 'SAME · Emergencias médicas', detail: 'Atención médica de urgencia.' },
    ],
  },
};

export function emergencyDirectory(country: string | null): EmergencyDirectory | null {
  return country && Object.hasOwn(DIRECTORIES, country) ? DIRECTORIES[country] : null;
}
