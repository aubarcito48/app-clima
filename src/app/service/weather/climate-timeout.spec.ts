import { XhrFactory } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClimateApi } from './climate-api';
import { climateFeedback } from './climate-presentation';

describe('Client timeout without external network (TK08)', () => {
  afterEach(() => vi.useRealTimers());
  it('sets a 45-second XHR timeout and handles the timeout event as recoverable', async () => {
    vi.useFakeTimers();
    class TimeoutTransport extends EventTarget {
      timeout = 0;
      status = 0;
      statusText = '';
      readyState = 1;
      DONE = 4;
      responseType = '';
      aborted = false;
      timer: ReturnType<typeof setTimeout> | undefined;
      open = vi.fn();
      setRequestHeader = vi.fn();
      getAllResponseHeaders() {
        return '';
      }
      send() {
        this.timer = setTimeout(
          () => this.dispatchEvent(new ProgressEvent('timeout')),
          this.timeout,
        );
      }
      abort() {
        this.aborted = true;
        clearTimeout(this.timer);
      }
    }
    const transport = new TimeoutTransport();
    const build = vi.fn(() => transport as unknown as XMLHttpRequest);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: XhrFactory, useValue: { build } }],
    });
    const result = firstValueFrom(
      TestBed.inject(ClimateApi).search({ city: 'Córdoba', country: 'AR' }),
    ).catch((error) => climateFeedback(error));
    expect(transport.timeout).toBe(45000);
    await vi.advanceTimersByTimeAsync(45000);
    expect(await result).toMatchObject({ kind: 'timeout', retryable: true });
    expect(build).toHaveBeenCalledTimes(1);
    expect(transport.aborted).toBe(true);
  });
});
