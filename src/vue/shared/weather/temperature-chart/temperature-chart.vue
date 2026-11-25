<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { ForecastInterval } from '../../../models/weather/weather-preview';
import { displayTemperature } from '../../../models/weather/temperature';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ intervals?: readonly ForecastInterval[]; label?: string; unit?: 'C' | 'F' }>(), { intervals: () => [], label: 'Evolución de la temperatura', unit: 'C' });
const viewportElements = useTemplateRef<HTMLElement | HTMLElement[]>('chartViewport');
const viewport = computed(() => Array.isArray(viewportElements.value) ? viewportElements.value[0] : viewportElements.value);
const width = ref(720);
const intervals = computed(() => props.intervals);
const label = computed(() => props.label);
const unit = computed(() => props.unit);
const metric = ref<'temperature' | 'precipitation' | 'wind'>('temperature');
const motionKey = computed(() => ({
    intervals: intervals.value,
    label: label.value,
    metric: metric.value,
    unit: unit.value,
}));
const metrics = [
    { key: 'temperature', label: 'Temperatura' },
    { key: 'precipitation', label: 'Precipitaciones' },
    { key: 'wind', label: 'Viento' },
] as const;
const metricLabel = computed(() => metric.value === 'temperature'
    ? 'Temperatura'
    : metric.value === 'precipitation'
        ? 'Probabilidad de lluvia'
        : 'Viento');
const metricUnit = computed(() => metric.value === 'temperature'
    ? '°' + unit.value
    : metric.value === 'precipitation'
        ? '%'
        : 'km/h');
