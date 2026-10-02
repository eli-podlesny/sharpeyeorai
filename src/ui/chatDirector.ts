import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import type { EventBus } from '../core/events';
import { createRng, randomSeed, type Rng } from '../core/rng';
import { liveRound } from '../rounds/clock';
import { contains } from '../rounds/polygon';
import type { RoundResult } from '../rounds/session';
import {
  clearChatMessages,
  showChatMessage,
  showChatSequence,
  type ChatMessage,
  type ChatSequence,
} from './chatMessage';

/**
 * Who gets to speak, from weakest to strongest. A chat cancels the lines still to come of
 * weaker chats, and is dropped while a stronger one still has lines to come. The alert also
 * clears every message on screen.
 */
export const CHAT_PRIORITY = {
  /** Idle ("Ptss..."), too fast, and the "easy, huh?" after round 3. */
  time: 1,
  /** A click outside the shape: beats the time lines. */
  miss: 2,
  /** The rounds' own chats (10–12). */
  script: 3,
  /** "Alert! System Malfunction": cuts in over everything. */
  alert: 4,
} as const;

/**
 * Pure: whether a new chat of `priority` may start while chats of `pending` priorities
 * still have lines to come (it may unless one of them is stronger).
 */
export function chatMayStart(priority: number, pending: readonly number[]): boolean {
  return pending.every((p) => p <= priority);
}

/**
 * Pure: a bag of the indexes 0…n−1, handed out in a shuffled order, refilled (and
 * reshuffled) once empty: no entry comes twice before all were used.
 */
export function createShuffleBag(n: number, rng: Rng): () => number {
  let bag: number[] = [];
  return () => {
    if (bag.length === 0) {
      bag = Array.from({ length: n }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j] as number, bag[i] as number];
      }
    }
    return bag.pop() ?? 0;
  };
}

/** Pure: the click landed outside the shape as it was on screen (a hole still counts as on it). */
export function isMiss(result: RoundResult): boolean {
  return result.clickContent !== null && !contains(result.shape.outer, result.clickContent);
}

/**
 * The chat director: the one place that decides what the chat says and when, from game
 * events (timings in `gameConfig.chatMessage`, lines in `copy.chat` / `copy.chatPools`).
 *
 * - alert mode starts: "Alert! System Malfunction" (orange), clearing the chat;
 * - a round starts with its own chat (rounds 10–12; round 12's lit, in `litStack`);
 * - no click `idleAfterMs` into a round (round clock): an idle chat ("Ptss...", "Wake Up");
 * - a click outside the shape: a cocky line; else a click within `fastBeforeMs`: a speedy one;
 * - after round `easyAfterRound`: "Seems easy, huh?" or the like.
 * Round 12 (dark, no feedback) gets only its own chat; rounds that close their doors no idle chat.
 */
export function createChatDirector(bus: EventBus, litStack: HTMLElement): void {
  const cfg = gameConfig.chatMessage;
  const rng = createRng(randomSeed());
  const pools = copy.chatPools;
  const pick = {
    idle: createShuffleBag(pools.idle.length, rng),
    fast: createShuffleBag(pools.fast.length, rng),
    miss: createShuffleBag(pools.miss.length, rng),
    easy: createShuffleBag(pools.easy.length, rng),
  };

  const running: { priority: number; sequence: ChatSequence }[] = [];
  let alertMessage: ChatMessage | null = null;

  const say = (
    lines: readonly string[],
    priority: number,
    options: { anchor?: HTMLElement; holdMs?: number; delayMs?: number } = {},
  ): void => {
    for (let i = running.length - 1; i >= 0; i--) {
      if (!running[i]?.sequence.pending) running.splice(i, 1);
    }
    if (
      !chatMayStart(
        priority,
        running.map((r) => r.priority),
      )
    )
      return;
    for (const r of running) if (r.priority < priority) r.sequence.cancel();
    running.push({
      priority,
      sequence: showChatSequence({ variant: 'light', lines, ...options }),
    });
  };

  // The alert: the strongest. Everything else stops; it shows alone, in orange.
  bus.on('alert.show', ({ active }) => {
    alertMessage?.hide();
    alertMessage = null;
    if (!active) return;
    for (const r of running) r.sequence.cancel();
    clearChatMessages();
    alertMessage = showChatMessage({
      variant: 'orange',
      title: copy.chat.alert,
      durationMs: cfg.alertMs,
    });
  });

  /** The round being played and whether it has been decided (click or timeout). */
  let roundId: number | null = null;
  let decided = true;
  let idleSaid = false;

  bus.on('round.intro.start', (e) => {
    roundId = e.roundId;
    decided = false;
    idleSaid = false;
    const round = getRound(e.roundId);
    if (round.chat) {
      say(
        round.chat.lines.map((key) => copy.chat[key]),
        CHAT_PRIORITY.script,
        {
          anchor: round.aboveDarkness ? litStack : undefined,
          holdMs: round.chat.holdMs,
          delayMs: round.chat.delayMs,
        },
      );
    }
  });

  bus.on('round.logged', ({ result }) => {
    decided = true;
    const round = getRound(result.roundId);
    if (!round.clickFeedback || result.clickContent === null) return;
    if (isMiss(result)) {
      say([pools.miss[pick.miss()] ?? ''], CHAT_PRIORITY.miss);
    } else if (result.latencyMs !== null && result.latencyMs < cfg.fastBeforeMs) {
      say([pools.fast[pick.fast()] ?? ''], CHAT_PRIORITY.time);
    }
  });

  bus.on('round.outro.end', (e) => {
    if (e.roundId === cfg.easyAfterRound) {
      say([pools.easy[pick.easy()] ?? ''], CHAT_PRIORITY.time);
    }
  });

  bus.on('state.change', ({ to }) => {
    if (to !== 'round') {
      roundId = null;
      decided = true;
    }
  });

  // Idle: checked against the round clock, so a hidden tab (or the debug pause) never counts.
  const tick = (): void => {
    const live = liveRound.current;
    if (roundId !== null && !decided && !idleSaid && live?.roundId === roundId) {
      const round = getRound(roundId);
      const idleAllowed = round.clickFeedback && !round.effects.includes('closingDoors');
      if (idleAllowed && live.elapsedMs() >= cfg.idleAfterMs) {
        idleSaid = true;
        say(pools.idle[pick.idle()] ?? [], CHAT_PRIORITY.time);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
