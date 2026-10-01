/**
 * Collects everything a scene starts — timers, frame loops, listeners, mounted
 * elements — so one `dispose()` stops it all. Scenes can be left at any moment
 * (debug jumps), so nothing may keep running after they exit.
 */
export interface Scope {
  timeout(fn: () => void, ms: number): void;
  /** Calls `fn` every animation frame until the scope is disposed or `fn` returns false. */
  frame(fn: (now: number) => boolean | undefined): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ): void;
  /** Appends `el` to `parent`; it is removed again on dispose. */
  mount(parent: HTMLElement, el: HTMLElement): void;
  /** Runs `fn` on dispose, for state outside the scene that must be put back. */
  onDispose(fn: () => void): void;
  dispose(): void;
}

export function createScope(): Scope {
  const timeouts = new Set<number>();
  const frames = new Set<number>();
  const mounted: HTMLElement[] = [];
  const cleanups: (() => void)[] = [];
  const listeners = new AbortController();
  let disposed = false;

  return {
    timeout(fn, ms) {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
    },
    frame(fn) {
      const tick = (now: number): void => {
        frames.delete(id);
        if (disposed || fn(now) === false) return;
        id = requestAnimationFrame(tick);
        frames.add(id);
      };
      let id = requestAnimationFrame(tick);
      frames.add(id);
    },
    listen(target, type, fn) {
      target.addEventListener(type, fn, { signal: listeners.signal });
    },
    mount(parent, el) {
      parent.append(el);
      mounted.push(el);
    },
    onDispose(fn) {
      cleanups.push(fn);
    },
    dispose() {
      disposed = true;
      for (const id of timeouts) clearTimeout(id);
      for (const id of frames) cancelAnimationFrame(id);
      listeners.abort();
      for (const el of mounted) el.remove();
      for (const fn of cleanups) fn();
      timeouts.clear();
      frames.clear();
      mounted.length = 0;
      cleanups.length = 0;
    },
  };
}
