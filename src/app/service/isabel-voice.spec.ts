import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IsabelVoice } from './isabel-voice';

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

  it('reports blocked autoplay without sending another synthesis request', async () => {
    voice.setEnabled(true);
    FakeAudio.blocked = true;
    voice.speak('Hola');
    http.expectOne(() => true).flush(wav());
    await Promise.resolve();
    expect(voice.state()).toBe('blocked');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    http.expectNone(() => true);
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1);
    voice.setEnabled(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:isa-test');
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
});
