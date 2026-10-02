import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { panelPath } from './panelShape';
import { dotLeader, formatSamplePx, sampleRows } from './sampleTooltip';

describe('sample tooltip', () => {
  it('pads values with leading dots, as in Figma', () => {
    expect(dotLeader('138,65px')).toBe('...........138,65px');
    expect(dotLeader('+10000ms')).toHaveLength(layout.sampleTooltip.valueChars);
  });

  it('writes positions with two decimals and a comma', () => {
    expect(formatSamplePx(138.649)).toBe('138,65px');
  });

  it('logged rows: x, y and the padded time', () => {
    const rows = sampleRows({ kind: 'logged', roundId: 2, at: { x: 1, y: 2.5 }, latencyMs: 347 });
    expect(rows).toEqual(['1,00px', '2,50px', '+0347ms']);
  });

  it('no input rows: dashes and the deadline', () => {
    const rows = sampleRows({ kind: 'noInput', roundId: 11, deadlineMs: 8000 });
    expect(rows).toEqual(['—', '—', '+8000ms']);
  });
});

describe('panel shape', () => {
  it('cuts the top-left and bottom-right corners (Figma)', () => {
    expect(panelPath({ width: 176, height: 104 }, 12)).toBe('M12 0H176V92L164 104H0V12Z');
  });
});
