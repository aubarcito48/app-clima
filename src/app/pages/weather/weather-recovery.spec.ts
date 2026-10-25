import { EMPTY } from 'rxjs';
import { WeatherAlertsApi } from '../../service/weather-alerts-api';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ClimateApi } from '../../service/climate-api';
import { CLIMATE_FIXTURE } from '../../testing/climate-fixture';
import { Weather } from './weather';

describe('Recovery and accessible interactions (TK08)', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Weather],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WeatherAlertsApi, useValue: { search: () => EMPTY } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it.each([429, 503, 0])(
    'ends loading after %s and retries the exact normalized query once',
    async (status) => {
      const fixture = TestBed.createComponent(Weather);
      await fixture.whenStable();
      fixture.componentInstance.search({ city: ' Córdoba ', country: 'ar', region: ' Córdoba ' });
      const req = http.expectOne(() => true);
      if (status === 0) req.error(new ProgressEvent('error'));
      else req.flush({ mensaje: 'PRIVATE-ERROR' }, { status, statusText: 'Error' });
      await fixture.whenStable();
      const view: HTMLElement = fixture.nativeElement;
      expect(view.querySelector('[aria-busy="true"]')).toBeNull();
      expect(view.querySelector('app-weather-loading')).toBeNull();
      expect(view.querySelector('[role="alert"]')).not.toBeNull();
      expect(view.textContent).not.toContain('PRIVATE-ERROR');
      expect(document.activeElement).toBe(view.querySelector('[aria-labelledby="search-feedback"]'));
      const retry = Array.from(view.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === 'Reintentar consulta',
      )!;
      retry.click();
      const next = http.expectOne(() => true);
      expect(next.request.params.get('ciudad')).toBe('Córdoba');
      expect(next.request.params.get('pais')).toBe('AR');
      expect(next.request.params.get('region')).toBe('Córdoba');
      expect(fixture.componentInstance.state()).toBe('loading');
      next.flush(CLIMATE_FIXTURE);
      await fixture.whenStable();
      expect(fixture.componentInstance.state()).toBe('ready');
      expect(view.querySelector('[role="alert"]')).toBeNull();
    },
  );

  it('offers a retry after timeout without leaving loading active', async () => {
    const search = vi
      .spyOn(TestBed.inject(ClimateApi), 'search')
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 0,
              error: new DOMException('private details', 'TimeoutError'),
            }),
        ),
      )
      .mockReturnValueOnce(of(CLIMATE_FIXTURE));
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    await fixture.whenStable();
    expect(fixture.componentInstance.feedback()?.kind).toBe('timeout');
    expect(fixture.nativeElement.textContent).toContain('Se agotó el tiempo de espera');
    expect(fixture.nativeElement.querySelector('app-weather-loading')).toBeNull();
    fixture.componentInstance.retry();
    await fixture.whenStable();
    expect(search).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.state()).toBe('ready');
  });

  it('focuses a missing city for correction and never keeps the previous weather', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush(CLIMATE_FIXTURE);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('#city') as HTMLInputElement;
    input.value = 'Ciudad inexistente';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http
      .expectOne(() => true)
      .flush({ codigo: 'CIUDAD_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Ciudad inexistente');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
    expect(fixture.nativeElement.querySelector('#advice-text')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Corregir búsqueda');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar consulta');
  });

  it('focuses the unified input when Django reports a region error', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http
      .expectOne(() => true)
      .flush({ errores: { region: ['invalid'] } }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    const region = fixture.nativeElement.querySelector('#city') as HTMLInputElement;
    expect(document.activeElement).toBe(region);
    expect(region.getAttribute('aria-invalid')).toBe('true');
    expect(region.getAttribute('aria-describedby')).toContain('search-feedback');
  });

  it('treats an unknown 404 as a service error instead of declaring the city nonexistent', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush('Not Found', { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(fixture.componentInstance.feedback()?.kind).toBe('unavailable');
    expect(fixture.componentInstance.feedback()?.retryable).toBe(true);
  });

  it('cancels from the UI, announces cancellation and returns focus to the city', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    const pending = http.expectOne(() => true);
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    const cancel = Array.from(view.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Cancelar búsqueda'),
    )!;
    cancel.click();
    await fixture.whenStable();
    expect(pending.cancelled).toBe(true);
    expect(document.activeElement).toBe(view.querySelector('#city'));
    expect(view.querySelector('[role="status"]')?.textContent).toContain('Búsqueda cancelada');
    expect(view.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('removes recovery for an old query as soon as the input is edited', async () => {
    const fixture = TestBed.createComponent(Weather);
    await fixture.whenStable();
    fixture.componentInstance.search({ city: 'Córdoba', country: 'AR' });
    http.expectOne(() => true).flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('#city') as HTMLInputElement;
    input.value = 'Mendoza';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    fixture.componentInstance.retry();
    http.expectNone(() => true);
  });
});
