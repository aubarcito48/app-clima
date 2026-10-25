import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, of, Subject, switchMap, tap } from 'rxjs';
import { CurrentLocation, LocationFailure } from '../../service/current-location';
import { ClimateApi } from '../../service/climate-api';
import { climateFeedback, climatePresentation } from '../../service/climate-presentation';
import { ClimateResponse } from '../../models/climate-response';
import { WeatherQuery, CitySearchFeedback } from '../../models/city-query';
import { WeatherPreview } from '../../models/weather-preview';
import { CitySearch } from '../../shared/city-search/city-search';
import { CurrentWeather } from '../../shared/current-weather/current-weather';
import { Forecast } from '../../shared/forecast/forecast';
import { WeatherIcon } from '../../shared/weather-icon/weather-icon';
import { WeatherLoading } from '../../shared/weather-loading/weather-loading';
import { WeatherSidebar } from '../../shared/weather-sidebar/weather-sidebar';
import { FavoritePlaces } from '../../service/favorite-places';
import { normalizeCityQuery, serializeWeatherQuery } from '../../shared/city-search/city-query';
@Component({
  selector: 'app-weather',
  imports: [CitySearch, CurrentWeather, Forecast, WeatherIcon, WeatherLoading, WeatherSidebar],
  templateUrl: './weather.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Weather {
  readonly sidebarCollapsed = signal(false);
  readonly favorites = inject(FavoritePlaces);
  toggleFavorite(): void {
    const location = this.response()?.ubicacion;
    if (location) this.favorites.toggle(location);
  }
  readonly temperatureUnit = signal<'C' | 'F'>('C');
  readonly today = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  readonly state = signal<'initial' | 'loading' | 'ready'>('initial');
  readonly weather = signal<WeatherPreview | null>(null);
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
        this.weather.set(result.data ? climatePresentation(result.data) : null);
        this.feedback.set(result.feedback);
        this.state.set(result.data ? 'ready' : 'initial');
      });
  }
  search(query: WeatherQuery): void {
    const normalized = 'city' in query ? normalizeCityQuery(query) : query;
    if ('city' in normalized && !normalized.city) return;
    const key = serializeWeatherQuery(normalized);
    if (this.state() === 'loading' && this.activeKey === key) return;
    this.activeKey = key;
    this.lastQuery = { ...normalized };
    this.cancelled.set(false);
    this.response.set(null);
    this.weather.set(null);
    this.feedback.set(null);
    this.locating.set(false);
    this.requestedCity.set('city' in normalized ? normalized.city : 'tu ubicación actual');
    this.state.set('loading');
    this.searches.next(normalized);
  }
  reset(): void {
    this.cancelled.set(this.state() === 'loading');
    this.searches.next(null);
    this.activeKey = '';
    this.locating.set(false);
    this.response.set(null);
    this.weather.set(null);
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
    this.weather.set(null);
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
