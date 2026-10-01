import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { rounds } from '../config/rounds.config';
import type { Point } from '../core/stage';
import { roundCenters } from '../rounds/opticalCenter';
import { createResult } from '../rounds/session';
import { summarize } from './summary';

const content = { width: 1046, height: 676 };

/** One result per round, clicking `at(O, C)` after `latencyMs`. */
function play(at: (O: Point, C: Point) => Point, latencyMs: number) {
  return rounds.map((round) => {
    const { O, C } = roundCenters(round, content);
    return createResult(round.id, at(O, C), latencyMs, content);
  });
}

describe('summarize', () => {
  it('a perfect, fast game scores exactly 10,000', () => {
    const summary = summarize(play((O) => O, 500));
    expect(summary.total).toBe(gameConfig.scoring.maxScore);
    expect(summary.rounds).toHaveLength(12);
    expect(summary.humanityIndex).toBeCloseTo(1);
    expect(summary.persona.override).toBe('algorithm');
  });

  it('clicking C on the square is machine-like and costs ~15% accuracy', () => {
    const summary = summarize(play((_, C) => C, 500));
    expect(summary.humanityIndex).toBeCloseTo(0);
    for (const r of summary.rounds) {
      expect(r.dO).toBeCloseTo(10);
      expect(r.dC).toBeCloseTo(0);
      expect(r.a).toBeCloseTo(0.854, 3);
    }
    expect(summary.persona.humanity).toBe('machine');
  });

  it('slow clicks cost round 1 nothing and rounds 2–12 up to 20%', () => {
    const summary = summarize(play((O) => O, 20000));
    expect(summary.rounds[0]?.q).toBeCloseTo(1);
    expect(summary.rounds[1]?.q).toBeCloseTo(0.8);
    // (1 + 11 × 0.8) / 12 × 10,000
    expect(summary.total).toBe(Math.round(((1 + 11 * 0.8) / 12) * 10000));
    expect(summary.meanLatencyMs).toBe(20000);
  });

  it('a penalty zeroes the round', () => {
    const results = play((O) => O, 500);
    const first = results[0];
    if (first) first.penalty = true;
    const summary = summarize(results);
    expect(summary.rounds[0]?.q).toBe(0);
    expect(summary.total).toBe(Math.round((11 / 12) * 10000));
  });

  it('missing rounds count as 0', () => {
    const summary = summarize(play((O) => O, 500).slice(0, 6));
    expect(summary.total).toBe(5000);
  });

  it('points add up to the total', () => {
    const summary = summarize(play((O) => ({ x: O.x + 20, y: O.y }), 3000));
    const sum = summary.rounds.reduce((acc, r) => acc + r.points, 0);
    expect(Math.round(sum)).toBe(summary.total);
  });
});
