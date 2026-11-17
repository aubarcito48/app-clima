import { describe, expect, it } from 'vitest';
import { createIsaPlayback } from './isa-playback';

function ownWav(): ArrayBuffer {
  const rate = 22050, pcm = new Uint8Array(rate * 2 * 2);
  const header = new Uint8Array(44), view = new DataView(header.buffer);
  const tag = (at: number, text: string) => header.set(new TextEncoder().encode(text), at);
  tag(0, 'RIFF'); tag(8, 'WAVE'); tag(12, 'fmt '); tag(36, 'data');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, pcm.length, true);
  const chunk = (name: string, value: unknown) => {
    const data = new TextEncoder().encode(JSON.stringify(value)), bytes = new Uint8Array(8 + data.length + data.length % 2);
    bytes.set(new TextEncoder().encode(name)); new DataView(bytes.buffer).setUint32(4, data.length, true); bytes.set(data, 8); return bytes;
  };
  const parts = [header, pcm, chunk('isav', [{ start: 0, end: 1, value: 'B' }, { start: 1, end: 2, value: 'X' }]), chunk('isam', { engine: 'isa-rf-v2' })];
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0; for (const part of parts) { result.set(part, at); at += part.length; }
  new DataView(result.buffer).setUint32(4, result.length - 8, true);
  return result.buffer;
}

describe('Production RF V2 playback', () => {
  it('selects the reviewed planner in both languages and keeps an absolute monotonic clock', () => {
    for (const language of ['es', 'en'] as const) {
      const playback = createIsaPlayback(ownWav(), language)!;
      expect(playback).toBeDefined(); expect('engine' in playback && playback.engine).toBe('isa-rf-v2');
      let previous = -1;
      for (let i = 0; i <= 240; i++) {
        const current = playback.sourceSecondsAt(i / 120);
        expect(Number.isFinite(current)).toBe(true); expect(current).toBeGreaterThanOrEqual(previous - 1e-8);
        previous = current;
      }
      const target = playback.sourceSecondsAt(.75);
      playback.sourceSecondsAt(1.9);
      expect(playback.sourceSecondsAt(.75)).toBe(target);
    }
  });
});
