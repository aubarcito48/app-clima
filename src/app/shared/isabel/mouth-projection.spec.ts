import { describe, expect, it } from 'vitest';
import { expressionFromDefinition } from '@bible-strong/avatar-core';
import definition from './isabel.avatar.json';
import { mouthPaths, projectMouthPoint } from './mouth-projection';

describe('Isa mouth stays on the rotating face', () => {
  const surface = definition.body.primary as {
    type: 'sphere';
    width: number;
    height: number;
    depth: number;
    roundness: number;
  };
  const neutral = expressionFromDefinition(
    'neutral',
    definition.expressions.neutral as Parameters<typeof expressionFromDefinition>[1],
  );
  it('moves with yaw and tilts with roll instead of staying centered in the silhouette', () => {
    const left = projectMouthPoint(surface, { ...neutral, headY: -35 }, 0, 46);
    const right = projectMouthPoint(surface, { ...neutral, headY: 35 }, 0, 46);
    expect(left.x).toBeLessThan(-40);
    expect(right.x).toBeGreaterThan(40);
    expect(right.y).toBeCloseTo(left.y);
    const rolled = { ...neutral, headZ: 25 };
    const a = projectMouthPoint(surface, rolled, -14, 46);
    const b = projectMouthPoint(surface, rolled, 14, 46);
    expect(Math.abs(b.y - a.y)).toBeGreaterThan(10);
  });
  it('hides the mouth when facing away and keeps an open mouth on the visible face', () => {
    expect(mouthPaths(surface, { ...neutral, headY: 180 }, 0.8).lips).toBe('');
    for (const headY of [-45, 0, 45]) {
      const paths = mouthPaths(surface, { ...neutral, headY, headZ: 20, headX: 15 }, 0.8);
      expect(paths.lips).toContain('M');
      expect(paths.lips).not.toMatch(/NaN|Infinity/u);
      expect(paths.tongue).not.toBe('');
    }
  });
});
