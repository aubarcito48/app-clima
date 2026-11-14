import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIsaPortrait } from './isa-portrait';

describe('Isa video speech lifecycle', () => {
  let now: number;
  let serial: number;
  let callbacks: Map<number, FrameRequestCallback>;
  let controller: Awaited<ReturnType<typeof createIsaPortrait>> | undefined;
  let host: HTMLElement;
  let failSpeech: boolean;
  let delaySecondPage: boolean;
  let releaseSecondPage: (() => void) | undefined;
  const requests: string[] = [];

  async function advance(frames: number) {
    for (let i = 0; i < frames; i++) {
      now += 1000 / 60;
      const batch = [...callbacks.values()];
      callbacks.clear();
      batch.forEach(callback => callback(now));
      await Promise.resolve();
    }
  }

  beforeEach(async () => {
    now = 0;
    serial = 0;
    callbacks = new Map();
    failSpeech = false;
    delaySecondPage = false;
    releaseSecondPage = undefined;
    requests.length = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(), drawImage: vi.fn(), globalAlpha: 1, globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('Image', class {
      src = '';
      decode() {
        requests.push(this.src);
        if (delaySecondPage && this.src.includes('isa-speech-v1-1.webp')) {
          return new Promise<void>(resolve => { releaseSecondPage = resolve; });
        }
        return failSpeech && this.src.includes('speech') ? Promise.reject(new Error('Offline')) : Promise.resolve();
      }
    });
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callbacks.set(++serial, callback);
      return serial;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    host = document.createElement('div');
    document.body.append(host);
    controller = await createIsaPortrait(host);
  });

  afterEach(() => {
    controller?.destroy();
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps speech moving through quiet gaps and closes only when playback ends', async () => {
    expect(requests).toHaveLength(1);
    controller!.play('isa-awake');
    await advance(160);
    controller!.setMouthOpening(0.6);
    controller!.setSpeaking(true);
    await advance(50);
    const canvas = host.querySelector('canvas')!;
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.9);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBeGreaterThan(0);
    controller!.setMouthOpening(0);
    await advance(35);
    // Even a long quiet gap must not pause and restart the speaking character.
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.99);
    const pausedFrame = canvas.dataset['isaSpeechFrame'];
    await advance(20);
    expect(canvas.dataset['isaSpeechFrame']).not.toBe(pausedFrame);
    controller!.setSpeaking(false);
    await advance(70);
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBe(0);
    expect(callbacks.size).toBe(0);
  });

  it('keeps native playback speed and the same video across short syllable gaps', async () => {
    controller!.play('isa-awake');
    await advance(160);
    controller!.setMouthOpening(0.7);
    controller!.setSpeaking(true);
    await advance(30);
    const canvas = host.querySelector('canvas')!;
    const start = Number(canvas.dataset['isaSpeechFrame']);
    for (let i = 0; i < 10; i++) {
      controller!.setMouthOpening(0);
      await advance(3);
      controller!.setMouthOpening(0.7);
      await advance(3);
      expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.99);
    }
    expect(Number(canvas.dataset['isaSpeechFrame']) - start).toBeGreaterThanOrEqual(23);
    expect(Number(canvas.dataset['isaSpeechFrame']) - start).toBeLessThanOrEqual(25);
  });

  it('keeps speaking when a gesture or loading update arrives mid-narration', async () => {
    controller!.play('isa-awake');
    await advance(160);
    controller!.setMouthOpening(.7);
    controller!.setSpeaking(true);
    await advance(60);
    const canvas = host.querySelector('canvas')!;
    const before = Number(canvas.dataset['isaSpeechFrame']);
    controller!.play('isa-down');
    controller!.setWorking(true);
    await advance(60);
    expect(canvas.dataset['isaExpression']).toBe('isa-awake');
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.99);
    controller!.play('isa-awake');
    await advance(160);
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.9);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBeGreaterThan(before);
    expect(canvas.dataset['isaSpeaking']).toBe('true');
  });

  it('enters speech during the initial turn without waiting at the neutral portrait', async () => {
    controller!.play('isa-right');
    controller!.setWorking(true);
    await advance(100);
    expect(requests.some(request => request.includes('isa-speech-v1-0'))).toBe(true);
    controller!.setWorking(false);
    controller!.setSpeaking(true);
    await advance(15);
    const canvas = host.querySelector('canvas')!;
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.85);
    expect(canvas.dataset['isaExpression']).toBe('isa-awake');
  });

  it('loops a long narration without playing the source intro or outro', async () => {
    controller!.setSpeaking(true);
    const canvas = host.querySelector('canvas')!;
    let wraps = 0;
    let previous = 12;
    for (let i = 0; i < 1500; i++) {
      await advance(1);
      const frame = Number(canvas.dataset['isaSpeechFrame']);
      expect(frame).toBeGreaterThanOrEqual(12);
      expect(frame).toBeLessThan(192);
      if (frame < previous) wraps++;
      if (i > 40) expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.99);
      previous = frame;
    }
    expect(wraps).toBeGreaterThanOrEqual(3);
  });

  it('does not load speech or animate with reduced motion', async () => {
    controller!.setExpression('isa-awake');
    controller!.setSpeaking(true);
    controller!.setMouthOpening(1);
    await advance(10);
    expect(requests).toHaveLength(1);
    expect(callbacks.size).toBe(0);
  });

  it('uses the audio clock across stalls, quiet gaps and loops instead of drifting', async () => {
    controller!.setSpeaking(true);
    controller!.setSpeechTime(1);
    await advance(60);
    const canvas = host.querySelector('canvas')!;
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBe(36);
    await advance(60);
    // A paused audio clock must not run ahead on a separate animation timer.
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBe(36);
    controller!.setSpeechTime(9);
    await advance(10);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBe(48);
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.99);
    controller!.setSpeechTime(NaN);
    controller!.setSpeechTime(-1);
    await advance(10);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBe(48);
  });

  it('holds the last speech image across a late atlas page instead of flashing neutral', async () => {
    delaySecondPage = true;
    controller!.play('isa-awake');
    await advance(160);
    controller!.setMouthOpening(0.7);
    controller!.setSpeaking(true);
    await advance(180);
    const canvas = host.querySelector('canvas')!;
    const waitingFrame = canvas.dataset['isaSpeechFrame'];
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.99);
    await advance(20);
    expect(canvas.dataset['isaSpeechFrame']).toBe(waitingFrame);
    expect(releaseSecondPage).toBeDefined();
    releaseSecondPage!();
    await advance(30);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBeGreaterThan(Number(waitingFrame));
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.99);
  });

  it('keeps the portrait usable if speech images fail and releases work on destroy', async () => {
    failSpeech = true;
    controller!.play('isa-awake');
    await advance(160);
    controller!.setSpeaking(true);
    controller!.setMouthOpening(1);
    await advance(30);
    expect(Number(host.querySelector('canvas')!.dataset['isaSpeechBlend'])).toBe(0);
    controller!.destroy();
    expect(callbacks.size).toBe(0);
    expect(host.querySelector('canvas')).toBeNull();
    controller = undefined;
  });

  it('suspends animation when the page is hidden and resumes when visible', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    controller!.play('isa-awake');
    await advance(160);
    controller!.setSpeaking(true);
    controller!.setMouthOpening(0.5);
    await advance(20);
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callbacks.size).toBe(0);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callbacks.size).toBe(1);
  });
});
