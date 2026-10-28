/**
 * The model connection as the home page handles it: which service the active endpoint is, and
 * connecting a service through the console's own routes (Coo Pet Provider's `connectVendor`, the
 * same the guide on the desktop uses). Only the provider package's browser-safe files are imported.
 */
import { get, post } from '../../base/api.ts';
import { connectChatGPT, connectVendor, testEndpoint, type ConnectResult, type WebUiCall } from 'cortico-provider-coo/src/connect.ts';

export { connectionVendor, defaultRegion, localized, regionsOf, siteOf, vendorName, vendorsFor, type Region, type Vendor } from 'cortico-provider-coo/src/vendors.ts';
export { VENDOR_ICONS } from 'cortico-provider-coo/src/icons.ts';
export { connectChatGPT, connectVendor, testEndpoint, type ConnectResult };

export interface Status {
  loop?: { paused?: boolean };
  modelConnection?: { ready: boolean; name: string; model: string | null; module: string; moduleTitle: string; baseUrl?: string } | null;
}

/** The WebUI routes for `connect.ts`: GET without a body, POST with one. */
export const consoleCall = (signal?: AbortSignal): WebUiCall =>
  (<T>(path: string, body?: unknown) => (body === undefined ? get<T>(path, { signal }) : post<T>(path, body, { signal }))) as WebUiCall;

export const readStatus = (signal?: AbortSignal) => get<Status>('/api/status', { signal });
