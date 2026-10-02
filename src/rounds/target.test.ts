import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { getRound } from '../config/rounds.config';
import { scoreRound, summarize } from '../scoring/summary';
import { shapeAt } from './motion';
import { createResult, createTimeoutResult } from './session';
import { roundTarget, targetAt } from './target';

const content = { width: layout.opening.width, height: layout.opening.height };
const SEED = 42;

describe('scoring a moving shape against the frame on screen', () => {
  it('a click on O of the displayed frame scores full accuracy, though O has moved since t = 0', () => {
    const round = getRound(6);
    const displayedAt = 1500; // a quarter period: the oval is far to the right
    const frame = targetAt(round, content, SEED, displayedAt);
    const rest = roundTarget(round, content, SEED);
    expect(Math.abs(frame.centers.O.x - rest.centers.O.x)).toBeGreaterThan(200);

    const result = createResult(frame, frame.centers.O, 1234);
    const scored = scoreRound(result);
    expect(scored.dO).toBeCloseTo(0, 9);
    expect(scored.a).toBeCloseTo(1, 9);
    // The same click judged against the resting shape would have scored nothing.
    expect(scoreRound(createResult(rest, frame.centers.O, 1234)).a).toBe(0);
  });

  it('stores the displayed frame in the result', () => {
    const round = getRound(4);
    const frame = targetAt(round, content, SEED, 2345);
    const result = createResult(frame, { x: 500, y: 300 }, 2400);
    expect(result.frameMs).toBe(2345);
    expect(result.shape.outer).toEqual(shapeAt(round, content, SEED, 2345).outer);
    expect(result.centers).toEqual(frame.centers);
  });

  it('round 11: the falloff follows the current size', () => {
    const round = getRound(11);
    expect(targetAt(round, content, SEED, 0).falloffRadius).toBeCloseTo(100, 6);
    expect(targetAt(round, content, SEED, 5000).falloffRadius).toBeCloseTo(60, 6);
    expect(targetAt(round, content, SEED, 10000).falloffRadius).toBeCloseTo(20, 6);
  });

  it('still shapes give the same target at any time', () => {
    const round = getRound(3);
    expect(targetAt(round, content, SEED, 4000)).toBe(roundTarget(round, content, SEED));
  });
});

describe('timeouts', () => {
  const r11 = getRound(11);
  const timeout = createTimeoutResult(targetAt(r11, content, SEED, 10000));

  it('have no click and score 0', () => {
    expect(timeout.click).toBeNull();
    expect(timeout.latencyMs).toBeNull();
    const scored = scoreRound(timeout);
    expect(scored.q).toBe(0);
    expect(scored.points).toBe(0);
    expect(scored.dO).toBeNull();
    expect(scored.lean).toBeNull();
  });

  it('are left out of the humanity lean and the mean latency', () => {
    const r6 = getRound(6);
    const frame = targetAt(r6, content, SEED, 0);
    const clicked = createResult(frame, frame.centers.O, 2000);
    const summary = summarize([clicked, timeout]);
    expect(summary.meanLatencyMs).toBe(2000);
    expect(summary.humanityIndex).toBeCloseTo(1, 6);
  });
});
