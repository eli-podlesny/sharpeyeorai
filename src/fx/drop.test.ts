import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { shakePoses } from './drop';

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
