import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
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
  readonly layer = signal<'temperature' | 'rain' | 'wind'>('temperature');
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map: LeafletMap | null = null;
  private overlay: TileLayer | null = null;
  private library: typeof import('leaflet') | null = null;
  private generation = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.location();
      untracked(() => {
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
          maxZoom: 8,
          zoomAnimation: false,
          fadeAnimation: false,
        })
        .setView([Math.max(-85, Math.min(85, place.latitud)), place.longitud], 5);
      leaflet
        .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          keepBuffer: 0,
          updateWhenIdle: true,
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
      this.updateLayer();
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
    this.layer.set(value as 'temperature' | 'rain' | 'wind');
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
      },
    );
    this.overlay.on('tileerror', () => this.failed.set(true));
    this.overlay.on('load', () => this.loading.set(false));
    this.overlay.addTo(this.map);
    this.overlay.bringToFront();
  }

  close(): void {
    this.generation++;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.overlay = null;
    this.opened.set(false);
    this.loading.set(false);
  }
}
