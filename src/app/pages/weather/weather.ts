import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CityQuery, CitySearchFeedback } from '../../models/city-query';
import { WeatherPreview } from '../../models/weather-preview';
import { CitySearch } from '../../shared/city-search/city-search';
import { CurrentWeather } from '../../shared/current-weather/current-weather';
import { Forecast } from '../../shared/forecast/forecast';
import { Recommendation } from '../../shared/recommendation/recommendation';
import { WeatherIcon } from '../../shared/weather-icon/weather-icon';
import { WeatherLoading } from '../../shared/weather-loading/weather-loading';
import { normalizeCityQuery, serializeCityQuery } from '../../shared/city-search/city-query';
import { resolveWeatherDemo } from './weather-demo-search';
@Component({
  selector: 'app-weather',
  imports: [CitySearch, CurrentWeather, Forecast, Recommendation, WeatherIcon, WeatherLoading],
  templateUrl: './weather.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Weather {
  readonly state = signal<'initial' | 'loading' | 'ready'>('initial');
  readonly weather = signal<WeatherPreview | null>(null);
  readonly feedback = signal<CitySearchFeedback | null>(null);
  readonly requestedCity = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }
  showExample(query: CityQuery = { city: 'Córdoba', country: 'AR' }): void {
    const normalized = normalizeCityQuery(query);
    // Defensa adicional: ni siquiera el transporte simulado recibe una ciudad vacía.
    if (!normalized.city) return;
    clearTimeout(this.timer);
    this.weather.set(null);
    this.feedback.set(null);
    this.requestedCity.set(normalized.city);
    this.state.set('loading');
    // Demora visual simulada: no se realiza ninguna solicitud de red.
    this.timer = setTimeout(() => {
      const result = resolveWeatherDemo(serializeCityQuery(normalized));
      if (result.kind === 'ready') {
        this.weather.set(result.weather);
        this.state.set('ready');
      } else {
        this.feedback.set(result.feedback);
        this.state.set('initial');
      }
    }, 1000);
  }
  reset(): void {
    clearTimeout(this.timer);
    this.weather.set(null);
    this.feedback.set(null);
    this.state.set('initial');
  }
}
