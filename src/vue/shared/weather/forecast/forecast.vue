<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { displayTemperature, TemperatureUnit } from '../../../models/weather/temperature';
import { ForecastInterval, WeatherPreview } from '../../../models/weather/weather-preview';
import WeatherIcon from '../weather-icon/weather-icon.vue';
import TemperatureChart from '../temperature-chart/temperature-chart.vue';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ weather?: WeatherPreview | null }>(), { weather: null });
const language = useLanguage();
const weather = computed(() => props.weather);
const unit = defineModel<TemperatureUnit>('unit', { default: 'C' });
function temperature(value: number) {
    return displayTemperature(value, unit.value);
}
function dateLabel(key: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(language.locale.value, { ...options, timeZone: 'UTC' }).format(new Date(key + 'T12:00:00Z'));
}
const days = computed(() => {
    const groups = new Map<string, {
        key: string;
        label: string;
        intervals: ForecastInterval[];
    }>();
    for (const interval of weather.value?.forecast ?? []) {
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
        shortDay: dateLabel(day.key, { weekday: 'short' }),
        shortDate: dateLabel(day.key, { day: 'numeric', month: 'short' }),
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
const selectedDay = resettableRef(() => {
    weather.value;
    return days.value[0]?.key ?? '';
});
const activeDay = computed(() => days.value.find((day) => day.key === selectedDay.value) ?? null);
const showAll = resettableRef(() => {
    weather.value;
    return false;
});
const visibleDays = computed(() => showAll.value ? days.value : activeDay.value ? [activeDay.value!] : []);

defineExpose({ temperature });
</script>

<template>
<div data-component="app-forecast" class="block min-w-0"><section id="evolucion" class="min-w-0 scroll-mt-6" aria-labelledby="forecast-heading">
  <template v-if="activeDay"><template v-for="day in [activeDay]">
    <TemperatureChart class="mb-6 block min-w-0" :intervals="day.intervals" :unit="unit" :label="t('Evoluci\u00F3n del {day}', { 'day': day.label })" />
  </template></template><template v-if="weather"><template v-for="data in [weather]">
    <section aria-labelledby="daily-heading">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="daily-heading" class="font-display text-lg font-bold text-ink">
          {{ t('Pron\u00F3stico de los pr\u00F3ximos d\u00EDas') }}
        </h2>
        <label class="sr-only" for="forecast-unit">{{ t('Unidad de temperatura') }}</label>
        <select id="forecast-unit" class="min-h-11 rounded-control border border-control-line bg-surface px-3 text-xs font-semibold text-blue" :value="unit" @change="unit = ((($event.target as HTMLSelectElement).value === 'F') ? 'F' : 'C')" ref="unitSelect">
          <option value="C">°C</option>
          <option value="F">°F</option>
        </select>
      </div>
      <p class="mt-1 text-xs leading-6 text-muted">
        {{ t('Planific\u00E1 tus aventuras. Eleg\u00ED una fecha para ver sus horas.') }}
      </p>
      <template v-if="days.length">
        <div class="day-strip mt-4" role="group" tabindex="0" :aria-label="t('Elegir un d\u00EDa del pron\u00F3stico, desplazables horizontalmente')">
          <template v-for="(day, index) in days" :key="day.key">
            <button type="button" class="day-choice forecast-day" :aria-pressed="(selectedDay === day.key)" :aria-label="t('{day}, rango de {low} a {high} grados {unit}', { 'day': day.label, 'low': temperature(day.low), 'high': temperature(day.high), 'unit': unit })" @focus="($event.currentTarget as HTMLButtonElement).scrollIntoView({ 'block': 'nearest', 'inline': 'nearest' })" @click="selectedDay = day.key;
showAll = false" ref="dayButton">
              <span class="min-w-0 text-center"><span class="block text-sm font-bold text-ink">{{ day.shortDay }}</span><span class="mt-1 block text-[10px] text-muted">{{ day.shortDate }}</span></span>
              <template v-if="day.representative.condition"><template v-for="condition in [day.representative.condition]">
                <WeatherIcon class="text-blue" :name="condition" :size="30" />
              </template></template><template v-else>
                <span aria-hidden="true"></span>
              </template><span class="min-w-0 text-center text-[11px] leading-5 text-secondary" :title="t('Intervalo de las {time} h', { 'time': day.representative.time })">{{ (day.representative.description ?? (t('Descripci\u00F3n no disponible'))) }}</span>
              <span class="day-temperatures text-sm">
                <span class="font-bold text-ink">
                  <span class="block text-[10px] font-normal text-secondary" aria-hidden="true">{{ t('M\u00E1x.') }}</span>
                  <span class="sr-only">{{ t('Mayor temperatura de intervalos:') }} </span>{{ temperature(day.high) }}°
                </span>
                <span class="text-muted">
                  <span class="block text-[10px]" aria-hidden="true">{{ t('M\u00EDn.') }}</span>
                  <span class="sr-only">{{ t('Menor temperatura de intervalos:') }} </span>{{ temperature(day.low) }}°
                </span>
              </span>
            </button>
          </template></div>
        <p class="mt-3 text-xs leading-6 text-muted">
          {{ t('Rangos de los intervalos recibidos, con fechas que pueden estar incompletas. No son extremos diarios completos. No son promedios diarios. La condici\u00F3n mostrada corresponde al intervalo m\u00E1s cercano al mediod\u00EDa.') }}
        </p>
      </template><template v-else>
        <p class="mt-4 text-sm text-secondary">
          {{ t('Pron\u00F3stico no disponible por el momento.') }}
        </p>
      </template></section>
    <section class="mt-7" aria-labelledby="forecast-heading">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 id="forecast-heading" class="font-display text-lg font-bold text-ink">
          {{ t('Pron\u00F3stico por hora') }}
        </h2>
        <template v-if="days.length">
          <button type="button" class="min-h-11 rounded-control px-2 text-xs font-semibold text-blue hover:bg-surface" aria-controls="hourly-intervals" :aria-expanded="showAll" :aria-label="(showAll ? (t('Ver solo el d\u00EDa elegido')) : (t('Ver todos los intervalos')))" @click="showAll = !(showAll)">
            {{ (showAll ? (t('Ver d\u00EDa elegido')) : (t('Ver completo'))) }}
            <span aria-hidden="true">→</span>
          </button>
        </template></div>
      <p class="mt-1 text-xs leading-6 text-muted">
        {{ t('Pr\u00F3ximos intervalos del d\u00EDa elegido. Hora local de la ciudad.') }}
      </p>
      <p class="mt-1 text-xs leading-6 text-secondary">
        {{ data.city }} ({{ data.timezoneLabel }}{{ t('). Fuente:') }} {{ data.source }}{{ t('. Intervalos de tres horas seg\u00FAn disponibilidad.') }}
      </p>
      <div id="hourly-intervals">
        <template v-for="(day, index) in visibleDays" :key="day.key">
          <section class="mt-3" :aria-labelledby="('forecast-day-' + day.key)">
            <h3 :id="('forecast-day-' + day.key)" :class="(showAll ? 'mb-2 text-xs font-semibold text-secondary' : 'sr-only')">
              {{ day.label }}
            </h3>
            <div class="hour-strip" tabindex="0" role="region" :aria-label="t('Horas del {day}, desplazables horizontalmente', { 'day': day.label })">
              <template v-if="(day.key === data.observedDayKey)">
                <div class="hour-card" :aria-label="t('Clima actual')">
                  <span class="text-xs font-semibold text-secondary">{{ t('Ahora') }}</span>
                  <template v-if="data.condition"><template v-for="condition in [data.condition]">
                    <WeatherIcon class="my-1 text-blue" :name="condition" :size="30" />
                  </template></template><p class="text-lg font-semibold text-ink">
                    {{ temperature(data.temperature) }}<span class="ml-0.5 text-xs font-normal">°{{ unit }}</span>
                  </p>
                  <p class="text-center text-[11px] leading-5 text-muted">
                    {{ (data.description ?? (t('Descripci\u00F3n no disponible'))) }}
                  </p>
                </div>
              </template><ol class="flex shrink-0 gap-3" :aria-label="t('Intervalos de pron\u00F3stico del {day}', { 'day': day.label })">
                <template v-for="(interval, index) in day.intervals" :key="interval.dateTime">
                  <li class="hour-card">
                    <time class="text-xs font-semibold text-secondary" :datetime="interval.dateTime">{{ interval.time }} h</time>
                    <template v-if="interval.condition"><template v-for="condition in [interval.condition]">
                      <WeatherIcon class="my-1 text-blue" :name="condition" :size="30" />
                    </template></template><p class="text-lg font-semibold text-ink">
                      {{ temperature(interval.temperature) }}<span class="ml-0.5 text-xs font-normal">°{{ unit }}</span>
                    </p>
                    <p class="text-center text-[11px] leading-5 text-muted">
                      {{ (interval.description ?? (t('Descripci\u00F3n no disponible'))) }}
                    </p>
                    <template v-if="(interval.precipitation != null)">
                      <p class="text-center text-[11px] text-secondary">
                        {{ t('Lluvia:') }} {{ interval.precipitation }} %
                      </p>
                    </template></li>
                </template></ol>
            </div>
          </section>
        </template></div>
    </section>
  </template></template><template v-else>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h2 id="forecast-heading" class="font-display text-lg font-bold text-ink">
        {{ t('Pron\u00F3stico por hora') }}
      </h2>
      <template v-if="days.length">
        <button type="button" class="min-h-11 rounded-control px-2 text-xs font-semibold text-blue hover:bg-surface" aria-controls="hourly-intervals" :aria-expanded="showAll" :aria-label="(showAll ? (t('Ver solo el d\u00EDa elegido')) : (t('Ver todos los intervalos')))" @click="showAll = !(showAll)">
          {{ (showAll ? (t('Ver d\u00EDa elegido')) : (t('Ver completo'))) }}
          <span aria-hidden="true">→</span>
        </button>
      </template></div>
    <p class="mt-1 text-xs leading-6 text-muted">
      {{ t('Pr\u00F3ximos intervalos del d\u00EDa elegido. Hora local de la ciudad.') }}
    </p>
    <div class="mt-4 rounded-app border border-line bg-surface px-6 py-10 text-center">
      <WeatherIcon name="cloud-sun" class="text-blue" :size="32" />
      <p class="mt-3 text-sm font-semibold text-secondary">
        {{ t('Un vistazo a lo que viene.') }}
      </p>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ t('Eleg\u00ED una ciudad para ver sus pr\u00F3ximas horas, los d\u00EDas y la evoluci\u00F3n de la temperatura.') }}
      </p>
    </div>
  </template></section>
</div>
</template>

<style scoped>
[data-component="app-forecast"] {
  display: block;
  min-width: 0;
}
.hour-strip {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0.25rem 0.125rem 0.75rem;
}
.hour-card {
  display: flex;
  flex: 0 0 6.25rem;
  min-width: 0;
  min-height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: var(--radius-app);
  background: var(--color-surface);
  border: 1px solid transparent;
  padding: 1rem 0.65rem;
}
.hour-strip > .hour-card {
  border-color: var(--color-selected-line);
  background: var(--color-selected);
}
.day-strip {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-padding: 0.5rem;
  padding: 0.5rem 0.5rem 0.75rem;
}
.forecast-day {
  position: relative;
  display: flex;
  flex: 0 0 7.75rem;
  min-width: 0;
  min-height: 12rem;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-surface);
  padding: 1rem 0.65rem;
  text-align: center;
}
.forecast-day[aria-pressed='true'] {
  border-color: var(--color-selected-line);
  background: var(--color-selected);
}
.forecast-day:hover:not([aria-pressed='true']) {
  background: var(--color-hover);
  border-color: var(--color-blue);
}
.day-temperatures {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

</style>
