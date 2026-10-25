// Modelo de presentación adaptado al contrato de Django, sin valores de reemplazo.
export type WeatherCondition = 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'moon';
export interface ForecastInterval {
  dateTime: string;
  dayKey: string;
  dayLabel: string;
  time: string;
  temperature: number;
  condition: WeatherCondition | null;
  description: string | null;
}
export interface WeatherPreview {
  city: string;
  country: string;
  dateLabel: string;
  updatedAt: string;
  observedAtUtc: string;
  observedTime: string;
  updatedAtUtc: string;
  timezoneLabel: string;
  source: string;
  temperature: number;
  feelsLike: number | null;
  humidity: number | null;
  wind: number | null;
  condition: WeatherCondition | null;
  description: string | null;
  forecast: readonly ForecastInterval[];
  advice: { text: string } | null;
}
