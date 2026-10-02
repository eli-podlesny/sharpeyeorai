import { describe, expect, it } from 'vitest';
import { copy } from './copy';
import { gameConfig } from './game.config';
import { layout } from './layout.config';
import { shapeAt } from '../rounds/motion';
import { bounds } from '../rounds/polygon';
import {
  freeScreenArea,
  getRound,
  opticalSettings,
  rectForRotatedBox,
  skewedRotatedBox,
  rounds,
} from './rounds.config';

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

  it('gives every round its own shape', () => {
    expect(rounds.map((r) => r.shape.type)).toEqual([
      'rect',
      'blob',
      'avocado',
      'curve',
      'curve',
      'ellipse',
      'rect',
      'star',
      'circleCluster',
      'star',
      'rect',
      'triangle',
    ]);
    expect(getRound(12).shape).toEqual({ type: 'triangle', side: 120 });
    expect(getRound(1).shape).toEqual({ type: 'rect', width: 360, height: 360 });
    expect(getRound(11).shape).toEqual({ type: 'rect', width: 200, height: 200 });
  });

  it('moves every round except 1, 2, 3 and 12', () => {
    const kinds = (id: number) => getRound(id).motions?.map((m) => m.type);
    expect(rounds.filter((r) => r.motions?.length).map((r) => r.id)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(kinds(4)).toEqual(['morph']);
    expect(kinds(5)).toEqual(['morph', 'bob']);
    expect(kinds(6)).toEqual(['wave']);
    expect(kinds(7)).toEqual(['skew']);
    expect(kinds(8)).toEqual(['jump']);
    expect(kinds(9)).toEqual(['morph']);
    expect(kinds(10)).toEqual(['spin']);
    expect(kinds(11)).toEqual(['shrink']);
  });

  it('round 5 alone has the decoy, on C, blinking no faster than 3 Hz', () => {
    expect(rounds.filter((r) => r.decoy).map((r) => r.id)).toEqual([5]);
    const decoy = getRound(5).decoy;
    expect(decoy?.target).toBe('computed');
    expect(decoy?.blinks).toBe(2);
    expect(1000 / ((decoy?.onMs ?? 0) + (decoy?.offMs ?? 0))).toBeLessThanOrEqual(3);
  });

  it('round 11 times out at 8s; round 12 takes clicks for 4s, then idles for its two last breaths', () => {
    expect(getRound(11).timeLimitMs).toBe(8000);
    const r12 = getRound(12);
    expect(r12.inputWindows).toEqual([[0, 4000]]);
    // Two breaths of 1.2s with 0.7s of black between.
    expect(r12.postRoundIdleMs).toBe(3100);
    expect(r12.hideAfter).toEqual({ visibleMs: 1000, fadeMs: 200 });
  });

  it('only round 12 ends on its click instead of waiting out its idle time', () => {
    expect(rounds.filter((r) => r.clickEndsRound).map((r) => r.id)).toEqual([12]);
  });

  it('round 12 alone hides the objective line and the click feedback', () => {
    expect(rounds.filter((r) => !r.showObjective).map((r) => r.id)).toEqual([12]);
    expect(rounds.filter((r) => !r.clickFeedback).map((r) => r.id)).toEqual([12]);
  });

  it('round 10 (star) is turned about 14° and moved about 120px left', () => {
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

  describe('round 7: a rectangle turned clockwise and leaning, that fills the free area', () => {
    const { opening } = layout;
    const content = { width: opening.width, height: opening.height };
    const r7 = getRound(7);
    const area = freeScreenArea();
    const skew = r7.motions?.find((m) => m.type === 'skew');
    const period = skew?.type === 'skew' ? skew.periodMs : NaN;
    const boxAt = (t: number) => bounds(shapeAt(r7, content, 1, t).outer);

    it('is turned clockwise and smaller than the free area', () => {
      const shape = r7.shape as { width: number; height: number };
      expect(r7.rotationDeg).toBeGreaterThan(0);
      expect(shape.width).toBeLessThan(area.width);
      expect(shape.height).toBeLessThan(area.height);
    });

    it('never leaves the free area while it leans', () => {
      for (let t = 0; t <= period; t += 50) {
        const box = boxAt(t);
        expect(box.minX).toBeGreaterThanOrEqual(area.left - 1e-6);
        expect(box.maxX).toBeLessThanOrEqual(area.left + area.width + 1e-6);
        expect(box.minY).toBeGreaterThanOrEqual(area.top - 1e-6);
        expect(box.maxY).toBeLessThanOrEqual(area.top + area.height + 1e-6);
      }
    });

    it('at its strongest lean, fills the free area one way', () => {
      const leans = [period / 4, (3 * period) / 4].map(boxAt);
      const fills = leans.some(
        (box) =>
          Math.abs(box.width - area.width) < 1e-6 || Math.abs(box.height - area.height) < 1e-6,
      );
      expect(fills).toBe(true);
    });

    it('skewedRotatedBox: no skew, no turn is the rectangle itself', () => {
      const box = skewedRotatedBox(300, 200, 0, 0);
      expect(box.width).toBeCloseTo(300, 9);
      expect(box.height).toBeCloseTo(200, 9);
    });
  });

  it('rectForRotatedBox: unturned it is the box itself', () => {
    expect(rectForRotatedBox(300, 200, 0)).toEqual({ width: 300, height: 200 });
  });

  it('points every round at existing objective copy', () => {
    for (const r of rounds) expect(copy.objectives[r.copyKey]).toBeTruthy();
  });

  it('throws for an unknown round id', () => {
    expect(() => getRound(13)).toThrow();
  });
});
