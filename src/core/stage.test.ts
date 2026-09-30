import { describe, expect, it } from 'vitest';
import { clientToStage, computeScale } from './stage';

describe('computeScale', () => {
  it('is 1 at the design size', () => {
    expect(computeScale(1440, 900)).toBe(1);
  });

  it('fits by height on a 16:9 window', () => {
    expect(computeScale(1280, 720)).toBeCloseTo(0.8);
    expect(computeScale(2560, 1440)).toBeCloseTo(1.6);
  });

  it('fits by width on a tall window', () => {
    expect(computeScale(1200, 1200)).toBeCloseTo(1200 / 1440);
  });

  it('never goes below the scale of a 1024px-wide window', () => {
    const min = 1024 / 1440;
    expect(computeScale(800, 500)).toBeCloseTo(min);
    expect(computeScale(1920, 400)).toBeCloseTo(min);
  });
});

describe('clientToStage', () => {
  it('maps the stage corners to design corners', () => {
    const rect = { left: 100, top: 50, width: 720 }; // stage drawn at half size
    expect(clientToStage(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(clientToStage(820, 500, rect)).toEqual({ x: 1440, y: 900 });
  });

  it('maps the stage center to the design center at 2560 × 1440', () => {
    const scale = 1.6;
    const width = 1440 * scale;
    const rect = { left: (2560 - width) / 2, top: 0, width };
    const p = clientToStage(1280, 720, rect);
    expect(p.x).toBeCloseTo(720);
    expect(p.y).toBeCloseTo(450);
  });

  it('returns coordinates outside the stage as negative or overflowing values', () => {
    const rect = { left: 0, top: 0, width: 1440 };
    expect(clientToStage(-10, 1000, rect)).toEqual({ x: -10, y: 1000 });
  });
});
