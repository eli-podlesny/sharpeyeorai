import { describe, expect, it } from 'vitest';
import { copy } from '../config/copy';
import { accuracyTier, humanityTier, pickPersona, speedTier } from './persona';

describe('tiers', () => {
  it('accuracy: sharp ≥ 7500, decent 4500–7499, blurry < 4500', () => {
    expect(accuracyTier(7500)).toBe('sharp');
    expect(accuracyTier(7499)).toBe('decent');
    expect(accuracyTier(4500)).toBe('decent');
    expect(accuracyTier(4499)).toBe('blurry');
  });

  it('humanity: machine < 0.35, hybrid 0.35–0.65, human > 0.65, null → hybrid', () => {
    expect(humanityTier(0.34)).toBe('machine');
    expect(humanityTier(0.35)).toBe('hybrid');
    expect(humanityTier(0.65)).toBe('hybrid');
    expect(humanityTier(0.66)).toBe('human');
    expect(humanityTier(null)).toBe('hybrid');
  });

  it('speed: fast < 1500, steady 1500–4000, slow > 4000', () => {
    expect(speedTier(1499)).toBe('fast');
    expect(speedTier(1500)).toBe('steady');
    expect(speedTier(4000)).toBe('steady');
    expect(speedTier(4001)).toBe('slow');
  });
});

describe('pickPersona', () => {
  it('uses accuracy × humanity, with the speed tag as a third line', () => {
    const p = pickPersona(8000, 0.1, 2000);
    expect(p.override).toBeNull();
    expect(p.headline).toBe(copy.persona.matrix.sharp.machine.headline);
    expect(p.line).toBe(copy.persona.matrix.sharp.machine.line);
    expect(p.speedTag).toBe(copy.persona.speedTags.steady);
  });

  it('covers all nine matrix cells', () => {
    const totals = { sharp: 8000, decent: 6000, blurry: 2000 } as const;
    const indexes = { machine: 0, hybrid: 0.5, human: 1 } as const;
    for (const [acc, total] of Object.entries(totals)) {
      for (const [hum, index] of Object.entries(indexes)) {
        const p = pickPersona(total, index, 2000);
        expect([p.accuracy, p.humanity]).toEqual([acc, hum]);
        expect(p.override).toBeNull();
      }
    }
  });

  it('"algorithm" wins at 9800+, even when fast or slow', () => {
    expect(pickPersona(9800, 1, 5000).override).toBe('algorithm');
    expect(pickPersona(9900, 0, 500).override).toBe('algorithm');
  });

  it('"trigger" for fast + blurry, "sniper" for slow + sharp', () => {
    expect(pickPersona(2000, 0.5, 900).override).toBe('trigger');
    expect(pickPersona(8000, 0.5, 5000).override).toBe('sniper');
  });

  it('hides the speed tag when an override fires', () => {
    const p = pickPersona(8000, 0.5, 5000);
    expect(p.headline).toBe(copy.persona.overrides.sniper.headline);
    expect(p.speedTag).toBeNull();
  });
});
