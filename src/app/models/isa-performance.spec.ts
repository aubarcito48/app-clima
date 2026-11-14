import { describe, expect, it } from 'vitest';
import {
  isaGestureAt,
  isaSpeechTimeAt,
  readIsaSegments,
  readIsaTimeline,
  type IsaCue,
  type IsaSegment,
} from './isa-performance';
import { isaVoiceWav } from '../testing/isa-voice-fixture';
import { voiceEnvelope } from '../service/voice-envelope';
import { readClimateResponse } from './climate-response';
import { CLIMATE_FIXTURE } from '../testing/climate-fixture';
import { climatePresentation } from '../service/climate-presentation';

describe('Isa direction and sample-derived timing', () => {
  const cues: IsaCue[] = [
    { from: 0, speech_end: 2.7, until: 3, gesture: 'isa-down' },
    { from: 3, speech_end: 5.8, until: 6, gesture: 'isa-right' },
  ];
  const plan: IsaSegment[] = [
    { text: 'Llevá abrigo.', gesture: 'isa-down', speed: 0.9, energy: 0.85, pause_ms: 300 },
  ];

  it('preserves direction from the API to presentation and tolerates absent/invalid direction', () => {
    const source = structuredClone(CLIMATE_FIXTURE);
    source.recomendacion = { estado: 'disponible', texto: 'Llevá abrigo.', segmentos: plan };
    expect(climatePresentation(readClimateResponse(source)).advice?.segments).toEqual(plan);
    expect(readIsaSegments([{ ...plan[0], gesture: 'happy' }], 'Llevá abrigo.')).toBeUndefined();
    expect(readIsaSegments(plan, 'Un texto diferente.')).toBeUndefined();
    expect(readIsaSegments([{ ...plan[0], speed: NaN }], 'Llevá abrigo.')).toBeUndefined();
    const invalid = {
      ...source,
      recomendacion: { ...source.recomendacion, segmentos: [{ ...plan[0], gesture: 'happy' }] },
    };
    expect(climatePresentation(readClimateResponse(invalid)).advice?.text).toBe('Llevá abrigo.');
    expect(climatePresentation(readClimateResponse(invalid)).advice?.segments).toBeUndefined();
  });

  it('reads real cue boundaries without changing audio analysis and returns front between glances', () => {
    const audio = isaVoiceWav(cues);
    expect(readIsaTimeline(audio)).toEqual(cues);
    expect(voiceEnvelope(audio).length).toBeGreaterThan(0);
    expect(isaGestureAt(cues, 0.2)).toBe('isa-down');
    expect(isaGestureAt(cues, 1.3)).toBe('isa-awake');
    expect(isaGestureAt(cues, 2.8)).toBe('isa-down');
    expect(isaGestureAt(cues, 3)).toBe('isa-right');
    expect(isaGestureAt(cues, 6)).toBe('isa-awake');
    expect(isaGestureAt([], 1)).toBe('isa-awake');
  });

  it('ignores truncated, overlapping, unknown or out-of-audio cues', () => {
    expect(readIsaTimeline(isaVoiceWav(cues).slice(0, -10))).toEqual([]);
    for (const change of [{ from: 2 }, { gesture: 'happy' }, { until: 7 }, { speech_end: 2 }]) {
      expect(readIsaTimeline(isaVoiceWav([cues[0], { ...cues[1], ...change } as IsaCue]))).toEqual(
        [],
      );
    }
    expect(readIsaTimeline(new ArrayBuffer(0))).toEqual([]);
  });

  it('follows Piper pace on the audio clock without resetting between fragments', () => {
    const segments: IsaSegment[] = [
      { text: 'Primero.', gesture: 'isa-awake', speed: 0.8, energy: 1, pause_ms: 300 },
      { text: 'Después.', gesture: 'isa-awake', speed: 1.2, energy: 1, pause_ms: 200 },
    ];
    expect(isaSpeechTimeAt(cues, segments, 1)).toBeCloseTo(0.8);
    expect(isaSpeechTimeAt(cues, segments, 2.8)).toBeCloseTo(2.8 - 2.7 * 0.2);
    expect(isaSpeechTimeAt(cues, segments, 3)).toBeCloseTo(3 - 2.7 * 0.2);
    expect(isaSpeechTimeAt(cues, segments, 4)).toBeCloseTo(4 - 2.7 * 0.2 + 0.2);
    expect(isaSpeechTimeAt([], segments, 4)).toBe(4);
    expect(isaSpeechTimeAt(cues, [], 4)).toBe(4);
    expect(isaSpeechTimeAt(cues, segments, NaN)).toBe(0);
  });
});
