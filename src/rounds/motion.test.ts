import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { freeScreenArea, getRound } from '../config/rounds.config';
import { placeShape } from './geometry';
import { shapeAt, shapeFrameAt, waveAmplitude } from './motion';
import { shapeCenters } from './opticalCenter';
import { bounds, selfIntersects } from './polygon';
import { opticalSettings } from '../config/rounds.config';

const content = { width: layout.opening.width, height: layout.opening.height };
const SEED = 42;
const SEEDS = [1, 2, 3, 42, 1234567];

/** Round times from 0 to `untilMs`, every `stepMs`. */
const times = (untilMs: number, stepMs: number): number[] =>
  Array.from({ length: Math.floor(untilMs / stepMs) + 1 }, (_, i) => i * stepMs);

describe('still rounds', () => {
  it('have no motion: every moment is the shape at rest', () => {
    for (const id of [1, 2, 3, 12]) {
      const round = getRound(id);
      expect(shapeFrameAt(round, content, SEED, 1234)).toBeUndefined();
      expect(shapeAt(round, content, SEED, 1234)).toEqual(placeShape(round, content, SEED));
    }
  });
});

describe('rounds 4, 5 and 9: morphing', () => {
  for (const id of [4, 5, 9]) {
    const round = getRound(id);

    it(`round ${id} changes over time and repeats for the same seed`, () => {
      const a = shapeAt(round, content, SEED, 0).outer;
      const b = shapeAt(round, content, SEED, 750).outer;
      expect(b).not.toEqual(a);
      expect(shapeAt(round, content, SEED, 750).outer).toEqual(b);
    });

    it(`round ${id} stays close to its size (drift up to 3%) and never crosses itself`, () => {
      for (const seed of SEEDS) {
        const rest = bounds(placeShape(round, content, seed).outer);
        for (const t of times(10000, 250)) {
          const outer = shapeAt(round, content, seed, t).outer;
          expect(selfIntersects(outer)).toBe(false);
          const box = bounds(outer);
          expect(Math.abs(box.width - rest.width)).toBeLessThanOrEqual(0.1 * rest.width);
          expect(Math.abs(box.height - rest.height)).toBeLessThanOrEqual(0.1 * rest.height);
        }
      }
    });
  }

  it('round 5 also bobs up and down by up to 12px', () => {
    const round = getRound(5);
    const ys = times(4000, 50).map((t) => shapeAt(round, content, SEED, t).anchor.y);
    const rest = placeShape(round, content, SEED).anchor.y;
    expect(Math.max(...ys) - rest).toBeCloseTo(12, 1);
    expect(rest - Math.min(...ys)).toBeCloseTo(12, 1);
  });

  it('round 5 keeps C and O far enough apart to count for the lean', () => {
    const round = getRound(5);
    for (const t of times(3000, 500)) {
      const { C, O } = shapeCenters(shapeAt(round, content, SEED, t), opticalSettings(round));
      expect(Math.hypot(O.x - C.x, O.y - C.y)).toBeGreaterThan(4);
    }
  });
});

describe('round 6: the swaying oval', () => {
  const round = getRound(6);
  const area = freeScreenArea(layout.round.motionMargin);

  it('starts at rest and sways wide', () => {
    expect(shapeFrameAt(round, content, SEED, 0)?.offset).toEqual({ x: 0, y: 0 });
    const motion = round.motions?.[0];
    if (motion?.type !== 'wave') throw new Error('round 6 should wave');
    expect(waveAmplitude(round, motion, content, SEED).x).toBeGreaterThan(300);
    expect(waveAmplitude(round, motion, content, SEED).y).toBe(40);
  });

  it('never leaves the free area: 48px from the screen edges, the HUD row and the objective line', () => {
    for (const t of times(12000, 10)) {
      const box = bounds(shapeAt(round, content, SEED, t).outer);
      expect(box.minX).toBeGreaterThanOrEqual(area.left - 1e-6);
      expect(box.maxX).toBeLessThanOrEqual(area.left + area.width + 1e-6);
      expect(box.minY).toBeGreaterThanOrEqual(area.top - 1e-6);
      expect(box.maxY).toBeLessThanOrEqual(area.top + area.height + 1e-6);
      expect(box.minX).toBeGreaterThanOrEqual(layout.round.motionMargin);
      expect(box.maxX).toBeLessThanOrEqual(content.width - layout.round.motionMargin);
    }
  });

  it('reaches both sides of the free area', () => {
    const wave = round.motions?.[0];
    const period = wave?.type === 'wave' ? wave.periodMs : NaN;
    const quarter = shapeAt(round, content, SEED, period / 4);
    const threeQuarters = shapeAt(round, content, SEED, (3 * period) / 4);
    expect(Math.min(bounds(quarter.outer).maxX, bounds(threeQuarters.outer).maxX)).toBeLessThan(
      content.width / 2,
    );
    expect(Math.max(bounds(quarter.outer).maxX, bounds(threeQuarters.outer).maxX)).toBeCloseTo(
      area.left + area.width,
      6,
    );
  });
});

