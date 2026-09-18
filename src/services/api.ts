import { API_BASE_URL, API_VERSION } from '../lib/constants';

/**
 * Minimal API client for communicating with the NigraanOS backend.
 *
 * All requests use a timeout (default 5 s) so the client never hangs
 * indefinitely when the backend is unreachable (e.g. localhost on
 * Android where localhost resolves to the device, not the dev machine).
 *
 * The base URL is normalized in `lib/constants.ts` — every request
 * targets `<API_BASE_URL>/api/v1` regardless of how the environment
 * variable was formatted.
 */

/** Default request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 5_000;

/** Error thrown for non-2xx API responses. Carries the HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface RequestOptions {
  /** Session token attached as `Authorization: Bearer <token>`. */
  token?: string | null;
  /** Override the default request timeout (e.g. for slow AI calls). */
  timeoutMs?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private get endpointBase(): string {
    return `${this.baseUrl}/api/${API_VERSION}`;
  }

  /**
   * Join a path onto the versioned base URL with a guaranteed single
   * slash, so malformed joins (e.g. `/api/v1reports`) cannot occur.
   */
  private resolveUrl(path: string): string {
    return `${this.endpointBase}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private buildHeaders(token: string | null | undefined): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Throw an ApiError carrying the backend's structured error message
   * when available, falling back to a generic status message.
   */
  private async throwApiError(
    response: Response,
    method: string,
    path: string,
  ): Promise<never> {
    let message = '';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if (typeof record.error_message === 'string') message = record.error_message;
        else if (typeof record.detail === 'string') message = record.detail;
      }
    } catch {
      // Non-JSON error body — use the generic message below
    }
    throw new ApiError(
      message || `${method} ${path} failed: ${response.status}`,
      response.status,
    );
  }

  /**
   * Race a fetch call against a timeout using Promise.race.
   *
   * Uses Promise.race instead of AbortController because some
   * React Native fetch polyfills do not honour AbortSignal,
   * causing requests to hang indefinitely when the host is unreachable.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Request to ${url} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    return Promise.race([fetch(url, init), timeoutPromise]);
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {});
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetchWithTimeout(
      this.resolveUrl(path),
      {
        method: 'GET',
        headers: this.buildHeaders(options.token),
      },
      options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );
    if (!response.ok) {
      await this.throwApiError(response, 'GET', path);
    }
    return response.json();
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetchWithTimeout(
      this.resolveUrl(path),
      {
        method: 'POST',
        headers: this.buildHeaders(options.token),
        body: JSON.stringify(body),
      },
      options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );
    if (!response.ok) {
      await this.throwApiError(response, 'POST', path);
    }
    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
