import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encryptSecret, decryptSecret } from './crypto';
import {
  parseRawCookieInput,
  scrapeStravaActivitiesForUser,
  StravaCookie,
} from './scraper';

// Load .env from current or parent workspace directories automatically
for (const rel of ['.env', '../.env', '../../.env', '../../../.env']) {
  const candidate = path.resolve(process.cwd(), rel);
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
}

export interface StoredConnectionRecord {
  user_id: string;
  strava_email: string | null;
  strava_password_encrypted: string | null;
  strava_session_cookies: StravaCookie[] | null;
  supabase_access_token_encrypted?: string | null;
  athlete_id: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: 'idle' | 'running' | 'success' | 'error';
  last_sync_error: string | null;
  last_synced_count: number;
}

const LOCAL_STORE_PATH = path.resolve(process.cwd(), '.strava-connections.json');

function readLocalConnections(): Record<string, StoredConnectionRecord> {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) return {};
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeLocalConnection(record: StoredConnectionRecord): void {
  try {
    const all = readLocalConnections();
    all[record.user_id] = record;
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(all, null, 2), 'utf8');
  } catch (err) {
    console.warn('[strava-scraper] Could not write local connection cache:', err);
  }
}

function deleteLocalConnection(userId: string): void {
  try {
    const all = readLocalConnections();
    delete all[userId];
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(all, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

export interface SupabaseAuthContext {
  supabaseUrl?: string;
  supabaseKey?: string;
  userAccessToken?: string;
}

function extractAuthContext(req?: express.Request): SupabaseAuthContext {
  const headerUrl = req?.headers['x-supabase-url'];
  const headerKey = req?.headers['x-supabase-key'];
  const authHeader = req?.headers['authorization'];
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  return {
    supabaseUrl:
      (typeof headerUrl === 'string' && headerUrl) ||
      req?.body?.supabaseUrl ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL,
    supabaseKey:
      (typeof headerKey === 'string' && headerKey) ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      req?.body?.supabaseKey,
    userAccessToken: bearerToken || req?.body?.supabaseAccessToken,
  };
}

function getSupabaseClient(ctx?: SupabaseAuthContext): SupabaseClient {
  const url =
    ctx?.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    ctx?.supabaseKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const key = serviceKey || anonKey;

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env configuration.'
    );
  }

  const globalHeaders: Record<string, string> = {};
  if (!serviceKey && ctx?.userAccessToken) {
    globalHeaders['Authorization'] = `Bearer ${ctx.userAccessToken}`;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: globalHeaders },
  });
}

async function getConnectionRecord(
  userId: string,
  ctx?: SupabaseAuthContext
): Promise<StoredConnectionRecord | null> {
  const localAll = readLocalConnections();
  const localRec = localAll[userId] || null;

  try {
    const supabase = getSupabaseClient(ctx);
    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return {
        user_id: userId,
        strava_email: data.strava_email ?? localRec?.strava_email ?? null,
        strava_password_encrypted:
          data.strava_password_encrypted ?? localRec?.strava_password_encrypted ?? null,
        strava_session_cookies:
          data.strava_session_cookies ?? localRec?.strava_session_cookies ?? null,
        supabase_access_token_encrypted: localRec?.supabase_access_token_encrypted ?? null,
        athlete_id: data.athlete_id ?? localRec?.athlete_id ?? null,
        sync_enabled: data.sync_enabled ?? localRec?.sync_enabled ?? true,
        last_sync_at: data.last_sync_at ?? localRec?.last_sync_at ?? null,
        last_sync_status: data.last_sync_status ?? localRec?.last_sync_status ?? 'idle',
        last_sync_error: data.last_sync_error ?? localRec?.last_sync_error ?? null,
        last_synced_count: data.last_synced_count ?? localRec?.last_synced_count ?? 0,
      };
    }
  } catch {
    // Fall back to local encrypted store
  }

  return localRec;
}

async function saveConnectionRecord(
  record: StoredConnectionRecord,
  ctx?: SupabaseAuthContext
): Promise<void> {
  writeLocalConnection(record);

  try {
    const supabase = getSupabaseClient(ctx);
    const { supabase_access_token_encrypted: _, ...dbPayload } = record;
    await supabase.from('strava_connections').upsert(dbPayload, { onConflict: 'user_id' });
  } catch {
    // Local store already updated; ignore if strava_connections migration hasn't been run yet
  }
}

const activeSyncLocks = new Set<string>();

