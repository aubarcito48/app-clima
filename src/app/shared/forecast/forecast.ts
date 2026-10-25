import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { computed } from '@angular/core';
import { ForecastInterval, WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
@Component({
  selector: 'app-forecast',
  imports: [WeatherIcon],
  templateUrl: './forecast.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Forecast {
  readonly weather = input<WeatherPreview | null>(null);
  readonly days = computed(() => {
    const groups = new Map<string, { key: string; label: string; intervals: ForecastInterval[] }>();
    for (const interval of this.weather()?.forecast ?? []) {
      let day = groups.get(interval.dayKey);
      if (!day) {
        day = { key: interval.dayKey, label: interval.dayLabel, intervals: [] };
        groups.set(interval.dayKey, day);
      }
      day.intervals.push(interval);
    }
    return [...groups.values()];
  });
}
