<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { WeatherPreview } from '../../../models/weather/weather-preview';
import WeatherIcon from '../weather-icon/weather-icon.vue';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ weather?: WeatherPreview | null }>(), { weather: null });
const weather = computed(() => props.weather);


</script>

<template>
<div data-component="app-weather-details"><section class="metrics-panel textured-card" :aria-label="(t('Detalles del clima'))">
  <h2 class="relative z-10 mb-3 font-display text-sm font-bold text-ink">
    {{ t('Tu clima de un vistazo') }}
  </h2>
  <div class="relative z-10 grid grid-cols-2 gap-x-4 gap-y-4">
    <div class="metric-card">
      <dl >
        <dt >
          <WeatherIcon name="drop" :size="22" /><span >{{ t('Humedad') }}</span>
        </dt>
        <dd >
          {{ ((weather?.humidity == null) ? (t('No disponible')) : (weather?.humidity + ' %')) }}
        </dd>
      </dl>
      <p >{{ t('Humedad relativa') }}</p>
    </div>
    <div class="metric-card">
      <dl >
        <dt >
          <WeatherIcon name="wind" :size="22" /><span >{{ t('Viento') }}</span>
        </dt>
        <dd >
          {{ ((weather?.wind == null) ? (t('No disponible')) : (weather?.wind + ' km/h')) }}
        </dd>
      </dl>
      <p >
        {{ t((weather?.windDirection?.label ?? 'Direcci\u00F3n no disponible')) }}{{ ((weather?.windDirection && (weather?.wind !== 0)) ? ((' (' + (t(weather?.windDirection?.abbreviation))) + ')') : '') }}
      </p>
    </div>
    <div class="metric-card">
      <dl >
        <dt >
          <WeatherIcon name="sunrise" :size="22" /><span >{{ t('Amanecer') }}</span>
        </dt>
        <dd >{{ (weather?.sunrise ?? (t('No disponible'))) }}</dd>
      </dl>
      <p >{{ t('Hora local de la ciudad') }}</p>
    </div>
    <div class="metric-card">
      <dl >
        <dt >
          <WeatherIcon name="sunset" :size="22" /><span >{{ t('Atardecer') }}</span>
        </dt>
        <dd >{{ (weather?.sunset ?? (t('No disponible'))) }}</dd>
      </dl>
      <p >{{ t('Hora local de la ciudad') }}</p>
    </div>
  </div>
</section>
</div>
</template>

<style scoped lang="scss">
[data-component="app-weather-details"] {
  display: block;
  min-width: 0;
  height: 100%;
}
.metrics-panel {
  padding: 1.25rem;
  height: 100%;
}
.metrics-panel > div {
  align-items: start;
  gap: 1.25rem 1rem;
}
.metric-card {
  min-width: 0;
  padding: 0.25rem 0;
}
.metric-card dt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-secondary);
}
.metric-card dt app-weather-icon {
  display: flex;
  color: var(--color-blue);
}
.metric-card dd {
  margin-top: 0.5rem;
  color: var(--color-ink);
  font-weight: 700;
  font-size: clamp(1.15rem, 1.7vw, 1.5rem);
  overflow-wrap: anywhere;
}
.metric-card p {
  margin-top: 0.4rem;
  color: var(--color-muted);
  font-size: 0.75rem;
  line-height: 1.7;
}

</style>