export async function syncSingleUser(
  userId: string,
  options?: { fullHistory?: boolean; authContext?: SupabaseAuthContext }
): Promise<{
  syncedCount: number;
  athleteId: string | null;
  pagesScraped: number;
}> {
  if (activeSyncLocks.has(userId)) {
    throw new Error('A Strava sync is already in progress for this user.');
  }

  activeSyncLocks.add(userId);
  let conn = await getConnectionRecord(userId, options?.authContext);

  if (!conn) {
    activeSyncLocks.delete(userId);
    throw new Error('No Strava connection configured for this user.');
  }

  // Restore cached Supabase access token for background cron runs if not in request
  const effectiveCtx: SupabaseAuthContext = {
    ...options?.authContext,
    userAccessToken:
      options?.authContext?.userAccessToken ||
      (conn.supabase_access_token_encrypted
        ? decryptSecret(conn.supabase_access_token_encrypted)
        : undefined),
  };

  const supabase = getSupabaseClient(effectiveCtx);

  try {
    conn = {
      ...conn,
      last_sync_status: 'running',
      last_sync_error: null,
    };
    await saveConnectionRecord(conn, effectiveCtx);

    const password = conn.strava_password_encrypted
      ? decryptSecret(conn.strava_password_encrypted)
      : null;

    const { data: existingRows } = await supabase
      .from('activities')
      .select('strava_activity_id')
      .eq('user_id', userId)
      .not('strava_activity_id', 'is', null);

    const existingStravaIds = new Set<string>(
      (existingRows || [])
        .map((r: { strava_activity_id: string | null }) => r.strava_activity_id)
        .filter((id): id is string => Boolean(id))
    );

    const isFirstFullSync = existingStravaIds.size === 0 || !conn.last_sync_at;
    const shouldScrapeFullHistory = options?.fullHistory ?? isFirstFullSync;

    const result = await scrapeStravaActivitiesForUser({
      userId,
      email: conn.strava_email,
      password,
      sessionCookies: Array.isArray(conn.strava_session_cookies)
        ? conn.strava_session_cookies
        : null,
      existingStravaIds,
      maxPages: 500,
      fullHistory: shouldScrapeFullHistory,
    });

    // Purge any preset mock sample rows (id < 10000 or preset sample names with no strava_activity_id)
    await supabase
      .from('activities')
      .delete()
      .eq('user_id', userId)
      .is('strava_activity_id', null)
      .lt('id', 10000);

    await supabase
      .from('activities')
      .delete()
      .eq('user_id', userId)
      .is('strava_activity_id', null)
      .in('name', [
        'Easy Recovery Spin',
        'Zwift - 3x12m SweetSpot Intervals',
        'Tuesday Night SST Repeats',
        'Mid-week Zone 2 Aerobic Base',
        'Zwift Racing League - Crit Sprint',
        'Saturday Alpine Ridge Endurance Ride',
        'Sunday Paceline & Espresso Ride',
        '[PLANNED] 4x8m VO2Max Intervals',
        '[PLANNED] Weekend Century Gran Fondo',
      ]);

    const CHUNK_SIZE = 200;
    for (let i = 0; i < result.activities.length; i += CHUNK_SIZE) {
      const chunk = result.activities.slice(i, i + CHUNK_SIZE);
      const { error: upsertErr } = await supabase
        .from('activities')
        .upsert(chunk, { onConflict: 'id' });

      if (upsertErr) {
        throw new Error(`Failed to save scraped rides to Supabase: ${upsertErr.message}`);
      }
    }

    const updatedRecord: StoredConnectionRecord = {
      ...conn,
      strava_session_cookies: result.updatedCookies,
      athlete_id: result.athleteId ?? conn.athlete_id ?? null,
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
      last_synced_count: result.activities.length,
    };
    await saveConnectionRecord(updatedRecord, effectiveCtx);

    return {
      syncedCount: result.activities.length,
      athleteId: result.athleteId,
      pagesScraped: result.pagesScraped,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown Strava scraping error';
    await saveConnectionRecord(
      {
        ...conn,
        last_sync_status: 'error',
        last_sync_error: errMsg,
      },
      effectiveCtx
    );
    throw err;
  } finally {
    activeSyncLocks.delete(userId);
  }
}

export async function runDailyBatchSync(): Promise<{
  totalUsers: number;
  succeeded: number;
  failed: number;
}> {
  const userIds = new Set<string>();

  // 1. Collect from local encrypted store
  const localAll = readLocalConnections();
  for (const rec of Object.values(localAll)) {
    if (rec.sync_enabled) userIds.add(rec.user_id);
  }

  // 2. Collect from Supabase strava_connections if available
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('strava_connections')
      .select('user_id')
      .eq('sync_enabled', true);
    for (const row of data || []) {
      if (row.user_id) userIds.add(row.user_id);
    }
  } catch {
    // ignore
  }

  let succeeded = 0;
  let failed = 0;

  for (const uid of userIds) {
    try {
      await syncSingleUser(uid);
      succeeded++;
    } catch (err: any) {
      failed++;
      console.error(`[strava-scraper] Daily sync failed for ${uid}:`, err?.message || err);
    }
  }

  return { totalUsers: userIds.size, succeeded, failed };
}

