import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-forecast',
  imports: [WeatherIcon],
  templateUrl: './forecast.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Forecast {
  readonly weather = input<WeatherPreview | null>(null);
}
