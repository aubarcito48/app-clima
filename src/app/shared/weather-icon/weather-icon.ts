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
  | 'sunset'
  | 'heart'
  | 'menu'
  | 'alert'
  | 'phone'
  | 'play'
  | 'pause';
@Component({
  selector: 'app-weather-icon',
  templateUrl: './weather-icon.html',
  styleUrl: './weather-icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0 items-center justify-center' },
})
export class WeatherIcon {
  readonly animated = input(false);
  readonly paused = input(false);
  readonly filled = input(false);
  readonly name = input<IconName>('sun');
  readonly size = input(24);
}
