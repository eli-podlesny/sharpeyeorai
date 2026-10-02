import { describe, expect, it } from 'vitest';
import { copy } from '../config/copy';
import { createRng } from '../core/rng';
import type { RoundResult } from '../rounds/session';
import { CHAT_PRIORITY, chatMayStart, createShuffleBag, isMiss } from './chatDirector';

describe('chat director', () => {
  it('has the asked-for pools', () => {
    expect(copy.chatPools.idle).toHaveLength(5);
    for (const chat of copy.chatPools.idle) expect(chat.length).toBeLessThanOrEqual(3);
    expect(copy.chatPools.idle[0]).toEqual(['Ptss...', 'Wake Up']);
    expect(copy.chatPools.fast).toHaveLength(12);
    expect(copy.chatPools.miss).toHaveLength(10);
    expect(copy.chatPools.miss).toContain('Missed that haha');
    expect(copy.chatPools.easy).toContain('Seems easy, huh?');
  });

  it('ranks alert over the round chats over a miss over the time lines', () => {
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
