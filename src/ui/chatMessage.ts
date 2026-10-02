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

  const { fadeMs, minVisibleMs } = gameConfig.chatMessage;
  const ms = prefersReducedMotion() ? 0 : fadeMs;
  const shownAt = performance.now();
  el.style.opacity = '0';
  stack.append(el);
  commitStyles(el);
  fadeTo(el, 1, ms);

  let gone = false;
  let timer: number | undefined;
  const remove = (): void => {
    fit.disconnect();
    el.remove();
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
  return { el, hide };
}
