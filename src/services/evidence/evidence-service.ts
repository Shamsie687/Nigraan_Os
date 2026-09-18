// ── Evidence Service ─────────────────────────────────────────────
//
// Service layer for evidence upload and management.
//
// Security notes:
// - All operations require an authenticated user session
// - uploader_id is derived from auth.uid() (never from client)
// - Storage bucket is private — signed URLs are used for access
// - RLS policies enforce ownership through incident relationship
// - On upload failure, orphaned storage files are cleaned up

import { getSupabase } from '../supabase';
import {
  type EvidenceRow,
  type CreateEvidencePayload,
  type LocalEvidencePhoto,
  type EvidenceMediaType,
  EVIDENCE_CONSTRAINTS,
  EVIDENCE_STORAGE,
  isValidEvidenceMediaType,
  isValidEvidenceFileSize,
  generateEvidenceStoragePath,
} from './evidence-model';

// ── Service Types ────────────────────────────────────────────────

/**
 * Result of an evidence upload operation.
 */
export interface EvidenceUploadResult {
  success: boolean;
  evidence?: EvidenceRow;
  error?: string;
}

/**
 * Result of a batch upload operation.
 */
export interface BatchUploadResult {
  uploaded: EvidenceRow[];
  failures: { index: number; error: string }[];
}

/**
 * Options for fetching evidence for an incident.
 */
export interface FetchEvidenceOptions {
  incidentId: string;
  /** Maximum number of records to return */
  limit?: number;
}

// ── Validation ───────────────────────────────────────────────────

/**
 * Validates a local photo before upload.
 * Checks MIME type, file size, and photo limit.
 */
export function validateLocalPhoto(
  photo: LocalEvidencePhoto,
  currentCount: number
): { valid: boolean; error?: string } {
  if (currentCount >= EVIDENCE_CONSTRAINTS.maxPhotosPerIncident) {
    return {
      valid: false,
      error: `Maximum ${EVIDENCE_CONSTRAINTS.maxPhotosPerIncident} photos allowed per report.`,
    };
  }

  if (photo.fileSize && !isValidEvidenceFileSize(photo.fileSize)) {
    return {
      valid: false,
      error: `File size must be between 1 byte and ${EVIDENCE_CONSTRAINTS.fileSize.maxLabel}.`,
    };
  }

  return { valid: true };
}

/**
 * Infers MIME type from file URI extension.
 * Returns undefined if the extension is not recognized.
 */
export function inferMediaType(uri: string): EvidenceMediaType | undefined {
  const ext = uri.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return undefined;
  }
}

// ── Internal Helpers ─────────────────────────────────────────────

/**
 * Read a local file URI as a Blob for upload to Supabase Storage.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.status}`);
  }
  const blob = await response.blob();
  return blob;
}

/**
 * Remove a file from Storage (used for orphan cleanup on DB insert failure).
 */
async function removeFromStorage(storagePath: string): Promise<void> {
  await getSupabase().storage
    .from(EVIDENCE_STORAGE.bucketName)
    .remove([storagePath]);
}

// ── Upload ───────────────────────────────────────────────────────

/**
 * Upload evidence photo to Supabase Storage and create database record.
 *
 * Flow:
 * 1. Validate photo (type, size)
 * 2. Read local file as blob
 * 3. Upload blob to private Storage bucket
 * 4. Insert evidence metadata record in database
 * 5. If DB insert fails, clean up the orphaned storage file
 * 6. Return created evidence record
 */
