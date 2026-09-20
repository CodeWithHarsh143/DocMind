# DocMind(website)

**Ask questions over your team's documents and get grounded, cited answers.**

DocMind is a full-stack document Q&A platform built on a **Retrieval-Augmented
Generation (RAG)** pipeline. Teams upload PDF, DOCX, or TXT files into shared
workspaces, the system indexes them into embeddings, and members can chat with
their documents — receiving streaming answers that are grounded in the actual
content and pinned to the source documents they came from.

---

## Features

- **Workspace-based document management** — upload, track processing status, and
  manage documents inside shared organizations.
- **RAG-powered chat** — semantic search over vector-embedded chunks
  (pgvector), grounded answers streamed live via SSE, with **source chips**
  linking each answer back to the documents it used.
- **Chat sessions & history** — persistent per-workspace conversations with
  message history, source attribution, and auto-generated titles.
- **Authentication & security**:
  - JWT access tokens + **revocable refresh tokens** (logout invalidates them).
  - Password reset via **email OTP** (hashed in Redis, 5-attempt lockout,
    10-minute expiry) and account activation from pending invitations.
  - **Google OAuth** sign-in with token verification and email verification.
  - HTTP **rate limiting** on chat endpoints via Redis.
- **Organizations & membership** — admin/user roles, email invitations with
  token-based acceptance, member management, organization branding (logo).
- **Answer caching** — identical questions within a workspace are served from a
  Redis cache instead of re-querying the model.
- **Background document processing** — uploads are queued through RQ; text
  extraction, chunking, and embedding generation run asynchronously.
- **Polished React 19 UI** — dark/light theming, responsive layouts, streaming
  markdown rendering, and empty/error states.

---

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│   Frontend (React 19)       │      │   Backend (FastAPI)          │
│   Vite · Tailwind v4 · TS   │─────▶│   REST + SSE streaming       │
│   nginx (serves static)     │      │   sync SQLAlchemy + psycopg2  │
└─────────────────────────────┘      └──────┬───────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
        ┌───────────────────┐   ┌──────────────────────┐  ┌────────────────────┐
        │  PostgreSQL 16    │   │  Redis 7             │  │  RQ Worker         │
        │  + pgvector (1536d)│  │  · chat answer cache │  │  text extraction   │
        │  users/org/doc/   │   │  · OTP hashes        │  │  chunking          │
        │  chunks/messages  │   │  · rate-limit counts │  │  embeddings        │
        └───────────────────┘   └──────────────────────┘  └────────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────────┐
                              │  Google Gemini (OpenAI API)  │
                              │  · embeddings (1536-d)       │
                              │  · chat completions (stream) │
                              └──────────────────────────────┘
```

**Request flow for chat:**

1. Client streams a question to `POST /documents/chat/{org_id}`.
2. Membership is verified, the question is persisted as a user message.
3. A Redis cache lookup short-circuits repeated questions.
4. Otherwise the question is embedded and the top-5 most similar chunks are
   retrieved with pgvector cosine distance.
5. Grounding sources are streamed first, then the model's token-by-token answer.
6. The assistant message is persisted with its source attribution and the
   answer is cached.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 · FastAPI · Uvicorn |
| ORM / DB | SQLAlchemy 2 · Alembic · PostgreSQL 16 + pgvector |
| Cache / Rate-limit | Redis 7 · RQ (background jobs) |
| AI | Google Gemini via the OpenAI-compatible API (embeddings + chat) |
| Auth | python-jose (JWT) · passlib/bcrypt · Google tokeninfo |
| Files | PyPDF · python-docx · aiofiles (chunked uploads) |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · framer-motion |
| Email | Resend or SMTP (configurable) |
| Testing | pytest · pytest-asyncio · httpx · fakeredis |
| Infra | Docker · Docker Compose · nginx |

---

## Repository Structure

```
DocMind/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py           # app factory, middleware, router wiring
│   │   ├── config.py         # pydantic-settings (env-driven)
│   │   ├── database.py       # engine + SessionLocal + get_db
│   │   ├── core/             # security, rate limiting, exceptions
│   │   ├── models/           # SQLAlchemy models (User, Org, Document, Chat…)
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── routers/          # auth, organization, document, sessions, user, invites
│   │   ├── services/         # business logic, RAG, file processing, chunking
│   │   ├── storage/uploads/  # uploaded files
│   │   └── tasks/            # RQ background jobs (extract → chunk → embed)
│   ├── migration/            # Alembic migrations
│   ├── tests/                # 163 unit + integration tests
│   └── requirements.txt
├── frontend/                 # React + TypeScript + Vite UI
│   └── src/
│       ├── pages/            # Login, Dashboard, Chat, Documents, Members…
│       ├── components/       # layout, chat, documents, auth, ui
│       └── context/          # theme, auth state
├── db/init.sql               # DB bootstrap (pgvector extension)
├── docker-compose.yml        # full local stack (db, redis, backend, worker, frontend)
└── .gitignore
```

---

## Getting Started (Docker)

The simplest path runs the full stack with a single command.

```bash
docker compose up --build
```

Services:

| Service  | Endpoint              | Notes |
|----------|-----------------------|-------|
| Frontend | http://localhost:8080 | SPA + API proxied to the backend by nginx (SSE-safe) |

Only the frontend port is published to the host. Its nginx configuration
(`frontend/nginx.conf`) proxies all API routes — `/auth`, `/organizations`,
`/documents`, `/users`, `/sessions`, `/api/invite`, `/uploads` — to the
backend service inside the Docker network, including streaming responses.

> **Note:** `docker-compose.yml` loads backend configuration from
> `backend/.env` (`env_file`). Create that file before starting — see
> [Configuration](#configuration).

Document processing (extraction → chunking → embeddings) runs in a dedicated
RQ worker container; uploaded files and Postgres data are persisted in named
Docker volumes.

---

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # then fill in credentials (see Configuration)
.venv/bin/uvicorn app.main:app --reload
```

