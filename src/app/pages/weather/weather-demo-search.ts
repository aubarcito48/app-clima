import { CitySearchFeedback } from '../../models/city-query';
import { WeatherPreview } from '../../models/weather-preview';
import { WEATHER_DEMOS } from './weather-demo';

type DemoSearchResult =
  { kind: 'ready'; weather: WeatherPreview } | { kind: 'feedback'; feedback: CitySearchFeedback };

// Transporte local de prueba: recibe los parámetros codificados y los decodifica.
// Las respuestas ambiguas/inexistentes simulan errores; no proceden de Django.
export function resolveWeatherDemo(searchParams: string): DemoSearchResult {
  const params = new URLSearchParams(searchParams);
  const city = params.get('ciudad') ?? '';
  const country = params.get('pais') ?? '';
  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  if (!country && collator.compare(city, 'Córdoba') === 0) {
    return {
      kind: 'feedback',
      feedback: {
        kind: 'ambiguous',
        message:
          'Hay más de una ciudad llamada Córdoba en este ejemplo. Indicá el país o elegí una opción para precisar la búsqueda.',
        choices: [
          { label: 'Córdoba, Argentina (AR)', country: 'AR' },
          { label: 'Córdoba, España (ES)', country: 'ES' },
        ],
      },
    };
  }
  if (collator.compare(city, 'Ciudad inexistente') === 0) {
    return {
      kind: 'feedback',
      feedback: {
        kind: 'not-found',
        message:
          'No encontramos esa ciudad en esta simulación. Revisá el nombre o agregá el país y volvé a buscar.',
      },
    };
  }
  const example = WEATHER_DEMOS.find((item) => collator.compare(item.city, city) === 0);
  if (example && ['', 'ar', 'argentina'].includes(country.toLowerCase())) {
    return { kind: 'ready', weather: example };
  }
  return {
    kind: 'feedback',
    feedback: {
      kind: 'demo-unavailable',
      message:
        'Esta demo tiene datos de Córdoba, Buenos Aires y Mendoza, en Argentina (AR). Tu entrada se conserva para que puedas corregirla. La búsqueda de otras ciudades estará disponible al conectar la API.',
    },
  };
}
