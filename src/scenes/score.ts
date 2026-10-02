import { copy, fill, padDigits, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { SceneContext } from '../core/game';
import { contentSize } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import type { Scope } from '../core/scope';
import { setU, u } from '../core/units';
import { randomSeed } from '../core/rng';
import { createSampleResults } from '../rounds/autoplay';
import { summarize, type SessionSummary } from '../scoring/summary';
import { h } from '../ui/dom';
import { fadeTo, prefersReducedMotion } from '../ui/motion';
import { showChatMessage, type ChatMessage } from '../ui/chatMessage';
import { createFillingBar, createPanel, createTitle } from './layout';

const { score: L } = layout;

/** A centered line of text at a fixed top, sized from layout.config.ts. */
function createLine(
  tag: 'p' | 'h2',
  className: string,
  text: string,
  box: { top: number; fontSize: number; lineHeight: number; letterSpacing?: number },
): HTMLElement {
  const el = h(tag, `score-line ${className}`, text);
  setU(el, box);
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
  setU(table, { top: L.table.top, fontSize: L.table.fontSize });
  table.style.setProperty('--row-height', u(L.table.rowHeight));
  table.style.setProperty('--cell-padding-x', u(L.table.cellPaddingX));

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
      h('td', '', r.dO === null ? copy.score.noInput : r.dO.toFixed(1)),
      h('td', '', r.latencyMs === null ? copy.score.noValue : String(r.latencyMs)),
      h('td', '', String(Math.round(r.points))),
    );
    body.append(row);
  }

  table.append(head, body);
  return table;
}

/**
 * The end of the test: total (counted up), verdict persona, speed tag, a Details table,
 * Share result and Play again. The doors open onto "Calculating" (like "Initializing"),
 * which stays `calculatingMs` once they are open; then the score fades in and counts up.
 * The screen HUD is hidden here. Reached without
 * playing (debug jump), it scores seeded sample clicks instead.
 */
/** Counts the score screens of this visit, from a random start: the verdict's wording. */
let verdictRoll = randomSeed();

export function createScoreScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(false, 0);
    ctx.hud.setVisible(false, 0);

    const { session } = ctx;
    const isSample = session.results.length === 0;
    const results = isSample ? createSampleResults(session, contentSize) : session.results;
    // Each score screen takes the next wording of its verdict, so replays read differently.
    const summary = summarize(results, gameConfig.roundCount, gameConfig.scoring, verdictRoll++);
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
    total.style.transform = `translateX(${u(L.total.nudgeX)})`;
    const line = createLine('p', 'score-body', persona.line, L.line);
    line.style.maxWidth = u(L.line.maxWidth);
    verdict.append(total, createLine('h2', 'score-headline', persona.headline, L.headline), line);
    if (persona.speedTag) {
      verdict.append(createLine('p', 'score-speed-tag', persona.speedTag, L.speedTag));
    }

    const table = createDetailsTable(summary);
    table.hidden = true;

    // Links row
    const links = h('div', 'score-links');
    setU(links, {
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
    if (isSample) {
      const note = h('p', 'score-sample-note', copy.score.sampleNote);
      setU(note, L.sampleNote);
      root.append(note);
    }
    root.classList.add('fade');
    root.style.opacity = '0';
    root.inert = true;
    scope.mount(ctx.content, root);

    // The room shows first; then the screen enters from below (after the game; not on a
    // debug jump, where it is already there).
    const enterMs = ctx.screen.show(gameConfig.screenEntrance.delayMs);

    // "Calculating" first, like "Initializing": it starts behind the shut doors, the doors
    // open onto it (zooming in), and it stays `calculatingMs` once they are open.
    const doorAt = enterMs + gameConfig.loadingStartBeforeDoorsMs;
    const doorMs = gameConfig.doorOpenMs;
    const fadeMs = gameConfig.calculatingFadeMs;
    const calcEnd = doorAt + doorMs + gameConfig.calculatingMs;
    const calculating = createPanel('calculating');
    calculating.classList.add('fade');
    const bar = createFillingBar(calcEnd);
    calculating.append(createTitle(copy.calculating.title), bar.el);
    scope.mount(ctx.content, calculating);
    bar.start();

    scope.timeout(() => {
      ctx.bus.emit('door.open.start', { durationMs: doorMs });
      ctx.doors.setOpen(true, doorMs);
      scope.timeout(() => ctx.bus.emit('door.open.end', {}), doorMs);
    }, doorAt);

    // Then the score: it fades in and the total counts up.
    scope.timeout(() => fadeTo(calculating, 0, fadeMs), calcEnd);
    scope.timeout(() => {
      calculating.remove();
      root.inert = false;
      fadeTo(root, 1, fadeMs);
      ctx.bus.emit('score.reveal', { summary, isSample });
      countUp(scope, total, summary.total);
    }, calcEnd + fadeMs);

    scope.listen(details, 'click', () => {
      const open = table.hidden;
      table.hidden = !open;
      verdict.hidden = open;
      details.textContent = open ? copy.score.hideDetails : copy.score.details;
      details.setAttribute('aria-expanded', String(open));
    });

    // A new Share replaces the last message (which still stays its minimum time, stacked
    // above the new one); leaving the score removes it.
    let message: ChatMessage | null = null;
    scope.onDispose(() => message?.hide(true));

    scope.listen(share, 'click', () => {
      const text = fill(copy.score.shareText, {
        total: summary.total,
        max: gameConfig.scoring.maxScore,
        headline: persona.headline,
        url: copy.score.shareUrl,
      });
      const report = (copied: boolean): void => {
        message?.hide();
        message = copied
          ? showChatMessage({
              variant: 'light',
              title: copy.score.copied,
              durationMs: gameConfig.chatMessage.copiedMs,
            })
          : // No clipboard: show the text so it can be copied by hand. It stays until replaced.
            showChatMessage({
              variant: 'light',
              title: copy.score.copyFailed,
              body: text,
              selectable: true,
            });
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
