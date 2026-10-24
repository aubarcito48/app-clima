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
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Esta demo',
    );
    expect(fixture.nativeElement.querySelector('.temperature')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
