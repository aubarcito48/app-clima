<script setup lang="ts">
import { ref, computed } from 'vue';

import WeatherDetails from '../weather-details/weather-details.vue';
import { WeatherPreview } from '../../../models/weather/weather-preview';
import { displayTemperature, TemperatureUnit } from '../../../models/weather/temperature';
import WeatherIcon from '../weather-icon/weather-icon.vue';
import { useLanguage } from '../../../service/preferences/language';

const t = useLanguage().text;
const props = withDefaults(
  defineProps<{
    showDetails?: boolean;
    favorite?: boolean;
    unit?: TemperatureUnit;
    weather?: WeatherPreview | null;
  }>(),
  { showDetails: true, favorite: false, unit: 'C', weather: null },
);
const emit = defineEmits<{ favoriteToggled: []; searchRequested: [] }>();
const showDetails = computed(() => props.showDetails);
const motionPaused = ref(false);
const canAnimate = computed(() =>
  ['sun', 'cloud-sun', 'cloud', 'rain', 'cloud-moon'].includes(weather.value?.condition ?? ''),
);
const favorite = computed(() => props.favorite);
const unit = computed(() => props.unit);
function temperature(value: number) {
  return displayTemperature(value, unit.value);
}
const weather = computed(() => props.weather);

defineExpose({ temperature });
</script>

