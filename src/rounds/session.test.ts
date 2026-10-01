import { describe, expect, it } from 'vitest';
import { getRound } from '../config/rounds.config';
import { createResult, createSession, shapeSeed } from './session';
import { roundTarget } from './target';

const content = { width: 1046, height: 676 };

describe('createResult', () => {
  it('stores the click relative to C, with C at (0, 0) and O above it', () => {
    // Round 11 at t = 0: a 200 × 200 square, 8px above the content center → C = (523, 330).
    const target = roundTarget(getRound(11), content, 1);
    const result = createResult(target, { x: 533, y: 320 }, 1500);
    expect(result.click?.x).toBeCloseTo(10);
    expect(result.click?.y).toBeCloseTo(-10);
    expect(result.C).toEqual({ x: 0, y: 0 });
    expect(result.O.x).toBeCloseTo(0);
    expect(result.O.y).toBeCloseTo(-10);
    expect(result.clickContent).toEqual({ x: 533, y: 320 });
    expect(result.latencyMs).toBe(1500);
    expect(result.falloffRadius).toBe(100);
  });
});

describe('shapeSeed', () => {
  it('derives from the game seed, differs per round, and can be set by hand', () => {
    const a = createSession(123);
    expect(shapeSeed(a, 2)).toBe(shapeSeed(createSession(123), 2));
    expect(shapeSeed(a, 2)).not.toBe(shapeSeed(a, 3));
    expect(shapeSeed(a, 2)).not.toBe(shapeSeed(createSession(124), 2));
    a.shapeSeeds.set(2, 7);
    expect(shapeSeed(a, 2)).toBe(7);
  });
});
