import { describe, expect, it } from 'vitest';
import { validateAvatarDefinition } from '@bible-strong/avatar-core';
import original from './isabel.avatar.json';
import { isaBehaviorDefinition } from './isabel-behavior';
import {
  expressionFromDefinition,
  poseFromExpression,
  rotateWithQuaternion,
} from '@bible-strong/avatar-core';

describe('Isa expressions for her lifecycle', () => {
  it('looks down toward the content in the horizontal navbar without changing her awake eyes', () => {
    const source = validateAvatarDefinition(original);
    if (!source.ok) throw new Error('Invalid fixture');
    const definition = isaBehaviorDefinition(source.value);
    const down = definition.expressions['isa-down'];
    expect(validateAvatarDefinition(definition).ok).toBe(true);
    expect(down.eyes).toEqual(definition.expressions['isa-awake'].eyes);
    expect(down.motion).toEqual(definition.expressions['isa-awake'].motion);
    const pose = poseFromExpression(expressionFromDefinition('isa-down', down));
    const facing = rotateWithQuaternion(pose.orientation, [0, 0, 1]);
    expect(facing[0]).toBeCloseTo(0);
    expect(facing[1]).toBeGreaterThan(0);
    expect(definition.expressions['isa-right'].head).toEqual({ x: 0, y: 28, z: 0 });
  });
  it('keeps normal frontal eyes, enlarges them slightly for speech and closes them for sleep', () => {
    const source = validateAvatarDefinition(original);
    if (!source.ok) throw new Error('Invalid fixture');
    const definition = isaBehaviorDefinition(source.value);
    expect(validateAvatarDefinition(definition).ok).toBe(true);
    const front = definition.expressions['isa-front'];
    const speaking = definition.expressions['isa-speech-small-attentive'];
    expect(front.head).toEqual({ x: 0, y: 0, z: 0 });
    expect(front.eyes.left.height).toBeCloseTo(
      source.value.expressions['neutral'].eyes.left.height * 0.85,
    );
    expect(speaking.head).toEqual(front.head);
    expect(speaking.eyes.left.height / front.eyes.left.height).toBeCloseTo(1.12);
    expect(definition.expressions['isa-right'].head.y).toBeGreaterThan(0);
    expect(definition.expressions['isa-sleep'].eyes.left.height).toBe(5);
    expect(definition.animations['isa-sleep'].blink.enabled).toBe(false);
    const awake = definition.expressions['isa-awake'];
    expect(definition.expressions['isa-right'].eyes).toEqual(awake.eyes);
    expect(definition.expressions['isa-right'].motion).toEqual(awake.motion);
    expect(awake.head).toEqual({ x: 0, y: 0, z: 0 });
    expect(awake.eyes.left.width).toBeLessThan(
      source.value.expressions['surprised-left'].eyes.left.width,
    );
    expect(awake.eyes.left.width).toBeGreaterThan(front.eyes.left.width);
    expect(awake.eyes.left.height).toBe(
      source.value.expressions['surprised-left'].eyes.left.height,
    );
  });
});
