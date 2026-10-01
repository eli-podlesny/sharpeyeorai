import { SAMPLE_SPREAD_PX, spreadPreset, type AutoplayPreset } from '../config/autoplay.config';
import { rounds } from '../config/rounds.config';
import { rangeOf } from '../core/rng';
import type { Size } from './geometry';
import { createResult, shapeSeed, type GameSession, type RoundResult } from './session';
import { targetAt } from './target';
import { acceptsClick, inputDeadlineMs } from './timing';

/** Autoplay clicks this long before a round's deadline at the latest. */
const DEADLINE_MARGIN_MS = 1;

/**
 * Fake results for all rounds, following a preset (see autoplay.config.ts), on the
 * session's shapes. Moving shapes are clicked on the frame shown at the fake latency,
 * which stays inside the round's deadline and input windows. The session's rng makes
 * them repeatable for a given seed.
 */
export function autoplayResults(
  preset: AutoplayPreset,
  session: GameSession,
  content: Size,
): RoundResult[] {
  const { rng } = session;
  return rounds.map((round) => {
    const wanted = Math.round(rangeOf(rng, preset.latencyMs.min, preset.latencyMs.max));
    const deadline = inputDeadlineMs(round);
    const latency = deadline === null ? wanted : Math.min(wanted, deadline - DEADLINE_MARGIN_MS);
    const firstOpen = round.inputWindows?.find(([, to]) => to > latency)?.[0] ?? 0;
    const clickMs = acceptsClick(round, latency) ? latency : firstOpen;
    const target = targetAt(round, content, shapeSeed(session, round.id), clickMs);
    const { C, O } = target.centers;
    const dx = O.x - C.x;
    const dy = O.y - C.y;
    const sep = Math.hypot(dx, dy);
    // Unit vector across the C→O line (screen right when O is straight above C).
    const side = sep > 0 ? { x: -dy / sep, y: dx / sep } : { x: 1, y: 0 };
    const j = preset.jitterPx;
    const click = {
      x: C.x + preset.lean * dx + preset.sidePx * side.x + rangeOf(rng, -j, j),
      y: C.y + preset.lean * dy + preset.sidePx * side.y + rangeOf(rng, -j, j),
    };
    return createResult(target, click, clickMs);
  });
}

/** Sample data for the score screen when it is opened without playing (debug jumps). */
export function createSampleResults(session: GameSession, content: Size): RoundResult[] {
  return autoplayResults(spreadPreset(SAMPLE_SPREAD_PX), session, content);
}
