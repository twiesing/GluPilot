# ---- Build-Stage: Backend (TS->JS) + Frontend (Vite/React/Astryx) ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable

# Manifeste zuerst für Layer-Caching (root + web-Workspace).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json
RUN pnpm install --frozen-lockfile

# Quellcode und Build (tsc -> dist, vite -> public).
COPY tsconfig.json ./
COPY src ./src
COPY web ./web
RUN pnpm build

# ---- Runtime-Stage: nur Backend-Prod-Deps + kompilierter Code + statische App ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
RUN corepack enable

# Frontend-Deps liegen in web/devDependencies -> --prod installiert sie nicht.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/server.js"]
