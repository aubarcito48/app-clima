import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { WeatherQuery } from '../models/city-query';
import { readClimateResponse } from '../models/climate-response';
import { serializeWeatherQuery } from '../shared/city-search/city-query';
import { Language } from './language';

@Injectable({
  providedIn: 'root',
})
export class ClimateApi {
  private readonly http = inject(HttpClient);
  private readonly language = inject(Language);
  search(query: WeatherQuery) {
    let params = new HttpParams({
      fromObject: Object.fromEntries(new URLSearchParams(serializeWeatherQuery(query))),
    });
    if (this.language.code() === 'en') params = params.set('idioma', 'en');
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/v1/clima/`, {
        params,
        timeout: 45000,
      })
      .pipe(map(readClimateResponse));
  }
}
