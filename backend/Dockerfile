# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ─── deps ────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# ─── runtime ─────────────────────────────────────────────
FROM base AS runtime
# non-root user
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY migrations ./migrations
COPY schema.sql seed.js package.json ./

# Thư mục upload cho reports (mount volume trong compose)
RUN mkdir -p /app/uploads/reports && chown -R app:app /app

USER app

ENV PORT=3001
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Chạy migration mỗi lần start rồi bật server (idempotent nhờ schema_migrations)
CMD ["sh", "-c", "node migrations/runner.js && node src/server.js"]
