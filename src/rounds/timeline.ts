import type { EventBus } from '../core/events';
import type { Point } from '../core/stage';

/** Where a round is in its sequence (see sequence.ts): fading in, playable, fading out. */
export type RoundStage = 'intro' | 'play' | 'outro';

/** What a round's timeline gets to work with. */
export interface RoundTimelineContext {
  roundId: number;
  /** The round's root element inside screen-content. */
  root: HTMLElement;
  /** The shape element (an SVG covering screen-content). */
  shape: SVGSVGElement;
  bus: EventBus;
}

/**
 * Optional per-round hooks for moving shapes, glitches and scene effects (v0.5–v0.7).
 * Every function is optional; rounds leave out what they don't need.
 */
export interface RoundTimeline {
  onIntroStart?(ctx: RoundTimelineContext): void;
  onShapeVisible?(ctx: RoundTimelineContext): void;
  /**
   * Every animation frame from the start of the fade-in until the outro ends. `elapsedMs`
   * counts from the start of the round; `roundMs` is the round clock (from
   * `round.shape.visible`, paused while the tab is hidden; 0 before).
   */
  onFrame?(
    ctx: RoundTimelineContext,
    frame: { elapsedMs: number; roundMs: number; stage: RoundStage },
  ): void;
  onClick?(ctx: RoundTimelineContext, click: { content: Point; latencyMs: number }): void;
  onOutroEnd?(ctx: RoundTimelineContext): void;
}
