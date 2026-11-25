import type { Map as LeafletMap, TileLayer, CircleMarker } from 'leaflet';
import type { Subscription } from 'rxjs';
import type { ClimateLocation } from '../../../models/weather/climate-response';
import type { useLanguage } from '../../../hooks/useLanguage';
import { createMapPointApi, type MapPointWeather } from '../../../service/weather/map-point-api';
import { MAP_LAYERS, type WeatherLayer } from './map-layers';
import { apiBaseUrl } from '../../../api/http';
const environment={apiBaseUrl};
export class WeatherMapEngine {
opened=false; loading=false;failed=false;point:MapPointWeather|null=null;pointLoading=false;pointFailed=false;selected:{lat:number;lng:number}|null=null;
private document=globalThis.document;
readonly layers = MAP_LAYERS;
private pointRequest?: Subscription;
private selectedMarker: CircleMarker | null = null;
private locationKey = '';
private map: LeafletMap | null = null;
private overlay: TileLayer | null = null;
private library: typeof import('leaflet') | null = null;
private generation = 0;
private resizeObserver: ResizeObserver | null = null;
private api: ReturnType<typeof createMapPointApi>;
get language(){return this.languageGetter()}
constructor(private container:HTMLDivElement,private location:ClimateLocation,public layer:WeatherLayer,private languageGetter:()=>ReturnType<typeof useLanguage>,private notify:(state:{loading:boolean;failed:boolean})=>void){const shared=createMapPointApi();this.api={...shared,query:(lat,lng)=>shared.query(lat,lng,this.language.code)};this.locationKey=`${location.latitud}|${location.longitud}|${location.nombre}`;}
refreshPopup(){this.renderPointPopup()}
private update(patch:Partial<Pick<WeatherMapEngine,'opened'|'loading'|'failed'|'layer'|'point'|'pointLoading'|'pointFailed'|'selected'>>){Object.assign(this,patch);this.notify({loading:this.loading,failed:this.failed});this.renderPointPopup()}

    async open(): Promise<void> {
        if (this.opened)
            return;
        const generation = ++this.generation;
        this.update({ opened: true });
        this.update({ loading: true });
        this.update({ failed: false });
        try {
            const { default: leaflet } = await import('leaflet');
            if (generation !== this.generation)
                return;
            this.library = leaflet;
            const place = this.location;
            this.map = leaflet
                .map(this.container, {
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
                .on('tileerror', () => this.update({ failed: true }))
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
            if (selected)
                this.consultPoint(selected.lat, selected.lng);
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
                this.resizeObserver.observe(this.container);
            }
            requestAnimationFrame(() => this.map?.invalidateSize());
        }
        catch {
            if (generation === this.generation) {
                this.update({ failed: true });
                this.update({ loading: false });
            }
        }
    }
    changeLayer(value: string): void {
        if (!['temperature', 'rain', 'wind'].includes(value) || value === this.layer)
            return;
        this.update({ layer: value as WeatherLayer });
        this.updateLayer();
    }
    private updateLayer(): void {
        if (!this.map || !this.library)
            return;
        this.overlay?.remove();
        this.update({ failed: false });
        this.update({ loading: true });
        this.overlay = this.library.tileLayer(`${environment.apiBaseUrl}/api/v1/mapa/?layer=${this.layer}&z={z}&x={x}&y={y}`, {
            attribution: '<a href="https://openweathermap.org/">OpenWeather</a>',
            opacity: 0.7,
            keepBuffer: 0,
            updateWhenIdle: true,
            maxNativeZoom: 8,
            maxZoom: 18,
        });
        const overlay = this.overlay;
        this.overlay.on('tileerror', () => {
            if (this.overlay === overlay)
                this.update({ failed: true });
        });
        this.overlay.on('load', () => {
            if (this.overlay === overlay)
                this.update({ loading: false });
        });
        this.overlay.addTo(this.map);
        this.overlay.bringToFront();
    }
    close(): void {
        this.pointRequest?.unsubscribe();
        this.update({ point: null });
        this.update({ selected: null });
        this.update({ pointLoading: false });
        this.update({ pointFailed: false });
        this.selectedMarker = null;
        this.generation++;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.map?.remove();
        this.map = null;
        this.overlay = null;
        this.update({ opened: false });
        this.update({ loading: false });
    }
    consultPoint(latitude: number, longitude: number): void {
        this.pointRequest?.unsubscribe();
        const lat = Math.max(-85, Math.min(85, latitude));
        const lng = ((((longitude + 180) % 360) + 360) % 360) - 180;
        this.update({ selected: { lat, lng } });
        this.api.remember(this.locationKey, lat, lng);
        this.update({ point: null });
        this.update({ pointLoading: true });
        this.update({ pointFailed: false });
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
                this.update({ point: point });
                this.update({ pointLoading: false });
            },
            error: () => {
                this.update({ pointFailed: true });
                this.update({ pointLoading: false });
            },
        });
    }
    private renderPointPopup(): void {
        if (!this.selectedMarker || !this.map)
            return;
        const existing = this.selectedMarker.getPopup();
        if (existing && !this.map.hasLayer(existing))
            return;
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
        if (this.pointLoading) {
            line(this.language.text('Consultando este punto…'));
        }
        else if (this.pointFailed) {
            line(this.language.text('No se pudo consultar este punto. Podés volver a intentarlo.'));
            const retry = line(this.language.text('Reintentar consulta'), 'button') as HTMLButtonElement;
            retry.type = 'button';
            retry.addEventListener('click', () => {
                const coordinates = this.selected;
                if (coordinates)
                    this.consultPoint(coordinates.lat, coordinates.lng);
            });
        }
        else if (this.point) {
            const current = this.point!.actual;
            const layer = this.layer;
            const value = layer === 'temperature'
                ? current.temperatura_c
                : layer === 'wind'
                    ? current.viento_kmh
                    : current.lluvia_ultima_hora_mm;
            line(this.language.text(layer === 'rain' ? 'Lluvia en la última hora' : this.layers[layer].label));
            line(value === null
                ? this.language.text('Sin datos')
                : `${new Intl.NumberFormat(this.language.locale, { maximumFractionDigits: 1 }).format(value)} ${this.layers[layer].unit}`, 'strong');
            const observed = new Intl.DateTimeFormat(this.language.locale, {
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
