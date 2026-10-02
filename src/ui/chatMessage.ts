import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { setU, u } from '../core/units';
import { h } from './dom';
import { commitStyles, fadeTo, prefersReducedMotion } from './motion';
import { fitPanel } from './panelShape';

const C = layout.chatMessage;

/** Figma "tooltip chat": light (paper) or orange (the alert). */
export type ChatVariant = 'light' | 'orange';

export interface ChatMessageOptions {
  variant: ChatVariant;
  /** The first line. */
  title: string;
  /** More text under it, wrapping at the max width (e.g. the share text to copy by hand). */
  body?: string;
  /** Where it stacks; the screen's chat spot (bottom-right of the opening) by default. */
  anchor?: HTMLElement;
  /** Fades out and goes after this long; it stays until `hide()` when left out. */
  durationMs?: number;
  /** The text can be selected and copied (the clipboard fallback). */
  selectable?: boolean;
  /** Never dropped to make room for new messages (the alert). */
  pinned?: boolean;
}

export interface ChatMessage {
  el: HTMLElement;
  /**
   * Fades it out and removes it, but never before it has been up `chatMessage.minVisibleMs`.
   * `immediate`: gone now, whatever the time (a scene going away).
   */
  hide(immediate?: boolean): void;
}

let defaultStack: HTMLElement | null = null;

/** Every message on screen, to clear them (the alert) or drop the oldest (the cap). */
const live = new Map<HTMLElement, ChatMessage>();
/** Messages the cap leaves alone. */
const pinned = new WeakSet<HTMLElement>();

/** Removes every message now, in every stack (the alert cuts in). */
export function clearChatMessages(): void {
  for (const message of [...live.values()]) message.hide(true);
}

/**
 * The chat spot: a box over the screen opening (`openingBox`, inside the screen, above its
 * content and below the doors) holding a stack in its bottom-right corner, where messages
 * pile up right-aligned, each overlapping the one above by `layout.chatMessage.overlap`.
 */
export function createChatLayer(): HTMLElement {
  const layer = h('div', 'chat-layer');
  const stack = createChatStack();
  layer.append(stack);
  defaultStack = stack;
  return layer;
}

/**
 * A stack at the chat spot, for a box over the opening other than the chat layer (round 12
 * shows its message lit, above the darkness, with the round's own content).
 */
export function createChatStack(): HTMLElement {
  const stack = h('div', 'chat-stack');
  setU(stack, { right: C.anchor.right, bottom: C.anchor.bottom });
  stack.style.setProperty('--chat-overlap', u(-C.overlap));
  return stack;
}

/**
 * Shows a chat message (Figma "tooltip chat"): the text on a hand-drawn panel with cut
 * corners, hugging the text up to `layout.chatMessage.maxWidth`, then wrapping. It fades in
 * (`chatMessage.fadeMs`), and out again after `durationMs` if given. Every message stays
 * at least `chatMessage.minVisibleMs`.
 */
export function showChatMessage(options: ChatMessageOptions): ChatMessage {
  const stack = options.anchor ?? defaultStack;
  if (!stack) throw new Error('showChatMessage: no chat layer');

  const el = h('div', `chat-message chat-message--${options.variant} fade`);
  el.setAttribute('role', 'status');
  if (options.selectable) el.classList.add('chat-message--selectable');
  setU(el, { fontSize: C.fontSize, lineHeight: C.lineHeight });
  el.style.maxWidth = u(C.maxWidth);
  el.style.padding = `${u(C.paddingY)} ${u(C.paddingX)}`;
  const text = h('div', 'chat-message__text');
  text.append(h('div', 'chat-message__title', options.title));
  if (options.body) text.append(h('div', 'chat-message__body', options.body));
  el.append(text);

  // The panel hugs the text: drawn once the size is known, and again if it changes (the
  // fonts arriving, or the stack shown after being hidden).
  const fit = new ResizeObserver(() => {
    if (el.offsetWidth > 0) fitPanel(el);
  });
  fit.observe(el);

  const { fadeMs, minVisibleMs, pushMs } = gameConfig.chatMessage;
  const reduced = prefersReducedMotion();
  const ms = reduced ? 0 : fadeMs;
  const shownAt = performance.now();
  el.style.opacity = '0';
  // The new message goes in at the bottom and pushes the others up: they glide there
  // (`pushMs`) from where they were, instead of jumping.
  // At most `maxVisible` at once: the oldest (not pinned) goes, at once.
  const shown = [...stack.children].filter((c): c is HTMLElement => live.has(c as HTMLElement));
  const extra = Math.max(shown.length - gameConfig.chatMessage.maxVisible + 1, 0);
  for (const old of shown.filter((c) => !pinned.has(c)).slice(0, extra)) {
    live.get(old)?.hide(true);
  }
  const before = new Map([...stack.children].map((c) => [c, c.getBoundingClientRect().top]));
  stack.append(el);
  if (!reduced) {
    for (const [child, top] of before) {
      const dy = top - child.getBoundingClientRect().top;
      if (dy !== 0) {
        child.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
          duration: pushMs,
          easing: 'ease-out',
        });
      }
    }
  }
  commitStyles(el);
  fadeTo(el, 1, ms);

  let gone = false;
  let timer: number | undefined;
  const remove = (): void => {
    fit.disconnect();
    el.remove();
    live.delete(el);
  };
  const fadeOut = (): void => {
    if (ms === 0) return remove();
    fadeTo(el, 0, ms);
    window.setTimeout(remove, ms);
  };
  const hide = (immediate = false): void => {
    if (immediate) {
      gone = true;
      window.clearTimeout(timer);
      remove();
      return;
    }
    if (gone) return;
    gone = true;
    window.clearTimeout(timer);
    const wait = Math.max(shownAt + minVisibleMs - performance.now(), 0);
    timer = window.setTimeout(fadeOut, wait);
  };
  if (options.durationMs !== undefined) {
    timer = window.setTimeout(() => hide(), Math.max(options.durationMs, minVisibleMs));
  }
  const message = { el, hide };
  live.set(el, message);
  if (options.pinned) pinned.add(el);
  return message;
}

