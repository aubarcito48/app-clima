import { describe, expect, it } from 'vitest';
import { speakingEyeOpenness } from './speaking-eyes';

describe('Speech eye overlay', () => {
  it('closes only twenty percent, twice at most, with a long pause between gestures', () => {
    expect(speakingEyeOpenness(0)).toBe(1);
    expect(speakingEyeOpenness(1000)).toBe(1);
    expect(speakingEyeOpenness(1800)).toBeCloseTo(0.8);
    expect(speakingEyeOpenness(2600)).toBe(1);
    expect(speakingEyeOpenness(5000)).toBe(1);
    expect(speakingEyeOpenness(7800)).toBeCloseTo(0.8);
    expect(speakingEyeOpenness(8600)).toBe(1);
    expect(speakingEyeOpenness(12000)).toBe(1);
    expect(speakingEyeOpenness(60000)).toBe(1);
  });
});
