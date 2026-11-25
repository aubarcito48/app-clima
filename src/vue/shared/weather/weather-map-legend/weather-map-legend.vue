<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { MAP_LAYERS, WeatherLayer } from '../weather-map/map-layers';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ layer: WeatherLayer }>(), {  });
const layer = computed(() => props.layer);
const layers = MAP_LAYERS;


</script>

<template>
<div data-component="app-weather-map-legend"><section class="rounded-app border border-line bg-surface p-4 sm:p-5" aria-labelledby="map-guide-heading">
  <h2 id="map-guide-heading" class="font-display text-lg font-bold text-ink">
    {{ t('C\u00F3mo leer el mapa') }}
  </h2>
  <template v-for="legend in [layers[layer]]">
  <div class="map-legend mt-3">
    <div class="legend-heading">
      <strong >{{ t(legend.label) }} · {{ legend.unit }}</strong><span >OpenWeather</span>
    </div>
    <div class="legend-gradient" aria-hidden="true" :style="{ 'background': legend.gradient }"></div>
    <div class="legend-ticks">
      <template v-for="(tick, index) in legend.ticks" :key="tick.value">
        <span :style="{ 'left': (tick.position) + '%' }">{{ tick.value }}</span>
      </template></div>
    <p >
      {{ t('Escala orientativa. Los colores representan condiciones regionales, incluso al acercar a un barrio.') }}
    </p>
  </div>
  <p class="mt-3 text-xs leading-6 text-secondary">
    {{ t('Arrastr\u00E1 para explorar y toc\u00E1 un punto para consultar su clima. Us\u00E1 + o \u2212 para acercar o alejar.') }}
  </p>
  <p class="mt-2 text-xs leading-6 text-muted">
    {{ t('Vista regional orientativa; no reemplaza los avisos meteorol\u00F3gicos oficiales.') }}
  </p>
</template></section>
</div>
</template>

<style scoped lang="scss">
[data-component="app-weather-map-legend"] {
  display: block;
  min-width: 0;
}
.map-legend {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-ink);
}
.legend-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}
.legend-heading h3 {
  margin: 0;
  font-weight: 600;
}
.legend-gradient {
  height: 0.75rem;
  margin-top: 0.75rem;
  border-radius: 0.25rem;
}
.legend-ticks {
  position: relative;
  height: 1.75rem;
  margin: 0.25rem 1rem 0;
  font-size: 0.65rem;
}
.legend-ticks span {
  position: absolute;
  transform: translateX(-50%);
}
.map-legend p {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-secondary);
}

</style>
