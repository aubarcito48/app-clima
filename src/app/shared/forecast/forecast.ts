import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import { computed } from '@angular/core';
import { ForecastInterval, WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { TemperatureChart } from '../temperature-chart/temperature-chart';
@Component({
  selector: 'app-forecast',
  imports: [WeatherIcon, TemperatureChart],
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
    return [...groups.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((day) => ({
        ...day,
        low: Math.min(...day.intervals.map((row) => row.temperature)),
        high: Math.max(...day.intervals.map((row) => row.temperature)),
        intervals: day.intervals.sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime)),
      }));
  });
  readonly selectedDay = linkedSignal(() => {
    this.weather();
    return this.days()[0]?.key ?? '';
  });
  readonly activeDay = computed(
    () => this.days().find((day) => day.key === this.selectedDay()) ?? null,
  );
  readonly showAll = linkedSignal(() => {
    this.weather();
    return false;
  });
  readonly visibleDays = computed(() =>
    this.showAll() ? this.days() : this.activeDay() ? [this.activeDay()!] : [],
  );
}
