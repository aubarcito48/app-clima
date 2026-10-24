import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CityQuery } from '../models/city-query';
import { readClimateResponse } from '../models/climate-response';
import { serializeCityQuery } from '../shared/city-search/city-query';

@Injectable({
  providedIn: 'root',
})
export class ClimateApi {
  private readonly http = inject(HttpClient);
  search(query: CityQuery) {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/v1/clima/`, {
        params: new HttpParams({
          fromObject: Object.fromEntries(new URLSearchParams(serializeCityQuery(query))),
        }),
        timeout: 45000,
      })
      .pipe(map(readClimateResponse));
  }
}
