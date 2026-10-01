import type { Point } from '../../core/stage';
import { arcPoints, ellipsePoints, type Shape, type ShapeContext } from './shape';

export interface SmileyParams {
  diameter: number;
}

/** Face features as fractions of the diameter; angles in degrees, clockwise from 3 o'clock. */
export const SMILEY_FEATURES = {
  /** Eyes: upright ovals, mirrored left and right. */
  eye: { x: 0.17, y: -0.14, rx: 0.05, ry: 0.08 },
  /** Mouth: a curved band along a circle around (0, centerY), with round ends. */
  mouth: { centerY: 0.02, radius: 0.3, thickness: 0.08, fromDeg: 30, toDeg: 150 },
} as const;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A curved band: outer arc one way, round cap, inner arc back, round cap. */
function bandPoints(
  center: Point,
  radius: number,
  thickness: number,
  from: number,
  to: number,
  spacing: number,
): Point[] {
  const half = thickness / 2;
  const capAt = (a: number): Point => ({
    x: center.x + radius * Math.cos(a),
    y: center.y + radius * Math.sin(a),
  });
  const outer = arcPoints(center, radius + half, radius + half, from, to, spacing);
  // The end cap turns outward from the band's end, then the inner arc runs back.
  const endCap = arcPoints(capAt(to), half, half, to, to + Math.PI, spacing).slice(1, -1);
  const inner = arcPoints(center, radius - half, radius - half, to, from, spacing);
  const startCap = arcPoints(
    capAt(from),
    half,
    half,
    from + Math.PI,
    from + 2 * Math.PI,
    spacing,
  ).slice(1, -1);
  return [...outer, ...endCap, ...inner, ...startCap];
}

/** A disc with two eyes and a smiling mouth cut out. */
export function smileyShape({ diameter: d }: SmileyParams, { spacing }: ShapeContext): Shape {
  const { eye, mouth } = SMILEY_FEATURES;
  const r = d / 2;
  const leftEye = ellipsePoints({ x: -eye.x * d, y: eye.y * d }, eye.rx * d, eye.ry * d, spacing);
  // Mirrored point for point, so both eyes are exactly alike.
  const rightEye = leftEye.map((p) => ({ x: -p.x, y: p.y })).reverse();
  return {
    outer: ellipsePoints({ x: 0, y: 0 }, r, r, spacing),
    holes: [
      leftEye,
      rightEye,
      bandPoints(
        { x: 0, y: mouth.centerY * d },
        mouth.radius * d,
        mouth.thickness * d,
        rad(mouth.fromDeg),
        rad(mouth.toDeg),
        spacing,
      ),
    ],
    pole: { x: 0, y: 0 },
  };
}
