<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue';
import { useFavoritePlaces } from '../../service/places/favorite-places';
import { useWeather } from '../../composables/useWeather';
import { useLanguage } from '../../service/preferences/language';
import CitySearch from '../../shared/places/city-search/city-search.vue';
import Forecast from '../../shared/weather/forecast/forecast.vue';
import CurrentWeather from '../../shared/weather/current-weather/current-weather.vue';
import WeatherLoading from '../../shared/weather/weather-loading/weather-loading.vue';
import WeatherDetails from '../../shared/weather/weather-details/weather-details.vue';
import WeatherSidebar from '../../shared/weather/weather-sidebar/weather-sidebar.vue';
import WeatherIcon from '../../shared/weather/weather-icon/weather-icon.vue';
import SiteFooter from '../../shared/site/site-footer/site-footer.vue';
import BackToTop from '../../shared/site/back-to-top/back-to-top.vue';
import SectionNavigation from '../../shared/site/section-navigation/section-navigation.vue';
const t = useLanguage().text;
const { locate, locating, response, state, weather, feedback, requestedCity, cancelled, temperatureUnit, search, reset, editQuery, retry } = useWeather();
const citySearch = useTemplateRef<InstanceType<typeof CitySearch>>('citySearch');
const favorites = useFavoritePlaces();
function toggleFavorite() { if (response.value) favorites.toggle(response.value.ubicacion); }
const sections = [{ id: 'inicio-clima', label: 'Inicio' }, { id: 'pronostico', label: 'Buscar ciudad' }, { id: 'clima-contenido', label: 'Clima y pronóstico' }];
onMounted(() => {
  const place = history.state?.weatherPlace;
  if (place && Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180) {
    void search({ latitude: place.latitude, longitude: place.longitude });
    const { weatherPlace, ...rest } = history.state; history.replaceState(rest, '');
  }
});
</script>
<template>
<div data-component="app-weather" class="block min-w-0"><a href="#main-content" class="skip-link">{{ t('Saltar al contenido') }}</a>
<div class="weather-layout mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
  <WeatherSidebar @placeSelected="citySearch?.chooseSuggestion($event)">

  </WeatherSidebar>
  <div class="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
    <main id="main-content" tabindex="-1" class="pb-10">
      <header id="inicio-clima" tabindex="-1"  class="mb-7 grid grid-cols-1 items-start gap-5">
        <div class="min-w-0">
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {{ t('Hola, explorador') }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-secondary">
            {{ t('Tu clima y tus planes para el día.') }}
          </p>
        </div>

      </header>
      <section id="pronostico" tabindex="-1"  class="search-panel scroll-mt-6 rounded-app border border-line bg-surface px-4 py-3 sm:px-5 sm:py-3" :aria-label="(t('Consulta de ciudad'))">
        <CitySearch :busy="(state === 'loading')" :locating="locating" :feedback="feedback" @queryEdited="editQuery()"  @querySubmitted="search($event)" @locationRequested="locate" @retryRequested="retry()" ref="citySearch" />
      </section>
      <div class="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-atomic="true" class="text-sm text-secondary" :aria-label="(t('Estado de la consulta del clima'))">
          <template v-if="state === 'loading'">
              <span class="inline-flex items-center gap-2"><span class="loading-dot" aria-hidden="true"></span>
                {{ (locating ? (t('Obteniendo')) : (t('Consultando el clima de'))) }}
                {{ t(requestedCity) }}…</span>
            </template><template v-else-if="state === 'ready'">
              <span class="inline-flex items-center gap-2"><WeatherIcon name="pin" :size="16" /><span >{{ t('Explorando') }}
                  <strong class="font-semibold text-ink">{{ weather?.city }}</strong>
                </span></span>
              <span class="sr-only">{{ (weather?.forecast?.length ? '' : (t('Pronóstico no disponible.'))) }}
              </span>
            </template><template v-else>
              <template v-if="cancelled">
                {{ t('Búsqueda cancelada. Podés consultar otra ciudad.') }}
              </template><template v-else-if="feedback">
                {{ t('No se pudo completar la consulta de') }}
                {{ t(requestedCity) }}{{ t('. Revisá el aviso de búsqueda.') }}
              </template><template v-else>
                {{ t('Elegí una ciudad. Nosotros ponemos el contexto.') }}
              </template></template>
        </p>
        <template v-if="((state === 'ready') || (state === 'loading'))">
          <button type="button" class="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-secondary underline decoration-line underline-offset-4 hover:text-ink" @click="citySearch?.cancelAutoSearch();
reset();
citySearch?.focusCity()">
            <WeatherIcon name="close" :size="14" />
            {{ ((state === 'loading') ? (t('Cancelar búsqueda')) : (t('Volver al inicio'))) }}
          </button>
        </template></div>
      <div id="clima-contenido" tabindex="-1" class="mt-2" :aria-busy="((state === 'loading'))">
        <template v-if="(state === 'loading')">
          <WeatherLoading  />
        </template><template v-else>
          <div class="grid items-stretch gap-6">
            <CurrentWeather  :weather="weather" :showDetails="!weather" :favorite="favorites.contains(response?.ubicacion ?? null)" @favoriteToggled="toggleFavorite" :unit="temperatureUnit"   @searchRequested="citySearch?.focusCity()" />
            <template v-if="response"><template v-for="data in [response]">
              <div class="weather-context-grid">
                <div class="weather-context-stack">

                  <WeatherDetails :weather="weather" />

                </div>

              </div>
            </template></template>
            <Forecast :weather="weather" v-model:unit="temperatureUnit" />
          </div>
        </template></div>
      <template v-if="(state === 'ready')">
        <a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex flex-wrap items-center gap-2 rounded-app text-xs text-secondary underline decoration-line underline-offset-4">
          <span class="rounded-app bg-white px-2 py-1"><img src="openweather-logo.png" alt="OpenWeather" width="90" height="40" class="h-auto w-20" /></span>
          {{ t('Datos meteorológicos proporcionados por OpenWeather') }}
        </a>
      </template><aside class="mt-6 flex items-start gap-2.5 px-1 text-xs leading-6 text-muted" :aria-label="(t('Información del servicio'))">
        <WeatherIcon name="sparkles" class="mt-1" :size="16" />
        <p >
          {{ t('La disponibilidad del pronóstico puede variar. Consultá las condiciones antes de organizar tus planes.') }}
        </p>
      </aside>

    </main>
    <SiteFooter  />
  </div>
</div>
<BackToTop  />
<SectionNavigation :sections="sections" />
</div>
</template>

<style scoped>
.weather-context-grid,
.weather-context-stack {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
.weather-context-grid {
  align-items: stretch;
}
.weather-context-stack {
  align-content: start;
}
@media (min-width: 1280px) {
  .weather-context-grid {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }
}

</style>
