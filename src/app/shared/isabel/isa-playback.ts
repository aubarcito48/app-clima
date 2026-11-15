import catalog from './isa-speech-selection.json';

export interface AudioPause {
  start: number;
  end: number;
}
interface MouthCue extends AudioPause {
  value: string;
}
interface ClockRow {
  time: number;
  phase: number;
  rate: number;
}
interface Jump {
  pose: number;
  motion: number;
}
interface PcmVoice {
  samples: Float64Array;
  rate: number;
  duration: number;
  cues: MouthCue[];
}

const FPS = 24;
const FIRST = 12;
const END = 192;
const CYCLE = END - FIRST;
const shapes = catalog.sourceFrames.map((_, index) => {
  let nearest = 0;
  for (let j = 1; j < catalog.candidates.length; j++) {
    if (Math.abs(index - catalog.candidates[j]) < Math.abs(index - catalog.candidates[nearest]))
      nearest = j;
  }
  return catalog.labels[nearest];
});
const jumps = catalog.jumps as Record<string, Jump[]>;
const fallbackShapes: Record<string, string> = { A: 'X', G: 'B', H: 'C' };
const mapped = (shape: string) => fallbackShapes[shape] ?? shape;
const evenRound = (value: number) =>
  value % 1 === 0.5 ? Math.floor(value) + (Math.floor(value) % 2) : Math.round(value);

function readPcm(buffer: ArrayBuffer): PcmVoice | undefined {
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 44 || buffer.byteLength > 4_100_000) return;
    const tag = (at: number) => String.fromCharCode(...new Uint8Array(buffer, at, 4));
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE' || view.getUint32(4, true) + 8 !== buffer.byteLength)
      return;
    let rate = 0,
      offset = 0,
      bytes = 0,
      raw: unknown;
    for (let at = 12; at + 8 <= buffer.byteLength;) {
      const size = view.getUint32(at + 4, true),
        end = at + 8 + size;
      if (end > buffer.byteLength) return;
      if (tag(at) === 'fmt ') {
        if (
          size < 16 ||
          rate ||
          view.getUint16(at + 8, true) !== 1 ||
          view.getUint16(at + 10, true) !== 1 ||
          view.getUint16(at + 22, true) !== 16
        )
          return;
        rate = view.getUint32(at + 12, true);
      } else if (tag(at) === 'data') {
        if (offset) return;
        offset = at + 8;
        bytes = size;
      } else if (tag(at) === 'isav') {
        if (raw !== undefined || size > 65536) return;
        raw = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, at + 8, size)));
      }
      at = end + (size % 2);
      if (at > buffer.byteLength || (at < buffer.byteLength && at + 8 > buffer.byteLength)) return;
    }
    if (
      !offset ||
      bytes % 2 ||
      rate !== 22050 ||
      !Array.isArray(raw) ||
      !raw.length ||
      raw.length > 1500
    )
      return;
    const duration = bytes / 2 / rate;
    if (duration <= 0 || duration > 90) return;
    const cues: MouthCue[] = [];
    let previous = 0;
    for (const row of raw) {
      if (
        !row ||
        typeof row !== 'object' ||
        !Number.isFinite(row.start) ||
        !Number.isFinite(row.end) ||
        row.start < 0 ||
        row.end <= row.start ||
        row.end > duration + 0.011 ||
        Math.abs(row.start - previous) > 0.011 ||
        typeof row.value !== 'string' ||
        !/^[ABCDEFGHX]$/.test(row.value)
      )
        return;
      cues.push({ start: row.start, end: row.end, value: row.value });
      previous = row.end;
    }
    if (Math.abs(previous - duration) > 0.021) return;
    const samples = Float64Array.from(
      { length: bytes / 2 },
      (_, i) => view.getInt16(offset + i * 2, true) / 32768,
    );
    return { samples, rate, duration, cues };
  } catch {
    return;
  }
}

function rmsFrames(samples: Float64Array, hop: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < samples.length; i += hop) {
    const end = Math.min(samples.length, i + hop);
    let sum = 0;
    for (let j = i; j < end; j++) sum += samples[j] ** 2;
    values.push(Math.sqrt(sum / (end - i)));
  }
  return values;
}

