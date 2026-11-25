<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';

import { ClimateResponse } from '../../../models/weather/climate-response';
import {
  ALERT_SOURCES,
  AlertSeverity,
  WeatherAlertsResponse,
} from '../../../models/alerts/weather-alerts';
import { getJson } from '../../../api/http';
import { readWeatherAlerts } from '../../../models/alerts/weather-alerts';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
import { useLanguage } from '../../../service/preferences/language';
type AlertsState = {
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  data: WeatherAlertsResponse | null;
};
const t = useLanguage().text;
const props = withDefaults(defineProps<{ location?: ClimateResponse['ubicacion'] | null }>(), {
  location: null,
});
const language = useLanguage();
const location = computed(() => props.location);
const source = computed(() => {
  const country = location.value?.pais ?? '';
  return Object.hasOwn(ALERT_SOURCES, country) ? ALERT_SOURCES[country] : null;
});
const result = ref<AlertsState>({ status: 'idle', data: null });
const refresh = ref(0);
function retry() {
  refresh.value++;
}
watchEffect((onCleanup) => {
  const place = location.value;
  refresh.value;
  if (!place) {
    result.value = { status: 'idle', data: null };
    return;
  }
  let current: AbortController | null = null;
  const load = async () => {
    current?.abort();
    const controller = new AbortController();
    current = controller;
    result.value = { status: 'loading', data: null };
    try {
      const raw = await getJson(
        '/api/v1/alertas/',
        new URLSearchParams({
          latitud: String(place.latitud),
          longitud: String(place.longitud),
          pais: place.pais,
        }),
        controller.signal,
        35000,
      );
      if (!controller.signal.aborted)
        result.value = { status: 'ready', data: readWeatherAlerts(raw, place) };
    } catch {
      if (!controller.signal.aborted) result.value = { status: 'unavailable', data: null };
    }
  };
  void load();
  const interval = setInterval(load, 180000);
  onCleanup(() => {
    current?.abort();
    clearInterval(interval);
  });
});
function severity(value: AlertSeverity): string {
  return {
    Extreme: 'Extrema',
    Severe: 'Alta',
    Moderate: 'Moderada',
    Minor: 'Baja',
    Unknown: 'No especificada',
  }[value];
}
function localTime(value: string): string {
  const offset = location.value?.desplazamiento_horario_segundos ?? 0;
  return new Intl.DateTimeFormat(language.locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hourCycle: 'h23',
  }).format(new Date(Date.parse(value) + offset * 1000));
}

defineExpose({ retry, severity, localTime });
</script>