/** Pure: when each line of a chat sequence shows, and how long it stays so all go together. */
export function chatSequenceTimes(
  count: number,
  intervalMs: number,
  holdMs: number,
): { atMs: number; durationMs: number }[] {
  const endMs = (count - 1) * intervalMs + holdMs;
  return Array.from({ length: count }, (_, i) => ({
    atMs: i * intervalMs,
    durationMs: endMs - i * intervalMs,
  }));
}

/**
 * A little conversation: one message every `chatMessage.sequenceIntervalMs`, each pushing
 * the ones before it up; once the last is in, the whole chat stays `holdMs` and fades out
 * together. Runs on its own timers, so it plays out even when the round ends first.
 * `cancel()` drops the lines not shown yet; `pending` tells whether any are left.
 */
export interface ChatSequence {
  readonly pending: boolean;
  cancel(): void;
}

export function showChatSequence(options: {
  variant: ChatVariant;
  lines: readonly string[];
  holdMs?: number;
  anchor?: HTMLElement;
  /** The first line comes this long from now. */
  delayMs?: number;
  /**
   * The chat stays until the mouse moves (or a click); then it fades `holdMs` later
   * (the idle chats: they only go once the player is back).
   */
  untilActivity?: boolean;
}): ChatSequence {
  const { sequenceIntervalMs, sequenceHoldMs } = gameConfig.chatMessage;
  const holdMs = options.holdMs ?? sequenceHoldMs;
  const times = chatSequenceTimes(options.lines.length, sequenceIntervalMs, holdMs);
  let left = options.lines.length;
  const shown: ChatMessage[] = [];

  // Until activity: the lines come without an end; the first move after the first line
  // starts the countdown, and once every line is in they all go together.
  let activeAt: number | null = null;
  let finishing = false;
  const finish = (): void => {
    if (finishing || left > 0 || activeAt === null) return;
    finishing = true;
    window.removeEventListener('pointermove', onActivity);
    window.removeEventListener('pointerdown', onActivity);
    const wait = Math.max(activeAt + holdMs - performance.now(), 0);
    window.setTimeout(() => {
      for (const m of shown) m.hide();
    }, wait);
  };
  const onActivity = (): void => {
    if (shown.length === 0 || activeAt !== null) return;
    activeAt = performance.now();
    finish();
  };
  if (options.untilActivity) {
    window.addEventListener('pointermove', onActivity);
    window.addEventListener('pointerdown', onActivity);
  }

  const timers = options.lines.map((title, i) => {
    const t = times[i] ?? { atMs: 0, durationMs: holdMs };
    return window.setTimeout(
      () => {
        left--;
        shown.push(
          showChatMessage({
            variant: options.variant,
            title,
            anchor: options.anchor,
            durationMs: options.untilActivity ? undefined : t.durationMs,
          }),
        );
        if (options.untilActivity) finish();
      },
      (options.delayMs ?? 0) + t.atMs,
    );
  });
  return {
    get pending() {
      return left > 0;
    },
    cancel() {
      for (const id of timers) window.clearTimeout(id);
      left = 0;
      if (options.untilActivity) finish();
    },
  };
}

/**
 * How many chat messages are on screen right now, pinned ones (the alert) aside: quiet
 * lines wait for an otherwise empty chat.
 */
export function chatMessageCount(): number {
  let n = 0;
  for (const el of live.keys()) if (!pinned.has(el)) n++;
  return n;
}
