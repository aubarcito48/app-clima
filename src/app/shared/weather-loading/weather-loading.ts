import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'app-weather-loading',
  templateUrl: './weather-loading.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class WeatherLoading {}
