import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClimateLocation } from '../models/climate-response';
import { readWeatherAlerts } from '../models/weather-alerts';

@Injectable({
  providedIn: 'root',
})
export class WeatherAlertsApi {
  private readonly http = inject(HttpClient);
  search(location: ClimateLocation) {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/v1/alertas/`, {
        params: { latitud: location.latitud, longitud: location.longitud, pais: location.pais },
        timeout: 20000,
      })
      .pipe(map((value) => readWeatherAlerts(value, location)));
  }
}
