import { describe, expect, it } from 'vitest';
import { voiceEnvelope } from './voice-envelope';

describe('Isa mouth follows WAV energy', () => {
  it('distinguishes speech from silence and rejects malformed or unsupported audio', () => {
    const buffer = new ArrayBuffer(44 + 1920 * 2);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const tag = (offset: number, text: string) => bytes.set(new TextEncoder().encode(text), offset);
    tag(0, 'RIFF');
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    tag(36, 'data');
    view.setUint32(4, buffer.byteLength - 8, true);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint16(34, 16, true);
    view.setUint32(40, 1920 * 2, true);
    for (let sample = 0; sample < 960; sample++) view.setInt16(44 + sample * 2, 4000, true);
    const envelope = voiceEnvelope(buffer);
    expect(envelope).toHaveLength(2);
    expect(envelope[0]).toBeGreaterThan(0.5);
    expect(envelope[1]).toBe(0);
    expect(voiceEnvelope(buffer.slice(0, 43))).toHaveLength(0);
    view.setUint16(22, 2, true);
    expect(voiceEnvelope(buffer)).toHaveLength(0);
  });
});
