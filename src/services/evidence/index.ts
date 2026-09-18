export {
  EVIDENCE_MEDIA_TYPES,
  EVIDENCE_SOURCES,
  EVIDENCE_CONSTRAINTS,
  EVIDENCE_STORAGE,
  type EvidenceMediaType,
  type EvidenceSource,
  type EvidenceRow,
  type CreateEvidencePayload,
  type LocalEvidencePhoto,
  isValidEvidenceMediaType,
  isValidEvidenceFileSize,
  generateEvidenceStoragePath,
} from './evidence-model';

export {
  type EvidenceUploadResult,
  type BatchUploadResult,
  type FetchEvidenceOptions,
  validateLocalPhoto,
  inferMediaType,
  uploadEvidence,
  uploadEvidenceBatch,
  fetchEvidenceForIncident,
  deleteEvidence,
  getEvidenceSignedUrl,
} from './evidence-service';
