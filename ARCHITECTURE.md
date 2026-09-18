# NigraanOS — Architecture

## Project Structure

```
Nigraan-OS/
├── apps/
│   └── mobile/                 # Universal client (Android, iOS, Web)
│       ├── src/
│       │   ├── app/            # Screen routes (Expo Router)
│       │   ├── components/     # Reusable UI components
│       │   ├── services/       # API client, local storage, etc.
│       │   ├── hooks/          # Custom React hooks
│       │   └── lib/            # Constants, helpers, config
│       ├── App.tsx             # Application entry component
│       ├── app.json            # Expo configuration
│       ├── package.json
│       └── tsconfig.json
│
├── backend/                    # FastAPI + Python API server
│   ├── app/
│   │   ├── api/                # HTTP route handlers (routers)
│   │   ├── core/               # Config, security, dependencies
│   │   ├── models/             # Database models (SQLAlchemy/ORM)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic + AI abstraction
│   │   ├── db/                 # Database session, migrations
│   │   └── main.py             # FastAPI application factory
│   ├── requirements.txt
│   └── pyproject.toml
│
├── shared/                     # Cross-layer domain types
│   ├── types/                  # TypeScript domain types (incident lifecycle)
│   └── validation/             # Shared validation schemas (future)
│
├── docs/                       # Product and architecture documentation
│
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

## Layer Responsibilities

### Mobile Client (`apps/mobile`)

- **Runtime**: React Native via Expo (supports Android, iOS, and Web from one codebase).
- **Routing**: Expo Router for file-based navigation.
- **Responsibilities**: UI rendering, user interaction, media capture (camera, microphone, GPS), offline queueing, and communication with the backend API.
- **Does NOT**: Access databases directly, hold API secrets, or run AI models.

### Backend (`backend`)

- **Runtime**: Python 3.13+ with FastAPI and Uvicorn.
- **Responsibilities**: All server-side logic including authentication, data validation, database access, AI orchestration, media processing, and API versioning.
- **Does NOT**: Trust client input without validation, expose internal errors to clients, or store secrets in code.

### Shared (`shared`)

- **Purpose**: Domain types and validation schemas that both client and backend reference.
- **Currently**: TypeScript incident lifecycle types.
- **Future**: Zod validation schemas that can be consumed by both layers.
- **Does NOT**: Contain runtime dependencies, UI code, or database logic.

## Client ↔ Backend Communication

```
┌──────────────┐     HTTPS / REST      ┌──────────────┐
│              │ ─────────────────────► │              │
│    Mobile    │     JSON payloads      │   Backend    │
│   (Expo)     │ ◄───────────────────── │  (FastAPI)   │
│              │                        │              │
└──────────────┘                        └──────┬───────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                              ┌─────┴─────┐       ┌──────┴──────┐
                              │ PostgreSQL │       │  AI Provider │
                              │  + PostGIS │       │ (abstracted) │
                              └───────────┘       └─────────────┘
```

- **Protocol**: HTTPS only in production; HTTP allowed for local development.
- **Format**: JSON request and response bodies.
- **Authentication**: Bearer token in the `Authorization` header (JWT issued by backend via Supabase Auth).
- **API Versioning**: All endpoints are prefixed with `/api/v1/`.
- **Error Format**: Standardized JSON error responses with `detail` field.

## Authentication

- **Provider**: Supabase Auth (email/OTP, phone/OTP, and eventually social login).
- **Flow**: Client authenticates directly with Supabase Auth SDK → receives JWT → sends JWT to backend on every request.
- **Backend Validation**: Backend verifies JWT signature and claims using Supabase service role key.
- **No secrets on client**: The Supabase anon key is safe for client use. The service role key lives only on the backend.

## Database Access

- **Primary**: PostgreSQL with PostGIS for geospatial queries (incident location, proximity search, clustering).
- **Provider**: Supabase PostgreSQL (managed) for initial deployment; can migrate to self-hosted PostgreSQL.
- **ORM**: SQLAlchemy (Python) on the backend.
- **Access Rule**: Only the backend talks to the database. The client never connects directly.
- **Migrations**: Alembic for schema migrations (to be set up when first models are created).

## AI Services

- **Access Pattern**: All AI provider calls go through `backend/app/services/` — an abstraction layer that isolates provider-specific logic.
- **Provider Agnostic**: The service layer defines interfaces (e.g., `classify_incident`, `extract_text_from_media`) that can be backed by OpenAI, Google AI, or any future provider.
- **No client-side keys**: AI provider API keys are environment variables read only by the backend.
- **Human-in-the-loop**: AI outputs are treated as suggestions, not authoritative decisions. Critical actions require human verification.

## Secret Management

| Secret                  | Where it lives                        | Who reads it       |
|-------------------------|---------------------------------------|---------------------|
| `DATABASE_URL`          | Environment variable                  | Backend only        |
| `SUPABASE_URL`          | Environment variable                  | Backend + client    |
| `SUPABASE_ANON_KEY`     | Environment variable                  | Client (safe)       |
| `SUPABASE_SERVICE_ROLE_KEY` | Environment variable              | Backend only        |
| `OPENAI_API_KEY`        | Environment variable                  | Backend only        |
| `GOOGLE_AI_API_KEY`     | Environment variable                  | Backend only        |

- Secrets are never committed to version control.
- `.env` files are listed in `.gitignore`.
- `.env.example` is committed as a template with empty values.
- In production, secrets are injected via the hosting platform's environment configuration.