export function registerStravaScraperRoutes(
  app: express.Application,
  cronSchedule: string = '0 2 * * *'
): void {
  app.get('/api/strava/status/:userId', async (req, res) => {
    try {
      const userId = String(req.params.userId);
      const ctx = extractAuthContext(req);
      const data = await getConnectionRecord(userId, ctx);

      if (!data) {
        res.json({
          connected: false,
          cronSchedule,
        });
        return;
      }

      res.json({
        connected: true,
        stravaEmail: data.strava_email,
        hasSessionCookies:
          Array.isArray(data.strava_session_cookies) &&
          data.strava_session_cookies.length > 0,
        athleteId: data.athlete_id,
        syncEnabled: data.sync_enabled,
        lastSyncAt: data.last_sync_at,
        lastSyncStatus: data.last_sync_status,
        lastSyncError: data.last_sync_error,
        lastSyncedCount: data.last_synced_count,
        cronSchedule,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch Strava status' });
    }
  });

  app.post('/api/strava/connect', async (req, res) => {
    try {
      const {
        userId,
        email,
        password,
        sessionCookie,
        syncEnabled = true,
        triggerSync = true,
      } = req.body || {};

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      if (!email && !sessionCookie) {
        res.status(400).json({
          error: 'Provide either Strava email & password or a _strava4_session cookie.',
        });
        return;
      }

      const ctx = extractAuthContext(req);
      const existing = await getConnectionRecord(userId, ctx);

      const parsedCookies = parseRawCookieInput(sessionCookie);

      const record: StoredConnectionRecord = {
        user_id: userId,
        strava_email:
          email !== undefined
            ? email
              ? String(email).trim()
              : null
            : existing?.strava_email ?? null,
        strava_password_encrypted: password
          ? encryptSecret(String(password))
          : existing?.strava_password_encrypted ?? null,
        strava_session_cookies:
          parsedCookies.length > 0
            ? parsedCookies
            : existing?.strava_session_cookies ?? null,
        supabase_access_token_encrypted: ctx.userAccessToken
          ? encryptSecret(ctx.userAccessToken)
          : existing?.supabase_access_token_encrypted ?? null,
        athlete_id: existing?.athlete_id ?? null,
        sync_enabled: Boolean(syncEnabled),
        last_sync_at: existing?.last_sync_at ?? null,
        last_sync_status: existing?.last_sync_status ?? 'idle',
        last_sync_error: null,
        last_synced_count: existing?.last_synced_count ?? 0,
      };

      await saveConnectionRecord(record, ctx);

      if (triggerSync) {
        const syncResult = await syncSingleUser(userId, {
          fullHistory: true,
          authContext: ctx,
        });
        res.json({
          connected: true,
          syncedCount: syncResult.syncedCount,
          pagesScraped: syncResult.pagesScraped,
          athleteId: syncResult.athleteId,
        });
        return;
      }

      res.json({ connected: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to connect and sync Strava' });
    }
  });

  app.post('/api/strava/sync', async (req, res) => {
    try {
      const { userId, fullHistory } = req.body || {};
      const ctx = extractAuthContext(req);

      if (userId) {
        const result = await syncSingleUser(userId, {
          fullHistory: typeof fullHistory === 'boolean' ? fullHistory : undefined,
          authContext: ctx,
        });
        res.json({
          status: 'success',
          syncedCount: result.syncedCount,
          pagesScraped: result.pagesScraped,
          athleteId: result.athleteId,
        });
        return;
      }

      const batchResult = await runDailyBatchSync();
      res.json({
        status: 'success',
        ...batchResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Strava sync failed' });
    }
  });

  app.patch('/api/strava/settings/:userId', async (req, res) => {
    try {
      const userId = String(req.params.userId);
      const { syncEnabled } = req.body || {};
      const ctx = extractAuthContext(req);
      const existing = await getConnectionRecord(userId, ctx);
      if (existing) {
        await saveConnectionRecord(
          { ...existing, sync_enabled: Boolean(syncEnabled) },
          ctx
        );
      }
      res.json({ syncEnabled: Boolean(syncEnabled) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update sync setting' });
    }
  });

  app.delete('/api/strava/disconnect/:userId', async (req, res) => {
    try {
      const userId = String(req.params.userId);
      const ctx = extractAuthContext(req);
      deleteLocalConnection(userId);
      try {
        const supabase = getSupabaseClient(ctx);
        await supabase.from('strava_connections').delete().eq('user_id', userId);
      } catch {
        // ignore
      }
      res.json({ disconnected: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to disconnect Strava' });
    }
  });
}
