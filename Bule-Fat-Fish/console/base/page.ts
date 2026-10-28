/**
 * A page of the settings window: its route (the first segment of the hash), its name and icon in
 * the rail, and how it mounts. `mount` gets a fresh root and a lifecycle each time the page opens;
 * leaving the page aborts the signal and disposes what the lifecycle owns. A throw shows an error
 * card in place of the page.
 */
import type { WebUi, Disposable } from 'cortico/web/shared/client-panel.ts';
import type { ConsoleIconName } from './ui/icons.ts';

/** What a page registers its timers, observers and cleanups with. */
export interface PageLifecycle {
  readonly signal: AbortSignal;
  own<T extends Disposable>(d: T): T;
  add(cleanup: () => void): Disposable;
  interval(fn: () => void, ms: number): Disposable;
  timeout(fn: () => void, ms: number): Disposable;
}

export interface PageContext {
  readonly root: HTMLElement;
  readonly lifecycle: PageLifecycle;
  /** `lifecycle.signal`. */
  readonly signal: AbortSignal;
  readonly ui: WebUi;
  readonly router: {
    navigate(segments: readonly string[]): void;
    /** While `guard` returns a sentence, leaving the page asks first; disposed with the page. */
    addLeaveGuard(guard: () => string | null): Disposable;
  };
  /** `/api/capabilities`: which surfaces Core has. */
  readonly capabilities: Record<string, boolean>;
  onError(err: unknown): void;
  /** Mounts panel `panelId` of page `pageId` (a World's panel) into `box`. */
  mountPanel(pageId: string, panelId: string, box: HTMLElement): Promise<Disposable>;
}

export interface Page {
  readonly route: string;
  readonly label: string;
  readonly icon: ConsoleIconName;
  mount(ctx: PageContext): void | Disposable | Promise<void | Disposable>;
}
