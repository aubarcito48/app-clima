import { Translate } from '../translate';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ColorTheme } from '../../service/color-theme';
import { WeatherIcon } from '../weather-icon/weather-icon';

@Component({
  selector: 'app-theme-toggle',
  imports: [Translate, WeatherIcon],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  readonly theme = inject(ColorTheme);
}
