import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

const take = (rng: () => number, n: number): number[] => Array.from({ length: n }, rng);

describe('seeded rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(createRng(123), 20)).toEqual(take(createRng(123), 20));
  });

  it('gives a different sequence for a different seed', () => {
    expect(take(createRng(123), 5)).not.toEqual(take(createRng(124), 5));
  });

  it('stays within [0, 1)', () => {
    for (const n of take(createRng(7), 1000)) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
