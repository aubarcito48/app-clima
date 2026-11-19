import type { Expression } from '@bible-strong/avatar-core';

const EYE_FIELDS = [
  'widthLeft',
  'widthRight',
  'heightLeft',
  'heightRight',
  'spacing',
  'positionXLeft',
  'positionXRight',
  'positionYLeft',
  'positionYRight',
  'leftAngle',
  'rightAngle',
] as const;

export function transitionEyes(
  base: Expression,
  from: Expression,
  to: Expression,
  progress: number,
): Expression {
  const t = Math.max(0, Math.min(1, progress));
  const ease = t * t * t * (t * (t * 6 - 15) + 10);
  const pose = { ...base };
  for (const field of EYE_FIELDS) pose[field] = from[field] + (to[field] - from[field]) * ease;
  return pose;
}
