import { describe, expect, it } from 'vitest';
import { copy, fill, padTime } from './copy';

describe('timer text', () => {
  it('always shows at least four digits', () => {
    expect(fill(copy.round.timeValue, { ms: padTime(0) })).toBe('0000ms');
    expect(padTime(347)).toBe('0347');
    expect(padTime(1520)).toBe('1520');
    expect(padTime(12034)).toBe('12034');
  });

  it('rounds and never goes below zero', () => {
    expect(padTime(346.6)).toBe('0347');
    expect(padTime(-3)).toBe('0000');
  });
});
