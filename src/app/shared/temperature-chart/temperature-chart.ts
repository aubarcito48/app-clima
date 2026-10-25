import { Translate } from '../translate';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ForecastInterval } from '../../models/weather-preview';
import { displayTemperature } from '../../models/temperature';

@Component({
  selector: 'app-temperature-chart',
  imports: [Translate],
  templateUrl: './temperature-chart.html',
  styleUrl: './temperature-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChart {
  readonly viewport = viewChild<ElementRef<HTMLElement>>('chartViewport');
  readonly width = signal(720);
  constructor() {
    afterRenderEffect((onCleanup) => {
      const element = this.viewport()?.nativeElement;
      if (!element) return;
      const measure = () => this.width.set(Math.max(480, element.clientWidth || 720));
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        onCleanup(() => observer.disconnect());
      }
    });
  }
  readonly intervals = input<readonly ForecastInterval[]>([]);
  readonly label = input('Evolución de la temperatura');
  readonly unit = input<'C' | 'F'>('C');
  readonly metric = signal<'temperature' | 'precipitation' | 'wind'>('temperature');
  // Recreate the SVG only when its data changes, never on container resize.
  readonly motionKey = computed(() => ({
    intervals: this.intervals(),
    label: this.label(),
    metric: this.metric(),
    unit: this.unit(),
  }));
  readonly metrics = [
    { key: 'temperature', label: 'Temperatura' },
    { key: 'precipitation', label: 'Precipitaciones' },
    { key: 'wind', label: 'Viento' },
  ] as const;
  readonly metricLabel = computed(() =>
    this.metric() === 'temperature'
      ? 'Temperatura'
      : this.metric() === 'precipitation'
        ? 'Probabilidad de lluvia'
        : 'Viento',
  );
  readonly metricUnit = computed(() =>
    this.metric() === 'temperature'
      ? '°' + this.unit()
      : this.metric() === 'precipitation'
        ? '%'
        : 'km/h',
  );
  readonly chart = computed(() => {
    const rows = this.intervals()
      .map((row) => ({
        ...row,
        temperature: displayTemperature(row.temperature, this.unit()),
      }))
      .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    if (!rows.length) return null;
    const samples = rows.map((row) => ({
      ...row,
      value:
        this.metric() === 'temperature'
          ? row.temperature
          : this.metric() === 'precipitation'
            ? (row.precipitation ?? null)
            : (row.wind ?? null),
    }));
    const values = samples.flatMap((row) => (row.value == null ? [] : [row.value]));
    const low =
      this.metric() === 'temperature' && values.length ? Math.floor(Math.min(...values) - 1) : 0;
    const high =
      this.metric() === 'precipitation'
        ? 100
        : this.metric() === 'wind'
          ? Math.max(1, Math.ceil(Math.max(0, ...values) + 1))
          : values.length
            ? Math.ceil(Math.max(...values) + 1)
            : 1;
    const start = Date.parse(rows[0].dateTime);
    const duration = Date.parse(rows[rows.length - 1].dateTime) - start;
    const timeline = samples.map((row) => ({
      ...row,
      x: duration
        ? 56 + ((Date.parse(row.dateTime) - start) / duration) * (this.width() - 88)
        : this.width() / 2,
    }));
    const points = timeline.flatMap((row) =>
      row.value == null
        ? []
        : [{ ...row, value: row.value, y: 134 - ((row.value - low) / (high - low)) * 104 }],
    );
    // Missing samples break the series rather than joining across unavailable intervals.
    const segments: string[] = [];
    let segment: string[] = [];
    for (const row of timeline) {
      if (row.value == null) {
        if (segment.length > 1) segments.push(segment.join(' '));
        segment = [];
      } else segment.push(`${row.x},${134 - ((row.value - low) / (high - low)) * 104}`);
    }
    if (segment.length > 1) segments.push(segment.join(' '));
    return {
      points,
      timeline,
      segments,
      available: values.length > 0,
      ticks: Array.from({ length: 5 }, (_, index) => ({
        y: 134 - index * 26,
        value: Number((low + ((high - low) * index) / 4).toFixed(1)),
      })),
    };
  });
}
