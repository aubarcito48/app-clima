export type IsaMouthShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface IsaMouthCue {
  start: number;
  end: number;
  value: IsaMouthShape;
}

/** Optional audio-relative visemes. Invalid metadata must not stop the voice. */
export function readIsaMouthTimeline(buffer: ArrayBuffer): IsaMouthCue[] {
  try {
    const view = new DataView(buffer);
    const tag = (offset: number) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    if (
      view.byteLength < 44 ||
      tag(0) !== 'RIFF' ||
      tag(8) !== 'WAVE' ||
      view.getUint32(4, true) + 8 !== view.byteLength
    )
      return [];
    let byteRate = 0,
      dataSize = 0,
      timeline: unknown;
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > view.byteLength) return [];
      if (tag(offset) === 'fmt ' && size >= 16) byteRate = view.getUint32(offset + 16, true);
      if (tag(offset) === 'data') dataSize = size;
      if (tag(offset) === 'isav') {
        if (size > 65536 || timeline !== undefined) return [];
        timeline = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            new Uint8Array(buffer, offset + 8, size),
          ),
        );
      }
      offset += 8 + size + (size % 2);
    }
    const duration = dataSize / byteRate;
    if (
      offset !== view.byteLength ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 90 ||
      !Array.isArray(timeline) ||
      !timeline.length ||
      timeline.length > 1500
    )
      return [];
    const cues: IsaMouthCue[] = [];
    let previous = 0;
    for (const item of timeline) {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        Object.keys(item).sort().join(',') !== 'end,start,value' ||
        typeof item.start !== 'number' ||
        typeof item.end !== 'number' ||
        !Number.isFinite(item.start) ||
        !Number.isFinite(item.end) ||
        typeof item.value !== 'string' ||
        !/^[A-HX]$/.test(item.value) ||
        item.start < 0 ||
        item.end <= item.start ||
        item.end > duration + 0.011 ||
        Math.abs(item.start - previous) > 0.011
      )
        return [];
      cues.push({ start: item.start, end: item.end, value: item.value as IsaMouthShape });
      previous = item.end;
    }
    return Math.abs(previous - duration) <= 0.021 ? cues : [];
  } catch {
    return [];
  }
}

export function isaMouthAt(cues: readonly IsaMouthCue[], seconds: number): IsaMouthShape {
  if (!Number.isFinite(seconds) || seconds < 0) return 'X';
  let low = 0,
    high = cues.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1,
      cue = cues[mid];
    if (seconds < cue.start) high = mid - 1;
    else if (seconds >= cue.end) low = mid + 1;
    else return cue.value;
  }
  return 'X';
}
