import { computed, ref, watch, onUnmounted } from 'vue';
import { currentLocation, LocationFailure } from './useCurrentLocation';
import { useLanguage } from '../service/preferences/language';
import type { ClimateResponse } from '../models/weather/climate-response';
import type { WeatherQuery, CitySearchFeedback } from '../models/places/city-query';
import { normalizeCityQuery, serializeWeatherQuery } from '../shared/places/city-search/city-query';
import { searchClimate } from '../api/climate';
import { climateFeedback, climatePresentation } from '../service/weather/climate-presentation';

export function useWeather() {
  const language = useLanguage();
  const response = ref<ClimateResponse | null>(null);
  const state = ref<'initial' | 'loading' | 'ready'>('initial');
  const feedback = ref<CitySearchFeedback | null>(null);
  const requestedCity = ref('');
  const cancelled = ref(false);
  const locating = ref(false);
  const temperatureUnit = ref<'C' | 'F'>('C');
  const weather = computed(() =>
    response.value ? climatePresentation(response.value, language.locale.value) : null,
  );
  let controller: AbortController | null = null;
  let lastQuery: WeatherQuery | null = null;
  let activeKey = '';
  let generation = 0;

  function editQuery() {
    generation++;
    controller?.abort();
    controller = null;
    activeKey = '';
    lastQuery = null;
    response.value = null;
    feedback.value = null;
    state.value = 'initial';
    cancelled.value = false;
    locating.value = false;
  }
  function reset() {
    const loading = state.value === 'loading';
    editQuery();
    cancelled.value = loading;
  }
  async function search(query: WeatherQuery) {
    const normalized = 'city' in query ? normalizeCityQuery(query) : query;
    if ('city' in normalized && !normalized.city) return;
    const key = `${serializeWeatherQuery(normalized)}:${language.code.value}`;
    if (state.value === 'loading' && activeKey === key) return;
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    const signal = controller.signal;
    lastQuery = { ...normalized };
    activeKey = key;
    locating.value = false;
    cancelled.value = false;
    response.value = null;
    feedback.value = null;
    requestedCity.value = 'city' in normalized ? normalized.city : 'tu ubicación actual';
    state.value = 'loading';
    try {
      const data = await searchClimate(normalized, language.code.value, signal);
      if (current !== generation || signal.aborted) return;
      response.value = data;
      state.value = 'ready';
    } catch (error) {
      if (current !== generation || signal.aborted) return;
      feedback.value = climateFeedback(error);
      state.value = 'initial';
    } finally {
      if (current === generation) activeKey = '';
    }
  }
  async function locate() {
    editQuery();
    const current = ++generation;
    controller = new AbortController();
    const signal = controller.signal;
    locating.value = true;
    state.value = 'loading';
    requestedCity.value = 'tu ubicación actual';
    try {
      const coordinates = await currentLocation(signal);
      if (current !== generation || signal.aborted) return;
      locating.value = false;
      await search(coordinates);
    } catch (error) {
      if (current !== generation || signal.aborted) return;
      locating.value = false;
      state.value = 'initial';
      feedback.value = {
        kind: 'location',
        message:
          error instanceof LocationFailure && error.reason === 'denied'
            ? 'No diste permiso para usar tu ubicación. Podés habilitarlo en el navegador o escribir un lugar.'
            : error instanceof LocationFailure && error.reason === 'timeout'
              ? 'No pudimos obtener tu ubicación a tiempo. Volvé a intentarlo o escribí un lugar.'
              : 'Tu navegador no pudo obtener la ubicación. Revisá sus permisos o escribí un lugar.',
      };
    }
  }
  function retry() {
    if (feedback.value?.retryable && lastQuery) void search(lastQuery);
  }
  watch(language.code, () => {
    if (lastQuery) void search(lastQuery);
  });
  onUnmounted(() => {
    generation++;
    controller?.abort();
  });
  return {
    locating,
    locate,
    response,
    state,
    feedback,
    requestedCity,
    cancelled,
    temperatureUnit,
    weather,
    search,
    reset,
    editQuery,
    retry,
  };
}
