import { describe, expect, it } from 'vitest';
import { parseUrlParams } from './params';

describe('parseUrlParams', () => {
  it('reads the review options', () => {
    expect(parseUrlParams('?debug=1&state=round&round=5&seed=123')).toEqual({
      debug: true,
      state: 'round',
      round: 5,
      seed: 123,
    });
  });

  it('falls back to nothing when empty', () => {
    expect(parseUrlParams('')).toEqual({ debug: false, state: null, round: null, seed: null });
  });

  it('ignores unknown states and non-numbers', () => {
    expect(parseUrlParams('?state=boss&round=abc&seed=-4')).toEqual({
      debug: false,
      state: null,
      round: null,
      seed: null,
    });
  });
});
