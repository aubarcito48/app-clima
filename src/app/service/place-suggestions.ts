import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlaceSuggestion } from '../models/city-query';
import { readClimateLocation } from '../models/climate-response';

@Injectable({
  providedIn: 'root',
})
export class PlaceSuggestions {
  private readonly http = inject(HttpClient);
  search(text: string) {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/v1/lugares/`, {
        params: { q: text },
        timeout: 8000,
      })
      .pipe(
        map((value) => {
          if (
            !value ||
            typeof value !== 'object' ||
            !('sugerencias' in value) ||
            !Array.isArray(value.sugerencias) ||
            value.sugerencias.length > 5
          )
            throw new Error('Sugerencias inválidas');
          const seen = new Set<number>();
          return value.sugerencias.map((row: unknown): PlaceSuggestion => {
            if (
              !row ||
              typeof row !== 'object' ||
              !('id' in row) ||
              !Number.isSafeInteger(row.id) ||
              Number(row.id) <= 0 ||
              seen.has(Number(row.id))
            )
              throw new Error('Lugar inválido');
            const place = readClimateLocation(row);
            seen.add(Number(row.id));
            return {
              id: Number(row.id),
              name: place.nombre,
              country: place.pais,
              region: place.region,
              latitude: place.latitud,
              longitude: place.longitud,
            };
          });
        }),
      );
  }
}
