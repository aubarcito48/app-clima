import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { WeatherMusic } from '../weather-music/weather-music';

@Component({
  selector: 'app-weather-sidebar',
  imports: [WeatherMusic],
  templateUrl: './weather-sidebar.html',
  styleUrl: './weather-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherSidebar {
  readonly weather = input<WeatherPreview | null>(null);
}
