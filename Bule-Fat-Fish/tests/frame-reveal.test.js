import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { revealWhenPainted } from '../console/features/frame-reveal.ts';

function fixture() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://127.0.0.1:17788/' });
  const win = dom.window;
  vi.stubGlobal('window', win);
  const frame = win.document.createElement('iframe');
  win.document.body.append(frame);
  const life = new win.AbortController();
  const reveal = revealWhenPainted(frame, life.signal);
  const say = (source, type = 'companion:painted') => win.dispatchEvent(new win.MessageEvent('message', { data: { type }, source }));
  const pending = () => frame.classList.contains('companion-frame-pending');
  return { win, frame, reveal, life, say, pending };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('pet pages in a frame show once they have drawn themselves', () => {
  it('stays hidden until its own page says it is painted, and hides again for a new address', () => {
    const { frame, reveal, say, pending } = fixture();
    expect(pending()).toBe(true);
    // another window, or another message, does not show it
    say(null);
    say(frame.contentWindow, 'companion:other');
    expect(pending()).toBe(true);
    say(frame.contentWindow);
    expect(pending()).toBe(false);
    reveal.pend();
    expect(pending()).toBe(true);
  });

  it('shows a page that never says so a while after it loaded, and stops listening when the page goes', () => {
    vi.useFakeTimers();
    const { win, frame, life, say, pending } = fixture();
    frame.dispatchEvent(new win.Event('load'));
    vi.advanceTimersByTime(2400);
    expect(pending()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(pending()).toBe(false);
    frame.classList.add('companion-frame-pending');
    life.abort();
    say(frame.contentWindow);
    expect(pending()).toBe(true);
  });
});