<template>
  <div data-component="app-weather-alerts">
    <template v-if="location"
      ><template v-for="place in [location]">
        <section
          id="alertas"
          class="rounded-app border border-line bg-surface p-4 sm:p-5"
          aria-labelledby="alerts-heading"
          :aria-busy="result.status === 'loading'"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2
                id="alerts-heading"
                class="flex items-center gap-2 font-display text-lg font-bold text-ink"
              >
                <WeatherIcon name="alert" :size="22" />{{ t('Alertas meteorol\u00F3gicas') }}
              </h2>
              <p class="mt-1 text-xs leading-6 text-secondary">
                {{ t('Avisos oficiales para') }} {{ place.nombre
                }}{{ t('. Hora local de la ciudad.') }}
              </p>
            </div>
            <template v-if="source"
              ><template v-for="provider in [source]">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-h-11 items-center rounded-app px-2 text-xs font-semibold text-blue underline"
                  :href="provider.url"
                  >{{ t('Consultar') }} {{ provider.short
                  }}<span class="sr-only"> {{ t('(se abre en otra pesta\u00F1a)') }}</span></a
                >
              </template></template
            >
          </div>
          <p
            class="mt-2 text-sm leading-6 text-secondary"
            role="status"
            aria-atomic="true"
            :aria-label="t('Estado de alertas meteorol\u00F3gicas')"
          >
            <template v-if="result.status === 'loading'">
              {{ t('Consultando avisos oficiales\u2026') }} </template
            ><template v-else-if="result.data?.fuente?.consultas_limitadas">
              {{
                t(
                  'La fuente oficial est\u00E1 limitando temporalmente las consultas. Reintentaremos autom\u00E1ticamente; consultala mientras tanto.',
                )
              }} </template
            ><template
              v-else-if="result.status === 'unavailable' || result.data?.estado === 'no_disponible'"
            >
              {{
                t(
                  'No pudimos verificar las alertas en este momento. Consult\u00E1 la fuente oficial.',
                )
              }} </template
            ><template v-else-if="result.data?.estado === 'fuera_cobertura'">
              {{
                t(
                  'No tenemos alertas verificadas para este pa\u00EDs. La cobertura actual incluye Argentina, Brasil, Chile y Uruguay.',
                )
              }} </template
            ><template v-else-if="result.data?.estado === 'parcial'">
              {{
                t(
                  'Consulta incompleta: no se pudieron verificar todos los avisos. Consult\u00E1 la fuente oficial para ampliar la informaci\u00F3n.',
                )
              }} </template
            ><template
              v-else-if="result.data?.estado === 'disponible' && !result.data?.alertas?.length"
            >
              {{
                t(
                  'Sin alertas reportadas para esta ubicaci\u00F3n. Esto no equivale a ausencia de riesgo.',
                )
              }} </template
            ><template v-else-if="result.data?.alertas?.length">
              {{ t('Avisos vigentes o programados para esta ubicaci\u00F3n:') }}
              {{ result.data?.alertas?.length }}.
            </template>
          </p>
          <template v-if="result.data"
            ><template v-for="data in [result.data]">
              <template v-if="data.alertas.length">
                <p class="mt-2 text-xs text-secondary">
                  {{ t('Los avisos oficiales se muestran en su idioma original.') }}
                </p>
              </template>
              <ul class="mt-3 grid gap-3">
                <template v-for="(alert, index) in data.alertas" :key="index">
                  <li
                    class="alert-notice rounded-app border border-control-line p-4"
                    :data-severity="alert.severidad"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <h3
                        class="font-display text-base font-bold text-ink"
                        :lang="source?.language"
                      >
                        {{ alert.fenomeno }}
                      </h3>
                      <span class="severity rounded-app px-3 py-1 text-xs font-semibold"
                        >{{ t('Severidad:') }} {{ t(severity(alert.severidad)) }}</span
                      >
                    </div>
                    <p class="mt-2 text-xs leading-6 text-secondary">
                      {{ t('Desde') }}
                      <time :datetime="alert.inicio_utc">{{ localTime(alert.inicio_utc) }}</time>
                      {{ t('hasta') }}
                      <time :datetime="alert.fin_utc">{{ localTime(alert.fin_utc) }}</time
                      >.
                    </p>
                    <p
                      class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]"
                      :lang="source?.language"
                      v-text="alert.descripcion"
                    ></p>
                    <details class="mt-2 rounded-app text-sm text-secondary">
                      <summary
                        class="min-h-11 cursor-pointer rounded-control py-3 font-semibold text-blue"
                      >
                        {{ t('Recomendaciones y \u00E1rea del aviso') }}
                      </summary>
                      <template v-if="alert.recomendaciones">
                        <p
                          class="whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]"
                          :lang="source?.language"
                          v-text="alert.recomendaciones"
                        ></p>
                      </template>
                      <p
                        class="mt-2 text-xs leading-6 [overflow-wrap:anywhere]"
                        :lang="source?.language"
                      >
                        {{ alert.zona }}
                      </p>
                      <p class="mt-1 text-xs leading-6">
                        {{ t('Emitido:') }} {{ localTime(alert.emitido_en_utc) }}.
                      </p>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-2 inline-flex min-h-11 items-center rounded-app text-xs font-semibold text-blue underline"
                        :href="alert.url"
                        >{{ t('Ver documento oficial')
                        }}<span class="sr-only"> {{ t('(se abre en otra pesta\u00F1a)') }}</span></a
                      >
                    </details>
                  </li>
                </template>
              </ul>
              <template v-if="data.estado !== 'fuera_cobertura'">
                <p class="mt-3 text-xs leading-6 text-muted">
                  {{ t('Fuente:') }} {{ data.fuente.nombre }}{{ t('. Consultado:') }}
                  {{ localTime(data.fuente.consultado_en_utc)
                  }}{{ t('. Actualizaci\u00F3n autom\u00E1tica cada tres minutos.') }}
                </p>
              </template></template
            ></template
          ><template
            v-if="result.status !== 'loading' && result.data?.estado !== 'fuera_cobertura'"
          >
            <button
              type="button"
              class="mt-2 min-h-11 rounded-control border border-control-line px-3 text-xs font-semibold text-blue hover:bg-sky"
              @click="retry()"
            >
              {{ t('Actualizar avisos') }}
            </button>
          </template>
          <p class="mt-3 border-t border-line pt-3 text-xs leading-6 text-muted">
            {{
              t(
                'Son avisos meteorol\u00F3gicos oficiales; no incluyen un monitoreo de sismos ni de crecidas de r\u00EDos. El Ni\u00F1o y La Ni\u00F1a aportan contexto estacional, pero no confirman un desastre en una ciudad.',
              )
            }}
            <a
              class="rounded-app text-blue underline"
              href="https://www.argentina.gob.ar/ina/el-nino-situacion-hidrometeorologica-en-argentina"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t('Ver informes oficiales sobre El Ni\u00F1o')
              }}<span class="sr-only"> {{ t('(se abre en otra pesta\u00F1a)') }}</span></a
            >.
          </p>
        </section>
      </template></template
    >
  </div>
</template>

<style scoped>
[data-component='app-weather-alerts'] {
  display: block;
  min-width: 0;
}
.severity {
  background: var(--color-sky);
  color: var(--color-ink);
}
.alert-notice {
  border-inline-start-width: 4px;
}
.alert-notice[data-severity='Extreme'],
.alert-notice[data-severity='Severe'] {
  border-inline-start-color: var(--color-danger);
}
.alert-notice[data-severity='Moderate'] {
  border-inline-start-color: var(--color-blue);
}
</style>
