import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { computeUnitRect, unitScale } from '../core/stage';
import { droppedPose, shakePoses } from './drop';

const { drop } = layout.assembly;
const end = { x: drop.x, y: drop.y, rotateDeg: drop.rotateDeg, scale: drop.scale };

describe('landing shake', () => {
  const poses = shakePoses(end, drop.shake);

  it('settles exactly on the dropped pose', () => {
    expect(poses.at(-1)).toEqual(end);
    expect(poses).toHaveLength(drop.shake.count + 1);
  });

  it('first hits down, then swings to alternate sides', () => {
    const first = poses[0];
    const second = poses[1];
    expect(first && first.y > end.y).toBe(true);
    expect(second && second.y < end.y).toBe(true);
  });

  it('dies away: every wobble is smaller than the one before', () => {
    const sizes = poses.slice(0, -1).map((p) => Math.abs(p.y - end.y));
    sizes.slice(1).forEach((s, i) => expect(s).toBeLessThan(sizes[i] ?? Infinity));
  });

  it('stays subtle: never more than the configured shake', () => {
    for (const p of poses) {
      expect(Math.abs(p.y - end.y)).toBeLessThanOrEqual(drop.shake.y);
      expect(Math.abs(p.x - end.x)).toBeLessThanOrEqual(drop.shake.x);
      expect(Math.abs(p.rotateDeg - end.rotateDeg)).toBeLessThanOrEqual(drop.shake.rotateDeg);
    }
  });
});

describe('dropped pose', () => {
  const at = (w: number, h: number) => droppedPose(h, computeUnitRect(w, h).height);

  it('is the configured drop at 1440 × 900', () => {
    expect(at(1440, 900).y).toBeCloseTo(drop.y, 6);
  });

  it('never drops less than the configured drop', () => {
    for (const [w, h] of [
      [1280, 720],
      [1920, 1080],
      [2560, 1440],
      [3440, 1440],
    ] as const) {
      expect(at(w, h).y).toBeGreaterThanOrEqual(drop.y);
    }
  });

  it('falls to the bottom of tall windows', () => {
    for (const [w, h] of [
      [1280, 1000],
      [1024, 1366],
      [1200, 1920],
    ] as const) {
      const unit = computeUnitRect(w, h);
      const s = unitScale(unit.height);
      // Its center ends up drop.centerFromBottom (unit px) above the window bottom.
      const centerY = h / 2 + at(w, h).y * s;
      expect(h - centerY).toBeCloseTo(drop.centerFromBottom * s, 6);
    }
  });
});
