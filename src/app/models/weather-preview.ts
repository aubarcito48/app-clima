// Modelo de presentación de TK03, independiente del futuro contrato de Django.
export type WeatherCondition = 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'moon';
export interface ForecastInterval {
  time: string;
  temperature: number;
  condition: WeatherCondition;
  description: string;
}
export interface WeatherPreview {
  city: string;
  country: string;
  dateLabel: string;
  updatedAt: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  condition: WeatherCondition;
  description: string;
  forecast: readonly ForecastInterval[];
  advice: { heading: string; text: string; tips: readonly string[] };
}
export interface CityQuery {
  city: string;
  country: string;
}
