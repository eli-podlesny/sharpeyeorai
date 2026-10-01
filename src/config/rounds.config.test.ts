import { describe, expect, it } from 'vitest';
import { copy } from './copy';
import { gameConfig } from './game.config';
import { layout } from './layout.config';
import { freeScreenArea, getRound, opticalSettings, rounds } from './rounds.config';

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

  it('gives the static rounds their shapes; 4, 5, 6, 8 and 11 keep the placeholder', () => {
    expect(rounds.map((r) => r.shape.type)).toEqual([
      'rect',
      'blob',
      'avocado',
      'rect',
      'rect',
      'rect',
      'rect',
      'rect',
      'circle',
      'rhombus',
      'rect',
      'smiley',
    ]);
    for (const id of [4, 5, 6, 8, 11]) {
      expect(getRound(id).shape).toEqual({ type: 'rect', width: 200, height: 200 });
    }
    expect(getRound(1).shape).toEqual({ type: 'rect', width: 360, height: 360 });
  });

  it('round 10 is turned about 14° and moved about 120px left', () => {
    expect(getRound(10).rotationDeg).toBe(14);
    expect(getRound(10).offset.x).toBe(-120);
  });

  it('only round 12 uses the light fill', () => {
    expect(rounds.filter((r) => r.fill === 'light').map((r) => r.id)).toEqual([12]);
  });

  it('rounds 1 and 7 keep the 100px falloff of the old square', () => {
    expect(getRound(1).falloffRadius).toBe(100);
    expect(getRound(7).falloffRadius).toBe(100);
  });

  describe('round 7 fills the free area', () => {
    const { screen, screenHud, round: L } = layout;
    const margin = L.largeShapeMargin;
    const r7 = getRound(7);
    const shape = r7.shape as { width: number; height: number };
    const left = screen.width / 2 + r7.offset.x - shape.width / 2;
    const top = screen.height / 2 + r7.offset.y - shape.height / 2;

    it('keeps the margin from the screen edges', () => {
      expect(left).toBeCloseTo(margin, 9);
      expect(left + shape.width).toBeCloseTo(screen.width - margin, 9);
    });

    it('keeps the margin from the HUD row and the objective line', () => {
      expect(top).toBeCloseTo(screenHud.progress.top + screenHud.lineHeight + margin, 9);
      expect(top + shape.height).toBeCloseTo(screenHud.objective.top - margin, 9);
    });

    it('matches freeScreenArea', () => {
      expect(freeScreenArea()).toEqual({ left, top, width: shape.width, height: shape.height });
    });
  });

  it('points every round at existing objective copy', () => {
    for (const r of rounds) expect(copy.objectives[r.copyKey]).toBeTruthy();
  });

  it('throws for an unknown round id', () => {
    expect(() => getRound(13)).toThrow();
  });
});
