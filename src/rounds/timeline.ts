import type { EventBus } from '../core/events';
import type { Point } from '../core/stage';

/** Where a round is in its sequence (see sequence.ts). */
export type RoundStage = 'intro' | 'play' | 'outro';

/** What a round's timeline gets to work with. */
export interface RoundTimelineContext {
  roundId: number;
  /** The round's root element inside screen-content. */
  root: HTMLElement;
  /** The shape element. */
  shape: HTMLElement;
  bus: EventBus;
}

/**
 * Optional per-round hooks for moving shapes, glitches and scene effects (v0.5–v0.7).
 * Every function is optional; rounds leave out what they don't need.
 */
export interface RoundTimeline {
  onIntroStart?(ctx: RoundTimelineContext): void;
  onShapeVisible?(ctx: RoundTimelineContext): void;
  /** Every animation frame from the intro start until the outro ends. */
  onFrame?(ctx: RoundTimelineContext, frame: { elapsedMs: number; stage: RoundStage }): void;
  onClick?(ctx: RoundTimelineContext, click: { content: Point; latencyMs: number }): void;
  onOutroEnd?(ctx: RoundTimelineContext): void;
}
