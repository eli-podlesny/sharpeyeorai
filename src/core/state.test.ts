import { describe, expect, it } from 'vitest';
import { GAME_STATES, canTransition, createStateMachine, type GameState } from './state';

function setup(strict = true) {
  const log: string[] = [];
  const machine = createStateMachine({
    strict,
    onChange: (from, to) => log.push(`${from}→${to}`),
  });
  return { machine, log };
}

describe('transition table', () => {
  it('allows the full game loop', () => {
    const path: GameState[] = [
      'intro',
      'ready',
      'loading',
      'objective',
      'round',
      'round',
      'ending',
      'score',
      'ready',
    ];
    for (let i = 1; i < path.length; i++) {
      expect(canTransition(path[i - 1] as GameState, path[i] as GameState)).toBe(true);
    }
  });

  it('blocks skipping ahead', () => {
    expect(canTransition('ready', 'round')).toBe(false);
    expect(canTransition('score', 'round')).toBe(false);
    expect(canTransition('round', 'score')).toBe(false);
  });

  it('gives every state a way forward', () => {
    for (const s of GAME_STATES) {
      expect(GAME_STATES.some((t) => canTransition(s, t))).toBe(true);
    }
  });
});

describe('state machine', () => {
  it('starts nowhere and can be forced into any state', () => {
    const { machine, log } = setup();
    expect(machine.current).toBeNull();
    machine.force('round');
    expect(machine.current).toBe('round');
    expect(log).toEqual(['null→round']);
  });

  it('follows allowed transitions', () => {
    const { machine } = setup();
    machine.force('ready');
    machine.go('loading');
    expect(machine.current).toBe('loading');
  });

  it('throws on an illegal transition when strict (dev)', () => {
    const { machine } = setup(true);
    machine.force('ready');
    expect(() => machine.go('score')).toThrow(/ready → score/);
    expect(machine.current).toBe('ready');
  });

  it('ignores an illegal transition when not strict (production)', () => {
    const { machine, log } = setup(false);
    machine.force('ready');
    machine.go('score');
    expect(machine.current).toBe('ready');
    expect(log).toEqual(['null→ready']);
  });

  it('announces a change requested during another change after it, in order', () => {
    const log: string[] = [];
    const machine = createStateMachine({
      strict: true,
      onChange: (from, to) => {
        log.push(`start ${from}→${to}`);
        if (to === 'intro') machine.go('ready');
        log.push(`end ${from}→${to}`);
      },
    });
    machine.force('intro');
    expect(log).toEqual([
      'start null→intro',
      'end null→intro',
      'start intro→ready',
      'end intro→ready',
    ]);
    expect(machine.current).toBe('ready');
  });
});