export function acousticPauses(
  samples: Float64Array,
  rate: number,
): { pauses: AudioPause[]; micro: AudioPause[] } {
  const duration = samples.length / rate,
    hop = evenRound(rate * 0.01),
    energy = rmsFrames(samples, hop);
  const sorted = [...energy].sort((a, b) => a - b),
    p = (sorted.length - 1) * 0.9;
  const reference =
    sorted[Math.floor(p)] + (sorted[Math.ceil(p)] - sorted[Math.floor(p)]) * (p % 1);
  const threshold = Math.max(
    10 ** (-50 / 20),
    Math.min(10 ** (-38 / 20), reference * 10 ** (-30 / 20)),
  );
  function detect(
    values: number[],
    stride: number,
    enter: number,
    exit: number,
    minimum: number,
    maximum: number,
    margin: number,
    neighbors: number,
    old: AudioPause[],
  ) {
    const found: AudioPause[] = [];
    let i = 0;
    while (i < values.length) {
      if (values[i] >= enter) {
        i++;
        continue;
      }
      const start = i++;
      while (i < values.length && values[i] < exit) i++;
      const a = (start * stride) / rate,
        b = Math.min(duration, (i * stride) / rate);
      if (b - a < minimum || b - a >= maximum || a < margin || b > duration - margin) continue;
      if (old.some((row) => a < row.end + 0.015 && b > row.start - 0.015)) continue;
      const before = values.slice(Math.max(0, start - neighbors), start),
        after = values.slice(i, i + neighbors);
      if (
        before.length &&
        after.length &&
        Math.max(...before) >= exit * 2 &&
        Math.max(...after) >= exit * 2
      )
        found.push({ start: a, end: b });
    }
    return found;
  }
  const pauses = detect(energy, hop, threshold, threshold * 2, 0.05, Infinity, 0.06, 12, []);
  const microHop = evenRound(rate * 0.005),
    microThreshold = Math.min(threshold * 0.5, 10 ** (-50 / 20));
  const micro = detect(
    rmsFrames(samples, microHop),
    microHop,
    microThreshold,
    microThreshold * 1.5,
    0.018,
    0.05,
    0.08,
    8,
    pauses,
  );
  return { pauses, micro };
}

function pauseLevel(pauses: AudioPause[], t: number): number {
  let amount = 0;
  for (const row of pauses) {
    if (t < row.start - 0.035 || t > row.end + 0.035) continue;
    const x = Math.max(
      0,
      Math.min(1, (t - row.start + 0.035) / 0.035, (row.end + 0.035 - t) / 0.035),
    );
    amount = Math.max(amount, x * x * (3 - 2 * x));
  }
  return amount;
}
function microLevel(gaps: AudioPause[], t: number): number {
  let amount = 0;
  for (const row of gaps) {
    const center = (row.start + row.end) / 2,
      half = Math.min(0.008, (row.end - row.start) / 4);
    const a = center - half,
      b = center + half;
    if (t < a - 0.008 || t > b + 0.008) continue;
    const x = Math.max(0, Math.min(1, (t - a + 0.008) / 0.008, (b + 0.008 - t) / 0.008));
    amount = Math.max(amount, x * x * (3 - 2 * x));
  }
  return amount;
}
export function clockAt(rows: ClockRow[], time: number): ClockRow {
  const t = Math.max(0, Math.min(rows.at(-1)!.time, time));
  let lo = 0,
    hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid].time < t) lo = mid + 1;
    else hi = mid;
  }
  if (!lo) return { time: t, phase: 0, rate: rows[0].rate };
  const a = rows[lo - 1],
    b = rows[lo],
    dt = t - a.time;
  const rate = a.rate + ((b.rate - a.rate) * dt) / (b.time - a.time);
  return { time: t, phase: a.phase + (dt * (a.rate + rate)) / 2, rate };
}
export function playbackClock(
  duration: number,
  pauses: AudioPause[],
  micro: AudioPause[],
): ClockRow[] {
  const baseline: ClockRow[] = [{ time: 0, phase: 0, rate: 1 }];
  let phase = 0,
    rate = 1;
  for (let n = 1; n <= Math.ceil(duration / 0.005); n++) {
    const time = Math.min(duration, n * 0.005),
      previous = baseline.at(-1)!,
      dt = time - previous.time;
    const level = pauseLevel(pauses, time),
      lag = Math.max(0, previous.time - phase);
    const budget = Math.max(0, Math.min(1, 1 - lag / 0.2));
    const target = 1 - 0.65 * 0.8 * level * budget + (1 - level) * Math.min(0.06, lag / 0.8) * 0.8;
    const next = rate + (target - rate) * (1 - Math.exp(-dt / 0.025));
    phase += (dt * (rate + next)) / 2;
    rate = next;
    baseline.push({ time, phase, rate });
  }
  if (!micro.length) return baseline;
  const rows: ClockRow[] = [{ time: 0, phase: 0, rate: 1 }];
  phase = 0;
  for (let n = 1; n <= Math.ceil(duration / 0.002); n++) {
    const time = Math.min(duration, n * 0.002),
      previous = rows.at(-1)!,
      dt = time - previous.time;
    const now = clockAt(baseline, time),
      before = clockAt(baseline, previous.time),
      lag = Math.max(0, before.phase - phase);
    const level = microLevel(micro, time),
      budget = Math.max(0, Math.min(1, 1 - lag / 0.08));
    const catchup = !level && !pauseLevel(pauses, time) ? Math.min(0.025, lag / 0.6) : 0;
    rate = Math.max(0, now.rate * (1 - level * budget) + catchup);
    phase += (dt * (previous.rate + rate)) / 2;
    rows.push({ time, phase, rate });
  }
  return rows;
}

