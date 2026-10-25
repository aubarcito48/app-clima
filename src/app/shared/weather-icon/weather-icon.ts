import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WeatherCondition } from '../../models/weather-preview';
export type IconName =
  | WeatherCondition
  | 'search'
  | 'pin'
  | 'wind'
  | 'drop'
  | 'sparkles'
  | 'arrow'
  | 'check'
  | 'close'
  | 'sunrise'
  | 'sunset';
@Component({
  selector: 'app-weather-icon',
  templateUrl: './weather-icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0 items-center justify-center' },
})
export class WeatherIcon {
  readonly name = input<IconName>('sun');
  readonly size = input(24);
}
