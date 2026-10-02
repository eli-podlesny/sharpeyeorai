import { copy } from '../config/copy';
import { gameConfig, type ChatDirectorConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import type { EventBus } from '../core/events';
import { createRng, randomSeed, type Rng } from '../core/rng';
import { liveRound } from '../rounds/clock';
import { contains } from '../rounds/polygon';
import type { RoundResult } from '../rounds/session';
import { contentSize, toContentCoords } from '../core/input';
import { scoreRound } from '../scoring/summary';
import {
  chatMessageCount,
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
  /** Idle ("Ptss..."), too fast, the story beats, "easy, huh?", leaving, the score line. */
  time: 1,
  /** How the click went: a miss (or two), a bullseye, a machine pick, a streak. Beats the time lines. */
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

/** What the chat says about a click (src/ui/chatDirector.ts), strongest first. */
export type ClickReaction = 'missStreak' | 'miss' | 'bullseye' | 'machine' | 'goodStreak' | 'fast';

export interface ClickStreaks {
  /** Misses in a row, up to and including this click. */
  misses: number;
  /** Precise rounds in a row (quality ≥ `goodStreak.minQuality`), up to and including this click. */
  goods: number;
}

/**
 * Pure: the chat's reaction to a click (or none), and the streaks after it. A miss (a
 * second one in a row: the streak) wins; then a bullseye (near O), a machine pick (on C
 * while O is clearly elsewhere), a streak of precise rounds, and last a too-fast click.
 */
export function reactToClick(
  result: RoundResult,
  streaks: ClickStreaks,
  cfg: ChatDirectorConfig = gameConfig.chatDirector,
): { reaction: ClickReaction | null; streaks: ClickStreaks } {
  const scored = scoreRound(result);
  const miss = isMiss(result);
  const good = !miss && scored.q >= cfg.goodStreak.minQuality;
  const next = { misses: miss ? streaks.misses + 1 : 0, goods: good ? streaks.goods + 1 : 0 };
  let reaction: ClickReaction | null = null;
  if (miss) reaction = next.misses >= cfg.missStreak ? 'missStreak' : 'miss';
  else if (scored.dO !== null && scored.dO <= cfg.bullseyePx) reaction = 'bullseye';
  else if (
    scored.dC !== null &&
    scored.dO !== null &&
    scored.dC <= cfg.machine.nearCPx &&
    scored.dO >= cfg.machine.minFromOPx
  ) {
    reaction = 'machine';
  } else if (next.goods >= cfg.goodStreak.count) reaction = 'goodStreak';
  else if (result.latencyMs !== null && result.latencyMs < cfg.fastBeforeMs) reaction = 'fast';
  // A streak line once per streak: it starts counting again after it was said.
  if (reaction === 'goodStreak') next.goods = 0;
  if (reaction === 'missStreak') next.misses = 0;
  return { reaction, streaks: next };
}

/** A pool entry as chat lines: a single line, or a little chat. */
const asLines = (entry: string | readonly string[] | undefined): readonly string[] =>
  entry === undefined ? [] : typeof entry === 'string' ? [entry] : entry;

type SayOptions = {
  anchor?: HTMLElement;
  holdMs?: number;
  delayMs?: number;
  untilActivity?: boolean;
  /** Only into an empty chat. */
  quiet?: boolean;
};

/**
 * The chat director: the one place that decides what the chat says and when, from game
 * events (numbers in `gameConfig.chatDirector`, lines in `copy.chat` / `copy.chatPools`).
 *
 * - alert mode starts: "Alert! System Malfunction" (orange), clearing the chat;
 * - a round starts with its own chat (rounds 10–12; round 12's lit, in `litStack`);
 * - the first round: a greeting; story beats at some rounds' start (`beats`);
 * - no click `idleAfterMs` into a round (round clock): an idle chat, which stays until the
 *   mouse moves;
 * - a click: see `reactToClick` (miss, two misses, bullseye, machine pick, streak, too fast);
 * - clicking the screen while the round ignores it: an impatient line;
 * - the mouse leaving the window mid-round, or the tab coming back (once a game each);
 * - after round `easyAfterRound`: "Seems easy, huh?"; as the score shows, a line by tier.
 * Quiet lines (greeting, beats, easy, impatient, leaving, score) only come into an empty
 * chat. Round 12 (dark, no feedback) gets only its own chat; rounds that close their doors
 * no idle chat.
 */
export function createChatDirector(bus: EventBus, litStack: HTMLElement): void {
  const cfg = gameConfig.chatDirector;
  const rng = createRng(randomSeed());
  const pools = copy.chatPools;
  /** One shuffle bag per pool, so nothing repeats until its pool is used up. */
  const bags = new Map<readonly unknown[], () => number>();
  const pickFrom = <T>(pool: readonly T[]): T | undefined => {
    let next = bags.get(pool);
    if (!next) {
      next = createShuffleBag(pool.length, rng);
      bags.set(pool, next);
    }
    return pool[next()];
  };

  const running: { priority: number; sequence: ChatSequence }[] = [];
  let alertMessage: ChatMessage | null = null;

  const say = (lines: readonly string[], priority: number, options: SayOptions = {}): void => {
    if (lines.length === 0) return;
    for (let i = running.length - 1; i >= 0; i--) {
      if (!running[i]?.sequence.pending) running.splice(i, 1);
    }
    const { quiet, ...rest } = options;
    if (quiet && (chatMessageCount() > 0 || running.length > 0)) return;
    if (
      !chatMayStart(
        priority,
        running.map((r) => r.priority),
      )
    )
      return;
    for (const r of running) if (r.priority < priority) r.sequence.cancel();
    running.push({ priority, sequence: showChatSequence({ variant: 'light', lines, ...rest }) });
  };
  const sayPool = (
    pool: readonly (string | readonly string[])[],
    priority: number,
    options: SayOptions = {},
  ): void => say(asLines(pickFrom(pool)), priority, options);

  // The alert: the strongest. Everything else stops; it shows alone, in orange.
  bus.on('alert.show', ({ active }) => {
    alertMessage?.hide();
    alertMessage = null;
    if (!active) return;
    for (const r of running) r.sequence.cancel();
    clearChatMessages();
    // It stays (pinned: the cap never drops it) until round 10's chat fades, with it.
    alertMessage = showChatMessage({ variant: 'orange', title: copy.chat.alert, pinned: true });
  });

  /** The round being played; whether its shape is up and still taking its click. */
  let roundId: number | null = null;
  let open = false;
  let decided = true;
  let idleSaid = false;
  let ignoredClicks = 0;
  let streaks: ClickStreaks = { misses: 0, goods: 0 };
  /** Once a game. */
  let awaySaid = false;
  let backSaid = false;

  bus.on('round.intro.start', (e) => {
    roundId = e.roundId;
    open = false;
    decided = false;
    idleSaid = false;
    ignoredClicks = 0;
    const round = getRound(e.roundId);
    if (e.roundId === 1) {
      streaks = { misses: 0, goods: 0 };
      awaySaid = false;
      backSaid = false;
      sayPool(pools.start, CHAT_PRIORITY.time, { delayMs: cfg.startDelayMs, quiet: true });
    }
    if (round.chat && e.roundId === cfg.alertUntilChatOfRound && alertMessage) {
      const { sequenceIntervalMs, sequenceHoldMs } = gameConfig.chatMessage;
      const endMs =
        (round.chat.delayMs ?? 0) +
        (round.chat.lines.length - 1) * sequenceIntervalMs +
        (round.chat.holdMs ?? sequenceHoldMs);
      const alert = alertMessage;
      window.setTimeout(() => alert.hide(), endMs);
    }
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
    for (const beat of cfg.beats) {
      if (beat.round !== e.roundId) continue;
      window.setTimeout(() => {
        if (roundId === beat.round) {
          sayPool(pools.beats[beat.pool], CHAT_PRIORITY.time, { quiet: true });
        }
      }, beat.delayMs);
    }
  });

  bus.on('round.shape.visible', () => {
    open = true;
  });

  bus.on('round.logged', ({ result }) => {
    open = false;
    decided = true;
    if (!getRound(result.roundId).clickFeedback || result.clickContent === null) return;
    const out = reactToClick(result, streaks, cfg);
    streaks = out.streaks;
    const pool = {
      missStreak: pools.missStreak,
      miss: pools.miss,
      bullseye: pools.bullseye,
      machine: pools.machine,
      goodStreak: pools.goodStreak,
      fast: pools.fast,
    } as const;
    if (out.reaction === null) return;
    const priority = out.reaction === 'fast' ? CHAT_PRIORITY.time : CHAT_PRIORITY.miss;
    sayPool(pool[out.reaction], priority);
  });

  bus.on('round.outro.end', (e) => {
    if (e.roundId === cfg.easyAfterRound) {
      sayPool(pools.easy, CHAT_PRIORITY.time, { quiet: true });
    }
  });

  bus.on('state.change', ({ to }) => {
    if (to !== 'round') {
      roundId = null;
      open = false;
      decided = true;
    }
  });

  bus.on('score.reveal', ({ summary }) => {
    const { sharp, decent } = gameConfig.persona.accuracy;
    const tier = summary.total >= sharp ? 'sharp' : summary.total >= decent ? 'decent' : 'blurry';
    sayPool(pools.score[tier], CHAT_PRIORITY.time, { delayMs: cfg.scoreDelayMs, quiet: true });
  });

  /** A round is on and its click still to come (a hidden tab, a leave: worth a word). */
  const playing = (): boolean => roundId !== null && !decided && getRound(roundId).clickFeedback;

  // Clicking the screen while the round ignores clicks (too early, or already decided).
  // Captured first: the deciding click itself still finds the round open.
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (roundId === null || open || !getRound(roundId).clickFeedback || e.button !== 0) return;
      const c = toContentCoords(e.clientX, e.clientY);
      const inside = c.x >= 0 && c.y >= 0 && c.x <= contentSize.width && c.y <= contentSize.height;
      if (!inside) return;
      ignoredClicks++;
      if (ignoredClicks === cfg.impatientClicks) {
        sayPool(pools.impatient, CHAT_PRIORITY.time, { quiet: true });
      }
    },
    { capture: true },
  );

  document.documentElement.addEventListener('pointerleave', () => {
    if (awaySaid || !playing()) return;
    awaySaid = true;
    sayPool(pools.away, CHAT_PRIORITY.time, { quiet: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || backSaid || !playing()) return;
    backSaid = true;
    sayPool(pools.back, CHAT_PRIORITY.time, { quiet: true });
  });

  // Idle: checked against the round clock, so a hidden tab (or the debug pause) never
  // counts. It stays up until the mouse moves.
  const tick = (): void => {
    const live = liveRound.current;
    if (roundId !== null && !decided && !idleSaid && live?.roundId === roundId) {
      const round = getRound(roundId);
      const idleAllowed = round.clickFeedback && !round.effects.includes('closingDoors');
      if (idleAllowed && live.elapsedMs() >= cfg.idleAfterMs) {
        idleSaid = true;
        sayPool(pools.idle, CHAT_PRIORITY.time, {
          untilActivity: true,
          holdMs: cfg.idleHoldAfterMoveMs,
        });
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
