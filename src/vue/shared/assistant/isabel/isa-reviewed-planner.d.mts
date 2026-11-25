import type { MouthCue } from './isa-mouth-cue';
export interface Timing {
  duration: number;
  envelope: number[];
  quiet_threshold: number;
  inserted_pauses: {start: number; end: number}[];
  quiet_candidates: {start: number; end: number; duration_ms: number}[];
}
export const defaults: Record<'es' | 'en', Record<string, number | boolean>>;
export function planTiming(cues: MouthCue[], timing: Timing, catalog: unknown,
  range: {first: number; end: number}, options: Record<string, number | boolean>):
  {frames: number[]; wanted: string[]; sourceSecondsAt(time: number): number};
