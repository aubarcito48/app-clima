import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Weather } from './weather';

describe('Weather preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [Weather] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('starts with labelled regions and no fabricated current data', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelectorAll('main')).toHaveLength(1);
    expect(view.querySelector('label[for="city"]')).toBeTruthy();
    expect(view.querySelector('input#city')).toBeTruthy();
    expect(view.querySelectorAll('h2')).toHaveLength(3);
    expect(view.querySelector('.temperature')).toBeNull();
    expect(view.textContent).toContain('datos ficticios');
  });

  it('shows the loading state, then the same example across all regions', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    const example = Array.from(view.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Córdoba',
    );
    example?.click();
    fixture.detectChanges();
    expect(view.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(view.querySelector('app-weather-loading')).toBeTruthy();
    expect(view.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(view.querySelector('[role="status"]')?.textContent).toContain('Córdoba');
    expect(view.querySelector('app-current-weather')?.textContent).toContain('24');
    expect(view.querySelector('app-forecast ol')?.children).toHaveLength(4);
    expect(view.querySelector('app-recommendation')?.textContent).toContain(
      'Para tu día en Córdoba',
    );
    expect(view.querySelector('app-recommendation')?.textContent).toContain(
      'Todavía no se genera con IA',
    );
  });

  it('removes the previous result during loading and does not mix examples', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.componentInstance.showExample();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    fixture.componentInstance.showExample({ city: 'Mendoza', country: 'AR' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-recommendation').textContent).toContain(
      'Mendoza',
    );
    expect(fixture.nativeElement.querySelector('app-current-weather').textContent).not.toContain(
      'Córdoba',
    );
  });

  it('cancels a pending example when returning to the initial state', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.componentInstance.showExample();
    fixture.componentInstance.reset();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('initial');
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
  });

  it('explains the demo limitation instead of inventing weather for another city', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.componentInstance.showExample({ city: 'Madrid', country: 'ES' });
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Esta demo',
    );
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
    expect(fixture.componentInstance.state()).toBe('initial');
  });

  it('keeps empty input from reaching the simulated search or changing current results', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.componentInstance.showExample();
    vi.advanceTimersByTime(1000);
    const previous = fixture.componentInstance.weather();
    fixture.componentInstance.showExample({ city: '  \t ', country: 'AR' });
    expect(fixture.componentInstance.state()).toBe('ready');
    expect(fixture.componentInstance.weather()).toBe(previous);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports refining an ambiguous city with a country while preserving user input', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    const city = view.querySelector<HTMLInputElement>('#city')!;
    city.value = '  Córdoba  ';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    view
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.feedback()?.kind).toBe('ambiguous');
    expect(city.value).toBe('  Córdoba  ');
    expect(document.activeElement).toBe(view.querySelector('#country'));
    const option = Array.from(view.querySelectorAll<HTMLButtonElement>('ul button')).find(
      (button) => button.textContent?.includes('Argentina'),
    );
    option!.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.feedback()).toBeNull();
    expect(view.querySelector('app-current-weather h3')?.textContent?.trim()).toBe('Córdoba');
    expect(city.value).toBe('  Córdoba  ');
  });

  it('lets users correct a simulated missing city without keeping stale errors', () => {
    const fixture = TestBed.createComponent(Weather);
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    const city = view.querySelector<HTMLInputElement>('#city')!;
    city.value = 'Ciudad inexistente';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    view
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.feedback()?.kind).toBe('not-found');
    expect(city.value).toBe('Ciudad inexistente');
    city.value = 'Mendoza';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.feedback()).toBeNull();
    expect(view.querySelector('[role="alert"]')).toBeNull();
    view
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(view.querySelector('app-current-weather h3')?.textContent?.trim()).toBe('Mendoza');
  });
});
