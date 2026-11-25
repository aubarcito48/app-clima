import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MAP_LAYERS, WeatherLayer } from '../weather-map/map-layers';
import { Translate } from '../../preferences/translate';

@Component({
  selector: 'app-weather-map-legend',
  imports: [Translate],
  templateUrl: './weather-map-legend.html',
  styleUrl: './weather-map-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherMapLegend {
  readonly layer = input.required<WeatherLayer>();
  readonly layers = MAP_LAYERS;
}
