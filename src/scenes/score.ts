import { copy, fill, padDigits, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { SceneContext } from '../core/game';
import { contentSize } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import type { Scope } from '../core/scope';
import { rem, setRem } from '../core/units';
import { createSampleResults } from '../rounds/autoplay';
import { summarize, type SessionSummary } from '../scoring/summary';
import { h } from '../ui/dom';
import { prefersReducedMotion } from '../ui/motion';
import { besideElement, showTooltip } from '../ui/tooltip';

const { score: L } = layout;

/** A centered line of text at a fixed top, sized from layout.config.ts. */
function createLine(
  tag: 'p' | 'h2',
  className: string,
  text: string,
  box: { top: number; fontSize: number; lineHeight: number; letterSpacing?: number },
): HTMLElement {
  const el = h(tag, `score-line ${className}`, text);
  setRem(el, box);
  return el;
}

/** Text button styled like the Figma "SHARE RESULT" link. */
function createLink(label: string): HTMLButtonElement {
  const el = h('button', 'score-link', label);
  el.type = 'button';
  return el;
}

/** Counts the total up from 0 (eased), or shows it at once with reduced motion. */
function countUp(scope: Scope, el: HTMLElement, total: number): void {
  const show = (n: number): void => {
    el.textContent = fill(copy.score.total, { total: padDigits(n) });
  };
  if (prefersReducedMotion() || gameConfig.scoreCountUpMs <= 0) {
    show(total);
    return;
  }
  show(0);
  const start = performance.now();
  scope.frame((now) => {
    const t = Math.min((now - start) / gameConfig.scoreCountUpMs, 1);
    const eased = 1 - (1 - t) ** 3;
    show(Math.round(total * eased));
    return t < 1;
  });
}

function createDetailsTable(summary: SessionSummary): HTMLTableElement {
  const table = h('table', 'score-table');
  setRem(table, { top: L.table.top, fontSize: L.table.fontSize });
  table.style.setProperty('--row-height', rem(L.table.rowHeight));
  table.style.setProperty('--cell-padding-x', rem(L.table.cellPaddingX));

  const headRow = h('tr', '');
  for (const label of [
    copy.score.colRound,
    copy.score.colOffset,
    copy.score.colLatency,
    copy.score.colPoints,
  ]) {
    const th = h('th', '', label);
    th.scope = 'col';
    headRow.append(th);
  }
  const head = h('thead', '');
  head.append(headRow);

  const body = h('tbody', '');
  for (const r of summary.rounds) {
    const row = h('tr', '');
    row.append(
      h('td', '', padRound(r.id)),
      h('td', '', r.dO.toFixed(1)),
      h('td', '', String(r.latencyMs)),
      h('td', '', String(Math.round(r.points))),
    );
    body.append(row);
  }

  table.append(head, body);
  return table;
}

/**
 * The end of the test: total (counted up), verdict persona, speed tag, a Details table,
 * Share result and Play again. It renders behind the shut doors, then opens them; the
 * count-up runs while they open. The screen HUD is hidden here. Reached without
 * playing (debug jump), it scores seeded sample clicks instead.
 */
export function createScoreScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(false, 0);
    ctx.hud.setVisible(false, 0);

    const { session } = ctx;
    const isSample = session.results.length === 0;
    const results = isSample ? createSampleResults(session.rng, contentSize) : session.results;
    const summary = summarize(results);
    const { persona } = summary;

    const root = h('div', 'score');

    // Verdict view
    const verdict = h('div', 'score-verdict');
    const total = createLine(
      'p',
      'score-total',
      fill(copy.score.total, { total: padDigits(0) }),
      L.total,
    );
    total.setAttribute('aria-label', fill(copy.score.total, { total: summary.total }));
    const line = createLine('p', 'score-body', persona.line, L.line);
    line.style.maxWidth = rem(L.line.maxWidth);
    verdict.append(total, createLine('h2', 'score-headline', persona.headline, L.headline), line);
    if (persona.speedTag) {
      verdict.append(createLine('p', 'score-speed-tag', persona.speedTag, L.speedTag));
    }

    const table = createDetailsTable(summary);
    table.hidden = true;

    // Links row
    const links = h('div', 'score-links');
    setRem(links, {
      top: L.links.top,
      fontSize: L.links.fontSize,
      lineHeight: L.links.lineHeight,
      letterSpacing: L.links.letterSpacing,
      gap: L.links.gap,
    });
    const details = createLink(copy.score.details);
    details.setAttribute('aria-expanded', 'false');
    const share = createLink(copy.score.share);
    const playAgain = createLink(copy.score.playAgain);
    links.append(details, share, playAgain);

    root.append(createLine('p', 'score-label', copy.score.label, L.label), verdict, table, links);
    if (isSample) root.append(h('p', 'score-sample-note', copy.score.sampleNote));
    scope.mount(ctx.content, root);

    const doorMs = gameConfig.doorOpenMs;
    ctx.bus.emit('door.open.start', { durationMs: doorMs });
    ctx.doors.setOpen(true, doorMs);
    // The total counts up while the doors slide open.
    ctx.bus.emit('score.reveal', { summary, isSample });
    countUp(scope, total, summary.total);
    scope.timeout(() => ctx.bus.emit('door.open.end', {}), doorMs);

    scope.listen(details, 'click', () => {
      const open = table.hidden;
      table.hidden = !open;
      verdict.hidden = open;
      details.textContent = open ? copy.score.hideDetails : copy.score.details;
      details.setAttribute('aria-expanded', String(open));
    });

    let tip: HTMLElement | null = null;
    let tipVersion = 0;
    const replaceTip = (next: HTMLElement): void => {
      tip?.remove();
      tip = next;
      tipVersion++;
    };

    scope.listen(share, 'click', () => {
      const text = fill(copy.score.shareText, {
        total: summary.total,
        max: gameConfig.scoring.maxScore,
        headline: persona.headline,
        url: copy.score.shareUrl,
      });
      const report = (copied: boolean): void => {
        const at = besideElement(share);
        if (copied) {
          replaceTip(showTooltip(root, at, { title: copy.score.copied, above: true }));
          const version = tipVersion;
          scope.timeout(() => {
            if (version === tipVersion) tip?.remove();
          }, gameConfig.copiedTooltipMs);
        } else {
          // No clipboard: show the text so it can be copied by hand. It stays until replaced.
          replaceTip(
            showTooltip(root, at, {
              title: copy.score.copyFailed,
              lines: [text],
              wrap: true,
              above: true,
            }),
          );
        }
        ctx.bus.emit('score.share', { text, copied });
      };
      if (!navigator.clipboard) {
        report(false);
        return;
      }
      navigator.clipboard.writeText(text).then(
        () => report(true),
        () => report(false),
      );
    });

    scope.listen(playAgain, 'click', () => ctx.machine.go('ready'));
  });
}
