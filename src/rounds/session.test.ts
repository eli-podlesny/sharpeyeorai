import { describe, expect, it } from 'vitest';
import { createResult } from './session';

const content = { width: 1046, height: 676 };

describe('createResult', () => {
  it('stores the click relative to C, with C at (0, 0) and O above it', () => {
    // Round 1: 200 × 200 square, 8px above the content center → C = (523, 330).
    const result = createResult(1, { x: 533, y: 320 }, 1500, content);
    expect(result.click.x).toBeCloseTo(10);
    expect(result.click.y).toBeCloseTo(-10);
    expect(result.C).toEqual({ x: 0, y: 0 });
    expect(result.O.x).toBeCloseTo(0);
    expect(result.O.y).toBeCloseTo(-10);
    expect(result.clickContent).toEqual({ x: 533, y: 320 });
    expect(result.latencyMs).toBe(1500);
  });
});
