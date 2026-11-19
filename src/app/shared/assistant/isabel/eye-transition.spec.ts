import { describe, expect, it } from 'vitest';
import { expressionFromDefinition } from '@bible-strong/avatar-core';
import definition from './isabel.avatar.json';
import { transitionEyes } from './eye-transition';

describe('Gradual eyelid transitions', () => {
  it('passes through intermediate sizes without moving the head or changing the targets', () => {
    const open = expressionFromDefinition(
      'neutral',
      definition.expressions.neutral as Parameters<typeof expressionFromDefinition>[1],
    );
    const closed = { ...open, heightLeft: 5, heightRight: 5, spacing: 33 };
    const headTurned = { ...open, headY: 28 };
    expect(transitionEyes(headTurned, closed, open, 0).heightLeft).toBe(5);
    const middle = transitionEyes(headTurned, closed, open, 0.5);
    expect(middle.heightLeft).toBeGreaterThan(5);
    expect(middle.heightLeft).toBeLessThan(open.heightLeft);
    expect(middle.headY).toBe(28);
    expect(transitionEyes(headTurned, closed, open, 1).heightLeft).toBe(open.heightLeft);
    expect(transitionEyes(headTurned, open, closed, 1).heightLeft).toBe(5);
    expect(open.heightLeft).toBe(definition.expressions.neutral.eyes.left.height);
  });
});
