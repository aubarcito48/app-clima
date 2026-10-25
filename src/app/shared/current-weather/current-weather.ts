import { Translate } from '../translate';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { displayTemperature, TemperatureUnit } from '../../models/temperature';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-current-weather',
  imports: [Translate, WeatherIcon],
  templateUrl: './current-weather.html',
  styleUrl: './current-weather.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class CurrentWeather {
  readonly motionPaused = signal(false);
  readonly canAnimate = computed(() =>
    ['sun', 'cloud-sun', 'cloud', 'rain', 'cloud-moon'].includes(this.weather()?.condition ?? ''),
  );
  readonly favorite = input(false);
  readonly favoriteToggled = output<void>();
  readonly unit = input<TemperatureUnit>('C');
  temperature(value: number) {
    return displayTemperature(value, this.unit());
  }
  readonly weather = input<WeatherPreview | null>(null);
  readonly searchRequested = output<void>();
}