export async function uploadEvidence(
  incidentId: string,
  photo: LocalEvidencePhoto
): Promise<EvidenceUploadResult> {
  // ── Read session (same approach as incident-service) ─────────
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return {
      success: false,
      error:
        'Your session has expired. Please sign out and sign in again, ' +
        'then retry the upload.',
    };
  }

  // ── Validate media type ──────────────────────────────────────
  const mediaType = inferMediaType(photo.uri);
  if (!mediaType || !isValidEvidenceMediaType(mediaType)) {
    return {
      success: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are allowed.',
    };
  }

  // ── Validate file size (pre-check) ───────────────────────────
  if (photo.fileSize && !isValidEvidenceFileSize(photo.fileSize)) {
    return {
      success: false,
      error: `File size must not exceed ${EVIDENCE_CONSTRAINTS.fileSize.maxLabel}.`,
    };
  }

  // ── Read file from local URI ─────────────────────────────────
  let blob: Blob;
  try {
    blob = await uriToBlob(photo.uri);
  } catch {
    return {
      success: false,
      error: 'Could not read the selected photo. Please try again.',
    };
  }

  // ── Validate actual blob size ────────────────────────────────
  if (!isValidEvidenceFileSize(blob.size)) {
    return {
      success: false,
      error: `File size must not exceed ${EVIDENCE_CONSTRAINTS.fileSize.maxLabel}.`,
    };
  }

  // ── Upload to Storage ────────────────────────────────────────
  const storagePath = generateEvidenceStoragePath(incidentId, mediaType);

  const { error: storageError } = await getSupabase().storage
    .from(EVIDENCE_STORAGE.bucketName)
    .upload(storagePath, blob, {
      contentType: mediaType,
      upsert: false,
    });

  if (storageError) {
    console.warn(
      '[EvidenceService] Storage upload failed:',
      storageError.statusCode ?? '(no code)',
      storageError.message
    );
    return {
      success: false,
      error: storageError.statusCode === '403'
        ? 'Photo upload was blocked. Please check that the evidence storage bucket is configured correctly.'
        : `Upload failed: ${storageError.message}`,
    };
  }

  // ── Insert evidence metadata record ──────────────────────────
  const payload: CreateEvidencePayload = {
    incident_id: incidentId,
    uploader_id: user.id,
    storage_path: storagePath,
    media_type: mediaType,
    source: photo.source,
    file_size: blob.size,
    width: photo.width,
    height: photo.height,
    captured_at: photo.capturedAt,
  };

  const { data: evidenceRow, error: dbError } = await getSupabase()
    .from('evidence')
    .insert(payload)
    .select()
    .single();

  if (dbError) {
    console.warn(
      '[EvidenceService] DB insert failed:',
      dbError.code ?? '(no code)',
      dbError.message
    );
    // Clean up orphaned storage file
    await removeFromStorage(storagePath);
    return {
      success: false,
      error: 'Failed to save evidence record. Please try again.',
    };
  }

  return {
    success: true,
    evidence: evidenceRow as EvidenceRow,
  };
}

/**
 * Upload multiple evidence photos for an incident.
 *
 * Uploads each photo sequentially. Partial failures are tracked —
 * successfully uploaded photos are kept, failures are reported.
 */
export async function uploadEvidenceBatch(
  incidentId: string,
  photos: LocalEvidencePhoto[]
): Promise<BatchUploadResult> {
  const uploaded: EvidenceRow[] = [];
  const failures: { index: number; error: string }[] = [];

  for (let i = 0; i < photos.length; i++) {
    const result = await uploadEvidence(incidentId, photos[i]);
    if (result.success && result.evidence) {
      uploaded.push(result.evidence);
    } else {
      failures.push({ index: i, error: result.error || 'Unknown error' });
    }
  }

  return { uploaded, failures };
}

// ── Fetch ────────────────────────────────────────────────────────

/**
 * Fetch evidence records for an incident.
 *
 * RLS ensures the user can only fetch evidence for their own incidents.
 */
export async function fetchEvidenceForIncident(
  options: FetchEvidenceOptions
): Promise<EvidenceRow[]> {
  const { data, error } = await getSupabase()
    .from('evidence')
    .select('*')
    .eq('incident_id', options.incidentId)
    .order('created_at', { ascending: true })
    .limit(options.limit ?? EVIDENCE_CONSTRAINTS.maxPhotosPerIncident);

  if (error || !data) {
    return [];
  }

  return data as EvidenceRow[];
}

// ── Delete ───────────────────────────────────────────────────────

/**
 * Delete an evidence record and its associated file from Storage.
 *
 * RLS ensures the user can only delete evidence for their own incidents.
 * Deletes the DB record first, then removes the Storage file.
 */
export async function deleteEvidence(
  evidenceId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch the evidence record to get the storage_path
  const { data: record, error: fetchError } = await getSupabase()
    .from('evidence')
    .select('storage_path')
    .eq('id', evidenceId)
    .single();

  if (fetchError || !record) {
    return {
      success: false,
      error: 'Evidence record not found or access denied.',
    };
  }

  // 2. Delete the database record
  const { error: dbError } = await getSupabase()
    .from('evidence')
    .delete()
    .eq('id', evidenceId);

  if (dbError) {
    return {
      success: false,
      error: `Failed to delete evidence record: ${dbError.message}`,
    };
  }

  // 3. Remove the file from Storage (best-effort; DB record is already gone)
  await removeFromStorage(record.storage_path);

  return { success: true };
}

// ── Signed URLs ──────────────────────────────────────────────────

/**
 * Generate a signed URL for viewing evidence.
 *
 * Signed URLs provide temporary access without making the bucket public.
 *
 * @param storagePath - The path in the Storage bucket
 * @param expiresIn - URL validity in seconds (default: 1 hour)
 */
export async function getEvidenceSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await getSupabase().storage
    .from(EVIDENCE_STORAGE.bucketName)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
