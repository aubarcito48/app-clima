export type IsaGesture = 'isa-awake' | 'isa-right' | 'isa-down';

export interface IsaSegment {
  text: string;
  gesture: IsaGesture;
  speed: number;
  energy: number;
  pause_ms: number;
}

export interface IsaCue {
  from: number;
  speech_end: number;
  until: number;
  gesture: IsaGesture;
}

function gesture(value: unknown): value is IsaGesture {
  return value === 'isa-awake' || value === 'isa-right' || value === 'isa-down';
}

// Optional direction must never prevent displaying otherwise valid weather.
export function readIsaSegments(value: unknown, text: string): IsaSegment[] | undefined {
  if (!Array.isArray(value) || !value.length || value.length > 4) return undefined;
  const bounded = (value: unknown, low: number, high: number): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  const segments: IsaSegment[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined;
    const part = item as Record<string, unknown>;
    if (
      typeof part['text'] !== 'string' ||
      !part['text'].trim() ||
      !gesture(part['gesture']) ||
      !bounded(part['speed'], 0.8, 1.2) ||
      !bounded(part['energy'], 0.65, 1.2) ||
      !bounded(part['pause_ms'], 0, 600) ||
      !Number.isInteger(part['pause_ms'])
    )
      return undefined;
    segments.push({
      text: part['text'],
      gesture: part['gesture'],
      speed: part['speed'],
      energy: part['energy'],
      pause_ms: part['pause_ms'],
    });
  }
  return segments.map((part) => part.text).join(' ') === text ? segments : undefined;
}

/** Read sample-derived cue times from the WAV's optional isac RIFF chunk. */
export function readIsaTimeline(buffer: ArrayBuffer): IsaCue[] {
  try {
    const view = new DataView(buffer);
    const tag = (offset: number) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    if (view.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return [];
    let duration = 0;
    let byteRate = 0;
    let dataSize = 0;
    let timeline: unknown;
    for (let offset = 12; offset + 8 <= view.byteLength;) {
      const size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > view.byteLength) return [];
      if (tag(offset) === 'fmt ' && size >= 16) byteRate = view.getUint32(offset + 16, true);
      if (tag(offset) === 'data') dataSize = size;
      if (tag(offset) === 'isac') {
        if (size > 4096 || timeline !== undefined) return [];
        timeline = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, size)));
      }
      offset += 8 + size + (size % 2);
    }
    duration = dataSize / byteRate;
    if (
      !Number.isFinite(duration) ||
      !duration ||
      duration > 90 ||
      !Array.isArray(timeline) ||
      !timeline.length ||
      timeline.length > 6
    )
      return [];
    const cues: IsaCue[] = [];
    let previous = 0;
    for (const item of timeline) {
      if (
        !item ||
        typeof item !== 'object' ||
        !gesture(item.gesture) ||
        ![item.from, item.speech_end, item.until].every(
          (value) => typeof value === 'number' && Number.isFinite(value),
        ) ||
        Math.abs(item.from - previous) > 0.001 ||
        item.speech_end <= item.from ||
        item.until < item.speech_end ||
        item.until - item.speech_end > 0.601 ||
        item.until > duration + 0.001
      )
        return [];
      cues.push({
        from: item.from,
        speech_end: item.speech_end,
        until: item.until,
        gesture: item.gesture,
      });
      previous = item.until;
    }
    return Math.abs(previous - duration) <= 0.001 ? cues : [];
  } catch {
    return [];
  }
}

export function isaGestureAt(cues: readonly IsaCue[], seconds: number): IsaGesture {
  const cue = cues.find((cue) => seconds >= cue.from && seconds < cue.until);
  if (!cue) return 'isa-awake';
  // A short glance, then front-facing speech; no invented side-facing lip sync.
  return seconds < Math.min(cue.from + 1.2, cue.speech_end) || seconds >= cue.speech_end
    ? cue.gesture
    : 'isa-awake';
}

/** Animation time follows actual audio time, weighted by Piper's segment pace.
 * Pauses keep moving at normal pace; no frame is held between phrases.
 * Without matching metadata, the audio clock remains the source of truth.
 */
export function isaSpeechTimeAt(
  cues: readonly IsaCue[],
  segments: readonly IsaSegment[],
  seconds: number,
): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  if (!cues.length || cues.length !== segments.length) return seconds;
  let time = seconds;
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const spoken = Math.max(0, Math.min(seconds, cue.speech_end) - cue.from);
    time += spoken * (segments[i].speed - 1);
    if (seconds < cue.until) break;
  }
  return Math.max(0, time);
}
