import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIsaPortrait } from './isa-portrait';

describe('Isa video speech lifecycle', () => {
  let now: number;
  let serial: number;
  let callbacks: Map<number, FrameRequestCallback>;
  let controller: Awaited<ReturnType<typeof createIsaPortrait>> | undefined;
  let host: HTMLElement;
  let failSpeech: boolean;
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
    requests.length = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(), drawImage: vi.fn(), globalAlpha: 1, globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('Image', class {
      src = '';
      decode() {
        requests.push(this.src);
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
    expect(Number(canvas.dataset['isaSpeechBlend'])).toBe(0);
    controller!.setSpeaking(false);
    await advance(5);
    expect(callbacks.size).toBe(0);
  });

  it('does not load speech or animate with reduced motion', async () => {
    controller!.setExpression('isa-awake');
    controller!.setSpeaking(true);
    controller!.setMouthOpening(1);
    await advance(10);
    expect(requests).toHaveLength(1);
    expect(callbacks.size).toBe(0);
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
