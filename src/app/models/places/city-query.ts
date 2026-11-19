export interface CityQuery {
  city: string;
  country: string;
  region?: string;
}
export interface CoordinatesQuery {
  latitude: number;
  longitude: number;
}
export type WeatherQuery = CityQuery | CoordinatesQuery;

export interface PlaceSuggestion {
  id: number;
  name: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
}

export interface CountryChoice {
  label: string;
  country: string;
  city?: string;
  region?: string;
  id?: string;
}

// Estado de presentación adaptado a los errores públicos de Django.
export interface CitySearchFeedback {
  kind:
    | 'ambiguous'
    | 'not-found'
    | 'invalid'
    | 'unavailable'
    | 'connection'
    | 'timeout'
    | 'rate-limited'
    | 'location';
  message: string;
  retryable?: boolean;
  field?: 'city' | 'country' | 'region';
  choices?: readonly CountryChoice[];
}
