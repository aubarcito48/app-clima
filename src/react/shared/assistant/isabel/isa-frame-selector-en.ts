/** Approved English v2 whole-frame alignment. Spanish uses its own selector. */
import catalog from './isa-speech-selection-en.json';
import type { MouthCue } from './isa-mouth-cue';

const FPS = 24,
  FIRST = 12,
  END = 180,
  CYCLE = END - FIRST;
const MAX_DRIFT = 8,
  MIN_RUN = 4;
const fallbackShapes: Record<string, string> = { A: 'X', G: 'B', H: 'C' };
const mapped = (shape: string) => fallbackShapes[shape] ?? shape;
const shapes = catalog.sourceFrames.map((_, index) => {
  let nearest = 0;
  for (let i = 1; i < catalog.candidates.length; i++)
    if (Math.abs(index - catalog.candidates[i]) < Math.abs(index - catalog.candidates[nearest]))
      nearest = i;
  return catalog.labels[nearest];
});
const jumps = catalog.jumps as Record<string, { pose: number; motion: number }[]>;

interface State {
  index: number;
  run: number;
  cost: number;
  plan: number[];
}

export function selectEnglishSpeechFrames(
  cues: MouthCue[],
  start: number,
  duration: number,
): number[] {
  const count = Math.min(CYCLE, Math.max(1, Math.round(duration * FPS))),
    full = count === CYCLE;
  const baseline = Array.from({ length: count }, (_, i) => FIRST + i);
  if (!cues.length) return baseline;
  const wanted = Array.from({ length: count }, (_, i) =>
    mapped(
      cues.find((c) => c.start <= start + (i + 0.5) / FPS && start + (i + 0.5) / FPS < c.end)
        ?.value ?? 'X',
    ),
  );
  const emission = (index: number, t: number) =>
    shapes[index] === wanted[t] ? 0 : shapes[index] === 'X' || wanted[t] === 'X' ? 4 : 2;
  const baselineCost = baseline.reduce((cost, index, t) => cost + emission(index, t), 0);
  let states = new Map<string, State>([
    [
      `${FIRST}:4`,
      {
        index: FIRST,
        run: MIN_RUN,
        cost: emission(FIRST, 0),
        plan: [FIRST],
      },
    ],
  ]);
  for (let t = 1; t < count; t++) {
    const next = new Map<string, State>();
    for (const state of states.values())
      for (const step of [1, 0, 2]) {
        const index = state.index + step;
        if (index >= END || Math.abs(index - FIRST - t) > MAX_DRIFT) continue;
        if (full && index + (count - 1 - t) * 2 < END - 1) continue;
        if (full && t === count - 1 && index !== END - 1) continue;
        if (step !== 1 && (state.run < MIN_RUN || t < MIN_RUN || count - t < MIN_RUN)) continue;
        const jump = step === 2 ? jumps[String(state.index)]?.[0] : null;
        if (step === 2 && (!jump || jump.pose > 0.04 || jump.motion > 0.025)) continue;
        const run = step === 1 ? Math.min(MIN_RUN, state.run + 1) : 0;
        const cost =
          state.cost +
          emission(index, t) +
          (step === 1 ? 0 : 1.25) +
          (jump ? jump.pose * 30 + jump.motion * 40 : 0) +
          Math.abs(index - FIRST - t) * 0.03;
        const key = `${index}:${run}`,
          previous = next.get(key);
        if (!previous || cost < previous.cost)
          next.set(key, { index, run, cost, plan: [...state.plan, index] });
      }
    states = next;
  }
  const best = [...states.values()].sort((a, b) => a.cost - b.cost)[0];
  return best && best.cost < baselineCost ? best.plan : baseline;
}

/** Use the WAV's time directly; the selected plan already follows its cues. */
export function createEnglishPlayback(cues: MouthCue[], duration: number) {
  const cycles: number[][] = [];
  for (let start = 0; start < duration; start += CYCLE / FPS)
    cycles.push(selectEnglishSpeechFrames(cues, start, Math.min(CYCLE / FPS, duration - start)));
  return {
    cycles,
    sourceSecondsAt(time: number): number {
      const frame = Math.max(0, Math.min(duration, Number.isFinite(time) ? time : 0)) * FPS;
      const cycle = Math.min(cycles.length - 1, Math.floor(frame / CYCLE));
      const plan = cycles[cycle],
        position = Math.min(plan.length - 1e-6, frame - cycle * CYCLE);
      const i = Math.floor(position),
        fraction = position - i;
      // Interpolate the selected pair. Holds must not move forward and rewind;
      // the virtual last pair must continue smoothly into the next loop.
      const next = plan[i + 1] ?? Math.min(END, plan[i] + 1);
      return (cycle * CYCLE + plan[i] + (next - plan[i]) * fraction - FIRST) / FPS;
    },
  };
}
