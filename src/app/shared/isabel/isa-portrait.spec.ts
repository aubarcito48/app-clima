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

  it('loads speech only on demand, animates and closes on silence/stop', async () => {
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
    // Real pauses settle inside the same video, without replacing the whole body.
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(0.99);
    const pausedFrame = canvas.dataset['isaSpeechFrame'];
    await advance(20);
    expect(canvas.dataset['isaSpeechFrame']).toBe(pausedFrame);
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

  it('blends directed glances and resumes speech without restarting the video', async () => {
    controller!.play('isa-awake');
    await advance(160);
    controller!.setMouthOpening(.7);
    controller!.setSpeaking(true);
    await advance(60);
    const canvas = host.querySelector('canvas')!;
    const before = Number(canvas.dataset['isaSpeechFrame']);
    controller!.play('isa-down');
    await advance(60);
    expect(canvas.dataset['isaExpression']).toBe('isa-down');
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeLessThan(.01);
    controller!.play('isa-awake');
    await advance(160);
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBeGreaterThan(.9);
    expect(Number(canvas.dataset['isaSpeechFrame'])).toBeGreaterThan(before);
    expect(canvas.dataset['isaSpeaking']).toBe('true');
  });

  it('does not load speech or animate with reduced motion', async () => {
    controller!.setExpression('isa-awake');
    controller!.setSpeaking(true);
    controller!.setMouthOpening(1);
    await advance(10);
    expect(requests).toHaveLength(1);
    expect(callbacks.size).toBe(0);
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
