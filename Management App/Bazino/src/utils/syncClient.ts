/**
 * Helpers for the Management App's "web sync" feature — pushing/pulling reservations and
 * station status between this app and a website server.
 *
 * Two deployment shapes are supported:
 *  - Co-located (plain web app): Management App is served by the SAME Express server as
 *    the website, sharing the same database. `webServerUrl` is left empty, so requests use
 *    relative paths (`/api/sync/...`) and hit that same local server directly.
 *  - Standalone (desktop build): this app runs its OWN local server + local SQLite
 *    database (see /desktop-app), and needs to reach the REAL website's server over the
 *    internet to exchange reservations/status. `webServerUrl` holds that website's base
 *    URL (e.g. "https://xerxes.biz"), configured in the Web Sync settings tab.
 */

/** Builds the full URL to call for a given `/api/sync/...` path, given the configured base URL (or '' for relative/co-located mode). */
export function buildSyncUrl(webServerUrl: string, apiPath: string): string {
  if (!webServerUrl) return apiPath; // relative — same-origin, co-located mode
  try {
    return new URL(apiPath, webServerUrl).toString();
  } catch {
    // Malformed URL typed by the user — fall back to relative so the app doesn't hard-crash;
    // handleTestConnection's error message will point the user at the config tab.
    return apiPath;
  }
}

/** Standard headers for a sync request: JSON body + bearer auth (when an API key is set). */
export function syncHeaders(apiKey: string, withJsonBody = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withJsonBody) headers['Content-Type'] = 'application/json';
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}
