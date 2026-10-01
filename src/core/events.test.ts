import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from './events';

describe('event bus', () => {
  it('delivers a payload to listeners of that event only', () => {
    const bus = createEventBus();
    const onStart = vi.fn();
    const onEnd = vi.fn();
    bus.on('round.intro.start', onStart);
    bus.on('round.outro.end', onEnd);

    bus.emit('round.intro.start', { roundId: 3 });

    expect(onStart).toHaveBeenCalledWith({ roundId: 3 });
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const off = bus.on('round.intro.start', fn);
    off();
    bus.emit('round.intro.start', { roundId: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('sends every event to onAny listeners, with its name', () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.onAny((name) => seen.push(name));
    bus.emit('door.open.start', { durationMs: 100 });
    bus.emit('door.open.end', {});
    expect(seen).toEqual(['door.open.start', 'door.open.end']);
  });

  it('rejects unknown events and wrong payloads at compile time', () => {
    const bus = createEventBus();
    // @ts-expect-error — not a known event
    bus.emit('round.explode', {});
    // @ts-expect-error — roundId must be a number
    bus.emit('round.intro.start', { roundId: 'one' });
  });
});
