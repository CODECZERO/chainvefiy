# ─── Server Build ────────────────────────────────────────────────
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS server
WORKDIR /app/server
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/ ./
RUN npx tsc
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1
CMD ["node", "dist/index.js"]

# ─── Frontend Build ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
