import { SAMPLE_SPREAD_PX, spreadPreset, type AutoplayPreset } from '../config/autoplay.config';
import { rounds } from '../config/rounds.config';
import { rangeOf } from '../core/rng';
import type { Size } from './geometry';
import { createResult, shapeSeed, type GameSession, type RoundResult } from './session';
import { roundTarget } from './target';

/**
 * Fake results for all rounds, following a preset (see autoplay.config.ts), on the
 * session's shapes. The session's rng makes them repeatable for a given seed.
 */
export function autoplayResults(
  preset: AutoplayPreset,
  session: GameSession,
  content: Size,
): RoundResult[] {
  const { rng } = session;
  return rounds.map((round) => {
    const target = roundTarget(round, content, shapeSeed(session, round.id));
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
    const latency = Math.round(rangeOf(rng, preset.latencyMs.min, preset.latencyMs.max));
    return createResult(target, click, latency);
  });
}

/** Sample data for the score screen when it is opened without playing (debug jumps). */
export function createSampleResults(session: GameSession, content: Size): RoundResult[] {
  return autoplayResults(spreadPreset(SAMPLE_SPREAD_PX), session, content);
}
