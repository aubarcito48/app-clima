import { WeatherPreview } from '../../../models/weather/weather-preview';
import { Translate } from '../../preferences/translate';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-weather-details',
  imports: [Translate, WeatherIcon],
  templateUrl: './weather-details.html',
  styleUrl: './weather-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherDetails {
  readonly weather = input<WeatherPreview | null>(null);
}
