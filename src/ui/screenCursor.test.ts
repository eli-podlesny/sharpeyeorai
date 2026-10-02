import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { bracketBars, clampOffset, follow, spreadStep } from './screenCursor';

const C = layout.screenCursor;
const tuning = gameConfig.screenCursor;

describe('in-screen cursor', () => {
  it('the dot never trails more than the max offset', () => {
    const off = clampOffset({ x: 300, y: -400 }, C.maxDotOffset);
    expect(Math.hypot(off.x, off.y)).toBeCloseTo(C.maxDotOffset, 6);
    expect(off.x / off.y).toBeCloseTo(300 / -400, 6);
    expect(clampOffset({ x: 3, y: 4 }, C.maxDotOffset)).toEqual({ x: 3, y: 4 });
  });

  it('follow is frame-rate independent', () => {
    const one = follow(0, 100, 16, 60);
    const two = follow(follow(0, 100, 8, 60), 100, 8, 60);
    expect(two).toBeCloseTo(one, 10);
  });

  it('spreads slowly and recovers fast', () => {
    const fast = tuning.fullSpreadSpeed * 2;
    const grown = spreadStep(0, fast, 100, tuning);
    const shrunk = spreadStep(1, 0, 100, tuning);
    expect(grown).toBeGreaterThan(0);
    // Over the same time, closing covers more of the way than opening.
    expect(1 - shrunk).toBeGreaterThan(grown);
    expect(spreadStep(0.5, fast, 1e6, tuning)).toBeCloseTo(1, 6);
  });

  it('draws the Figma brackets', () => {
    // Normal (48 × 48 artboard, center 24): left bars at x 14–16, y 16–20 and 28–32.
    const normal = bracketBars(C.half, C.bar, C.gap, C.thickness).map((b) => ({
      ...b,
      x: b.x + 24,
      y: b.y + 24,
    }));
    expect(normal).toContainEqual({ x: 14, y: 16, width: 2, height: 4 });
    expect(normal).toContainEqual({ x: 14, y: 28, width: 2, height: 4 });
    expect(normal).toContainEqual({ x: 32, y: 28, width: 2, height: 4 });
    expect(normal).toContainEqual({ x: 16, y: 32, width: 4, height: 2 });
    // Max: left bars at x 8–10, y 12–20; top bars at y 8–10.
    const max = bracketBars(C.maxHalf, C.maxBar, C.gap, C.thickness).map((b) => ({
      ...b,
      x: b.x + 24,
      y: b.y + 24,
    }));
    expect(max).toContainEqual({ x: 8, y: 12, width: 2, height: 8 });
    expect(max).toContainEqual({ x: 28, y: 38, width: 8, height: 2 });
    // Pressed: x 15–17, y 17–21.
    const pressed = bracketBars(C.pressedHalf, C.bar, C.pressedGap, C.thickness).map((b) => ({
      ...b,
      x: b.x + 24,
      y: b.y + 24,
    }));
    expect(pressed).toContainEqual({ x: 15, y: 17, width: 2, height: 4 });
    expect(pressed).toContainEqual({ x: 27, y: 31, width: 4, height: 2 });
  });
});
