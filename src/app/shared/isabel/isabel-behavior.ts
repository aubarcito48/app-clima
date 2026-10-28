import type {
  AvatarDefinition,
  AvatarExpressionDefinition,
  AvatarAnimationDefinition,
} from '@bible-strong/avatar-core';

export function isaBehaviorDefinition(original: Readonly<AvatarDefinition>): AvatarDefinition {
  const definition = structuredClone(original);
  const front = structuredClone(definition.expressions['neutral']);
  front.head = { x: 0, y: 0, z: 0 };
  for (const eye of [front.eyes.left, front.eyes.right]) {
    eye.height *= 0.85;
    eye.x = 0;
    eye.y = -7;
    eye.angle = 0;
  }
  const sleep = structuredClone(front);
  sleep.head = { x: 5, y: 0, z: -3 };
  sleep.eyes.left.height = sleep.eyes.right.height = 5;
  sleep.eyes.left.width = sleep.eyes.right.width = 27;
  sleep.eyes.spacing += 4;
  sleep.motion = { eyes: 'none', body: 'slowDrift' };
  const awake = structuredClone(definition.expressions['surprised-left']);
  awake.head = { x: 0, y: 0, z: 0 };
  awake.eyes.left.width *= 0.64;
  awake.eyes.right.width *= 0.64;
  awake.eyes.left.angle = awake.eyes.right.angle = 0;
  const right = structuredClone(awake);
  right.head = { x: 0, y: 28, z: 0 };
  const expressions: Record<string, AvatarExpressionDefinition> = {
    'isa-awake': awake,
    'isa-front': front,
    'isa-sleep': sleep,
    'isa-right': right,
  };
  for (const key of ['joyful-wide', 'small-attentive', 'gentle-downward-gaze', 'attentive-left']) {
    const expression = structuredClone(front);
    for (const eye of [expression.eyes.left, expression.eyes.right]) {
      eye.width *= 1.12;
      eye.height *= 1.12;
    }
    // Conserva matices de atención/alegría con la mirada al frente.
    if (key === 'joyful-wide') {
      expression.eyes.left.height = front.eyes.left.height * 1.17;
      expression.eyes.right.height = front.eyes.right.height * 1.17;
    }
    if (key === 'gentle-downward-gaze') {
      expression.eyes.left.height = front.eyes.left.height * 1.05;
      expression.eyes.right.height = front.eyes.right.height * 1.05;
    }
    if (key === 'attentive-left') expression.eyes.left.angle = -4;
    expressions[`isa-speech-${key}`] = expression;
  }
  const blink = { ...definition.animations['idle'].blink, enabled: true };
  const hold = (expression: string, sleeping = false): AvatarAnimationDefinition => ({
    playbackMode: 'loop',
    steps: [{ expression, holdMs: 5000, transitionMs: 350, transition: 'smooth' }],
    blink: { ...blink, enabled: !sleeping },
  });
  const animations: Record<string, AvatarAnimationDefinition> = {
    'isa-awake': hold('isa-awake'),
    'isa-sleep': hold('isa-sleep', true),
    'isa-front': hold('isa-front'),
    'isa-right': hold('isa-right'),
  };
  for (const key of Object.keys(expressions).filter((key) => key.startsWith('isa-speech-')))
    animations[key] = hold(key);
  Object.assign(definition.expressions, expressions);
  Object.assign(definition.animations, animations);
  definition.expressionOrder.push(...Object.keys(expressions));
  definition.animationOrder.push(...Object.keys(animations));
  return definition;
}
