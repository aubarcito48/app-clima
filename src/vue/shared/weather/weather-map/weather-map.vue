<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, useElementRef, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import type { Map as LeafletMap, TileLayer, CircleMarker } from 'leaflet';
import { Subscription } from 'rxjs';
import { useMapPointApi, MapPointWeather } from '../../../service/weather/map-point-api';
import { useLanguage } from '../../../service/preferences/language';
import { MAP_LAYERS, WeatherLayer } from './map-layers';
import { ClimateLocation } from '../../../models/weather/climate-response';
import { apiBaseUrl } from '../../../api/http';
const environment = { apiBaseUrl };

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ location: ClimateLocation }>(), {  });
const location = computed(() => props.location);
const opened = ref(false);
const loading = ref(false);
const failed = ref(false);
const layer = defineModel<WeatherLayer>('layer', { default: 'temperature' });
const layers = MAP_LAYERS;
const point = ref<MapPointWeather | null>(null);
const pointLoading = ref(false);
const pointFailed = ref(false);
const selected = ref<{
    lat: number;
    lng: number;
} | null>(null);
const language = useLanguage();
const api = useMapPointApi();
const document = globalThis.document;
let pointRequest: Subscription | undefined = undefined;
let selectedMarker: CircleMarker | null = null;
let locationKey = '';
const container = useElementRef<HTMLDivElement>('mapContainer');
let map: LeafletMap | null = null;
let overlay: TileLayer | null = null;
let library: typeof import('leaflet') | null = null;
let mapGeneration = 0;
let resizeObserver: ResizeObserver | null = null;
async function open(): Promise<void> {
    if (opened.value)
        return;
    const generation = ++mapGeneration;
    opened.value = true;
    loading.value = true;
    failed.value = false;
    try {
        const { default: leaflet } = await import('leaflet');
        if (generation !== mapGeneration)
            return;
        library = leaflet;
        const place = location.value;
        map = leaflet
            .map(container.value!, {
            scrollWheelZoom: false,
            minZoom: 3,
            maxZoom: 18,
            zoomAnimation: false,
            fadeAnimation: false,
        })
            .setView([Math.max(-85, Math.min(85, place.latitud)), place.longitud], 5);
        leaflet
            .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            keepBuffer: 0,
            updateWhenIdle: true,
            maxZoom: 18,
        })
            .on('tileerror', () => failed.value = true)
            .addTo(map);
        leaflet
            .circleMarker([place.latitud, place.longitud], {
            radius: 6,
            color: '#ffffff',
            weight: 2,
            fillColor: '#176d95',
            fillOpacity: 1,
        })
            .addTo(map);
        leaflet.control.scale({ imperial: false }).addTo(map);
        map.on('click', (event) => consultPoint(event.latlng.lat, event.latlng.lng));
        updateLayer();
        // The weather page is recreated when its language is refreshed.
        const remembered = api.selectedFor(locationKey);
        if (remembered)
            consultPoint(remembered.lat, remembered.lng);
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
            resizeObserver.observe(container.value!);
        }
        requestAnimationFrame(() => map?.invalidateSize());
    }
    catch {
        if (generation === mapGeneration) {
            failed.value = true;
            loading.value = false;
        }
    }
}
function changeLayer(value: string): void {
    if (!['temperature', 'rain', 'wind'].includes(value) || value === layer.value)
        return;
    layer.value = value as WeatherLayer;
}
watch(layer, () => updateLayer(), { flush: 'post' });
function updateLayer(): void {
    if (!map || !library)
        return;
    overlay?.remove();
    failed.value = false;
    loading.value = true;
    overlay = library.tileLayer(`${environment.apiBaseUrl}/api/v1/mapa/?layer=${layer.value}&z={z}&x={x}&y={y}`, {
        attribution: '<a href="https://openweathermap.org/">OpenWeather</a>',
        opacity: 0.7,
        keepBuffer: 0,
        updateWhenIdle: true,
        maxNativeZoom: 8,
        maxZoom: 18,
    });
    const activeOverlay = overlay;
    overlay.on('tileerror', () => {
        if (overlay === activeOverlay)
            failed.value = true;
    });
    overlay.on('load', () => {
        if (overlay === activeOverlay)
            loading.value = false;
    });
    overlay.addTo(map);
    overlay.bringToFront();
}
function close(): void {
    pointRequest?.unsubscribe();
    point.value = null;
    selected.value = null;
    pointLoading.value = false;
    pointFailed.value = false;
    selectedMarker = null;
    mapGeneration++;
    resizeObserver?.disconnect();
    resizeObserver = null;
    map?.remove();
    map = null;
    overlay = null;
    opened.value = false;
    loading.value = false;
}
function consultPoint(latitude: number, longitude: number): void {
    pointRequest?.unsubscribe();
    const lat = Math.max(-85, Math.min(85, latitude));
    const lng = ((((longitude + 180) % 360) + 360) % 360) - 180;
    selected.value = { lat, lng };
    api.remember(locationKey, lat, lng);
    point.value = null;
    pointLoading.value = true;
    pointFailed.value = false;
    if (map && library) {
        selectedMarker?.remove();
        selectedMarker = library.circleMarker([lat, lng], {
            radius: 9,
            color: '#176d95',
            weight: 3,
            fillColor: '#fff',
            fillOpacity: 0.85,
        })
            .addTo(map);
    }
    pointRequest = api.query(lat, lng).subscribe({
        next: (data) => {
            point.value = data;
            pointLoading.value = false;
        },
        error: () => {
            pointFailed.value = true;
            pointLoading.value = false;
        },
    });
}
function renderPointPopup(): void {
    if (!selectedMarker || !map)
        return;
    const existing = selectedMarker.getPopup();
    if (existing && !map.hasLayer(existing))
        return;
    const content = document.createElement('div');
    content.className = 'point-popup';
    content.setAttribute('role', 'status');
    content.setAttribute('aria-label', language.text('Condiciones en el punto'));
    const line = (text: string, tag = 'p') => {
        const element = document.createElement(tag);
        element.textContent = text;
        content.append(element);
        return element;
    };
    if (pointLoading.value) {
        line(language.text('Consultando este punto…'));
    }
    else if (pointFailed.value) {
        line(language.text('No se pudo consultar este punto. Podés volver a intentarlo.'));
        const retry = line(language.text('Reintentar consulta'), 'button') as HTMLButtonElement;
        retry.type = 'button';
        retry.addEventListener('click', () => {
            const coordinates = selected.value;
            if (coordinates)
                consultPoint(coordinates.lat, coordinates.lng);
        });
    }
    else if (point.value) {
        const current = point.value!.actual;
        const metric = layer.value;
        const value = metric === 'temperature'
            ? current.temperatura_c
            : metric === 'wind'
                ? current.viento_kmh
                : current.lluvia_ultima_hora_mm;
        line(language.text(metric === 'rain' ? 'Lluvia en la última hora' : layers[metric].label));
        line(value === null
            ? language.text('Sin datos')
            : `${new Intl.NumberFormat(language.locale.value, { maximumFractionDigits: 1 }).format(value)} ${layers[metric].unit}`, 'strong');
        const observed = new Intl.DateTimeFormat(language.locale.value, {
            timeZone: 'UTC',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(new Date(current.fecha_utc));
        line(`OpenWeather · ${observed} UTC`, 'small');
    }
    else
        return;
    if (existing)
        existing.setContent(content);
    else
        selectedMarker.bindPopup(content, {
            className: 'weather-point-popup',
            autoPan: true,
            autoPanPadding: [24, 24],
            maxWidth: 230,
            minWidth: 140,
        })
            .openPopup();
    selectedMarker.getPopup()
        ?.getElement()
        ?.querySelector('.leaflet-popup-close-button')
        ?.setAttribute('aria-label', language.text('Cerrar detalle'));
}
watchPostEffect(() => {
    point.value;
    pointLoading.value;
    pointFailed.value;
    selected.value;
    layer.value;
    language.code.value;
    untracked(() => renderPointPopup());
});
watchPostEffect(() => {
    const place = location.value;
    const key = `${place.latitud}|${place.longitud}|${place.nombre}`;
    untracked(() => {
        if (key === locationKey && opened.value)
            return;
        locationKey = key;
        close();
        void open();
    });
});
({ onDestroy: cleanup }).onDestroy(() => close());

defineExpose({ open, changeLayer, close, consultPoint });
</script>

<template>
<div data-component="app-weather-map"><section class="map-card rounded-app border border-line bg-surface p-4 sm:p-5" aria-labelledby="weather-map-heading">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h2 id="weather-map-heading" class="font-display text-lg font-bold text-ink">
      {{ t('Mapa del clima') }}
    </h2>
    <template v-if="opened">
      <label class="text-xs font-semibold text-secondary">
        <span class="sr-only">{{ t('Mostrar') }}</span>
        <select class="min-h-11 rounded-control border border-control-line bg-surface px-3 text-ink" :value="layer" @change="changeLayer(($event.target as HTMLSelectElement).value)">
          <option value="temperature">{{ t('Temperatura') }}</option>
          <option value="rain">{{ t('Lluvia') }}</option>
          <option value="wind">{{ t('Viento') }}</option>
        </select>
      </label>
    </template></div>
  <div class="map-content mt-3" :hidden="!(opened)">
    <div class="map-canvas rounded-app" role="region" :aria-label="t('Mapa meteorol\u00F3gico interactivo')" ref="mapContainer"></div>
    <template v-if="(failed || loading)">
      <p class="mt-2 text-xs leading-5 text-secondary" role="status">
        <template v-if="failed">
          {{ t('No se pudo cargar todo el mapa. Esper\u00E1 un minuto y volv\u00E9 a consultar la ciudad.') }}
        </template><template v-else-if="loading">
          {{ t('Cargando mapa\u2026') }}
        </template></p>
    </template></div>
</section>
</div>
</template>

<style scoped>
[data-component="app-weather-map"] {
  display: block;
  min-width: 0;
}
.map-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.map-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.map-content[hidden] {
  display: none;
}
.map-canvas {
  flex: 1;
  min-height: 300px;
  height: 100%;
  width: 100%;
  z-index: 0;
  background: var(--color-sky);
  cursor: crosshair;
}

</style>
