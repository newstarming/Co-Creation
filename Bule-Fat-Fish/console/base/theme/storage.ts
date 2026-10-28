/**
 * The colour scheme record belongs to the deployment: read with GET `/api/theme`, written with POST.
 * The last reply is kept in this window's localStorage so the next start paints in its colours
 * before the request returns.
 */
import { get, post } from '../api.ts';
import { DEFAULT_SCHEME_ID, normalizeStoredTheme, type InjectedTheme, type StoredTheme } from './schemes.ts';

const CACHE_KEY = 'coopanion.theme';

function parse(value: unknown): InjectedTheme {
  const v = value as Partial<InjectedTheme> | null;
  return {
    defaultScheme: typeof v?.defaultScheme === 'string' && v.defaultScheme !== '' ? v.defaultScheme : DEFAULT_SCHEME_ID,
    theme: v?.theme == null ? null : normalizeStoredTheme(v.theme),
  };
}

function remember(theme: InjectedTheme): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch { /* no storage: the next start waits for the request */ }
}

/** The record as this window last saw it. */
export function readCachedTheme(): InjectedTheme {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return parse(JSON.parse(raw));
  } catch { /* unreadable: the defaults */ }
  return parse(null);
}

/** The deployment's record and its default scheme. */
export async function fetchTheme(signal?: AbortSignal): Promise<InjectedTheme> {
  const theme = parse(await get<unknown>('/api/theme', { signal }));
  remember(theme);
  return theme;
}

/** Writes the deployment's record; a failure is thrown to the caller. */
export async function saveDeploymentTheme(state: StoredTheme): Promise<void> {
  const out = await post<{ theme?: unknown }>('/api/theme', state);
  remember({ ...readCachedTheme(), theme: normalizeStoredTheme(out?.theme ?? state) });
}
