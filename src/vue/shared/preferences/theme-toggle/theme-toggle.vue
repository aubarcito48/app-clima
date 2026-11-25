<script setup lang="ts">
import { useColorTheme } from '../../../service/preferences/color-theme';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
import { useLanguage } from '../../../service/preferences/language';

const t = useLanguage().text;
const theme = useColorTheme();
</script>

<template>
  <div data-component="app-theme-toggle">
    <button
      type="button"
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-control border border-control-line bg-surface px-2.5 text-xs font-semibold text-blue hover:bg-sky"
      :aria-label="theme.mode.value === 'dark' ? t('Activar modo claro') : t('Activar modo oscuro')"
      :title="theme.mode.value === 'dark' ? t('Activar modo claro') : t('Activar modo oscuro')"
      @click="theme.toggle($event)"
    >
      <WeatherIcon :name="theme.mode.value === 'dark' ? 'moon' : 'sun'" :size="18" />
      <span class="whitespace-nowrap">{{
        theme.mode.value === 'dark' ? t('Modo oscuro') : t('Modo claro')
      }}</span>
    </button>
  </div>
</template>

<style scoped>
[data-component='app-theme-toggle'] {
  display: block;
  min-width: 0;
}
button {
  width: 100%;
  min-width: 0;
  padding-inline: 6px;
  white-space: nowrap;
}
</style>
