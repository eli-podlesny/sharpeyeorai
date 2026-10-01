import { describe, expect, it } from 'vitest';
import { copy, fill, padDigits } from './copy';

describe('timer and score digits', () => {
  it('always shows at least four digits', () => {
    expect(fill(copy.round.timeValue, { ms: padDigits(0) })).toBe('0000ms');
    expect(padDigits(347)).toBe('0347');
    expect(padDigits(1520)).toBe('1520');
    expect(padDigits(12034)).toBe('12034');
  });

  it('pads the score the same way', () => {
    expect(fill(copy.score.total, { total: padDigits(636) })).toBe('0636pts');
    expect(fill(copy.score.total, { total: padDigits(10000) })).toBe('10000pts');
  });

  it('rounds and never goes below zero', () => {
    expect(padDigits(346.6)).toBe('0347');
    expect(padDigits(-3)).toBe('0000');
  });
});
