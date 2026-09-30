import express from 'express';
import { isValidCron, scheduleDailyCron } from './scheduler';
import { registerStravaScraperRoutes, runDailyBatchSync } from './routes';

const PORT = Number(process.env.SCRAPER_PORT || process.env.PORT) || 4001;
const CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE || '0 2 * * *';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'foma-velo-strava-scraper',
    cronSchedule: CRON_SCHEDULE,
  });
});

registerStravaScraperRoutes(app, CRON_SCHEDULE);

if (isValidCron(CRON_SCHEDULE)) {
  scheduleDailyCron(CRON_SCHEDULE, () => {
    console.log(`[strava-scraper] Cron triggered (${CRON_SCHEDULE})`);
    runDailyBatchSync().catch((err) =>
      console.error('[strava-scraper] Unhandled daily cron error:', err)
    );
  });
  console.log(`[strava-scraper] Daily scheduler active with cron: "${CRON_SCHEDULE}"`);
} else {
  scheduleDailyCron('0 2 * * *', () => {
    runDailyBatchSync().catch((err) =>
      console.error('[strava-scraper] Unhandled daily cron error:', err)
    );
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[strava-scraper] Microservice listening on http://0.0.0.0:${PORT}`);
  if (process.env.RUN_SYNC_ON_STARTUP === 'true') {
    runDailyBatchSync().catch((err) =>
      console.error('[strava-scraper] Startup sync error:', err)
    );
  }
});