<template>
  <div data-component="app-current-weather" class="block min-w-0">
    <div class="current-overview" :class="{ 'single-overview': !showDetails }">
      <section
        class="weather-panel relative isolate overflow-hidden rounded-app border border-white p-4 sm:p-5"
        aria-labelledby="current-heading"
      >
        <div class="relative z-10 flex items-center justify-between gap-3">
          <h2 id="current-heading" class="font-display text-base font-bold text-ink">
            {{ t('Clima actual') }}
          </h2>
          <div class="flex shrink-0 items-center gap-2">
            <span
              class="rounded-app border border-ink/30 bg-ink/5 px-3 py-1 text-xs font-medium text-ink"
              >{{ weather?.source ?? t('Tu pr\u00F3ximo plan') }}</span
            >
            <template v-if="weather"
              ><template v-for="data in [weather]">
                <button
                  type="button"
                  class="favorite-toggle flex h-11 w-11 items-center justify-center rounded-control border border-ink/30 bg-ink/5 hover:bg-ink/10 focus-visible:outline-blue"
                  :aria-label="
                    t(favorite ? 'Quitar {city} de favoritos' : 'Guardar {city} en favoritos', {
                      city: data.city,
                    })
                  "
                  :aria-pressed="favorite"
                  @click="emit('favoriteToggled')"
                >
                  <WeatherIcon name="heart" :filled="favorite" :size="23" />
                </button> </template
            ></template>
          </div>
        </div>
        <template v-if="weather"
          ><template v-for="data in [weather]">
            <div class="current-details relative z-10 mt-3 min-w-0">
              <div>
                <p class="mb-1 flex items-center gap-1.5 text-sm text-secondary">
                  <WeatherIcon name="pin" :size="16" /> {{ data.country }}
                </p>
                <h3
                  class="break-words font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
                >
                  {{ data.city }}
                </h3>
              </div>
              <div class="min-w-0">
                <div class="temperature-with-icon">
                  <p class="temperature text-ink">
                    <span>{{ temperature(data.temperature) }}</span
                    ><span class="temperature-unit">°{{ unit }}</span>
                  </p>
                  <template v-if="data.condition"
                    ><template v-for="condition in [data.condition]">
                      <div class="weather-art inline-flex shrink-0 text-ink/80">
                        <WeatherIcon
                          :name="condition"
                          :size="64"
                          :animated="true"
                          :paused="motionPaused"
                        />
                      </div> </template
                  ></template>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3">
                  <p class="text-base font-semibold text-ink">
                    {{ data.description ?? t('Descripci\u00F3n no disponible') }}
                  </p>
                  <template v-if="canAnimate">
                    <button
                      type="button"
                      class="weather-motion-control min-h-11 items-center justify-center rounded-control px-2 text-[11px] text-secondary underline decoration-ink/40 underline-offset-4 hover:bg-ink/10 focus-visible:outline-blue"
                      :aria-label="
                        motionPaused
                          ? t('Reanudar animaci\u00F3n del clima')
                          : t('Pausar animaci\u00F3n del clima')
                      "
                      @click="motionPaused = !motionPaused"
                    >
                      {{ motionPaused ? t('Reanudar') : t('Pausar') }}
                    </button>
                  </template>
                </div>
                <p class="mt-1 text-sm text-secondary">
                  {{ t('Sensaci\u00F3n t\u00E9rmica:') }}
                  {{
                    data.feelsLike === null
                      ? t('No disponible')
                      : temperature(data.feelsLike) + ' \u00B0' + unit
                  }}
                </p>
              </div>
            </div>

            <section
              id="consejo-ia"
              aria-labelledby="clothing-advice-heading"
              class="relative z-10 mt-3 rounded-app border border-ink/15 bg-advice px-4 py-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4
                  id="clothing-advice-heading"
                  class="flex items-center gap-2 text-xs font-semibold text-ink"
                >
                  <WeatherIcon name="sparkles" :size="16" />{{ t('Qu\u00E9 ponerte hoy') }}
                </h4>
                <template v-if="data.advice">
                  <span class="text-[11px] text-secondary">{{ t('Generado con IA') }}</span>
                </template>
              </div>
              <template v-if="data.advice"
                ><template v-for="advice in [data.advice]">
                  <p
                    id="advice-text"
                    class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]"
                    v-text="advice.text"
                  ></p>
                  <template v-if="unit === 'F'">
                    <p class="mt-1 text-[11px] leading-5 text-secondary">
                      {{ t('El consejo de IA conserva las unidades originales en \u00B0C.') }}
                    </p>
                  </template></template
                ></template
              ><template v-else>
                <p class="mt-2 text-xs leading-5 text-secondary">
                  {{ t('El consejo de ropa no est\u00E1 disponible por el momento.') }}
                </p>
              </template>
            </section>
            <div
              class="relative z-10 mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-ink/10 pt-2 text-xs leading-5 text-secondary"
            >
              <p>{{ t('Hora de la ciudad (') }}{{ data.timezoneLabel }}).</p>
              <p>
                {{ t('Observado el') }}
                <time :datetime="data.observedAtUtc">{{
                  t('{date} a las {time} h', { date: data.dateLabel, time: data.observedTime })
                }}</time
                >.
                <span
                  >{{ t('Actualizado el') }}
                  <time :datetime="data.updatedAtUtc">{{
                    data.updatedAt.replace(', ', t(' a las '))
                  }}</time
                  >.</span
                >
              </p>
            </div>
          </template></template
        ><template v-else>
          <div
            class="relative z-10 mt-4 grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]"
          >
            <div class="min-w-0">
              <h3
                class="max-w-96 font-display text-[1.5rem] leading-tight font-bold tracking-tight text-ink sm:text-[1.75rem]"
              >
                {{ t('El cielo cambia.') }}<br />{{ t('Tus planes se adaptan.') }}
              </h3>
              <p class="mt-2 max-w-96 text-sm leading-6 text-secondary">
                {{
                  t(
                    'Eleg\u00ED una ciudad y encontr\u00E1 el clima y las pr\u00F3ximas horas para organizar tu d\u00EDa.',
                  )
                }}
              </p>
              <button
                type="button"
                class="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                @click="emit('searchRequested')"
              >
                {{ t('Buscar un lugar') }} <WeatherIcon name="arrow" :size="18" />
              </button>
            </div>
            <div class="empty-sky" aria-hidden="true">
              <div class="sun-disc"></div>
              <div class="sky-cloud sky-cloud-back"></div>
              <div class="sky-cloud"></div>
            </div>
          </div>
          <div
            class="relative z-10 mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/10 pt-3 text-xs text-secondary"
          >
            <span class="flex items-center gap-2"
              ><WeatherIcon name="sun" :size="18" /> {{ t('Clima de un vistazo') }}</span
            >
            <span class="flex items-center gap-2"
              ><WeatherIcon name="sparkles" :size="18" />
              {{ t('Pron\u00F3stico para tus planes') }}</span
            >
          </div>
        </template>
      </section>

      <template v-if="showDetails">
        <WeatherDetails :weather="weather" />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
