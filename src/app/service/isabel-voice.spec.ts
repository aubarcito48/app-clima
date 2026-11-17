import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IsabelVoice } from './isabel-voice';
import { isaVoiceWav } from '../testing/isa-voice-fixture';
import type { IsaSegment } from '../models/isa-performance';

class FakeAudio {
  static instances: FakeAudio[] = [];
  static blocked = false;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  currentTime = 0;
  duration = 10;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor(public src: string) {
    if (FakeAudio.blocked)
      this.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    FakeAudio.instances.push(this);
  }
}

describe('Isa voice playback lifecycle', () => {
  let voice: IsabelVoice;
  let http: HttpTestingController;
  const wav = () => new Blob([new Uint8Array(100)], { type: 'audio/wav' });
  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.blocked = false;
    vi.stubGlobal('Audio', FakeAudio);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:isa-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    voice = TestBed.inject(IsabelVoice);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    voice.stop();
    http.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts enabled, stays silent without advice and adds a greeting and farewell to the audio', () => {
    expect(voice.enabled()).toBe(true);
    voice.speak('');
    http.expectNone(() => true);
    voice.speak('Llevá abrigo.\nEn Córdoba refresca.');
    const request = http.expectOne((r) => r.url.endsWith('/api/v1/voz/'));
    expect(request.request.body).toEqual({
      texto: '¡Buenas, explorador!\nLlevá abrigo.\nEn Córdoba refresca.\n¡Hasta luego, explorador!',
    });
    expect(request.request.method).toBe('POST');
    expect(request.request.timeout).toBe(120000);
    expect(voice.state()).toBe('loading');
    request.flush(wav());
    FakeAudio.instances[0].onplaying?.();
    expect(voice.state()).toBe('speaking');
    FakeAudio.instances[0].currentTime = 5;
    FakeAudio.instances[0].ontimeupdate?.();
    expect(voice.progress()).toBe(0.5);
    FakeAudio.instances[0].onended?.();
    expect(voice.state()).toBe('idle');
    expect(voice.progress()).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:isa-test');
  });

  it('cancels pending synthesis when stopped and never starts the obsolete audio', () => {
    voice.setEnabled(true);
    voice.speak('Anterior');
    const old = http.expectOne(() => true);
    voice.speak('Actual');
    expect(old.cancelled).toBe(true);
    http.expectOne(() => true).flush(wav());
    expect(FakeAudio.instances).toHaveLength(1);
    voice.setEnabled(false);
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(voice.state()).toBe('idle');
    voice.speak('No debe hablar mientras está silenciada');
    http.expectNone(() => true);
  });

  it('uses audio time for directed glances, includes greetings and clears direction on mute', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const plan: IsaSegment[] = [
      { text: 'Llevá abrigo.', gesture: 'isa-down', speed: 0.9, energy: 0.8, pause_ms: 300 },
    ];
    voice.speak('Llevá abrigo.', 'es', plan);
    const request = http.expectOne(() => true);
    expect(request.request.body.segmentos).toHaveLength(3);
    expect(request.request.body.segmentos[1]).toEqual(plan[0]);
    expect(request.request.body.segmentos.map((part: IsaSegment) => part.text).join(' ')).toBe(
      request.request.body.texto.replace(/\n/gu, ' '),
    );
    request.flush(
      new Blob(
        [
          isaVoiceWav([
            { from: 0, speech_end: 1.8, until: 2, gesture: 'isa-awake' },
            { from: 2, speech_end: 3.7, until: 4, gesture: 'isa-down' },
            { from: 4, speech_end: 6, until: 6, gesture: 'isa-awake' },
          ]),
        ],
        { type: 'audio/wav' },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const audio = FakeAudio.instances[0];
    audio.currentTime = 2.2;
    audio.onplaying?.();
    expect(voice.gesture()).toBe('isa-down');
    expect(voice.speechTime()).toBeCloseTo(2.18);
    audio.currentTime = 3.4;
    frame?.(0);
    expect(voice.speechTime()).toBeCloseTo(3.26);
    expect(voice.gesture()).toBe('isa-awake');
    audio.currentTime = 3.8;
    frame?.(0);
    expect(voice.gesture()).toBe('isa-down');
    voice.setEnabled(false);
    expect(voice.gesture()).toBe('isa-awake');
    frame?.(0);
    expect(voice.state()).toBe('idle');
    expect(voice.speechTime()).toBe(0);
  });

  it('reports blocked autoplay without sending another synthesis request', async () => {
    voice.setEnabled(true);
    FakeAudio.blocked = true;
    voice.speak('Hola');
    http.expectOne(() => true).flush(wav());
    await vi.waitFor(() => expect(voice.state()).toBe('blocked'));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    http.expectNone(() => true);
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1);
    voice.resume();
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances).toHaveLength(1);
    http.expectNone(() => true);
    FakeAudio.instances[0].onplaying?.();
    expect(voice.state()).toBe('speaking');
    voice.setEnabled(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:isa-test');
  });

  it('retries busy synthesis once after Retry-After and exposes persistent busy', async () => {
    vi.useFakeTimers();
    voice.speak('Actual');
    const first = http.expectOne(() => true);
    first.flush(new Blob(), { status: 429, statusText: 'Busy', headers: { 'Retry-After': '5' } });
    expect(voice.waitingForVoice()).toBe(true);
    await vi.advanceTimersByTimeAsync(4999);
    http.expectNone(() => true);
    await vi.advanceTimersByTimeAsync(1);
    const retry = http.expectOne(() => true);
    expect(retry.request.body).toEqual(first.request.body);
    expect(voice.waitingForVoice()).toBe(false);
    retry.flush(new Blob(), { status: 429, statusText: 'Busy' });
    expect(voice.state()).toBe('busy');
    await vi.advanceTimersByTimeAsync(30000);
    http.expectNone(() => true);
  });

  it('cancels a queued busy retry on mute or replacement advice', async () => {
    vi.useFakeTimers();
    voice.speak('Anterior');
    http.expectOne(() => true).flush(new Blob(), { status: 429, statusText: 'Busy' });
    voice.speak('Nuevo');
    const next = http.expectOne(() => true);
    expect(next.request.body.texto).toContain('Nuevo');
    next.flush(new Blob(), { status: 429, statusText: 'Busy' });
    voice.setEnabled(false);
    await vi.advanceTimersByTimeAsync(30000);
    http.expectNone(() => true);
    expect(voice.state()).toBe('idle');
    expect(voice.waitingForVoice()).toBe(false);
  });

  it('does not retry other errors or shorten a long Retry-After', async () => {
    vi.useFakeTimers();
    for (const [status, wait] of [
      [503, '5'],
      [429, '120'],
      [429, 'invalid'],
    ]) {
      voice.speak('Consejo');
      http
        .expectOne(() => true)
        .flush(new Blob(), {
          status: Number(status),
          statusText: 'Unavailable',
          headers: { 'Retry-After': String(wait) },
        });
      expect(voice.state()).toBe(status === 429 ? 'busy' : 'error');
      await vi.advanceTimersByTimeAsync(30000);
      http.expectNone(() => true);
    }
  });

  it('cannot resume discarded audio or accept an old play rejection', async () => {
    let reject!: (reason: unknown) => void;
    voice.speak('Anterior');
    http.expectOne(() => true).flush(wav());
    const audio = FakeAudio.instances[0];
    audio.play.mockReturnValue(
      new Promise<void>((_, fail) => {
        reject = fail;
      }),
    );
    await vi.waitFor(() => expect(audio.play).toHaveBeenCalled());
    voice.stop();
    reject(new DOMException('blocked', 'NotAllowedError'));
    await Promise.resolve();
    voice.resume();
    expect(voice.state()).toBe('idle');
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('exposes a recoverable state when the server is unavailable or sends invalid audio', () => {
    voice.setEnabled(true);
    voice.speak('Hola');
    http.expectOne(() => true).flush(new Blob(), { status: 503, statusText: 'Unavailable' });
    expect(voice.state()).toBe('error');
    voice.speak('Hola');
    http.expectOne(() => true).flush(new Blob(['not wav'], { type: 'text/plain' }));
    expect(voice.state()).toBe('error');
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it('does not start audio after a cancelled asynchronous playback analysis', async () => {
    let finish!: (buffer: ArrayBuffer) => void;
    const pending = new Promise<ArrayBuffer>((resolve) => {
      finish = resolve;
    });
    const blob = wav();
    vi.spyOn(blob, 'arrayBuffer').mockReturnValue(pending);
    voice.speak('Anterior');
    http.expectOne(() => true).flush(blob);
    const audio = FakeAudio.instances[0];
    expect(audio.play).not.toHaveBeenCalled();
    voice.stop();
    finish(new ArrayBuffer(44));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(audio.play).not.toHaveBeenCalled();
    expect(voice.state()).toBe('idle');
  });
});
