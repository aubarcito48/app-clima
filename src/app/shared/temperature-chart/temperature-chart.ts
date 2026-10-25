import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ForecastInterval } from '../../models/weather-preview';

@Component({
  selector: 'app-temperature-chart',
  imports: [],
  templateUrl: './temperature-chart.html',
  styleUrl: './temperature-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChart {
  readonly intervals = input<readonly ForecastInterval[]>([]);
  readonly label = input('Evolución de la temperatura');
  readonly unit = input<'C' | 'F'>('C');
  readonly chart = computed(() => {
    const rows = this.intervals()
      .map((row) => ({
        ...row,
        temperature:
          this.unit() === 'C'
            ? row.temperature
            : Math.round(((row.temperature * 9) / 5 + 32) * 10) / 10,
      }))
      .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    if (!rows.length) return null;
    const values = rows.map((row) => row.temperature);
    const low = Math.floor(Math.min(...values) - 1);
    const high = Math.ceil(Math.max(...values) + 1);
    const start = Date.parse(rows[0].dateTime);
    const duration = Date.parse(rows[rows.length - 1].dateTime) - start;
    const points = rows.map((row) => ({
      ...row,
      x: duration ? 56 + ((Date.parse(row.dateTime) - start) / duration) * 608 : 360,
      y: 204 - ((row.temperature - low) / (high - low)) * 160,
    }));
    return {
      points,
      path: points.map((point) => `${point.x},${point.y}`).join(' '),
      ticks: Array.from({ length: 5 }, (_, index) => ({
        y: 204 - index * 40,
        value: Number((low + ((high - low) * index) / 4).toFixed(1)),
      })),
    };
  });
}
