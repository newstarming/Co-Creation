/**
 * The settings window's language. The Electron preload (app/settings-preload.cjs) writes the app
 * language to `cortico.console.language` in localStorage before the page loads; without it (a
 * plain browser) the browser's language is used. Strings are picked when a module loads, so a
 * change of language reloads the window. Every request and WebSocket handshake carries it back.
 */
import type { Language } from 'cortico/core/language.ts';
import { LANGUAGE_HEADER, LANGUAGE_QUERY } from './protocol.ts';

export type { Language };

const STORAGE_KEY = 'cortico.console.language';
const LANGUAGES: readonly Language[] = ['zh', 'zh-Hant', 'en', 'ja', 'ko', 'fr', 'de', 'es-419', 'pt-BR', 'it', 'ru'];

type BaseLanguage = 'zh' | 'en';
type Translation<T> = T extends (...args: never[]) => unknown ? T
  : T extends readonly unknown[] ? T
  : T extends Record<string, unknown> ? Partial<T>
  : T;
/** One value per language: zh and en are required, the others may leave out top-level keys. */
export type LanguageTable<T> =
  & { readonly [L in BaseLanguage]: T }
  & { readonly [L in Exclude<Language, BaseLanguage>]?: Translation<NoInfer<T>> };

function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

/** The table a missing translation is read from: zh-Hant reads zh, the others en. */
export function baseLanguage(language: Language): BaseLanguage {
  return language === 'zh' || language === 'zh-Hant' ? 'zh' : 'en';
}

/** A BCP 47 tag to a language: Traditional Chinese by script or region, any es is es-419, any pt pt-BR, other tags en. */
function languageOfLocale(tag: string | null | undefined): Language | undefined {
  const t = (tag ?? '').trim().toLowerCase();
  if (!t) return undefined;
  const [primary, second] = t.split(/[-_]/);
  switch (primary) {
    case 'zh': return second === 'hant' || second === 'tw' || second === 'hk' || second === 'mo' ? 'zh-Hant' : 'zh';
    case 'es': return 'es-419';
    case 'pt': return 'pt-BR';
    case 'ja': case 'ko': case 'fr': case 'de': case 'it': case 'ru': return primary;
    default: return 'en';
  }
}

function readLanguage(): Language {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch { /* no storage: the browser's language */ }
  if (isLanguage(stored)) return stored;
  try {
    return languageOfLocale(navigator.language) ?? 'zh';
  } catch {
    return 'zh';
  }
}

export const LANGUAGE: Language = readLanguage();
if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGE === 'zh' ? 'zh-CN' : LANGUAGE;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** The window language's value; a partial translation is completed from its base language. */
export function pick<T>(table: LanguageTable<T>): T {
  const base = table[baseLanguage(LANGUAGE)];
  if (LANGUAGE === 'zh' || LANGUAGE === 'en') return base;
  const own: unknown = table[LANGUAGE];
  if (own === undefined) return base;
  if (!isPlainObject(own) || !isPlainObject(base)) return own as T;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(own)) if (value !== undefined) merged[key] = value;
  return merged as T;
}

/** The header every HTTP request carries. */
export function languageHeaders(): Record<string, string> {
  return { [LANGUAGE_HEADER]: LANGUAGE };
}

/** A WebSocket path with the language attached (the handshake cannot carry headers). */
export function withLanguage(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${LANGUAGE_QUERY}=${LANGUAGE}`;
}
