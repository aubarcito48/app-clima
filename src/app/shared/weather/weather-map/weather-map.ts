import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Map as LeafletMap, TileLayer, CircleMarker } from 'leaflet';
import { Subscription } from 'rxjs';
import { MapPointApi, MapPointWeather } from '../../../service/weather/map-point-api';
import { Language } from '../../../service/preferences/language';
import { MAP_LAYERS, WeatherLayer } from './map-layers';
import { ClimateLocation } from '../../../models/weather/climate-response';
import { environment } from '../../../../environments/environment';
import { Translate } from '../../preferences/translate';

@Component({
  selector: 'app-weather-map',
  imports: [Translate],
  templateUrl: './weather-map.html',
  styleUrl: './weather-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherMap {
  readonly location = input.required<ClimateLocation>();
  readonly opened = signal(false);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly layer = model<WeatherLayer>('temperature');
  readonly layers = MAP_LAYERS;
  readonly point = signal<MapPointWeather | null>(null);
  readonly pointLoading = signal(false);
  readonly pointFailed = signal(false);
  readonly selected = signal<{ lat: number; lng: number } | null>(null);
  readonly language = inject(Language);
  private readonly api = inject(MapPointApi);
  private readonly document = inject(DOCUMENT);
  private pointRequest?: Subscription;
  private selectedMarker: CircleMarker | null = null;
  private locationKey = '';
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map: LeafletMap | null = null;
  private overlay: TileLayer | null = null;
  private library: typeof import('leaflet') | null = null;
  private generation = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.point();
      this.pointLoading();
      this.pointFailed();
      this.selected();
      this.layer();
      this.language.code();
      untracked(() => this.renderPointPopup());
    });
    afterRenderEffect(() => {
      const location = this.location();
      const key = `${location.latitud}|${location.longitud}|${location.nombre}`;
      untracked(() => {
        if (key === this.locationKey && this.opened()) return;
        this.locationKey = key;
        this.close();
        void this.open();
      });
    });
    inject(DestroyRef).onDestroy(() => this.close());
  }

  async open(): Promise<void> {
    if (this.opened()) return;
    const generation = ++this.generation;
    this.opened.set(true);
    this.loading.set(true);
    this.failed.set(false);
    try {
      const { default: leaflet } = await import('leaflet');
      if (generation !== this.generation) return;
      this.library = leaflet;
      const place = this.location();
      this.map = leaflet
        .map(this.container().nativeElement, {
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
        .on('tileerror', () => this.failed.set(true))
        .addTo(this.map);
      leaflet
        .circleMarker([place.latitud, place.longitud], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#176d95',
          fillOpacity: 1,
        })
        .addTo(this.map);
      leaflet.control.scale({ imperial: false }).addTo(this.map);
      this.map.on('click', (event) => this.consultPoint(event.latlng.lat, event.latlng.lng));
      this.updateLayer();
      // The weather page is recreated when its language is refreshed.
      const selected = this.api.selectedFor(this.locationKey);
      if (selected) this.consultPoint(selected.lat, selected.lng);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
        this.resizeObserver.observe(this.container().nativeElement);
      }
      requestAnimationFrame(() => this.map?.invalidateSize());
    } catch {
      if (generation === this.generation) {
        this.failed.set(true);
        this.loading.set(false);
      }
    }
  }

  changeLayer(value: string): void {
    if (!['temperature', 'rain', 'wind'].includes(value) || value === this.layer()) return;
    this.layer.set(value as WeatherLayer);
    this.updateLayer();
  }

  private updateLayer(): void {
    if (!this.map || !this.library) return;
    this.overlay?.remove();
    this.failed.set(false);
    this.loading.set(true);
    this.overlay = this.library.tileLayer(
      `${environment.apiBaseUrl}/api/v1/mapa/?layer=${this.layer()}&z={z}&x={x}&y={y}`,
      {
        attribution: '<a href="https://openweathermap.org/">OpenWeather</a>',
        opacity: 0.7,
        keepBuffer: 0,
        updateWhenIdle: true,
        maxNativeZoom: 8,
        maxZoom: 18,
      },
    );
    const overlay = this.overlay;
    this.overlay.on('tileerror', () => {
      if (this.overlay === overlay) this.failed.set(true);
    });
    this.overlay.on('load', () => {
      if (this.overlay === overlay) this.loading.set(false);
    });
    this.overlay.addTo(this.map);
    this.overlay.bringToFront();
  }

  close(): void {
    this.pointRequest?.unsubscribe();
    this.point.set(null);
    this.selected.set(null);
    this.pointLoading.set(false);
    this.pointFailed.set(false);
    this.selectedMarker = null;
    this.generation++;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.overlay = null;
    this.opened.set(false);
    this.loading.set(false);
  }

  consultPoint(latitude: number, longitude: number): void {
    this.pointRequest?.unsubscribe();
    const lat = Math.max(-85, Math.min(85, latitude));
    const lng = ((((longitude + 180) % 360) + 360) % 360) - 180;
    this.selected.set({ lat, lng });
    this.api.remember(this.locationKey, lat, lng);
    this.point.set(null);
    this.pointLoading.set(true);
    this.pointFailed.set(false);
    if (this.map && this.library) {
      this.selectedMarker?.remove();
      this.selectedMarker = this.library
        .circleMarker([lat, lng], {
          radius: 9,
          color: '#176d95',
          weight: 3,
          fillColor: '#fff',
          fillOpacity: 0.85,
        })
        .addTo(this.map);
    }
    this.pointRequest = this.api.query(lat, lng).subscribe({
      next: (point) => {
        this.point.set(point);
        this.pointLoading.set(false);
      },
      error: () => {
        this.pointFailed.set(true);
        this.pointLoading.set(false);
      },
    });
  }

  private renderPointPopup(): void {
    if (!this.selectedMarker || !this.map) return;
    const existing = this.selectedMarker.getPopup();
    if (existing && !this.map.hasLayer(existing)) return;
    const content = this.document.createElement('div');
    content.className = 'point-popup';
    content.setAttribute('role', 'status');
    content.setAttribute('aria-label', this.language.text('Condiciones en el punto'));
    const line = (text: string, tag = 'p') => {
      const element = this.document.createElement(tag);
      element.textContent = text;
      content.append(element);
      return element;
    };
    if (this.pointLoading()) {
      line(this.language.text('Consultando este punto…'));
    } else if (this.pointFailed()) {
      line(this.language.text('No se pudo consultar este punto. Podés volver a intentarlo.'));
      const retry = line(this.language.text('Reintentar consulta'), 'button') as HTMLButtonElement;
      retry.type = 'button';
      retry.addEventListener('click', () => {
        const coordinates = this.selected();
        if (coordinates) this.consultPoint(coordinates.lat, coordinates.lng);
      });
    } else if (this.point()) {
      const current = this.point()!.actual;
      const layer = this.layer();
      const value =
        layer === 'temperature'
          ? current.temperatura_c
          : layer === 'wind'
            ? current.viento_kmh
            : current.lluvia_ultima_hora_mm;
      line(
        this.language.text(
          layer === 'rain' ? 'Lluvia en la última hora' : this.layers[layer].label,
        ),
      );
      line(
        value === null
          ? this.language.text('Sin datos')
          : `${new Intl.NumberFormat(this.language.locale(), { maximumFractionDigits: 1 }).format(value)} ${this.layers[layer].unit}`,
        'strong',
      );
      const observed = new Intl.DateTimeFormat(this.language.locale(), {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(current.fecha_utc));
      line(`OpenWeather · ${observed} UTC`, 'small');
    } else return;
    if (existing) existing.setContent(content);
    else
      this.selectedMarker
        .bindPopup(content, {
          className: 'weather-point-popup',
          autoPan: true,
          autoPanPadding: [24, 24],
          maxWidth: 230,
          minWidth: 140,
        })
        .openPopup();
    this.selectedMarker
      .getPopup()
      ?.getElement()
      ?.querySelector('.leaflet-popup-close-button')
      ?.setAttribute('aria-label', this.language.text('Cerrar detalle'));
  }
}
