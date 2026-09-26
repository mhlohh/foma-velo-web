import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ActivityEntity, CalculationMode, UserSettings } from '../types';

/**
 * Data service backed by Supabase Postgres.
 * Row Level Security scopes every query to auth.uid().
 * Realtime channels replace the previous Firestore snapshot listeners.
 */

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

// ------------------------------------------------------------------
// Row <-> entity mapping (snake_case DB columns <-> camelCase app)
// ------------------------------------------------------------------

interface ActivityRow {
  id: number | string;
  strava_activity_id: string | null;
  date_millis: number | string;
  name: string;
  type: string;
  moving_time_sec: number;
  elapsed_time_sec: number;
  distance_meters: number;
  elevation_gain_meters: number;
  avg_watts: number | null;
  max_watts: number | null;
  weighted_watts: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  kilojoules: number | null;
  strava_tss: number | null;
  is_planned: boolean;
  is_manual: boolean;
  notes: string | null;
}

function rowToActivity(row: ActivityRow): ActivityEntity {
  return {
    id: Number(row.id),
    stravaActivityId: row.strava_activity_id,
    dateMillis: Number(row.date_millis),
    name: row.name || 'Workout',
    type: row.type || 'Ride',
    movingTimeSec: Number(row.moving_time_sec) || 0,
    elapsedTimeSec: Number(row.elapsed_time_sec) || 0,
    distanceMeters: Number(row.distance_meters) || 0,
    elevationGainMeters: Number(row.elevation_gain_meters) || 0,
    avgWatts: row.avg_watts != null ? Number(row.avg_watts) : null,
    maxWatts: row.max_watts != null ? Number(row.max_watts) : null,
    weightedWatts: row.weighted_watts != null ? Number(row.weighted_watts) : null,
    avgHr: row.avg_hr != null ? Number(row.avg_hr) : null,
    maxHr: row.max_hr != null ? Number(row.max_hr) : null,
    kilojoules: row.kilojoules != null ? Number(row.kilojoules) : null,
    stravaTss: row.strava_tss != null ? Number(row.strava_tss) : null,
    isPlanned: Boolean(row.is_planned),
    isManual: Boolean(row.is_manual),
    notes: row.notes,
  };
}

function activityToRow(activity: ActivityEntity) {
  return {
    id: activity.id,
    strava_activity_id: activity.stravaActivityId ?? null,
    date_millis: activity.dateMillis,
    name: activity.name || 'Workout',
    type: activity.type || 'Ride',
    moving_time_sec: activity.movingTimeSec ?? 0,
    elapsed_time_sec: activity.elapsedTimeSec ?? 0,
    distance_meters: activity.distanceMeters ?? 0,
    elevation_gain_meters: activity.elevationGainMeters ?? 0,
    avg_watts: activity.avgWatts ?? null,
    max_watts: activity.maxWatts ?? null,
    weighted_watts: activity.weightedWatts ?? null,
    avg_hr: activity.avgHr ?? null,
    max_hr: activity.maxHr ?? null,
    kilojoules: activity.kilojoules ?? null,
    strava_tss: activity.stravaTss ?? null,
    is_planned: activity.isPlanned ?? false,
    is_manual: activity.isManual ?? false,
    notes: activity.notes ?? null,
  };
}

// ------------------------------------------------------------------
// Activities
// ------------------------------------------------------------------

export async function fetchActivities(userId: string): Promise<ActivityEntity[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('date_millis', { ascending: false });

  if (error) throw new Error(`Failed to load activities: ${error.message}`);
  return (data as ActivityRow[] | null)?.map(rowToActivity) ?? [];
}

export async function upsertActivity(userId: string, activity: ActivityEntity): Promise<void> {
  const client = requireClient();
  const row = { ...activityToRow(activity), user_id: userId };
  const { error } = await client.from('activities').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save activity: ${error.message}`);
}

/**
 * Batch upsert in chunks (Postgres has a practical limit on
 * parameters per statement; 500 rows keeps us well inside it).
 */
export async function upsertActivities(
  userId: string,
  activities: ActivityEntity[]
): Promise<void> {
  if (activities.length === 0) return;
  const client = requireClient();
  const CHUNK = 500;
  for (let i = 0; i < activities.length; i += CHUNK) {
    const chunk = activities.slice(i, i + CHUNK).map((a) => ({
      ...activityToRow(a),
      user_id: userId,
    }));
    const { error } = await client.from('activities').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`Failed to save activities: ${error.message}`);
  }
}

export async function deleteActivity(userId: string, activityId: number): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('activities')
    .delete()
    .eq('user_id', userId)
    .eq('id', activityId);
  if (error) throw new Error(`Failed to delete activity: ${error.message}`);
}

export async function deleteActivities(userId: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const client = requireClient();
  const { error } = await client
    .from('activities')
    .delete()
    .eq('user_id', userId)
    .in('id', ids);
  if (error) throw new Error(`Failed to delete activities: ${error.message}`);
}

export async function deleteAllActivities(userId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('activities').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to clear activities: ${error.message}`);
}

// ------------------------------------------------------------------
// User settings
// ------------------------------------------------------------------

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  if (!data) return null;

  return {
    ftp: Number(data.ftp) || 250,
    lthr: Number(data.lthr) || 168,
    maxHr: Number(data.max_hr) || 190,
    weightKg: Number(data.weight_kg) || 72,
    calculationMode: (data.calculation_mode as CalculationMode) || CalculationMode.AUTO,
    ctlDays: Number(data.ctl_days) || 42,
    atlDays: Number(data.atl_days) || 7,
  };
}

export async function saveUserSettings(
  userId: string,
  settings: UserSettings,
  setupDone: boolean
): Promise<void> {
  const client = requireClient();
  const row = {
    user_id: userId,
    ftp: settings.ftp,
    lthr: settings.lthr,
    max_hr: settings.maxHr,
    weight_kg: settings.weightKg,
    calculation_mode: settings.calculationMode,
    ctl_days: settings.ctlDays,
    atl_days: settings.atlDays,
    setup_done: setupDone,
  };
  const { error } = await client.from('user_settings').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save settings: ${error.message}`);
}

// ------------------------------------------------------------------
// Realtime subscriptions (drop-in replacement for onSnapshot)
// ------------------------------------------------------------------

export function subscribeToActivities(
  userId: string,
  onChange: (activities: ActivityEntity[]) => void,
  onError?: (err: Error) => void
): () => void {
  const client = requireClient();
  const channel: RealtimeChannel = client
    .channel(`activities:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${userId}` },
      () => {
        fetchActivities(userId)
          .then(onChange)
          .catch((err) => onError?.(err));
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Realtime channel issue: ${status}`));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToSettings(
  userId: string,
  onChange: (settings: UserSettings | null) => void,
  onError?: (err: Error) => void
): () => void {
  const client = requireClient();
  const channel: RealtimeChannel = client
    .channel(`user_settings:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
      () => {
        fetchUserSettings(userId)
          .then(onChange)
          .catch((err) => onError?.(err));
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Realtime channel issue: ${status}`));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}
