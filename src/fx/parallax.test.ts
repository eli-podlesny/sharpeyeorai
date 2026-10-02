import { describe, expect, it } from 'vitest';
import { followFactor, pointerToNormalized } from './parallax';

describe('parallax follow', () => {
  it('is 99% of the way after the settle time', () => {
    expect(followFactor(500, 500)).toBeCloseTo(0.99, 6);
  });

  it('does not depend on the frame rate', () => {
    // Two 8 ms steps reach the same point as one 16 ms step.
    const half = followFactor(8, 500);
    const twoSteps = 1 - (1 - half) * (1 - half);
    expect(twoSteps).toBeCloseTo(followFactor(16, 500), 10);
  });

  it('never overshoots', () => {
    for (const dt of [1, 16, 100, 1000, 10000]) {
      const k = followFactor(dt, 500);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });
});

describe('pointer to −1…1', () => {
  it('is 0 at the center and ±1 at the edges', () => {
    expect(pointerToNormalized({ x: 640, y: 360 }, 1280, 720)).toEqual({ x: 0, y: 0 });
    expect(pointerToNormalized({ x: 0, y: 0 }, 1280, 720)).toEqual({ x: -1, y: -1 });
    expect(pointerToNormalized({ x: 1280, y: 720 }, 1280, 720)).toEqual({ x: 1, y: 1 });
  });

  it('clamps outside the window', () => {
    expect(pointerToNormalized({ x: -50, y: 900 }, 1280, 720)).toEqual({ x: -1, y: 1 });
  });
});
