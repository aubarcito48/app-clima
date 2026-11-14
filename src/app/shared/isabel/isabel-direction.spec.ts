import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Isabel } from './isabel';

describe('Isa applies the voice performance to the existing portrait', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gives continuous speech priority over directed gaze, respects reduced motion and rests', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        decode() {
          return Promise.resolve();
        }
      },
    );
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    TestBed.configureTestingModule({
      imports: [Isabel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Isabel);
    await fixture.whenStable();
    // Dynamic import and decode complete asynchronously after first render.
    await vi.waitFor(() => expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy());
    await fixture.whenStable();
    const isa = fixture.componentInstance;
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    isa.voice.state.set('speaking');
    isa.voice.gesture.set('isa-right');
    await fixture.whenStable();
    expect(canvas.dataset['isaExpression']).toBe('isa-awake');
    expect(canvas.dataset['isaSpeaking']).toBe('true');
    isa.voice.gesture.set('isa-awake');
    await fixture.whenStable();
    expect(canvas.dataset['isaExpression']).toBe('isa-awake');
    isa.reducedMotion.set(true);
    isa.voice.gesture.set('isa-down');
    await fixture.whenStable();
    expect(canvas.dataset['isaExpression']).toBe('isa-awake');
    expect(canvas.dataset['isaAnimation']).toBe('');
    isa.voice.stop();
    await fixture.whenStable();
    expect(canvas.dataset['isaSpeaking']).toBe('false');
    fixture.destroy();
    expect(canvas.isConnected).toBe(false);
  });
});
