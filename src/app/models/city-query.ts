export interface CityQuery {
  city: string;
  country: string;
}

export interface CountryChoice {
  label: string;
  country: string;
}

// Estado de presentación. TK05 adaptará a este tipo los errores reales de Django.
export interface CitySearchFeedback {
  kind: 'ambiguous' | 'not-found' | 'demo-unavailable';
  message: string;
  choices?: readonly CountryChoice[];
}
