import { describe, expect, it } from 'vitest';
import { copy } from './copy';
import { gameConfig } from './game.config';
import { getRound, opticalSettings, rounds } from './rounds.config';

describe('rounds config', () => {
  it('has one round per roundCount, numbered 1…N', () => {
    expect(rounds).toHaveLength(gameConfig.roundCount);
    expect(rounds.map((r) => r.id)).toEqual(rounds.map((_, i) => i + 1));
  });

  it('follows the phase plan: 1–3, 4–7, 8–11, 12', () => {
    expect(rounds.map((r) => r.phase)).toEqual([1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4]);
  });

  it('ignores time in round 1 only', () => {
    expect(getRound(1).timeWeight).toBe(0);
    for (const r of rounds.slice(1)) expect(r.timeWeight).toBe(0.2);
  });

  it('uses the global optical defaults unless a round overrides them', () => {
    expect(opticalSettings(getRound(1))).toEqual(gameConfig.optical);
    const custom = { ...getRound(1), optical: { biasY: 0.1 } };
    expect(opticalSettings(custom)).toEqual({ ...gameConfig.optical, biasY: 0.1 });
  });

  it('uses a 200 × 200 rectangle everywhere for now', () => {
    for (const r of rounds) {
      expect(r.shape).toEqual({ type: 'rect', width: 200, height: 200, rotationDeg: 0 });
    }
  });

  it('points every round at existing objective copy', () => {
    for (const r of rounds) expect(copy.objectives[r.copyKey]).toBeTruthy();
  });

  it('throws for an unknown round id', () => {
    expect(() => getRound(13)).toThrow();
  });
});
