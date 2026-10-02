import { avocadoShape, type AvocadoParams } from './avocado';
import { blobShape, type BlobParams } from './blob';
import { circleShape, type CircleParams } from './circle';
import { circleClusterShape, type CircleClusterParams } from './circleCluster';
import { curveShape, type CurveParams } from './curve';
import { ellipseShape, type EllipseParams } from './ellipse';
import { rectShape, type RectParams } from './rect';
import { rhombusShape, type RhombusParams } from './rhombus';
import type { Shape, ShapeContext } from './shape';
import { smileyShape, type SmileyParams } from './smiley';
import { starShape, type StarParams } from './star';
import { triangleShape, type TriangleParams } from './triangle';

export type { Shape, ShapeContext } from './shape';

/** Every shape a round can use, by `type`. Sizes are in design px. */
export type ShapeConfig =
  | ({ type: 'rect' } & RectParams)
  | ({ type: 'circle' } & CircleParams)
  | ({ type: 'ellipse' } & EllipseParams)
  | ({ type: 'circleCluster' } & CircleClusterParams)
  | ({ type: 'blob' } & BlobParams)
  | ({ type: 'curve' } & CurveParams)
  | ({ type: 'avocado' } & AvocadoParams)
  | ({ type: 'rhombus' } & RhombusParams)
  | ({ type: 'star' } & StarParams)
  | ({ type: 'smiley' } & SmileyParams)
  | ({ type: 'triangle' } & TriangleParams);

export type ShapeType = ShapeConfig['type'];

/** Builds a shape in its local space (bounding box centered on 0, 0). Pure: same config and rng → same shape. */
export function buildShape(config: ShapeConfig, ctx: ShapeContext): Shape {
  switch (config.type) {
    case 'rect':
      return rectShape(config, ctx);
    case 'circle':
      return circleShape(config, ctx);
    case 'ellipse':
      return ellipseShape(config, ctx);
    case 'circleCluster':
      return circleClusterShape(config, ctx);
    case 'star':
      return starShape(config, ctx);
    case 'blob':
      return blobShape(config, ctx);
    case 'curve':
      return curveShape(config, ctx);
    case 'avocado':
      return avocadoShape(config, ctx);
    case 'rhombus':
      return rhombusShape(config, ctx);
    case 'smiley':
      return smileyShape(config, ctx);
    case 'triangle':
      return triangleShape(config, ctx);
  }
}
