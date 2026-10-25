import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WeatherIcon } from '../weather-icon/weather-icon';

@Component({
  selector: 'app-weather-sidebar',
  imports: [WeatherIcon],
  templateUrl: './weather-sidebar.html',
  styleUrl: './weather-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherSidebar {}
