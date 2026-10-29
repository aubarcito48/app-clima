import {
  advanceAvatarPlayback,
  applyAmbientMotion,
  createAvatarPlaybackState,
  expressionFromDefinition,
  type Expression,
  playAvatarAnimation,
  renderAvatarExpression,
  sampleAvatarFrame,
  validateAvatarDefinition,
} from '@bible-strong/avatar-core';
import { mouthPaths } from './mouth-projection';
import { isaBehaviorDefinition } from './isabel-behavior';
import { speakingEyeOpenness } from './speaking-eyes';
import { transitionEyes } from './eye-transition';

const SVG_NS = 'http://www.w3.org/2000/svg';
let instance = 0;

// Un solo muestreo por frame: la boca comparte la pose exacta de cabeza y ojos.
export function createIsaAvatar(host: HTMLElement, input: unknown) {
  const parsed = validateAvatarDefinition(input);
  if (!parsed.ok) throw new Error('Invalid Isa avatar definition');
  const definition = isaBehaviorDefinition(parsed.value);
  const element = <K extends keyof SVGElementTagNameMap>(name: K) =>
    document.createElementNS(SVG_NS, name);
  const svg = element('svg');
  svg.setAttribute('viewBox', '-150 -150 300 300');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = svg.style.height = '100%';
  svg.style.display = 'block';
  const defs = element('defs');
  const clip = element('clipPath');
  clip.id = `isa-face-${++instance}`;
  const clipPath = element('path');
  clip.append(clipPath);
  defs.append(clip);
  const head = element('path');
  const face = element('g');
  face.setAttribute('clip-path', `url(#${clip.id})`);
  const left = element('path'),
    right = element('path');
  const mouth = element('g');
  mouth.setAttribute('data-isa-mouth', '');
  const lips = element('path');
  lips.setAttribute('stroke', '#fff2f6');
  lips.setAttribute('stroke-width', '3');
  lips.setAttribute('stroke-linecap', 'round');
  lips.setAttribute('stroke-linejoin', 'round');
  const tongue = element('path');
  tongue.setAttribute('fill', '#efa3bf');
  mouth.append(lips, tongue);
  face.append(left, right, mouth);
  const back = definition.body.nodes.map(() => element('path'));
  const front = definition.body.nodes.map(() => element('path'));
  svg.append(defs, ...back, head, face, ...front);
  host.append(svg);
  let state = { ...createAvatarPlaybackState(), activeExpression: 'isa-sleep' };
  let frameId: number | undefined;
  let destroyed = false,
    opening = 0;
  let frame = sampleAvatarFrame(definition, state, performance.now(), { random: Math.random });
  let pose = frame.expression;
  let speaking = false;
  let speakingSince = 0;
  let eyeTransition:
    { from: Expression; to: Expression; startedAt: number; duration: number } | undefined;
  const startEyeTransition = (key: string) => {
    const target = definition.expressions[key];
    if (!target) return;
    // El giro comparte los ojos del frente; no reiniciar su apertura al girar.
    const facing = ['isa-awake', 'isa-right', 'isa-down'];
    if (facing.includes(key) && facing.includes(state.activeExpression)) return;
    eyeTransition = {
      from: { ...pose },
      to: expressionFromDefinition(key, target),
      startedAt: performance.now(),
      duration: key === 'isa-sleep' ? 1500 : state.activeExpression === 'isa-sleep' ? 1100 : 550,
    };
  };
  const environment = () => ({
    random: Math.random,
    reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  });
  const drawMouth = () => {
    const paths = mouthPaths(definition.body.primary, pose, opening);
    lips.setAttribute('d', paths.lips);
    lips.setAttribute('fill', paths.open ? '#123047' : 'none');
    tongue.setAttribute('d', paths.lips ? paths.tongue : '');
    mouth.setAttribute('data-opening', opening.toFixed(2));
  };
  const draw = (now: number) => {
    const env = environment();
    frame = sampleAvatarFrame(definition, state, now, env);
    pose = env.reduceMotion ? frame.expression : applyAmbientMotion(frame.expression, now);
    let eyeProgress = 1;
    if (eyeTransition) {
      eyeProgress = Math.min(1, (now - eyeTransition.startedAt) / eyeTransition.duration);
      pose = transitionEyes(pose, eyeTransition.from, eyeTransition.to, eyeProgress);
      if (eyeProgress >= 1) eyeTransition = undefined;
    }
    svg.setAttribute('data-isa-eye-transition', eyeProgress.toFixed(3));
    const openness = speaking ? speakingEyeOpenness(now - speakingSince) : 1;
    if (openness < 1)
      pose = {
        ...pose,
        heightLeft: pose.heightLeft * openness,
        heightRight: pose.heightRight * openness,
      };
    svg.setAttribute('data-isa-eye-openness', openness.toFixed(3));
    const scene = renderAvatarExpression(
      definition,
      pose,
      frame.colors,
      speaking || eyeProgress < 1 ? 1 : frame.blink,
    );
    const geometry = scene.geometry;
    svg.setAttribute('data-isa-expression', state.activeExpression);
    svg.setAttribute('data-isa-animation', state.activeAnimation ?? '');
    clipPath.setAttribute('d', geometry.headPath);
    head.setAttribute('d', geometry.headPath);
    head.setAttribute('fill', scene.colors.body);
    for (const [path, d, visible] of [
      [left, geometry.leftPath, geometry.leftVisible],
      [right, geometry.rightPath, geometry.rightVisible],
    ] as const) {
      path.setAttribute('d', d);
      path.setAttribute('fill', scene.colors.eyes);
      path.setAttribute('opacity', visible ? '1' : '0');
    }
    back.forEach((path, index) => {
      path.setAttribute('d', geometry.backPaths[index] ?? '');
      path.setAttribute('fill', scene.colors.body);
    });
    front.forEach((path, index) => {
      path.setAttribute('d', geometry.frontPaths[index] ?? '');
      path.setAttribute('fill', scene.colors.body);
    });
    drawMouth();
  };
  const tick = (now: number) => {
    frameId = undefined;
    if (destroyed) return;
    state = advanceAvatarPlayback(definition, state, now, environment());
    draw(now);
    if (state.status === 'playing' || speaking || eyeTransition)
      frameId = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (frameId === undefined && !destroyed) frameId = requestAnimationFrame(tick);
  };
  draw(performance.now());
  return {
    play(animation: string) {
      const result = playAvatarAnimation(definition, animation, performance.now(), frame);
      if (!result.ok) return;
      startEyeTransition(definition.animations[animation].steps[0].expression);
      state = result.value;
      draw(performance.now());
      schedule();
    },
    setExpression(key: string) {
      if (!definition.expressions[key]) return;
      startEyeTransition(key);
      state = { ...createAvatarPlaybackState(), activeExpression: key };
      draw(performance.now());
      if (speaking || eyeTransition) schedule();
    },
    stop() {
      eyeTransition = undefined;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      frameId = undefined;
      state = createAvatarPlaybackState();
      draw(performance.now());
    },
    setMouthOpening(value: number) {
      opening = value;
      drawMouth();
    },
    setSpeaking(value: boolean) {
      if (speaking === value) {
        if (value) schedule();
        return;
      }
      speaking = value;
      if (value) speakingSince = performance.now();
      draw(performance.now());
      if (value) schedule();
    },
    destroy() {
      destroyed = true;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      svg.remove();
    },
  };
}
