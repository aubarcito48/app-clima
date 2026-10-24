import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CityQuery, WeatherPreview } from '../../models/weather-preview';
import { CitySearch } from '../../shared/city-search/city-search';
import { CurrentWeather } from '../../shared/current-weather/current-weather';
import { Forecast } from '../../shared/forecast/forecast';
import { Recommendation } from '../../shared/recommendation/recommendation';
import { WeatherIcon } from '../../shared/weather-icon/weather-icon';
import { WeatherLoading } from '../../shared/weather-loading/weather-loading';
import { WEATHER_DEMOS } from './weather-demo';
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
  readonly message = signal('');
  readonly requestedCity = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }
  showExample(query: CityQuery = { city: 'Córdoba', country: 'AR' }): void {
    clearTimeout(this.timer);
    const collator = new Intl.Collator('es', { sensitivity: 'base' });
    const example = WEATHER_DEMOS.find(
      (item) => collator.compare(item.city, query.city.trim()) === 0,
    );
    const supportedCountry = ['', 'ar', 'argentina'].includes(query.country.trim().toLowerCase());
    this.weather.set(null);
    if (!example || !supportedCountry) {
      this.state.set('initial');
      this.message.set(
        'Esta demo tiene ejemplos de Córdoba, Buenos Aires y Mendoza, en Argentina (AR). Elegí uno para explorar la vista.',
      );
      return;
    }
    this.message.set('');
    this.requestedCity.set(example.city);
    this.state.set('loading');
    // Demora visual simulada: no se realiza ninguna solicitud de red.
    this.timer = setTimeout(() => {
      this.weather.set(example);
      this.state.set('ready');
    }, 1000);
  }
  reset(): void {
    clearTimeout(this.timer);
    this.weather.set(null);
    this.message.set('');
    this.state.set('initial');
  }
}