export function speechCycle(cues: MouthCue[], start: number, duration: number): number[] {
  const count = Math.min(CYCLE, Math.max(1, Math.round(duration * FPS)));
  const baseline = Array.from({ length: count }, (_, i) => FIRST + i);
  // A complete native loop has no spare tail for forward skips. Keep it intact
  // instead of entering idle frames or making a new backwards seam.
  if (count === CYCLE || !cues.length) return baseline;
  const wanted = Array.from({ length: count }, (_, i) =>
    mapped(
      cues.find((c) => c.start <= start + (i + 0.5) / FPS && start + (i + 0.5) / FPS < c.end)
        ?.value ?? 'X',
    ),
  );
  const emission = (index: number, t: number) => Number(shapes[index] !== wanted[t]) * 2;
  const baselineCost = baseline.reduce((cost, frame, i) => cost + emission(frame, i), 0);
  interface State {
    index: number;
    run: number;
    cost: number;
    plan: number[];
  }
  let states = new Map<string, State>([
    [`${FIRST}:1`, { index: FIRST, run: 1, cost: emission(FIRST, 0), plan: [FIRST] }],
  ]);
  for (let t = 1; t < count; t++) {
    const next = new Map<string, State>();
    for (const state of states.values())
      for (let skip = 0; skip <= 2; skip++) {
        const index = state.index + 1 + skip;
        if (index >= END || index - FIRST - t > 12 || (skip && (state.run < 12 || count - t < 12)))
          continue;
        const jump = skip ? jumps[String(state.index)]?.[skip - 1] : undefined;
        if (skip && (!jump || jump.pose > 0.04 || jump.motion > 0.025)) continue;
        const run = skip ? 1 : Math.min(12, state.run + 1),
          key = `${index}:${run}`;
        const cost =
          state.cost +
          emission(index, t) +
          (jump ? 2 + skip * 0.6 + jump.pose * 30 + jump.motion * 40 : 0);
        const previous = next.get(key);
        if (!previous || cost < previous.cost)
          next.set(key, { index, run, cost, plan: [...state.plan, index] });
      }
    states = next;
  }
  const best = [...states.values()].sort((a, b) => a.cost - b.cost || a.index - b.index)[0];
  return best && best.cost < baselineCost ? best.plan : baseline;
}

/** Optional local playback analysis. Missing/invalid Rhubarb data keeps legacy playback. */
export function createIsaPlayback(buffer: ArrayBuffer) {
  const pcm = readPcm(buffer);
  if (!pcm) return undefined;
  const { pauses, micro } = acousticPauses(pcm.samples, pcm.rate);
  const rows = playbackClock(pcm.duration, pauses, micro),
    cycles: number[][] = [];
  for (let start = 0; start < pcm.duration; start += CYCLE / FPS)
    cycles.push(speechCycle(pcm.cues, start, Math.min(CYCLE / FPS, pcm.duration - start)));
  return {
    duration: pcm.duration,
    pauses,
    micro,
    cycles,
    sourceSecondsAt(time: number): number {
      if (!Number.isFinite(time)) return 0;
      const phase = clockAt(rows, time).phase,
        frame = Math.max(0, phase * FPS);
      const cycle = Math.min(cycles.length - 1, Math.floor(frame / CYCLE)),
        position = frame - cycle * CYCLE;
      const plan = cycles[cycle],
        i = Math.floor(position),
        fraction = position - i;
      const source = plan[Math.min(i, plan.length - 1)] + fraction;
      return (cycle * CYCLE + Math.min(END - FIRST - 1e-6, source - FIRST)) / FPS;
    },
  };
}
