# DENIS.DEV — Digital Atelier

A multilingual portfolio and private project CMS built with React 19, TypeScript, Vite 8, Express, PostgreSQL, and Prisma 7. A project is a single database record with EN / RU / HY translations, shared technical details, image gallery, and technologies.

## Requirements

- Node.js 20.19+
- Docker with Compose, or a PostgreSQL 14+ server

## Local setup

1. Copy `.env.example` to `.env`. Set a unique `SESSION_SECRET` with at least 32 random characters, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` with at least 12 characters. Do not commit `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`, or update `DATABASE_URL` to your own database.
3. Install dependencies from the project root with `npm install` or `pnpm install`.
4. Apply the initial schema: `npm run db:migrate`.
5. Create or update the administrator using the configured environment credentials: `npm run db:seed`.
6. Start the Vite frontend and Express API: `npm run dev`.
7. Open `http://localhost:5173`. Open `/admin` to sign in.

The Vite development server proxies `/api` and `/uploads` to the API. The Express server serves the built SPA in production and falls back to `index.html` for direct locale, project, and admin URLs.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Production startup guard and session secret configuration |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | One-time/current administrator seed credentials; only a bcrypt hash is stored |
| `PUBLIC_ORIGIN`, `ALLOWED_ORIGINS` | Public URL and exact allowed browser origins (comma-separated) |
| `PORT` | API port (default `4000`) |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Local image directory and upload size limit |
| `STORAGE_PROVIDER` | `local` or `s3` |
| `S3_*` | S3-compatible endpoint, bucket, credentials, and public base URL |
| `VITE_PUBLIC_EMAIL`, `VITE_PUBLIC_TELEGRAM_URL`, `VITE_PUBLIC_GITHUB_URL` | Contact destinations shown by the site |

For production, serve frontend and API on the same origin, set `NODE_ENV=production`, use HTTPS, rotate the sample database credentials, and set `ALLOWED_ORIGINS` to the exact site origin. When using S3-compatible storage, configure the bucket/CDN to serve the URLs at `S3_PUBLIC_BASE_URL`.

## Database commands

- `npm run db:migrate` — apply committed Prisma migrations.
- `npm --workspace backend run db:dev -- --name change_name` — create a development migration after editing `backend/prisma/schema.prisma`.
- `npm run db:generate` — regenerate the Prisma client after changing the schema.
- `npm run db:seed` — initialize/update the configured administrator. The password is bcrypt-hashed before storage.
- `npm run db:studio` — open Prisma Studio.

## Build and run

- `npm run build` — compile the backend and create the optimized frontend bundle.
- Set production environment variables and apply migrations with `npm run db:migrate`.
- Run `npm start` from the root; the backend serves `frontend/dist` and API routes on the configured port.

## Deploy as a container

The root `Dockerfile` builds the frontend and API into one non-root Node.js image. The container applies pending Prisma migrations, synchronizes the administrator from its environment variables, then starts the API and serves the frontend on the same origin.

Build the image with `docker build -t denis-dev .`. Configure these runtime variables in the hosting provider:

- `DATABASE_URL` — PostgreSQL URL reachable from the app container.
- `SESSION_SECRET` — a unique random value with at least 32 characters.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — production admin credentials; use a unique password of at least 12 characters.
- `PUBLIC_ORIGIN` and `ALLOWED_ORIGINS` — the exact HTTPS site origin, for example `https://portfolio.example.com`.
- `PORT` — use the port supplied by the host, or `4000`.

The container listens on the configured `PORT` and reports health at `/api/health`. Attach persistent storage at `/app/backend/uploads` when using local image storage, or configure S3-compatible storage. Public contact links are build-time values and can be set with `VITE_PUBLIC_EMAIL`, `VITE_PUBLIC_TELEGRAM_URL`, `VITE_PUBLIC_GITHUB_URL`, and `VITE_SITE_URL` build arguments. Do not pass database or administrator secrets as build arguments.

## Image storage

The `StorageService` interface separates file persistence from project records. Uploads accept verified JPG, PNG, WebP, and AVIF, normalize orientation, cap the long edge at 2400 px, and compress to WebP. Local mode stores optimized images under `backend/uploads`; the database stores URLs. S3-compatible mode uses the AWS SDK against AWS S3, MinIO, R2, or another compatible service. Uploads are size-limited and their signatures are verified before processing. The gallery order and localized alt text are stored in PostgreSQL.

## Admin and API

Admin authentication uses opaque random session tokens in HttpOnly, SameSite=Lax cookies; only an HMAC-SHA-256 token digest is persisted. Login is rate-limited, and every `/api/admin/*` endpoint requires a live server-side session. Password hashes use bcrypt. Drafts are omitted from public endpoints. Public locale lookup falls back to English; publishing requires complete English core copy and prompts for missing RU/HY translations.

Main routes: `/en`, `/ru`, `/hy`, `/:locale/projects/:slug`, and `/admin`. Public API: `GET /api/projects?locale=en`, `GET /api/projects/:slug?locale=en`. Admin API includes auth, dashboard, project CRUD, upload, and image-order endpoints.
