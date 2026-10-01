import { describe, expect, it } from 'vitest';
import { createRoundClock } from './clock';

describe('createRoundClock', () => {
  it('reads 0 until started, then counts from the start', () => {
    const clock = createRoundClock();
    expect(clock.started).toBe(false);
    expect(clock.elapsed(500)).toBe(0);
    clock.start(1000);
    expect(clock.started).toBe(true);
    expect(clock.elapsed(1000)).toBe(0);
    expect(clock.elapsed(1250)).toBe(250);
  });

  it('does not count time while the tab is hidden', () => {
    const clock = createRoundClock();
    clock.start(0);
    clock.setPaused('hidden', true, 1000);
    expect(clock.elapsed(5000)).toBe(1000);
    clock.setPaused('hidden', false, 5000);
    expect(clock.elapsed(5500)).toBe(1500);
  });

  it('stays paused until every reason is lifted', () => {
    const clock = createRoundClock();
    clock.start(0);
    clock.setPaused('hidden', true, 100);
    clock.setPaused('debug', true, 200);
    clock.setPaused('hidden', false, 300);
    expect(clock.paused).toBe(true);
    expect(clock.elapsed(400)).toBe(100);
    clock.setPaused('debug', false, 400);
    expect(clock.elapsed(500)).toBe(200);
  });

  it('paused before the start, starts paused', () => {
    const clock = createRoundClock();
    clock.setPaused('debug', true, 0);
    clock.start(100);
    expect(clock.elapsed(900)).toBe(0);
    clock.setPaused('debug', false, 1000);
    expect(clock.elapsed(1100)).toBe(100);
  });

  it('can be stepped forward by hand (debug frame step)', () => {
    const clock = createRoundClock();
    clock.start(0);
    clock.setPaused('debug', true, 100);
    clock.advance(16);
    expect(clock.elapsed(1000)).toBe(116);
  });

  it('repeated pause calls change nothing', () => {
    const clock = createRoundClock();
    clock.start(0);
    clock.setPaused('hidden', true, 100);
    clock.setPaused('hidden', true, 200);
    clock.setPaused('hidden', false, 300);
    clock.setPaused('hidden', false, 400);
    expect(clock.elapsed(500)).toBe(300);
  });
});
