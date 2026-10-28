/**
 * Connecting a service through the provider routes of Cortico's WebUI, as the app's guide and its
 * Start page do: each service gets its own endpoint for each of its platforms (`endpointName`), so
 * switching back and forth keeps each key. A ChatGPT plan is signed in instead (`connectChatGPT`),
 * through the `chatgpt` module's WebUI panel methods. `call` is the caller's way to reach the WebUI routes (fetch in the Core, the
 * settings window's own api in the browser); nothing here imports Node or the DOM.
 */
import { CHATGPT, CHATGPT_MODULE, chatgptEntry, connectionVendor, endpointName, vendorEntry, type Region, type Vendor } from './vendors.ts';

/** GET when `body` is left out, POST otherwise; throws on an error status. */
export type WebUiCall = <T>(path: string, body?: unknown) => Promise<T>;

export interface Connection {
  /** The active endpoint has its model and key and its module is available. */
  ready: boolean;
  /** Which service the active endpoint is, when it is one of these. */
  vendor: Vendor | null;
  /** Which of the service's platforms; null for a service with one platform. */
  region: Region | null;
  model: string;
}

export interface ConnectResult { ok: boolean; why: string | null; ms: number | null }

interface Status { modelConnection?: { ready: boolean; model: string | null; module?: string; baseUrl?: string } | null }
interface Detail { name: string; entry: Record<string, unknown>; revision: string }
interface TestReply { ok?: boolean; elapsedMs?: number; error?: string; status?: number; hint?: string }

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export async function currentConnection(call: WebUiCall): Promise<Connection> {
  const mc = (await call<Status>('/api/status').catch(() => null))?.modelConnection;
  const at = mc ? connectionVendor(mc) : null;
  return { ready: !!mc?.ready, vendor: at?.vendor ?? null, region: at?.region ?? null, model: mc?.model ?? '' };
}

/** Tests the endpoint `name` as it is saved. */
export async function testEndpoint(call: WebUiCall, name: string): Promise<ConnectResult> {
  try {
    const r = await call<TestReply>(`/api/providers/${encodeURIComponent(name)}/test`, {});
    const ok = r?.ok !== false && !r?.error;
    return { ok, ms: typeof r?.elapsedMs === 'number' ? Math.round(r.elapsedMs) : null, why: ok ? null : r?.hint ?? r?.error ?? `HTTP ${r?.status ?? '?'}` };
  } catch (err) {
    return { ok: false, ms: null, why: errText(err) };
  }
}

/**
 * Saves `key` and `model` for `vendor` on `region` (creating its endpoint the first time), tests it,
 * and once the test passes makes it the active endpoint and resumes the run, which starts paused
 * without a key. An empty `key` keeps the one the endpoint has; a new endpoint needs one. An empty
 * `model` keeps the endpoint's model, or takes the service's default for a new endpoint. `region`
 * matters only for a service with a platform per region.
 */
export async function connectVendor(call: WebUiCall, vendor: Vendor, key: string, model = '', region: Region = 'cn'): Promise<ConnectResult> {
  const secretValue = key.trim() || undefined;
  const typed = model.trim();
  const name = endpointName(vendor, region);
  try {
    const list = await call<{ providers: Array<{ name: string }> }>('/api/providers');
    if (list.providers.some((p) => p.name === name)) {
      const d = await call<Detail>(`/api/providers/${encodeURIComponent(name)}`);
      const entry = { ...d.entry };
      if (typed) {
        entry.spec = { ...(d.entry.spec as Record<string, unknown> | undefined), model: typed };
        entry.multimodal = (vendor.vision ?? []).includes(typed);
      }
      await call(`/api/providers/${encodeURIComponent(name)}/save`, { name: d.name, entry, expectedRevision: d.revision, secretValue });
    } else {
      await call('/api/providers', { name, entry: vendorEntry(vendor, typed || vendor.model, region), secretValue });
    }
  } catch (err) {
    return { ok: false, ms: null, why: errText(err) };
  }
  return testAndStart(call, name);
}

