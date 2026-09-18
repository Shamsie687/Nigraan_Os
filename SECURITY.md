# NigraanOS — Security Policy

This document defines the security principles and baseline requirements for the NigraanOS platform. All implementations must comply with these principles.

## 1. Authentication & Authorization

- **Authentication** is handled by Supabase Auth using JWT tokens.
- The client authenticates via Supabase Auth SDK and receives a short-lived JWT.
- Every API request from client to backend includes the JWT in the `Authorization: Bearer <token>` header.
- The backend validates the JWT signature and expiration on every request.
- **Authorization** is role-based. Initial roles: `citizen`, `verifier`, `admin`.
- All endpoints enforce authentication except the health check and registration endpoints.
- Session tokens must have a reasonable expiration window (e.g., 1 hour) with refresh token rotation.

## 2. Server-Side Validation

- All client input is validated on the backend using Pydantic schemas.
- Validation includes type checking, length limits, format verification, and sanitization.
- File uploads are validated for type, size, and content (not just extension).
- SQL injection is prevented through parameterized queries (ORM).
- No user input is ever used directly in system commands, file paths, or queries.

## 3. Rate Limiting & Abuse Prevention

- All public-facing endpoints enforce rate limits.
- Rate limits are applied per-user (authenticated) and per-IP (unauthenticated).
- Suggested baselines:
  - Report submission: 10 requests per minute per user.
  - General API: 100 requests per minute per user.
  - Authentication endpoints: 5 requests per minute per IP.
- Abuse patterns (rapid duplicate submissions, bot-like behavior) trigger temporary blocks.
- Rate limiting implementation: middleware at the API gateway or FastAPI middleware level.

## 4. Secure Media Handling

- All uploaded media (photos, videos, audio) is processed server-side before storage.
- File type validation uses magic bytes, not just MIME type or extension.
- Maximum file sizes are enforced:
  - Photos: 10 MB
  - Videos: 100 MB
  - Audio: 25 MB
- Media is stored in object storage (Supabase Storage or S3-compatible), not on the application server.
- Uploaded files are served through signed, time-limited URLs — never direct public access.
- EXIF data (including GPS coordinates) is extracted and stored separately; original files may be stripped of metadata before storage.
- Malware scanning should be applied to uploads in production.

## 5. Privacy & Minimal Data Collection

- Collect only the data necessary for the civic reporting function.
- Citizen identity is protected: display names are used publicly, not real names or contact details.
- Location data is collected only when the citizen explicitly grants permission.
- Location precision in public views may be reduced (e.g., to neighborhood level) to protect privacy.
- Citizens can delete their own reports and associated media.
- Data retention policies define how long resolved incidents and their media are kept.
- No data is sold to or shared with third parties outside the platform's civic function.

## 6. Database Access Control

- The database is only accessible from the backend application — no direct client access.
- Database credentials are stored in environment variables, never in code.
- The application connects using a dedicated database user with minimal required privileges.
- Row-Level Security (RLS) is enabled on PostgreSQL tables where appropriate.
- Supabase RLS policies enforce that users can only access their own data unless granted broader access by role.
- Schema migrations are reviewed for security implications.

## 7. Auditability

- All state-changing operations (create, update, delete) are logged with:
  - Timestamp
  - User identity (or system process)
  - Operation type
  - Affected resource
- Audit logs are append-only and stored separately from operational data.
- AI analysis results are stored alongside the incident they analyzed, with the model identifier and version.
- Status transitions on incidents are recorded as an event log (who changed what, when, from what to what).

## 8. Secret Management

- No secrets are hardcoded in source code.
- All secrets are managed via environment variables.
- `.env` files are in `.gitignore` and never committed.
- In production, secrets are injected by the deployment platform (e.g., Vercel, Railway, Docker environment).
- Secret rotation procedures should be documented before production launch.
- AI provider keys, database credentials, and Supabase service role keys are backend-only and never exposed to the client.

## 9. AI Safety & Human-in-the-Loop

- AI is used to assist, not replace, human judgment.
- AI outputs (classifications, severity assessments, risk scores) are stored as suggestions with confidence scores.
- Critical decisions — marking an incident as verified, resolved, or rejected — require human action.
- AI models must not auto-escalate to authorities without human review.
- AI provider calls are wrapped in error handling with fallback behavior (if AI is unavailable, the report is still accepted and queued for manual review).
- AI analysis is logged for auditability, including the model version and prompt used.
- Bias monitoring: periodic review of AI outputs for systematic bias across geographic, linguistic, or demographic dimensions.

## 10. Transport Security

- All production traffic uses HTTPS (TLS 1.2+).
- HTTP is permitted only for local development.
- HSTS headers are enabled in production.
- Certificate management is handled by the hosting platform.

## 11. Incident Response

- Security vulnerabilities should be reported responsibly (to be defined before public launch).
- Known vulnerabilities in dependencies are monitored via automated scanning.
- Critical patches are applied within 48 hours of disclosure.
