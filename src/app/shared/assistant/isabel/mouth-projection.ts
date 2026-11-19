import {
  poseFromExpression,
  rotateWithQuaternion,
  surfaceFrontSampleAt,
  type Expression,
  type SurfaceConfig,
} from '@bible-strong/avatar-core';

export function projectMouthPoint(
  surface: SurfaceConfig,
  expression: Expression,
  x: number,
  y: number,
) {
  // Misma superficie facial, quaternion y perspectiva que los ojos originales.
  const sample = surfaceFrontSampleAt(
    surface,
    120 * Math.cos(y / 120) * Math.sin(x / 120),
    120 * Math.sin(y / 120),
  );
  const orientation = poseFromExpression(expression).orientation;
  const point = rotateWithQuaternion(orientation, sample.point);
  const normal = rotateWithQuaternion(orientation, sample.normal);
  const scale = 620 / Math.max(0.0001, 620 - point[2] * expression.perspective);
  return { x: point[0] * scale, y: point[1] * scale, visible: normal[2] > 0.02 };
}

export function mouthPaths(surface: SurfaceConfig, expression: Expression, opening: number) {
  const open = opening > 0.05;
  const height = 6 + Math.max(0, Math.min(1, opening)) * 20;
  const path = (points: [number, number][], close: boolean) => {
    const projected = points.map(([x, y]) => projectMouthPoint(surface, expression, x, y));
    if (projected.some((point) => !point.visible)) return '';
    return (
      projected
        .map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(3)} ${point.y.toFixed(3)}`)
        .join(' ') + (close ? ' Z' : '')
    );
  };
  const ellipse = (rx: number, cy: number, ry: number): [number, number][] =>
    Array.from({ length: 48 }, (_, index) => {
      const angle = (index * Math.PI * 2) / 48;
      return [rx * Math.cos(angle), cy + ry * Math.sin(angle)];
    });
  const smile: [number, number][] = Array.from({ length: 25 }, (_, index) => {
    const x = -14 + (index * 28) / 24;
    return [x, 46 + 6 * (1 - (x / 14) ** 2)];
  });
  return {
    lips: path(open ? ellipse(14, 48 + height * 0.3, height * 0.5) : smile, open),
    tongue: open ? path(ellipse(7, 48 + height * 0.6, height * 0.12), true) : '',
    open,
  };
}
