/** Spanish frame selection. Tune this policy independently of the other language. */
import catalog from './isa-speech-selection.json';
import ranges from './isa-speech-ranges.json';
import type { MouthCue } from './isa-mouth-cue';

interface Jump {
  pose: number;
  motion: number;
}
const FPS = 24;
function catalogData() {
  const selected = catalog;
  const shapes = selected.sourceFrames.map((_, index) => {
    let nearest = 0;
    for (let j = 1; j < selected.candidates.length; j++) {
      if (Math.abs(index - selected.candidates[j]) < Math.abs(index - selected.candidates[nearest]))
        nearest = j;
    }
    return selected.labels[nearest];
  });
  return { shapes, jumps: selected.jumps as Record<string, Jump[]> };
}
const fallbackShapes: Record<string, string> = { A: 'X', G: 'B', H: 'C' };
const mapped = (shape: string) => fallbackShapes[shape] ?? shape;

export function selectSpanishSpeechFrames(
  cues: MouthCue[],
  start: number,
  duration: number,
): number[] {
  const { first: FIRST, end: END } = ranges.es,
    CYCLE = END - FIRST;
  const { shapes, jumps } = catalogData();
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