[data-component='app-current-weather'] {
  display: block;
  min-width: 0;
}
.weather-panel {
  --color-ink: var(--color-weather-ink);
  --color-secondary: var(--color-weather-secondary);
  --color-muted: var(--color-weather-secondary);
  background: linear-gradient(135deg, var(--color-weather-from), var(--color-weather-to));
  border-color: transparent;
  box-shadow: 0 16px 36px #2c81a021;
}
.favorite-toggle {
  color: var(--color-weather-heart);
}
.weather-panel::before {
  content: '';
  position: absolute;
  width: 16.5rem;
  height: 16.5rem;
  top: -5.5rem;
  left: -4.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-blue) 14%, transparent);
  pointer-events: none;
}
.weather-panel::after {
  content: '';
  position: absolute;
  width: 45rem;
  height: 18rem;
  border-radius: 50%;
  background: #ffffff10;
  right: -17rem;
  bottom: -12rem;
  transform: rotate(-12deg);
  z-index: -1;
  box-shadow: 0 -2rem 0 #ffffff08;
}
.temperature {
  display: flex;
  align-items: flex-start;
  font-size: clamp(3rem, 4.5vw, 3.5rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.075em;
}
.current-details {
  display: grid;
  align-items: center;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .current-details {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.25rem;
  }
}
.current-overview {
  display: grid;
  gap: 1rem;
  align-items: start;
}
@media (min-width: 1280px) {
  .current-overview {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    row-gap: 1.5rem;
  }
  .weather-panel {
    align-self: stretch;
  }
  .weather-panel {
    padding: 1rem;
  }
  .current-details {
    gap: 0.85rem;
    margin-top: 0;
  }
  .temperature {
    font-size: 3rem;
  }
  #consejo-ia {
    margin-top: 0.5rem;
    padding: 0.65rem 0.85rem;
  }
  #advice-text {
    line-height: 1.35rem;
  }
}
.temperature-unit {
  margin: 0.3rem 0 0 0.3rem;
  font-size: 1.25rem;
  letter-spacing: -0.04em;
}
.weather-art {
  filter: drop-shadow(0 12px 15px #627ba820);
}
.empty-sky {
  position: relative;
  height: 8rem;
  width: 7rem;
  transform: scale(0.65);
  transform-origin: center;
}
.sun-disc {
  position: absolute;
  width: 6.8rem;
  height: 6.8rem;
  top: 1rem;
  right: 0.3rem;
  border-radius: 50%;
  background: #f8ce65;
  box-shadow:
    0 0 0 12px #f8ce6520,
    0 0 0 24px #f8ce6510;
}
.sky-cloud {
  position: absolute;
  height: 3.6rem;
  width: 9rem;
  top: 6rem;
  left: -0.4rem;
  border-radius: 4rem;
  background: #fff;
  box-shadow: 0 12px 24px #718db71a;
}
.sky-cloud::before,
.sky-cloud::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: inherit;
}
.sky-cloud::before {
  width: 4.5rem;
  height: 4.5rem;
  left: 1.1rem;
  top: -2.1rem;
}
.sky-cloud::after {
  width: 3.2rem;
  height: 3.2rem;
  right: 1rem;
  top: -1.1rem;
}
.sky-cloud-back {
  transform: scale(0.6);
  background: #eef6ff;
  top: 3.8rem;
  left: 3.3rem;
}
@media (max-width: 639px) {
  .empty-sky {
    height: 5rem;
    width: 5rem;
    margin: 0;
    transform: scale(0.4);
  }
}

.temperature-with-icon {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.temperature-with-icon .temperature {
  flex-shrink: 0;
}
.current-overview.single-overview {
  display: block;
}
@media (min-width: 1280px) {
  .single-overview .weather-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.75rem 1.5rem;
    align-items: center;
  }
  .single-overview .weather-panel > :first-child,
  .single-overview .weather-panel > :last-child {
    grid-column: 1 / -1;
  }
  .single-overview .current-details {
    grid-column: 2;
    grid-row: 2;
  }
  .single-overview #consejo-ia {
    grid-column: 1;
    grid-row: 2;
    margin: 0;
  }
}
</style>
