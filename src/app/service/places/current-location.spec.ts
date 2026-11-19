import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurrentLocation } from './current-location';

describe('Location requested only on demand', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  function mockLocation() {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    return getCurrentPosition;
  }
  it('does not ask for permission until subscribed, preserves zero and sets a timeout', async () => {
    const get = mockLocation();
    const query = TestBed.inject(CurrentLocation).get();
    expect(get).not.toHaveBeenCalled();
    const result = firstValueFrom(query);
    get.mock.calls[0][0]({ coords: { latitude: 0, longitude: 0 } });
    expect(await result).toEqual({ latitude: 0, longitude: 0 });
    expect(get.mock.calls[0][2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ])('maps geolocation failure %s', async (code, reason) => {
    const get = mockLocation();
    const result = firstValueFrom(TestBed.inject(CurrentLocation).get());
    const assertion = expect(result).rejects.toMatchObject({ reason });
    get.mock.calls[0][1]({ code });
    await assertion;
  });
  it('ignores late coordinates after cancellation', () => {
    const get = mockLocation();
    const emit = vi.fn();
    const subscription = TestBed.inject(CurrentLocation).get().subscribe(emit);
    subscription.unsubscribe();
    get.mock.calls[0][0]({ coords: { latitude: -31, longitude: -64 } });
    expect(emit).not.toHaveBeenCalled();
  });
  it('bounds permission waiting and never opens geolocation in an insecure context', async () => {
    const get = mockLocation();
    vi.useFakeTimers();
    const result = firstValueFrom(TestBed.inject(CurrentLocation).get());
    const assertion = expect(result).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(12000);
    await assertion;
    vi.stubGlobal('isSecureContext', false);
    await expect(firstValueFrom(TestBed.inject(CurrentLocation).get())).rejects.toMatchObject({
      reason: 'unavailable',
    });
    expect(get).toHaveBeenCalledTimes(1);
  });
});
