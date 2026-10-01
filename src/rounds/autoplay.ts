import { SAMPLE_SPREAD_PX, spreadPreset, type AutoplayPreset } from '../config/autoplay.config';
import { rounds } from '../config/rounds.config';
import { rangeOf, type Rng } from '../core/rng';
import type { Size } from './geometry';
import { roundCenters } from './opticalCenter';
import { createResult, type RoundResult } from './session';

/**
 * Fake results for all rounds, following a preset (see autoplay.config.ts).
 * The rng makes them repeatable for a given seed.
 */
export function autoplayResults(preset: AutoplayPreset, rng: Rng, content: Size): RoundResult[] {
  return rounds.map((round) => {
    const { C, O } = roundCenters(round, content);
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
    return createResult(round.id, click, latency, content);
  });
}

/** Sample data for the score screen when it is opened without playing (debug jumps). */
export function createSampleResults(rng: Rng, content: Size): RoundResult[] {
  return autoplayResults(spreadPreset(SAMPLE_SPREAD_PX), rng, content);
}
