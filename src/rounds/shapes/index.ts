import { avocadoShape, type AvocadoParams } from './avocado';
import { blobShape, type BlobParams } from './blob';
import { circleShape, type CircleParams } from './circle';
import { rectShape, type RectParams } from './rect';
import { rhombusShape, type RhombusParams } from './rhombus';
import type { Shape, ShapeContext } from './shape';
import { smileyShape, type SmileyParams } from './smiley';

export type { Shape, ShapeContext } from './shape';

/** Every shape a round can use, by `type`. Sizes are in design px. */
export type ShapeConfig =
  | ({ type: 'rect' } & RectParams)
  | ({ type: 'circle' } & CircleParams)
  | ({ type: 'blob' } & BlobParams)
  | ({ type: 'avocado' } & AvocadoParams)
  | ({ type: 'rhombus' } & RhombusParams)
  | ({ type: 'smiley' } & SmileyParams);

export type ShapeType = ShapeConfig['type'];

/** Builds a shape in its local space (bounding box centered on 0, 0). Pure: same config and rng → same shape. */
export function buildShape(config: ShapeConfig, ctx: ShapeContext): Shape {
  switch (config.type) {
    case 'rect':
      return rectShape(config, ctx);
    case 'circle':
      return circleShape(config, ctx);
    case 'blob':
      return blobShape(config, ctx);
    case 'avocado':
      return avocadoShape(config, ctx);
    case 'rhombus':
      return rhombusShape(config, ctx);
    case 'smiley':
      return smileyShape(config, ctx);
  }
}
