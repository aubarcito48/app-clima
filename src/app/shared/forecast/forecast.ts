import { ChangeDetectionStrategy, Component, input, linkedSignal, signal } from '@angular/core';
import { computed } from '@angular/core';
import { ForecastInterval, WeatherPreview } from '../../models/weather-preview';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { TemperatureChart } from '../temperature-chart/temperature-chart';
@Component({
  selector: 'app-forecast',
  imports: [WeatherIcon, TemperatureChart],
  templateUrl: './forecast.html',
  styleUrl: './forecast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Forecast {
  readonly weather = input<WeatherPreview | null>(null);
  readonly unit = signal<'C' | 'F'>('C');
  temperature(value: number) {
    return this.unit() === 'C' ? value : Math.round(((value * 9) / 5 + 32) * 10) / 10;
  }
  private dateLabel(key: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat('es-AR', { ...options, timeZone: 'UTC' }).format(
      new Date(key + 'T12:00:00Z'),
    );
  }
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
        shortDay: this.dateLabel(day.key, { weekday: 'short' }),
        shortDate: this.dateLabel(day.key, { day: 'numeric', month: 'short' }),
        representative: [...day.intervals].sort((a, b) => {
          const distance = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            return Math.abs(hours * 60 + minutes - 720);
          };
          return distance(a.time) - distance(b.time);
        })[0],
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