describe('round 8: the jumping star', () => {
  const round = getRound(8);
  const area = freeScreenArea(layout.round.motionMargin);

  it('is an irregular seven-point star', () => {
    expect(round.shape).toMatchObject({ type: 'star', points: 7 });
  });

  const jump = round.motions?.[0];
  const every = jump?.type === 'jump' ? jump.everyMs : NaN;

  it('holds still for a while (1.2s), then jumps', () => {
    const at = (t: number) => shapeFrameAt(round, content, SEED, t)?.offset;
    expect(every).toBe(1200);
    expect(at(0)).toEqual({ x: 0, y: 0 });
    expect(at(every - 1)).toEqual(at(0));
    expect(at(every)).not.toEqual(at(every - 1));
    expect(at(2 * every - 1)).toEqual(at(every));
    expect(at(2 * every)).not.toEqual(at(2 * every - 1));
  });

  it('always lands fully inside the free area', () => {
    for (const seed of SEEDS) {
      for (const t of times(30000, every)) {
        const box = bounds(shapeAt(round, content, seed, t).outer);
        expect(box.minX).toBeGreaterThanOrEqual(area.left - 1e-6);
        expect(box.maxX).toBeLessThanOrEqual(area.left + area.width + 1e-6);
        expect(box.minY).toBeGreaterThanOrEqual(area.top - 1e-6);
        expect(box.maxY).toBeLessThanOrEqual(area.top + area.height + 1e-6);
      }
    }
  });

  it('jumps to the same places for the same seed', () => {
    expect(shapeFrameAt(round, content, 7, 4000)).toEqual(shapeFrameAt(round, content, 7, 4000));
    expect(shapeFrameAt(round, content, 7, 4000)).not.toEqual(
      shapeFrameAt(round, content, 8, 4000),
    );
  });
});

describe('round 11: the shrinking square', () => {
  const round = getRound(11);
  const side = (t: number): number => bounds(shapeAt(round, content, SEED, t).outer).width;

  it('shrinks linearly from 200 to 40 over 8s, centered, then stays', () => {
    expect(side(0)).toBeCloseTo(200, 6);
    expect(side(4000)).toBeCloseTo(120, 6);
    expect(side(8000)).toBeCloseTo(40, 6);
    expect(side(12000)).toBeCloseTo(40, 6);
    const rest = shapeAt(round, content, SEED, 0).anchor;
    expect(shapeAt(round, content, SEED, 7000).anchor).toEqual(rest);
  });
});

describe('round 9 and 10 stay inside the free area', () => {
  const area = freeScreenArea();
  const inside = (id: number, untilMs: number, stepMs: number): void => {
    for (const t of times(untilMs, stepMs)) {
      const box = bounds(shapeAt(getRound(id), content, SEED, t).outer);
      expect(box.minX).toBeGreaterThanOrEqual(area.left);
      expect(box.maxX).toBeLessThanOrEqual(area.left + area.width);
      expect(box.minY).toBeGreaterThanOrEqual(area.top);
      expect(box.maxY).toBeLessThanOrEqual(area.top + area.height);
    }
  };

  it('round 9 while it morphs', () => inside(9, 10000, 500));
  it('round 10 through a whole turn', () => inside(10, 20000, 100));
});

describe('round 10: the turning star', () => {
  it('turns clockwise, one full turn every 20s', () => {
    const round = getRound(10);
    expect(shapeAt(round, content, SEED, 0).rotationDeg).toBeCloseTo(14, 9);
    expect(shapeAt(round, content, SEED, 5000).rotationDeg).toBeCloseTo(14 + 90, 9);
    expect(shapeAt(round, content, SEED, 20000).rotationDeg).toBeCloseTo(14 + 360, 9);
  });
});
