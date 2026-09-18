/**
 * Reports Service — mobile client for the backend reports endpoint.
 *
 * Submits incident reports to POST /api/v1/reports. The session token
 * (Supabase access token or backend session token) is attached as
 * `Authorization: Bearer <token>` when available; when unauthenticated
 * the report is posted as a public submission — the backend accepts
 * both.
 *
 * The backend verifies the evidence photo with Gemini before storing
 * the report; rejection messages (e.g. "provide valid evidence") are
 * surfaced so the UI can tell the citizen what to fix.
 */

import { ApiError, apiClient } from '../api';
import { getAuthToken } from '../local-auth/local-auth-service';

// ── Types ────────────────────────────────────────────────────────

export interface SubmitReportInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  /** Local URI (file://, blob:, data:) of the evidence photo to verify. */
  photoUri: string;
}

export interface SubmitReportResult {
  success: boolean;
  error?: string;
  reportId?: string;
}

interface ReportCreateResponse {
  success: boolean;
  status: 'success' | 'rejected' | 'error' | 'unavailable';
  report?: { id?: string } | null;
  error_message?: string | null;
}

// ── Constants ────────────────────────────────────────────────────

/**
 * Submission window in milliseconds. The backend bounds its processing
 * (8s verification deadline + 6s storage insert), so 15s leaves room
 * for network latency while still failing fast on a dead connection.
 */
const REPORT_TIMEOUT_MS = 15_000;

/** Backend title constraint is a minimum of 3 characters. */
const MIN_TITLE_LENGTH = 3;
const FALLBACK_TITLE = 'Civic issue report';

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Read a local photo (file://, blob:, or data: URI) as base64 plus its
 * MIME type. Uses fetch + FileReader — the cross-platform Expo pattern
 * for reading picked/captured images before upload.
 */
async function readPhotoAsBase64(
  uri: string
): Promise<{ base64: string; mimeType: string | null }> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read photo data'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read photo data'));
    reader.readAsDataURL(blob);
  });

  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : '';
  if (!base64) {
    throw new Error('Photo data was empty');
  }

  // MIME type from the data URI, falling back to the blob type
  const mimeMatch = /^data:([^;,]+)[;,]/.exec(dataUrl);
  const mimeType = mimeMatch?.[1] ?? (blob.type || null);
  return { base64, mimeType };
}

function toResult(result: ReportCreateResponse): SubmitReportResult {
  if (result.success) {
    return { success: true, reportId: result.report?.id ?? undefined };
  }
  return {
    success: false,
    error: result.error_message ?? 'Failed to submit report. Please try again.',
  };
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) {
    // The API client rejects with a raw "… timed out after Nms" error —
    // surface a citizen-friendly message instead.
    if (e.message.includes('timed out')) {
      return 'Submission timed out while verifying your report. Please check your connection and try again.';
    }
    return e.message;
  }
  return 'Failed to submit report. Please try again.';
}

// ── Service Function ─────────────────────────────────────────────

/**
 * Submit a report to the NigraanOS backend.
 *
 * Flow:
 * 1. Read the evidence photo as base64
 * 2. Attach the session token when one is available (public otherwise)
 * 3. POST to /api/v1/reports — if an authenticated request is rejected
 *    (401/403), retry once without the header so unauthenticated
 *    clients still succeed (graceful public fallback)
 */
export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  let photoBase64: string;
  let photoMimeType: string | null;
  try {
    const photo = await readPhotoAsBase64(input.photoUri);
    photoBase64 = photo.base64;
    photoMimeType = photo.mimeType;
  } catch (e) {
    console.warn('[ReportsService] Failed to read evidence photo:', e);
    return {
      success: false,
      error: 'Could not read the evidence photo. Please try again.',
    };
  }

  const trimmedTitle = input.title.trim();
  const payload = {
    title: trimmedTitle.length >= MIN_TITLE_LENGTH ? trimmedTitle : FALLBACK_TITLE,
    description: input.description.trim(),
    category: input.category,
    latitude: input.latitude,
    longitude: input.longitude,
    image_base64: photoBase64,
    image_mime_type: photoMimeType,
  };

  const token = await getAuthToken();
  console.log('[ReportsService] Submitting report', {
    hasToken: token !== null,
    category: input.category,
  });

  try {
    const result = await apiClient.post<ReportCreateResponse>('/reports', payload, {
      token,
      timeoutMs: REPORT_TIMEOUT_MS,
    });
    return toResult(result);
  } catch (e) {
    // Authenticated attempt rejected — fall back to a public submission
    // (the backend contract accepts unauthenticated posts).
    if (token && e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      console.warn(
        '[ReportsService] Authenticated submission rejected — retrying as public submission',
        { status: e.status }
      );
      try {
        const result = await apiClient.post<ReportCreateResponse>('/reports', payload, {
          timeoutMs: REPORT_TIMEOUT_MS,
        });
        return toResult(result);
      } catch (retryError) {
        console.error('[ReportsService] Public submission failed', retryError);
        return { success: false, error: toErrorMessage(retryError) };
      }
    }

    console.error('[ReportsService] Report submission failed', e);
    return { success: false, error: toErrorMessage(e) };
  }
}
