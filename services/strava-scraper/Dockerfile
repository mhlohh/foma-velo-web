FROM mcr.microsoft.com/playwright:v1.51.0-noble

WORKDIR /app

ENV NODE_ENV=production
ENV SCRAPER_PORT=4001
ENV SYNC_CRON_SCHEDULE="0 2 * * *"

COPY package.json ./
RUN npm install --omit=dev && npm install -g tsx@4 && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:4001/health || curl -fsS http://127.0.0.1:4001/health || exit 1

CMD ["tsx", "src/index.ts"]
