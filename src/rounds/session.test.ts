import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { createRng } from '../core/rng';
import { createResult, createSampleResults } from './session';

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

describe('createSampleResults', () => {
  it('fills every round and repeats with the same seed', () => {
    const a = createSampleResults(createRng(42), content);
    const b = createSampleResults(createRng(42), content);
    expect(a).toHaveLength(gameConfig.roundCount);
    expect(a).toEqual(b);
  });
});
