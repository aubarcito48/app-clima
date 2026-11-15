import { describe, expect, it } from 'vitest';
import { isaVoiceWav, withIsaMouthCues } from '../testing/isa-voice-fixture';
import { isaMouthAt, readIsaMouthTimeline } from './isa-mouth';

const cues = [
  { start: 0, end: 1, value: 'A' },
  { start: 1, end: 5, value: 'D' },
  { start: 5, end: 6, value: 'X' },
];
const wav = (value: unknown = cues) => withIsaMouthCues(isaVoiceWav([]), value);

describe('Optional Rhubarb mouth timeline', () => {
  it('reads isav independently of performance metadata and selects audio boundaries', () => {
    const timeline = readIsaMouthTimeline(wav());
    expect(timeline).toEqual(cues);
    expect(isaMouthAt(timeline, 0.99)).toBe('A');
    expect(isaMouthAt(timeline, 1)).toBe('D');
    expect(isaMouthAt(timeline, 5)).toBe('X');
    expect(isaMouthAt(timeline, 6)).toBe('X');
    expect(isaMouthAt(timeline, Number.NaN)).toBe('X');
  });

  it('falls back on missing, duplicate or truncated metadata', () => {
    expect(readIsaMouthTimeline(isaVoiceWav([]))).toEqual([]);
    expect(readIsaMouthTimeline(withIsaMouthCues(wav(), cues))).toEqual([]);
    expect(readIsaMouthTimeline(wav().slice(0, -1))).toEqual([]);
  });

  it('rejects unknown shapes, gaps, backwards time, extra fields and incomplete coverage', () => {
    for (const invalid of [
      [{ start: 0, end: 6, value: 'AB' }],
      [{ start: false, end: 6, value: 'A' }],
      [{ start: -1, end: 6, value: 'A' }],
      [{ start: 0, end: 7, value: 'A' }],
      [{ start: 0, end: 5, value: 'A' }],
      [{ start: 0, end: 6, value: 'A', extra: 1 }],
      [
        { start: 0, end: 3, value: 'A' },
        { start: 2, end: 6, value: 'D' },
      ],
      [
        { start: 0, end: 3, value: 'A' },
        { start: 4, end: 6, value: 'D' },
      ],
    ])
      expect(readIsaMouthTimeline(wav(invalid))).toEqual([]);
  });
});
