import { describe, expect, it } from 'vitest';
import { getRound } from '../config/rounds.config';
import {
  acceptsClick,
  decoyLitAt,
  fixedRoundEndMs,
  inputDeadlineMs,
  shapeOpacityAt,
} from './timing';

describe('input rules', () => {
  it('most rounds accept a click any time after the shape is visible, with no deadline', () => {
    const round = getRound(4);
    expect(inputDeadlineMs(round)).toBeNull();
    expect(fixedRoundEndMs(round)).toBeNull();
    expect(acceptsClick(round, -1)).toBe(false);
    expect(acceptsClick(round, 0)).toBe(true);
    expect(acceptsClick(round, 60000)).toBe(true);
  });

  it('round 11 times out at 8s', () => {
    const round = getRound(11);
    expect(inputDeadlineMs(round)).toBe(8000);
    expect(acceptsClick(round, 7999)).toBe(true);
    expect(acceptsClick(round, 8000)).toBe(false);
    expect(fixedRoundEndMs(round)).toBeNull();
  });

  it('round 12 takes clicks for 4s only, then ignores input 4s: 8s in all', () => {
    const round = getRound(12);
    expect(inputDeadlineMs(round)).toBe(4000);
    expect(acceptsClick(round, 0)).toBe(true);
    expect(acceptsClick(round, 2500)).toBe(true);
    expect(acceptsClick(round, 3999)).toBe(true);
    expect(acceptsClick(round, 4000)).toBe(false);
    expect(acceptsClick(round, 7000)).toBe(false);
    expect(fixedRoundEndMs(round)).toBe(8000);
  });

  it('a click between two windows is ignored', () => {
    const round = {
      ...getRound(4),
      inputWindows: [
        [0, 1000],
        [2000, 3000],
      ] as const,
    };
    expect(acceptsClick(round, 500)).toBe(true);
    expect(acceptsClick(round, 1500)).toBe(false);
    expect(acceptsClick(round, 2500)).toBe(true);
    expect(inputDeadlineMs(round)).toBe(3000);
  });
});

describe('shapeOpacityAt', () => {
  it('round 12: visible 1s, fading over the last 200ms', () => {
    const round = getRound(12);
    expect(shapeOpacityAt(round, 0)).toBe(1);
    expect(shapeOpacityAt(round, 800)).toBe(1);
    expect(shapeOpacityAt(round, 900)).toBeCloseTo(0.5);
    expect(shapeOpacityAt(round, 1000)).toBe(0);
    expect(shapeOpacityAt(round, 5000)).toBe(0);
  });

  it('other rounds stay visible', () => {
    expect(shapeOpacityAt(getRound(1), 60000)).toBe(1);
  });
});

describe('decoyLitAt', () => {
  const decoy = { target: 'computed' as const, blinks: 2, onMs: 400, offMs: 400 };

  it('blinks twice, then never again', () => {
    expect(decoyLitAt(decoy, -1)).toBe(false);
    expect(decoyLitAt(decoy, 0)).toBe(true);
    expect(decoyLitAt(decoy, 399)).toBe(true);
    expect(decoyLitAt(decoy, 400)).toBe(false);
    expect(decoyLitAt(decoy, 800)).toBe(true);
    expect(decoyLitAt(decoy, 1199)).toBe(true);
    expect(decoyLitAt(decoy, 1200)).toBe(false);
    expect(decoyLitAt(decoy, 1600)).toBe(false);
  });
});