The app auto-creates the schema on startup (`Base.metadata.create_all`); apply
migrations instead with:

```bash
.venv/bin/alembic upgrade head
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server (default http://localhost:5173)
```

Other scripts: `npm run build`, `npm run lint` (oxlint), `npm test` (vitest).

---

## Configuration

All backend settings are read from environment variables (see `backend/app/config.py`;
a `.env` file in `backend/` is loaded automatically).

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/docmind`) |
| `SECRET_KEY` | Secret used to sign JWTs |
| `EXPIRE_MINUTES` | JWT access-token lifetime in minutes |
| `ALGORITHM` | JWT signing algorithm (e.g. `HS256`) |
| `REDIS_URL` | Redis connection string |
| `GEMINI_API_KEY` | Google Gemini API key (used for embeddings + chat) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_PROVIDER` | `resend` or `smtp` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP credentials when `EMAIL_PROVIDER=smtp` |
| `FRONTEND_BASE_URL` | Origin of the frontend (used in generated links) |
| `EMAIL_FROM` | Sender address for outgoing email |

---

## Document Processing Pipeline

```
upload ──▶ queue (RQ) ──▶ extract text ──▶ chunk (500 tokens / 50 overlap)
                              │
                              ▼
                    embed (Gemini, 1536-d)
                              │
                              ▼
            store DocumentChunk rows in pgvector
```

Each document transitions through a `processing_status` (`pending` → `completed`
or `failed`), so the UI can report progress without blocking uploads.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create an account (or activate a pending invite) |
| POST | `/auth/login` | OAuth2 password login → access + refresh tokens |
| POST | `/auth/refresh` | Exchange refresh token for a new access token |
| POST | `/auth/logout` | Revoke a refresh token |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/request-otp` | Send a password-reset OTP by email |
| POST | `/auth/verify-otp` | Verify OTP → one-time reset token |
| POST | `/auth/reset-password` | Reset password (or create a password for an OTP sign-up) |
| POST | `/auth/google` | Google OAuth sign-in / sign-up |
| POST | `/organizations` / `GET /organizations` | Create / list organizations |
| GET/PATCH/DELETE | `/organizations/{id}` | Update branding & settings, delete |
| GET/POST | `/organizations/{id}/members` | List / add members |
| PATCH/DELETE | `/organizations/{id}/members/{uid}` | Change role / remove member |
| POST/GET | `/organizations/{id}/invites` | Email invitations with token links |
| GET/POST | `/api/invite/{token}` / `/api/invite/mine` / `/api/invite/{token}/accept` | Invite lookup, listing, acceptance |
| GET | `/documents/organization/{org_id}` | List workspace documents |
| POST | `/documents/upload` | Upload PDF/DOCX/TXT → background pipeline |
| POST | `/documents/chat/{org_id}` | **Streaming RAG chat** (SSE, rate-limited) |
| POST/GET | `/organizations/{org_id}/sessions` | Create / list chat sessions |
| GET | `/sessions/{id}/messages` | Chat history for a session |
| DELETE | `/sessions/{id}` | Delete a chat session (owner only) |
| PATCH | `/users/me/profile` | Update profile (name, phone, avatar URL) |
| POST | `/users/me/avatar` | Upload an avatar image (PNG/JPG/WebP, ≤5 MB) |

Interactive API documentation is available at `http://localhost:8000/docs`
when running the backend directly with Uvicorn.

---

## Testing

The backend ships a **163-test suite** (unit + integration) run with pytest.

```bash
cd backend
.venv/bin/python -m pytest           # full suite
.venv/bin/python -m pytest tests/unit/
.venv/bin/python -m pytest tests/integration/
```

Design notes:

- Pure unit tests (schemas, cache with `fakeredis`, security, email) run
  **without** any external service.
- Service/integration tests use a dedicated `docmind_test` **schema** (the DB
  role lacks `CREATEDB`, so isolation is achieved via `search_path`); every
  test rolls back its transaction.
- OTP/indexing integration tests use **real Redis**, while the `RQ` queue runs
  in synchronous mode so no worker process is needed.
- Test-schema bootstrap and Redis seed/cleanup are handled automatically in
  `backend/tests/conftest.py`.

Environment overrides for running the suite elsewhere:
`TEST_BASE_DATABASE_URL`, `TEST_SCHEMA`, `TEST_REDIS_URL`.

---

## License

All rights reserved. This project is not released under an open-source license.
