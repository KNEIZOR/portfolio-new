FROM node:22-bookworm-slim AS build

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

COPY backend backend
COPY frontend frontend

ARG VITE_PUBLIC_EMAIL=denisstukalo33@gmail.com
ARG VITE_PUBLIC_TELEGRAM_URL=https://t.me/kneizor
ARG VITE_PUBLIC_GITHUB_URL=https://github.com/KNEIZOR
ARG VITE_SITE_URL=
ENV VITE_PUBLIC_EMAIL=${VITE_PUBLIC_EMAIL} \
    VITE_PUBLIC_TELEGRAM_URL=${VITE_PUBLIC_TELEGRAM_URL} \
    VITE_PUBLIC_GITHUB_URL=${VITE_PUBLIC_GITHUB_URL} \
    VITE_SITE_URL=${VITE_SITE_URL}

RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @denis-dev/backend run build \
 && pnpm --filter @denis-dev/frontend run build

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=./uploads
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system app \
 && useradd --system --gid app --home-dir /app app \
 && mkdir -p /app/backend/uploads \
 && chown -R app:app /app

COPY --from=build --chown=app:app /app/node_modules /app/node_modules
COPY --from=build --chown=app:app /app/backend/node_modules /app/backend/node_modules
COPY --from=build --chown=app:app /app/backend/package.json /app/backend/package.json
COPY --from=build --chown=app:app /app/backend/prisma /app/backend/prisma
COPY --from=build --chown=app:app /app/backend/prisma.config.ts /app/backend/prisma.config.ts
COPY --from=build --chown=app:app /app/backend/dist /app/backend/dist
COPY --from=build --chown=app:app /app/frontend/dist /app/frontend/dist
COPY --chown=app:app backend/docker-entrypoint.sh /app/backend/docker-entrypoint.sh

WORKDIR /app/backend
USER app
EXPOSE 4000
VOLUME ["/app/backend/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "./docker-entrypoint.sh"]