/** Tests the endpoint `name` and, once the test passes, makes it the active endpoint and resumes the run. */
async function testAndStart(call: WebUiCall, name: string): Promise<ConnectResult> {
  const r = await testEndpoint(call, name);
  if (!r.ok) return r;
  try {
    await call(`/api/providers/${encodeURIComponent(name)}/activate`, {});
    await call('/api/run/resume', {});
  } catch (err) {
    return { ok: false, ms: r.ms, why: errText(err) };
  }
  return r;
}

/** A ChatGPT endpoint's sign-in as its `state` method reports it (`SignInStatus` in chatgpt/auth.ts). */
export interface SignInState {
  signedIn: boolean;
  email: string | null;
  phase: 'idle' | 'waiting' | 'done' | 'failed';
  reason: string | null;
  /** The plan's models, once a sign-in is done. */
  models?: string[];
}

/** The WebUI panel of the `chatgpt` module's sign-in methods. */
export const SIGN_IN_PANEL = 'chatgpt';

/** The WebUI route of a sign-in method of the `chatgpt` module. */
const signInRoute = (method: string) => `/api/webui/providers/${encodeURIComponent(`llm:${CHATGPT_MODULE}`)}/panels/${SIGN_IN_PANEL}/${method}`;

export const chatgptState = (call: WebUiCall, name: string) => call<SignInState>(signInRoute('state'), { args: [name] });

/** Revokes and removes the tokens of the ChatGPT endpoint `name`. */
export const signOutChatGPT = (call: WebUiCall, name: string) => call<SignInState>(signInRoute('signOut'), { args: [name] });

/** How often a sign-in under way is looked at. */
const SIGN_IN_POLL_MS = 1000;

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((done, fail) => {
  if (signal?.aborted) return fail(new Error('cancelled'));
  const timer = setTimeout(done, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); fail(new Error('cancelled')); }, { once: true });
});

interface SignInOptions { signal?: AbortSignal; pollMs?: number }

/**
 * Signs the saved ChatGPT endpoint `name` in: `open` takes the authorization URL to the system
 * browser, and the sign-in is looked at until the browser comes back, it fails or times out
 * (`SIGN_IN_MS` in chatgpt/auth.ts), or `signal` aborts the wait (which throws).
 */
export async function signInChatGPT(call: WebUiCall, name: string, open: (url: string) => void, opts: SignInOptions = {}): Promise<SignInState> {
  const { url } = await call<{ url: string }>(signInRoute('signIn'), { args: [name] });
  open(url);
  let state: SignInState;
  do {
    await wait(opts.pollMs ?? SIGN_IN_POLL_MS, opts.signal);
    state = await chatgptState(call, name);
  } while (state.phase === 'waiting');
  return state;
}

/**
 * Signs the ChatGPT endpoint `name` in (`signInChatGPT`), creating the app's endpoint the first time,
 * and once it is in and its test passes makes it active and resumes the run. When the plan's model
 * list leaves out the endpoint's model, the endpoint takes the first model it lists.
 */
export async function connectChatGPT(call: WebUiCall, open: (url: string) => void, opts: SignInOptions & { name?: string } = {}): Promise<ConnectResult> {
  const name = opts.name ?? endpointName(CHATGPT, 'cn');
  try {
    const list = await call<{ providers: Array<{ name: string }> }>('/api/providers');
    if (!list.providers.some((p) => p.name === name)) await call('/api/providers', { name, entry: chatgptEntry() });
    const state = await signInChatGPT(call, name, open, opts);
    if (state.phase !== 'done' || !state.signedIn) return { ok: false, ms: null, why: state.reason ?? state.phase };
    const first = state.models?.[0];
    if (first) {
      const d = await call<Detail>(`/api/providers/${encodeURIComponent(name)}`);
      const spec = d.entry.spec as Record<string, unknown> | undefined;
      if (!state.models!.includes(String(spec?.model ?? ''))) {
        const entry = { ...d.entry, spec: { ...spec, model: first }, multimodal: (CHATGPT.vision ?? []).includes(first) };
        await call(`/api/providers/${encodeURIComponent(name)}/save`, { name: d.name, entry, expectedRevision: d.revision });
      }
    }
  } catch (err) {
    return { ok: false, ms: null, why: errText(err) };
  }
  return testAndStart(call, name);
}
