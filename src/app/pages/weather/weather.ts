import { Translate } from '../../shared/preferences/translate';
import { Router } from '@angular/router';
import { ScrollReveal } from '../../shared/site/scroll-reveal';
import { SectionNavigation } from '../../shared/site/section-navigation/section-navigation';
import { SiteFooter } from '../../shared/site/site-footer/site-footer';
import { Isabel } from '../../shared/assistant/isabel/isabel';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Language } from '../../service/preferences/language';
import { BackToTop } from '../../shared/site/back-to-top/back-to-top';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, of, Subject, switchMap, tap } from 'rxjs';
import { CurrentLocation, LocationFailure } from '../../service/places/current-location';
import { ClimateApi } from '../../service/weather/climate-api';
import { climateFeedback, climatePresentation } from '../../service/weather/climate-presentation';
import { ClimateResponse } from '../../models/weather/climate-response';
import { WeatherQuery, CitySearchFeedback } from '../../models/places/city-query';
import { WeatherPreview } from '../../models/weather/weather-preview';
import { CitySearch } from '../../shared/places/city-search/city-search';
import { CurrentWeather } from '../../shared/weather/current-weather/current-weather';
import { Forecast } from '../../shared/weather/forecast/forecast';
import { WeatherIcon } from '../../shared/weather/weather-icon/weather-icon';
import { WeatherLoading } from '../../shared/weather/weather-loading/weather-loading';
import { WeatherSidebar } from '../../shared/weather/weather-sidebar/weather-sidebar';
import { FavoritePlaces } from '../../service/places/favorite-places';
import { WeatherAlerts } from '../../shared/alerts/weather-alerts/weather-alerts';
import { WeatherMap } from '../../shared/weather/weather-map/weather-map';
import { WeatherMapLegend } from '../../shared/weather/weather-map-legend/weather-map-legend';
import { WeatherLayer } from '../../shared/weather/weather-map/map-layers';
import { WeatherDetails } from '../../shared/weather/weather-details/weather-details';
import { EmergencyContacts } from '../../shared/alerts/emergency-contacts/emergency-contacts';
import { ClimateAwareness } from '../../shared/weather/climate-awareness/climate-awareness';
import {
  normalizeCityQuery,
  serializeWeatherQuery,
} from '../../shared/places/city-search/city-query';
@Component({
  selector: 'app-weather',
  imports: [
    ScrollReveal,
    SectionNavigation,
    SiteFooter,
    Isabel,
    Translate,
    BackToTop,
    CitySearch,
    CurrentWeather,
    Forecast,
    WeatherIcon,
    WeatherLoading,
    WeatherSidebar,
    WeatherAlerts,
    WeatherMap,
    WeatherMapLegend,
    WeatherDetails,
    EmergencyContacts,
    ClimateAwareness,
  ],
  templateUrl: './weather.html',
  styleUrl: './weather.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Weather {
  readonly sections = [
    { id: 'inicio-clima', label: 'Inicio' },
    { id: 'pronostico', label: 'Buscar ciudad' },
    { id: 'clima-contenido', label: 'Clima y pronóstico' },
    { id: 'contactos-utiles', label: 'Contactos útiles' },
  ];
  readonly language = inject(Language);
  readonly favorites = inject(FavoritePlaces);
  toggleFavorite(): void {
    const location = this.response()?.ubicacion;
    if (location) this.favorites.toggle(location);
  }
  readonly temperatureUnit = signal<'C' | 'F'>('C');
  readonly mapLayer = signal<WeatherLayer>('temperature');
  readonly state = signal<'initial' | 'loading' | 'ready'>('initial');
  readonly weather = computed<WeatherPreview | null>(() => {
    const data = this.response();
    return data ? climatePresentation(data, this.language.locale()) : null;
  });
  readonly feedback = signal<CitySearchFeedback | null>(null);
  readonly requestedCity = signal('');
  readonly response = signal<ClimateResponse | null>(null);
  readonly cancelled = signal(false);
  readonly locating = signal(false);
  private readonly location = inject(CurrentLocation);
  private readonly api = inject(ClimateApi);
  private readonly searches = new Subject<WeatherQuery | 'current-location' | null>();
  private activeKey = '';
  private lastQuery: WeatherQuery | 'current-location' | null = null;
  constructor() {
    const place = inject(Router, { optional: true })?.currentNavigation()?.extras.state?.[
      'weatherPlace'
    ];
    let previousLanguage = this.language.code();
    effect(() => {
      const code = this.language.code();
      if (code === previousLanguage) return;
      previousLanguage = code;
      untracked(() => {
        if (this.lastQuery === 'current-location') this.locate();
        else if (this.lastQuery) this.search(this.lastQuery);
      });
    });
    this.searches
      .pipe(
        switchMap((query) =>
          query
            ? (query === 'current-location'
                ? this.location.get().pipe(
                    tap((coordinates) => {
                      this.locating.set(false);
                      this.lastQuery = coordinates;
                    }),
                    switchMap((coordinates) => this.api.search(coordinates)),
                  )
                : this.api.search(query)
              ).pipe(
                map((data) => ({ data, feedback: null })),
                catchError((error) =>
                  of({
                    data: null,
                    feedback:
                      error instanceof LocationFailure
                        ? {
                            kind: 'location' as const,
                            message:
                              error.reason === 'denied'
                                ? 'No diste permiso para usar tu ubicación. Podés habilitarlo en el navegador o escribir un lugar.'
                                : error.reason === 'timeout'
                                  ? 'No pudimos obtener tu ubicación a tiempo. Volvé a intentarlo o escribí un lugar.'
                                  : 'Tu navegador no pudo obtener la ubicación. Revisá sus permisos o escribí un lugar.',
                          }
                        : climateFeedback(error),
                  }),
                ),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.activeKey = '';
        this.locating.set(false);
        this.response.set(result.data);
        this.feedback.set(result.feedback);
        this.state.set(result.data ? 'ready' : 'initial');
      });
    if (
      place &&
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude) &&
      Math.abs(place.latitude) <= 90 &&
      Math.abs(place.longitude) <= 180
    ) {
      this.search({ latitude: place.latitude, longitude: place.longitude });
    }
  }
  search(query: WeatherQuery): void {
    const normalized = 'city' in query ? normalizeCityQuery(query) : query;
    if ('city' in normalized && !normalized.city) return;
    const key = `${serializeWeatherQuery(normalized)}:${this.language.code()}`;
    if (this.state() === 'loading' && this.activeKey === key) return;
    this.activeKey = key;
    this.lastQuery = { ...normalized };
    this.cancelled.set(false);
    this.response.set(null);
    this.feedback.set(null);
    this.locating.set(false);
    this.requestedCity.set('city' in normalized ? normalized.city : 'tu ubicación actual');
    this.state.set('loading');
    this.searches.next(normalized);
  }
  reset(): void {
    this.lastQuery = null;
    this.cancelled.set(this.state() === 'loading');
    this.searches.next(null);
    this.activeKey = '';
    this.locating.set(false);
    this.response.set(null);
    this.feedback.set(null);
    this.state.set('initial');
  }
  retry(): void {
    if (this.feedback()?.retryable && this.lastQuery && this.lastQuery !== 'current-location')
      this.search({ ...this.lastQuery });
  }
  editQuery(): void {
    this.searches.next(null);
    this.activeKey = '';
    this.lastQuery = null;
    this.locating.set(false);
    this.cancelled.set(false);
    this.response.set(null);
    this.feedback.set(null);
    this.state.set('initial');
  }
  locate(): void {
    this.editQuery();
    this.lastQuery = 'current-location';
    this.requestedCity.set('tu ubicación actual');
    this.locating.set(true);
    this.state.set('loading');
    this.searches.next('current-location');
  }
}
