import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-current-weather',
  imports: [WeatherIcon],
  templateUrl: './current-weather.html',
  styleUrl: './current-weather.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class CurrentWeather {
  readonly weather = input<WeatherPreview | null>(null);
  readonly exampleRequested = output<void>();
}
