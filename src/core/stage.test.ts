import { describe, expect, it } from 'vitest';
import { FRAME_ASPECT, layout } from '../config/layout.config';
import { computeUnitRect, unitScale } from './stage';

const { unitMarginX, unitMarginY, maxUnitHeight } = layout.viewport;

/** The brief's check sizes. */
const WINDOWS = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [1280, 1000],
] as const;

describe('computeUnitRect', () => {
  it('keeps the frame art shape', () => {
    for (const [w, h] of WINDOWS) {
      const r = computeUnitRect(w, h);
      expect(r.width / r.height).toBeCloseTo(FRAME_ASPECT, 9);
    }
  });

  it('is centered both ways', () => {
    for (const [w, h] of WINDOWS) {
      const r = computeUnitRect(w, h);
      expect(r.left + r.width / 2).toBeCloseTo(w / 2, 9);
      expect(r.top + r.height / 2).toBeCloseTo(h / 2, 9);
    }
  });

  it('has 64px above and below, or 24px at the sides when the width is the limit', () => {
    for (const [w, h] of WINDOWS) {
      const r = computeUnitRect(w, h);
      expect(r.top).toBeGreaterThanOrEqual(unitMarginY - 1e-9);
      expect(r.left).toBeGreaterThanOrEqual(unitMarginX - 1e-9);
      const capped = r.height === maxUnitHeight;
      const heightLimited = Math.abs(r.top - unitMarginY) < 1e-9;
      const widthLimited = Math.abs(r.left - unitMarginX) < 1e-9;
      expect(capped || heightLimited || widthLimited).toBe(true);
    }
  });

  it('is exactly the Figma frame at 1440 × 900', () => {
    const r = computeUnitRect(1440, 900);
    expect(r.height).toBeCloseTo(layout.unit.height, 9);
    expect(r.top).toBeCloseTo(64, 9);
    expect(unitScale(r.height)).toBeCloseTo(1, 9);
  });

  it('is limited by the width in a narrow 1280 × 1000 window', () => {
    const r = computeUnitRect(1280, 1000);
    expect(r.left).toBeCloseTo(24, 9);
    expect(r.width).toBeCloseTo(1280 - 48, 9);
    expect(r.top).toBeGreaterThan(64);
  });

  it('never grows past the 2× art', () => {
    const r = computeUnitRect(2560, 1440);
    expect(r.height).toBe(maxUnitHeight);
    expect(computeUnitRect(5120, 2880).height).toBe(maxUnitHeight);
  });
});