const chart = computed(() => {
    const rows = intervals.value.map((row) => ({
        ...row,
        temperature: displayTemperature(row.temperature, unit.value),
    }))
        .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    if (!rows.length)
        return null;
    const samples = rows.map((row) => ({
        ...row,
        value: metric.value === 'temperature'
            ? row.temperature
            : metric.value === 'precipitation'
                ? (row.precipitation ?? null)
                : (row.wind ?? null),
    }));
    const values = samples.flatMap((row) => (row.value == null ? [] : [row.value]));
    const low = metric.value === 'temperature' && values.length ? Math.floor(Math.min(...values) - 1) : 0;
    const high = metric.value === 'precipitation'
        ? 100
        : metric.value === 'wind'
            ? Math.max(1, Math.ceil(Math.max(0, ...values) + 1))
            : values.length
                ? Math.ceil(Math.max(...values) + 1)
                : 1;
    const start = Date.parse(rows[0].dateTime);
    const duration = Date.parse(rows[rows.length - 1].dateTime) - start;
    const timeline = samples.map((row) => ({
        ...row,
        x: duration
            ? 56 + ((Date.parse(row.dateTime) - start) / duration) * (width.value - 88)
            : width.value / 2,
    }));
    const points = timeline.flatMap((row) => row.value == null
        ? []
        : [{ ...row, value: row.value, y: 134 - ((row.value - low) / (high - low)) * 104 }]);
    // Missing samples break the series rather than joining across unavailable intervals.
    const segments: string[] = [];
    let segment: string[] = [];
    for (const row of timeline) {
        if (row.value == null) {
            if (segment.length > 1)
                segments.push(segment.join(' '));
            segment = [];
        }
        else
            segment.push(`${row.x},${134 - ((row.value - low) / (high - low)) * 104}`);
    }
    if (segment.length > 1)
        segments.push(segment.join(' '));
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
watchPostEffect((onCleanup) => {
    const element = viewport.value;
    if (!element)
        return;
    const measure = () => width.value = Math.max(480, element.clientWidth || 720);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        onCleanup(() => observer.disconnect());
    }
});


</script>

<template>
<div data-component="app-temperature-chart"><template v-if="chart"><template v-for="graph in [chart]">
  <figure class="rounded-app border border-line bg-surface p-3 sm:p-4">
    <figcaption class="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
      <span >{{ t(label) }}<span class="ml-2 text-xs font-normal text-muted">{{ t(metricLabel) }} ({{ metricUnit }})</span></span>
      <span role="group" class="flex flex-wrap gap-1" :aria-label="t('Variable del gr\u00E1fico')">
        <template v-for="(option, index) in metrics" :key="option.key">
          <button type="button" class="min-h-11 border-b-2 px-3 text-xs font-semibold text-blue hover:bg-sky" :class="((metric === option.key) ? 'border-blue' : 'border-transparent')" :aria-pressed="(metric === option.key)" @click="metric = option.key">
            {{ t(option.label) }}
          </button>
        </template></span>
    </figcaption>
    <template v-if="graph.available">
      <div class="overflow-x-auto" tabindex="0" role="region" :aria-label="t('Gr\u00E1fico de {metric}; desplazable horizontalmente', { 'metric': (t(metricLabel)) })" ref="chartViewport">
        <template v-for="(key, index) in [motionKey]" :key="JSON.stringify(key)">
          <svg class="chart-motion block h-40 w-full min-w-120 sm:h-44" role="img" :viewBox="(('0 0 ' + width) + ' 180')" :aria-label="t('{label}. {metric} en {unit}. Valores exactos disponibles en la tabla del gr\u00E1fico.', { 'label': (t(label)), 'metric': (t(metricLabel)), 'unit': metricUnit })">
            <template v-for="(tick, index) in graph.ticks" :key="tick.y">
              <line x1="56" stroke="var(--color-line)" :x2="(width - 32)" :y1="tick.y" :y2="tick.y" />
              <text x="44" text-anchor="end" fill="var(--color-secondary)" font-size="12" :y="(tick.y + 4)">
                {{ tick.value }}
              </text>
            </template><template v-for="(segment, index) in graph.segments" :key="index">
              <polyline pathLength="100" fill="none" stroke="var(--color-blue)" stroke-width="3" stroke-linejoin="round" :points="segment" />
            </template><template v-for="(point, index) in graph.points" :key="point.dateTime">
              <circle r="5" fill="var(--color-blue)" stroke="var(--color-surface)" stroke-width="2" :cx="point.x" :cy="point.y">
                <title >
                  {{ point.time }} h: {{ point.value }} {{ metricUnit }}{{ ((metric === 'wind') ? (', ' + (t((point.windDirection?.label ?? 'direcci\u00F3n no disponible')))) : '') }}
                </title>
              </circle>
              <text fill="var(--color-ink)" font-size="13" font-weight="600" :x="point.x" :y="(point.y - 14)" :text-anchor="(index === 0 ? 'start' : (index === graph.points.length - 1 ? 'end' : 'middle'))">
                {{ point.value }}{{ ((metric === 'temperature') ? '\u00B0' : ((metric === 'precipitation') ? '%' : '')) }}
                {{ t((((metric === 'wind') ? ((point.windDirection?.abbreviation ?? '')) : ''))) }}
              </text>
            </template><template v-for="(point, index) in graph.timeline" :key="point.dateTime">
              <text y="164" text-anchor="middle" fill="var(--color-secondary)" font-size="12" :x="point.x">
                {{ point.time }}
              </text>
            </template></svg>
        </template></div>
    </template><template v-else>
      <p class="flex h-40 items-center justify-center text-sm text-secondary sm:h-44" aria-live="polite">
        {{ t(metricLabel) }} {{ t('no disponible para este d\u00EDa.') }}
      </p>
    </template><table class="sr-only">
      <caption >
        {{ t(metricLabel) }}
        {{ t('del d\u00EDa elegido') }}
      </caption>
      <thead >
        <tr >
          <th scope="col">{{ t('Hora local') }}</th>
          <th scope="col">{{ t(metricLabel) }} ({{ metricUnit }})</th>
        </tr>
      </thead>
      <tbody >
        <template v-for="(point, index) in graph.timeline" :key="point.dateTime">
          <tr >
            <th scope="row">{{ point.time }} h</th>
            <td >
              {{ ((point.value == null) ? (t('No disponible')) : ((point.value + ' ') + metricUnit)) }}{{ ((metric === 'wind') ? (', ' + (t((point.windDirection?.label ?? 'direcci\u00F3n no disponible')))) : '') }}
            </td>
          </tr>
        </template></tbody>
    </table>
    <p class="mt-1 text-xs leading-5 text-muted">
      {{ t('Hora local de la ciudad.') }}
      {{ ((metric === 'precipitation') ? (t('Probabilidad de lluvia, no cantidad acumulada.')) : (t('Cada punto es un intervalo recibido.'))) }}
      {{ t('Los datos ausentes interrumpen la l\u00EDnea.') }}
    </p>
  </figure>
</template></template></div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .chart-motion {
    animation: chart-reveal 180ms ease-out;
  }
  .chart-motion polyline {
    stroke-dasharray: 100;
    animation: chart-draw 450ms ease-out;
  }
}

</style>
