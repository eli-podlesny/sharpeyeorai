import { describe, expect, it } from 'vitest';
import { autoplayPresets, type AutoplayPresetId } from '../config/autoplay.config';
import { gameConfig } from '../config/game.config';
import { createSession } from './session';
import { summarize } from '../scoring/summary';
import { autoplayResults, createSampleResults } from './autoplay';

const content = { width: 1046, height: 676 };
const SEEDS = [1, 42, 9001];

const play = (id: AutoplayPresetId, seed: number) =>
  summarize(autoplayResults(autoplayPresets[id], createSession(seed), content));

describe('autoplay presets reach every persona', () => {
  const matrixIds = Object.keys(autoplayPresets).filter((id) => id.includes('.'));

  it.each(matrixIds)('%s', (id) => {
    const [accuracy, humanity] = id.split('.');
    for (const seed of SEEDS) {
      const { persona } = play(id as AutoplayPresetId, seed);
      expect(persona.override).toBeNull();
      expect([persona.accuracy, persona.humanity]).toEqual([accuracy, humanity]);
    }
  });

  it.each(['algorithm', 'trigger', 'sniper'] as const)('override: %s', (id) => {
    for (const seed of SEEDS) expect(play(id, seed).persona.override).toBe(id);
  });
});

describe('createSampleResults', () => {
  it('fills every round and repeats with the same seed', () => {
    const a = createSampleResults(createSession(42), content);
    const b = createSampleResults(createSession(42), content);
    expect(a).toHaveLength(gameConfig.roundCount);
    expect(a).toEqual(b);
  });
});
