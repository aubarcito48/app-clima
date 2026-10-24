import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-recommendation',
  imports: [WeatherIcon],
  templateUrl: './recommendation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Recommendation {
  readonly weather = input<WeatherPreview | null>(null);
}
