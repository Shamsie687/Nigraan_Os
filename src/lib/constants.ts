/**
 * NigraanOS application constants.
 */

export const APP_NAME = 'NigraanOS';
export const APP_VERSION = '0.1.0';

export const API_VERSION = 'v1';

/**
 * API base URL configuration.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL environment variable (set in .env)
 *   2. NEXT_PUBLIC_API_URL (web deployments)
 *   3. EXPO_PUBLIC_API_BASE_URL (legacy variable name)
 *   4. Fallback to localhost in dev, production URL otherwise
 *
 * For web development: http://localhost:8000
 * For physical Android: http://<your-computer-LAN-IP>:8000
 *   (find your LAN IP with ipconfig / ifconfig)
 */

/**
 * Normalize a configured API root URL.
 *
 * Tolerates values that already carry the version prefix or trailing
 * slashes — every consumer appends `/api/v1/...` itself, so a raw
 * `http://localhost:8000/api/v1/` would otherwise become
 * `/api/v1/api/v1` or `/api/v1reports`.
 */
function normalizeApiRoot(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

const envApiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = envApiUrl
  ? normalizeApiRoot(envApiUrl)
  : __DEV__
    ? 'http://localhost:8000'
    : 'https://api.nigraanos.pk';

/** Fully-qualified API root — all fetch calls target `<root>/api/v1`. */
export const API_V1_BASE_URL = `${API_BASE_URL}/api/${API_VERSION}`;

/**
 * Build a URL under the versioned API root.
 *
 * The path is normalized to a single leading slash so malformed joins
 * (e.g. `/api/v1reports`) cannot occur.
 */
export function buildApiUrl(path: string): string {
  return `${API_V1_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
