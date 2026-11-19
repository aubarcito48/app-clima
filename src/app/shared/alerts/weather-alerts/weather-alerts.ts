import { Translate } from '../../preferences/translate';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, merge, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { ClimateResponse } from '../../../models/weather/climate-response';
import { ALERT_SOURCES, AlertSeverity, WeatherAlertsResponse } from '../../../models/alerts/weather-alerts';
import { WeatherAlertsApi } from '../../../service/alerts/weather-alerts-api';
import { WeatherIcon } from '../../weather/weather-icon/weather-icon';
import { Language } from '../../../service/preferences/language';

type AlertsState = {
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  data: WeatherAlertsResponse | null;
};

@Component({
  selector: 'app-weather-alerts',
  imports: [Translate, WeatherIcon],
  templateUrl: './weather-alerts.html',
  styleUrl: './weather-alerts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherAlerts {
  readonly language = inject(Language);
  readonly location = input<ClimateResponse['ubicacion'] | null>(null);
  readonly source = computed(() => {
    const country = this.location()?.pais ?? '';
    return Object.hasOwn(ALERT_SOURCES, country) ? ALERT_SOURCES[country] : null;
  });
  private readonly api = inject(WeatherAlertsApi);
  private readonly refresh = new Subject<void>();
  readonly result = toSignal(
    toObservable(this.location).pipe(
      switchMap((location) =>
        location
          ? merge(timer(0, 180000), this.refresh).pipe(
              switchMap(() =>
                this.api.search(location).pipe(
                  map((data) => ({ status: 'ready', data }) as AlertsState),
                  catchError(() => of({ status: 'unavailable', data: null } as AlertsState)),
                  startWith({ status: 'loading', data: null } as AlertsState),
                ),
              ),
            )
          : of({ status: 'idle', data: null } as AlertsState),
      ),
    ),
    { initialValue: { status: 'idle', data: null } as AlertsState },
  );
  retry() {
    this.refresh.next();
  }
  severity(value: AlertSeverity): string {
    return {
      Extreme: 'Extrema',
      Severe: 'Alta',
      Moderate: 'Moderada',
      Minor: 'Baja',
      Unknown: 'No especificada',
    }[value];
  }
  localTime(value: string): string {
    const offset = this.location()?.desplazamiento_horario_segundos ?? 0;
    return new Intl.DateTimeFormat(this.language.locale(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hourCycle: 'h23',
    }).format(new Date(Date.parse(value) + offset * 1000));
  }
}
