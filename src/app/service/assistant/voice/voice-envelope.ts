export const VOICE_FRAME_SECONDS = 0.04;

// La API entrega WAV PCM16 mono. Analizarlo aquí evita conectar el reproductor
// a otro dispositivo de audio o depender de permisos de Web Audio.
export function voiceEnvelope(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const tag = (offset: number) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (view.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return new Float32Array();
  let sampleRate = 0;
  let dataOffset = 0;
  let dataSize = 0;
  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const size = view.getUint32(offset + 4, true);
    if (offset + 8 + size > view.byteLength) return new Float32Array();
    if (tag(offset) === 'fmt ') {
      if (
        size < 16 ||
        view.getUint16(offset + 8, true) !== 1 ||
        view.getUint16(offset + 10, true) !== 1 ||
        view.getUint16(offset + 22, true) !== 16
      )
        return new Float32Array();
      sampleRate = view.getUint32(offset + 12, true);
    } else if (tag(offset) === 'data') {
      dataOffset = offset + 8;
      dataSize = size;
    }
    offset += 8 + size + (size % 2);
  }
  if (!sampleRate || !dataOffset || dataSize % 2) return new Float32Array();
  const samplesPerFrame = Math.max(1, Math.round(sampleRate * VOICE_FRAME_SECONDS));
  const sampleCount = dataSize / 2;
  const envelope = new Float32Array(Math.ceil(sampleCount / samplesPerFrame));
  for (let frame = 0; frame < envelope.length; frame++) {
    const start = frame * samplesPerFrame;
    const end = Math.min(sampleCount, start + samplesPerFrame);
    let energy = 0;
    for (let sample = start; sample < end; sample++) {
      const amplitude = view.getInt16(dataOffset + sample * 2, true) / 32768;
      energy += amplitude * amplitude;
    }
    envelope[frame] = Math.min(1, Math.max(0, (Math.sqrt(energy / (end - start)) - 0.008) * 9));
  }
  return envelope;
}
