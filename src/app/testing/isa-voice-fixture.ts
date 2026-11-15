import type { IsaCue } from '../models/isa-performance';

export function isaVoiceWav(cues: IsaCue[], duration = 6): ArrayBuffer {
  const sampleRate = 100;
  const dataSize = duration * sampleRate * 2;
  const metadata = new TextEncoder().encode(JSON.stringify(cues));
  const offset = 44 + dataSize;
  const buffer = new ArrayBuffer(offset + 8 + metadata.length + (metadata.length % 2));
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const tag = (offset: number, value: string) => bytes.set(new TextEncoder().encode(value), offset);
  tag(0, 'RIFF');
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  tag(36, 'data');
  tag(offset, 'isac');
  view.setUint32(4, buffer.byteLength - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, dataSize, true);
  view.setUint32(offset + 4, metadata.length, true);
  bytes.set(metadata, offset + 8);
  return buffer;
}

export function withIsaMouthCues(audio: ArrayBuffer, cues: unknown): ArrayBuffer {
  const payload = new TextEncoder().encode(JSON.stringify(cues));
  const result = new Uint8Array(audio.byteLength + 8 + payload.length + (payload.length % 2));
  result.set(new Uint8Array(audio));
  result.set(new TextEncoder().encode('isav'), audio.byteLength);
  const view = new DataView(result.buffer);
  view.setUint32(audio.byteLength + 4, payload.length, true);
  result.set(payload, audio.byteLength + 8);
  view.setUint32(4, result.byteLength - 8, true);
  return result.buffer;
}
