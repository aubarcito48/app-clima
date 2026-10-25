import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CitySearch } from './city-search';
import { PlaceSuggestions } from '../../service/place-suggestions';
import { of, Subject } from 'rxjs';
import { PlaceSuggestion } from '../../models/city-query';

describe('Unified place search', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [CitySearch],
      providers: [{ provide: PlaceSuggestions, useValue: { search: vi.fn(() => of([])) } }],
    }),
  );
  afterEach(() => vi.useRealTimers());
  it('has one input, no submit button and an explicit location action', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('input')).toHaveLength(1);
    expect(f.nativeElement.querySelector('[type="submit"]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Usar mi ubicación');
  });
  it('debounces suggestions without querying weather or AI for partial input', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    vi.useFakeTimers();
    const emit = vi.fn();
    f.componentInstance.querySubmitted.subscribe(emit);
    f.componentInstance.form.controls.city.setValue('Cór');
    f.componentInstance.onEdited();
    vi.advanceTimersByTime(100);
    f.componentInstance.form.controls.city.setValue('  Co\u0301rdoba,  Córdoba , ar ');
    f.componentInstance.onEdited();
    vi.advanceTimersByTime(299);
    expect(emit).not.toHaveBeenCalled();
    expect(TestBed.inject(PlaceSuggestions).search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(TestBed.inject(PlaceSuggestions).search).toHaveBeenCalledOnce();
    expect(emit).not.toHaveBeenCalled();
  });
  it('Enter submits immediately without a second delayed request', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    vi.useFakeTimers();
    const emit = vi.fn();
    f.componentInstance.querySubmitted.subscribe(emit);
    f.componentInstance.form.controls.city.setValue('Mendoza');
    f.componentInstance.onEdited();
    f.componentInstance.submit();
    vi.advanceTimersByTime(500);
    expect(emit).toHaveBeenCalledExactlyOnceWith({ city: 'Mendoza', country: '' });
  });
  it.each([' ', 'Córdoba,', 'x'.repeat(101)])(
    'does not submit incomplete input: %s',
    async (value) => {
      const f = TestBed.createComponent(CitySearch);
      await f.whenStable();
      const emit = vi.fn();
      f.componentInstance.querySubmitted.subscribe(emit);
      f.componentInstance.form.controls.city.setValue(value);
      f.componentInstance.submit();
      expect(emit).not.toHaveBeenCalled();
    },
  );
  it('does not query while composing input and cancels the timer for location', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    vi.useFakeTimers();
    const emit = vi.fn();
    const location = vi.fn();
    f.componentInstance.querySubmitted.subscribe(emit);
    f.componentInstance.locationRequested.subscribe(location);
    f.componentInstance.compositionStart();
    f.componentInstance.form.controls.city.setValue('Córdoba');
    f.componentInstance.onEdited();
    vi.advanceTimersByTime(1000);
    expect(emit).not.toHaveBeenCalled();
    f.componentInstance.compositionEnd();
    f.componentInstance.useLocation();
    vi.advanceTimersByTime(1000);
    expect(emit).not.toHaveBeenCalled();
    expect(location).toHaveBeenCalledOnce();
  });
  it('chooses a disambiguation candidate without separate region or country fields', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    const emit = vi.fn();
    f.componentInstance.querySubmitted.subscribe(emit);
    f.componentInstance.chooseLocation({
      label: 'Córdoba, Córdoba, AR',
      city: 'Córdoba',
      country: 'AR',
      region: 'Córdoba',
    });
    expect(emit).toHaveBeenCalledWith({ city: 'Córdoba', country: 'AR', region: 'Córdoba' });
    expect(f.componentInstance.form.controls.city.value).toBe('Córdoba, Córdoba, AR');
  });

  it('selects a suggestion using arrows and Enter, preserving its coordinates', async () => {
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    const emit = vi.fn();
    f.componentInstance.querySubmitted.subscribe(emit);
    f.componentInstance.suggestions.set([
      {
        id: 1,
        name: 'Córdoba',
        region: 'Córdoba',
        country: 'AR',
        latitude: -31.42,
        longitude: -64.18,
      },
    ]);
    f.componentInstance.onKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }),
    );
    expect(f.componentInstance.activeIndex()).toBe(0);
    f.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(emit).toHaveBeenCalledExactlyOnceWith({ latitude: -31.42, longitude: -64.18 });
    expect(f.componentInstance.popupVisible).toBe(false);
    expect(f.componentInstance.form.controls.city.value).toBe('Córdoba, Córdoba, AR');
    f.componentInstance.submit();
    expect(emit).toHaveBeenLastCalledWith({ latitude: -31.42, longitude: -64.18 });
  });

  it('ignores old suggestions after editing, and Escape closes the popup', async () => {
    const older = new Subject<PlaceSuggestion[]>();
    const newer = new Subject<PlaceSuggestion[]>();
    vi.mocked(TestBed.inject(PlaceSuggestions).search)
      .mockReturnValueOnce(older)
      .mockReturnValueOnce(newer);
    const f = TestBed.createComponent(CitySearch);
    await f.whenStable();
    f.componentInstance.focusCity();
    vi.useFakeTimers();
    f.componentInstance.form.controls.city.setValue('Cor');
    f.componentInstance.onEdited();
    vi.advanceTimersByTime(300);
    f.componentInstance.form.controls.city.setValue('Men');
    f.componentInstance.onEdited();
    vi.advanceTimersByTime(300);
    older.next([
      { id: 1, name: 'Córdoba', region: null, country: 'AR', latitude: -31, longitude: -64 },
    ]);
    expect(f.componentInstance.suggestions()).toHaveLength(0);
    newer.next([
      { id: 2, name: 'Mendoza', region: null, country: 'AR', latitude: -32, longitude: -68 },
    ]);
    expect(f.componentInstance.popupVisible).toBe(true);
    expect(f.componentInstance.suggestions()[0].name).toBe('Mendoza');
    f.componentInstance.onKeydown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );
    expect(f.componentInstance.popupVisible).toBe(false);
  });
});
