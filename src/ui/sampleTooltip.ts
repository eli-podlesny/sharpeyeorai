import { copy, fill, padDigits, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { Point } from '../core/stage';
import { setU } from '../core/units';
import { h } from './dom';
import { commitStyles, fadeTo } from './motion';
import { createPanelSvg } from './panelShape';

const T = layout.sampleTooltip;

/** What a sample tooltip shows: the click and its time, or "no input" with the deadline. */
export type SampleData =
  | { kind: 'logged'; roundId: number; at: Point; latencyMs: number }
  | { kind: 'noInput'; roundId: number; deadlineMs: number };

/** Pure: a value right-aligned with leading dots, as in Figma (`...........138,65px`). */
export function dotLeader(value: string, width: number = T.valueChars): string {
  return value.padStart(width, '.');
}

/** Pure: a position in content px with 2 decimals and a decimal comma (Figma). */
export function formatSamplePx(v: number): string {
  return fill(copy.round.samplePx, { v: v.toFixed(2).replace('.', ',') });
}

/** Pure: the three value rows (x, y, t) for a sample. */
export function sampleRows(data: SampleData): [string, string, string] {
  const ms = data.kind === 'logged' ? data.latencyMs : data.deadlineMs;
  const time = fill(copy.round.sampleMs, { ms: padDigits(Math.round(ms)) });
  if (data.kind === 'noInput') return [copy.round.sampleNone, copy.round.sampleNone, time];
  return [formatSamplePx(data.at.x), formatSamplePx(data.at.y), time];
}

/**
 * The sample tooltip (Figma "tooltip logged"): "Sample 04" and LOGGED (or NO INPUT for a
 * round that timed out), a divider, then x, y and t with dot leaders, on a hand-drawn
 * concrete panel. Pinned with its top-right corner at `corner` (content px from the
 * container's top and right). Fades in; `hide()` fades it out and removes it.
 */
export function showSampleTooltip(
  container: HTMLElement,
  corner: { right: number; top: number },
  data: SampleData,
  reducedMotion: boolean,
): { el: HTMLElement; hide(): void } {
  const tip = h('div', `sample-tip fade sample-tip--${data.kind}`);
  tip.setAttribute('role', 'status');
  setU(tip, { ...corner, width: T.width, height: T.height });
  tip.append(createPanelSvg({ width: T.width, height: T.height }, { dividerY: T.dividerY }));

  const status = data.kind === 'logged' ? copy.round.logged : copy.round.noInput;
  const head = h('div', 'sample-tip__row sample-tip__head');
  head.append(
    h('span', 'sample-tip__sample', fill(copy.round.sample, { n: padRound(data.roundId) })),
    h('span', 'sample-tip__status', status),
  );
  setU(head, { top: T.titleTop, left: T.paddingX, right: T.paddingX, lineHeight: T.lineHeight });
  for (const el of head.children) setU(el as HTMLElement, { fontSize: T.titleSize });
  tip.append(head);

  const labels = [copy.round.sampleX, copy.round.sampleY, copy.round.sampleT];
  sampleRows(data).forEach((value, i) => {
    const row = h('div', 'sample-tip__row');
    const label = h('span', 'sample-tip__label', labels[i]);
    const val = h('span', 'sample-tip__value', dotLeader(value));
    setU(label, { fontSize: T.labelSize });
    setU(val, { fontSize: T.valueSize });
    setU(row, {
      top: T.rowsTop + i * T.rowStep,
      left: T.paddingX,
      right: T.paddingX,
      lineHeight: T.lineHeight,
    });
    row.append(label, val);
    tip.append(row);
  });

  const ms = reducedMotion ? 0 : gameConfig.sampleTooltipFadeMs;
  tip.style.opacity = '0';
  container.append(tip);
  commitStyles(tip);
  fadeTo(tip, 1, ms);
  return {
    el: tip,
    hide() {
      fadeTo(tip, 0, ms);
      window.setTimeout(() => tip.remove(), ms);
    },
  };
}
