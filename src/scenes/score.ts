import { copy, padRound } from '../config/copy';
import { layout } from '../config/layout.config';
import type { SceneContext } from '../core/game';
import { contentSize } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import { rem, setRem } from '../core/units';
import { createSampleResults, type RoundResult } from '../rounds/session';
import { h } from '../ui/dom';
import { createButton, createPanel, createTitle } from './layout';

function createResultsTable(results: readonly RoundResult[]): HTMLTableElement {
  const { table: T } = layout.scenes;
  const table = h('table', 'score-table');
  setRem(table, { fontSize: T.fontSize });
  table.style.setProperty('--row-height', rem(T.rowHeight));
  table.style.setProperty('--cell-padding-x', rem(T.cellPaddingX));

  const head = h('thead', '');
  const headRow = h('tr', '');
  for (const label of [
    copy.score.colRound,
    copy.score.colX,
    copy.score.colY,
    copy.score.colLatency,
  ]) {
    const th = h('th', '', label);
    th.scope = 'col';
    headRow.append(th);
  }
  head.append(headRow);

  const body = h('tbody', '');
  for (const r of results) {
    const row = h('tr', '');
    row.append(
      h('td', '', padRound(r.roundId)),
      h('td', '', r.click.x.toFixed(1)),
      h('td', '', r.click.y.toFixed(1)),
      h('td', '', String(r.latencyMs)),
    );
    body.append(row);
  }

  table.append(head, body);
  return table;
}

/**
 * Raw results as a table (no scoring until v1.0) and a Play again button.
 * Reached without playing (debug jump), it shows seeded sample data instead.
 */
export function createScoreScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const { session } = ctx;
    const isSample = session.results.length === 0;
    const results = isSample ? createSampleResults(session.rng, contentSize) : session.results;

    const panel = createPanel('score');
    panel.append(createTitle(copy.score.title));
    if (isSample) panel.append(h('p', 'scene-text scene-text--note', copy.score.sampleNote));

    const playAgain = createButton(copy.score.playAgain);
    scope.listen(playAgain, 'click', () => ctx.machine.go('ready'));
    panel.append(createResultsTable(results), playAgain);
    scope.mount(ctx.content, panel);

    ctx.bus.emit('score.reveal', { results, isSample });
  });
}
