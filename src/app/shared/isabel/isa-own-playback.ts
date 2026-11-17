import { defaults, planTiming, type Timing } from './isa-reviewed-planner.mjs';
import spanish from './isa-reviewed-catalog-es.json';
import english from './isa-reviewed-catalog-en.json';
import ranges from './isa-speech-ranges.json';
import type { MouthCue } from './isa-mouth-cue';
import { readIsaTimeline } from '../../models/isa-performance';

export function createOwnPlayback(buffer: ArrayBuffer, samples: Float64Array,
  rate: number, cues: MouthCue[], language: 'es' | 'en') {
  const duration = samples.length / rate;
  const envelope: number[] = [];
  const hop = Math.round(rate * .01);
  for (let start = 0; start < samples.length; start += hop) {
    let sum = 0;
    const end = Math.min(samples.length, start + hop);
    for (let i = start; i < end; i++) sum += samples[i] ** 2;
    envelope.push(Math.sqrt(sum / (end - start)));
  }
  const sorted = [...envelope].sort((a,b) => a-b);
  const threshold = Math.max(1e-5, Math.min(.003, sorted[Math.floor(sorted.length * .9)] * .025));
  const quiet: Timing['quiet_candidates'] = [];
  let from: number | undefined;
  for (let i = 0; i <= envelope.length; i++) {
    if (i < envelope.length && envelope[i] < threshold) { from ??= i; continue; }
    if (from !== undefined) {
      const start = from * hop / rate, end = Math.min(duration, i * hop / rate);
      if (end - start >= .04) quiet.push({start, end, duration_ms: (end - start) * 1000});
      from = undefined;
    }
  }
  const timing: Timing = {duration, envelope, quiet_threshold: threshold,
    inserted_pauses: readIsaTimeline(buffer).filter(c => c.until > c.speech_end)
      .map(c => ({start: c.speech_end, end: c.until})), quiet_candidates: quiet};
  const plan = planTiming(cues, timing, language === 'es' ? spanish : english,
    ranges[language], defaults[language]);
  return {engine: 'isa-rf-v2' as const, duration, pauses: [], micro: [], cycles: [plan.frames],
    sourceSecondsAt: plan.sourceSecondsAt};
}
