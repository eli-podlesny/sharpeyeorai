import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import { chatSequenceTimes } from './chatMessage';

describe('chat sequences', () => {
  const { sequenceIntervalMs, sequenceHoldMs, minVisibleMs } = gameConfig.chatMessage;

  it('shows one line every 1.2s and fades them all out together 4s after the last', () => {
    const times = chatSequenceTimes(2, sequenceIntervalMs, sequenceHoldMs);
    expect(times).toEqual([
      { atMs: 0, durationMs: 5200 },
      { atMs: 1200, durationMs: 4000 },
    ]);
    for (const t of times) expect(t.atMs + t.durationMs).toBe(5200);
  });

  it('keeps every line up at least the minimum time', () => {
    for (const id of [10, 11, 12]) {
      const chat = getRound(id).chat;
      expect(chat).toBeDefined();
      if (!chat) continue;
      const times = chatSequenceTimes(
        chat.lines.length,
        sequenceIntervalMs,
        chat.holdMs ?? sequenceHoldMs,
      );
      for (const t of times) expect(t.durationMs).toBeGreaterThanOrEqual(minVisibleMs);
    }
  });

  it('rounds 10 and 11 have their two-line chats', () => {
    expect(getRound(10).chat?.lines).toEqual(['whatsGoingOn', 'brokeSomething']);
    expect(getRound(11).chat?.lines).toEqual(['doorsClosing', 'hurryUp']);
  });
});
