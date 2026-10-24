import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CityQuery } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-city-search',
  imports: [WeatherIcon],
  templateUrl: './city-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class CitySearch {
  readonly busy = input(false);
  readonly querySubmitted = output<CityQuery>();
  readonly city = signal('');
  readonly country = signal('');
  readonly examples = ['Córdoba', 'Buenos Aires', 'Mendoza'];
  submit(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.querySubmitted.emit({ city: this.city(), country: this.country() });
  }
  chooseExample(city: string): void {
    this.city.set(city);
    this.country.set('AR');
    this.querySubmitted.emit({ city, country: 'AR' });
  }
}
