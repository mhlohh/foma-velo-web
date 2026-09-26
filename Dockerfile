# ---------- Stage 1: build the client ----------
FROM node:22-alpine AS client-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json index.html ./
COPY src ./src

# Build-time public env (safe to bake: anon key + project URL are public by design)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build:client

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
# Install only what the server needs (skip client dev deps)
RUN npm ci --omit=dev && npm cache clean --force

# Server bundle from stage 1 would need esbuild at build time;
# simpler and robust: run server.ts with tsx in production too.
RUN npm install -g tsx@4

COPY server.ts ./
COPY --from=client-build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["tsx", "server.ts"]
