export interface CityQuery {
  city: string;
  country: string;
  region?: string;
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
    | 'rate-limited';
  message: string;
  retryable?: boolean;
  field?: 'city' | 'country' | 'region';
  choices?: readonly CountryChoice[];
}
