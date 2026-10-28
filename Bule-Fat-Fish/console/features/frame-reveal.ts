/**
 * The pet's pages in a frame (the 开始 preview, the 装扮 page) stay hidden until they say they have drawn
 * themselves in their own colors (stage.js `announcePainted`), then fade in: otherwise the frame shows the
 * browser's default white, or the page's starting theme, for a moment each time the page is opened.
 * `pend()` hides it again before a new address loads; a page that never says so shows after FALLBACK_MS.
 */
const FALLBACK_MS = 2500;

export function revealWhenPainted(frame: HTMLIFrameElement, signal: AbortSignal): { pend(): void } {
  let fallback: ReturnType<typeof setTimeout> | null = null;
  const show = (): void => {
    if (fallback) clearTimeout(fallback);
    fallback = null;
    frame.classList.remove('companion-frame-pending');
  };
  const pend = (): void => frame.classList.add('companion-frame-pending');
  pend();
  window.addEventListener('message', (e) => {
    if (e.source === frame.contentWindow && (e.data as { type?: unknown } | null)?.type === 'companion:painted') show();
  }, { signal });
  frame.addEventListener('load', () => {
    if (fallback) clearTimeout(fallback);
    fallback = setTimeout(show, FALLBACK_MS);
  }, { signal });
  signal.addEventListener('abort', () => { if (fallback) clearTimeout(fallback); }, { once: true });
  return { pend };
}
