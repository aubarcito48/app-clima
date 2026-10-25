import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, of, Subject, switchMap } from 'rxjs';
import { ClimateApi } from '../../service/climate-api';
import { climateFeedback, climatePresentation } from '../../service/climate-presentation';
import { ClimateResponse } from '../../models/climate-response';
import { CityQuery, CitySearchFeedback } from '../../models/city-query';
import { WeatherPreview } from '../../models/weather-preview';
import { CitySearch } from '../../shared/city-search/city-search';
import { CurrentWeather } from '../../shared/current-weather/current-weather';
import { Forecast } from '../../shared/forecast/forecast';
import { Recommendation } from '../../shared/recommendation/recommendation';
import { WeatherIcon } from '../../shared/weather-icon/weather-icon';
import { WeatherLoading } from '../../shared/weather-loading/weather-loading';
import { normalizeCityQuery, serializeCityQuery } from '../../shared/city-search/city-query';
@Component({
  selector: 'app-weather',
  imports: [CitySearch, CurrentWeather, Forecast, Recommendation, WeatherIcon, WeatherLoading],
  templateUrl: './weather.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class Weather {
  readonly state = signal<'initial' | 'loading' | 'ready'>('initial');
  readonly weather = signal<WeatherPreview | null>(null);
  readonly feedback = signal<CitySearchFeedback | null>(null);
  readonly requestedCity = signal('');
  readonly response = signal<ClimateResponse | null>(null);
  readonly cancelled = signal(false);
  private readonly api = inject(ClimateApi);
  private readonly searches = new Subject<CityQuery | null>();
  private activeKey = '';
  private lastQuery: CityQuery | null = null;
  constructor() {
    this.searches
      .pipe(
        switchMap((query) =>
          query
            ? this.api.search(query).pipe(
                map((data) => ({ data, feedback: null })),
                catchError((error) => of({ data: null, feedback: climateFeedback(error) })),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.activeKey = '';
        this.response.set(result.data);
        this.weather.set(result.data ? climatePresentation(result.data) : null);
        this.feedback.set(result.feedback);
        this.state.set(result.data ? 'ready' : 'initial');
      });
  }
  search(query: CityQuery): void {
    const normalized = normalizeCityQuery(query);
    if (!normalized.city) return;
    const key = serializeCityQuery(normalized);
    if (this.state() === 'loading' && this.activeKey === key) return;
    this.activeKey = key;
    this.lastQuery = { ...normalized };
    this.cancelled.set(false);
    this.response.set(null);
    this.weather.set(null);
    this.feedback.set(null);
    this.requestedCity.set(normalized.city);
    this.state.set('loading');
    this.searches.next(normalized);
  }
  reset(): void {
    this.cancelled.set(this.state() === 'loading');
    this.searches.next(null);
    this.activeKey = '';
    this.response.set(null);
    this.weather.set(null);
    this.feedback.set(null);
    this.state.set('initial');
  }
  retry(): void {
    if (this.feedback()?.retryable && this.lastQuery) this.search({ ...this.lastQuery });
  }
}
