import { describe, expect, it } from 'vitest';
import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import { contentSize } from '../core/input';
import { createRng } from '../core/rng';
import type { Point } from '../core/stage';
import { createResult, type RoundResult } from '../rounds/session';
import { roundTarget } from '../rounds/target';
import {
  CHAT_PRIORITY,
  chatMayStart,
  createShuffleBag,
  isMiss,
  reactToClick,
} from './chatDirector';

describe('chat director', () => {
  it('has the asked-for pools, and more', () => {
    const p = copy.chatPools;
    expect(p.idle.length).toBeGreaterThanOrEqual(5);
    for (const chat of p.idle) expect(chat.length).toBeLessThanOrEqual(3);
    expect(p.idle[0]).toEqual(['Ptss...', 'Wake Up']);
    expect(p.fast.length).toBeGreaterThanOrEqual(12);
    expect(p.miss.length).toBeGreaterThanOrEqual(10);
    expect(p.miss).toContain('Missed that haha');
    expect(p.miss).toContain('Are you blind or what?');
    expect(p.easy).toContain('Seems easy, huh?');
    for (const chat of [...p.missStreak, ...p.goodStreak, ...p.start]) {
      expect(chat.length).toBeLessThanOrEqual(3);
    }
  });

  it('ranks alert over the round chats over the click lines over the time lines', () => {
    const { time, miss, script, alert } = CHAT_PRIORITY;
    expect(time < miss && miss < script && script < alert).toBe(true);
    // A miss may cut into a pending idle chat, not the other way round.
    expect(chatMayStart(miss, [time])).toBe(true);
    expect(chatMayStart(time, [miss])).toBe(false);
    expect(chatMayStart(alert, [script, miss])).toBe(true);
    expect(chatMayStart(time, [])).toBe(true);
  });

  it('never repeats a line before the pool is used up', () => {
    const next = createShuffleBag(12, createRng(7));
    const first = Array.from({ length: 12 }, next);
    expect(new Set(first).size).toBe(12);
    const second = Array.from({ length: 12 }, next);
    expect(new Set(second).size).toBe(12);
  });

  it('a miss is a click outside the outline as displayed', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const result = (x: number, y: number): RoundResult =>
      ({ clickContent: { x, y }, shape: { outer: square, holes: [] } }) as unknown as RoundResult;
    expect(isMiss(result(50, 50))).toBe(false);
    expect(isMiss(result(150, 50))).toBe(true);
    expect(isMiss({ ...result(0, 0), clickContent: null })).toBe(false);
  });
});

describe('reacting to a click (round 3, the avocado: C and O about 19px apart)', () => {
  const target = roundTarget(getRound(3), contentSize, 1);
  const { C, O } = target.centers;
  const click = (p: Point, latencyMs = 2000): RoundResult => createResult(target, p, latencyMs);
  const none = { misses: 0, goods: 0 };
  const cfg = gameConfig.chatDirector;
  /** A point a few px from O, away from C. */
  const nearO = (px: number): Point => {
    const len = Math.hypot(O.x - C.x, O.y - C.y);
    return { x: O.x + ((O.x - C.x) / len) * px, y: O.y + ((O.y - C.y) / len) * px };
  };

  it('a bullseye near O, a machine pick on C', () => {
    expect(Math.hypot(O.x - C.x, O.y - C.y)).toBeGreaterThan(cfg.machine.minFromOPx);
    expect(reactToClick(click(O), none).reaction).toBe('bullseye');
    expect(reactToClick(click(C), none).reaction).toBe('machine');
  });

  it('a miss, and a second one in a row is a streak', () => {
    const outside = { x: 5, y: 5 };
    const first = reactToClick(click(outside), none);
    expect(first.reaction).toBe('miss');
    const second = reactToClick(click(outside), first.streaks);
    expect(second.reaction).toBe('missStreak');
  });

  it('a miss beats too fast', () => {
    expect(reactToClick(click({ x: 5, y: 5 }, 300), none).reaction).toBe('miss');
  });

  it('too fast, when nothing else applies', () => {
    expect(reactToClick(click(nearO(8), 400), none).reaction).toBe('fast');
    expect(reactToClick(click(nearO(8), 2000), none).reaction).toBeNull();
  });

  it('three precise rounds in a row make a streak, said once', () => {
    let streaks = none;
    const reactions = [];
    for (let i = 0; i < 4; i++) {
      const out = reactToClick(click(nearO(8)), streaks);
      reactions.push(out.reaction);
      streaks = out.streaks;
    }
    expect(reactions).toEqual([null, null, 'goodStreak', null]);
  });
});
