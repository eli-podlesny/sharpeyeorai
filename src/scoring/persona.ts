import { copy } from '../config/copy';
import { gameConfig, type PersonaConfig } from '../config/game.config';

export type AccuracyTier = 'sharp' | 'decent' | 'blurry';
export type HumanityTier = 'machine' | 'hybrid' | 'human';
export type SpeedTier = 'fast' | 'steady' | 'slow';
export type OverrideId = keyof typeof copy.persona.overrides;

export interface Persona {
  accuracy: AccuracyTier;
  humanity: HumanityTier;
  speed: SpeedTier;
  /** Set when an override replaced the accuracy × humanity verdict. */
  override: OverrideId | null;
  headline: string;
  line: string;
  /** Third, smaller line. Null when an override fired. */
  speedTag: string | null;
}

export function accuracyTier(total: number, cfg: PersonaConfig = gameConfig.persona): AccuracyTier {
  if (total >= cfg.accuracy.sharp) return 'sharp';
  if (total >= cfg.accuracy.decent) return 'decent';
  return 'blurry';
}

/** No valid rounds (null) counts as hybrid. */
export function humanityTier(
  index: number | null,
  cfg: PersonaConfig = gameConfig.persona,
): HumanityTier {
  if (index === null) return 'hybrid';
  if (index < cfg.humanity.machine) return 'machine';
  if (index > cfg.humanity.human) return 'human';
  return 'hybrid';
}

export function speedTier(
  meanLatencyMs: number,
  cfg: PersonaConfig = gameConfig.persona,
): SpeedTier {
  if (meanLatencyMs < cfg.speed.fast) return 'fast';
  if (meanLatencyMs > cfg.speed.slow) return 'slow';
  return 'steady';
}

/** Overrides, checked in this order; the first match wins. */
function findOverride(
  total: number,
  accuracy: AccuracyTier,
  speed: SpeedTier,
  cfg: PersonaConfig,
): OverrideId | null {
  if (total >= cfg.algorithmTotal) return 'algorithm';
  if (speed === 'fast' && accuracy === 'blurry') return 'trigger';
  if (speed === 'slow' && accuracy === 'sharp') return 'sniper';
  return null;
}

/** The verdict for a finished game. Text comes from `copy.persona`. */
export function pickPersona(
  total: number,
  humanityIndex: number | null,
  meanLatencyMs: number,
  cfg: PersonaConfig = gameConfig.persona,
): Persona {
  const accuracy = accuracyTier(total, cfg);
  const humanity = humanityTier(humanityIndex, cfg);
  const speed = speedTier(meanLatencyMs, cfg);
  const override = findOverride(total, accuracy, speed, cfg);

  const text = override
    ? copy.persona.overrides[override]
    : copy.persona.matrix[accuracy][humanity];
  return {
    accuracy,
    humanity,
    speed,
    override,
    headline: text.headline,
    line: text.line,
    speedTag: override ? null : copy.persona.speedTags[speed],
  };
}
