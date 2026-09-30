import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Cookie,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StravaConnectDialogProps {
  userId: string;
  onDismiss: () => void;
  onSynced?: () => void;
}

interface StravaConnectionStatus {
  connected: boolean;
  stravaEmail?: string | null;
  hasSessionCookies?: boolean;
  athleteId?: string | null;
  syncEnabled?: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: 'idle' | 'running' | 'success' | 'error';
  lastSyncError?: string | null;
  lastSyncedCount?: number;
  cronSchedule?: string;
  serviceOffline?: boolean;
  error?: string;
}

export const StravaConnectDialog: React.FC<StravaConnectDialogProps> = ({
  userId,
  onDismiss,
  onSynced,
}) => {
  const [status, setStatus] = useState<StravaConnectionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [authMethod, setAuthMethod] = useState<'cookie' | 'credentials'>('cookie');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [sessionCookie, setSessionCookie] = useState<string>('');
  const [syncEnabled, setSyncEnabled] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const getAuthHeaders = useCallback(async (): Promise<{
    headers: Record<string, string>;
    accessToken?: string;
  }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let accessToken: string | undefined;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      accessToken = data.session?.access_token;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
    return { headers, accessToken };
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const { headers } = await getAuthHeaders();
      const res = await fetch(`/api/strava/status/${encodeURIComponent(userId)}`, { headers });
      const data: StravaConnectionStatus = await res.json();
      setStatus(data);
      if (data.stravaEmail) setEmail(data.stravaEmail);
      if (typeof data.syncEnabled === 'boolean') setSyncEnabled(data.syncEnabled);
    } catch (err: any) {
      setStatus({
        connected: false,
        serviceOffline: true,
        error: err?.message || 'Unable to reach Strava Scraper microservice.',
      });
    } finally {
      setLoadingStatus(false);
    }
  }, [userId, getAuthHeaders]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (authMethod === 'credentials' && (!email.trim() || !password.trim())) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please enter both your Strava email and password.',
      });
      return;
    }

    if (authMethod === 'cookie' && !sessionCookie.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please paste your _strava4_session cookie value.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { headers, accessToken } = await getAuthHeaders();
      const res = await fetch('/api/strava/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          email: authMethod === 'credentials' ? email.trim() : undefined,
          password: authMethod === 'credentials' ? password : undefined,
          sessionCookie: authMethod === 'cookie' ? sessionCookie.trim() : undefined,
          supabaseAccessToken: accessToken,
          syncEnabled,
          triggerSync: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect and scrape Strava.');
      }

      setPassword('');
      setSessionCookie('');
      setFeedbackMsg({
        type: 'success',
        text: `Connected! Scraped ${data.pagesScraped ?? 1} page(s) and synced ${data.syncedCount ?? 0} cycling rides to Supabase.`,
      });
      await fetchStatus();
      onSynced?.();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to connect to Strava scraper microservice.',
      });
      await fetchStatus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncNow = async (fullHistory: boolean = false) => {
    setFeedbackMsg(null);
    setIsSyncingNow(true);
    try {
      const { headers, accessToken } = await getAuthHeaders();
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          fullHistory,
          supabaseAccessToken: accessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Strava scrape failed.');
      }
      setFeedbackMsg({
        type: 'success',
        text: `Sync complete! Scraped ${data.pagesScraped ?? 1} page(s) and synced ${data.syncedCount ?? 0} cycling activities to Supabase.`,
      });
      await fetchStatus();
      onSynced?.();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Strava sync failed.',
      });
      await fetchStatus();
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleToggleDailySync = async (nextVal: boolean) => {
    setSyncEnabled(nextVal);
    if (!status?.connected) return;
    try {
      const { headers, accessToken } = await getAuthHeaders();
      await fetch(`/api/strava/settings/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ syncEnabled: nextVal, supabaseAccessToken: accessToken }),
      });
      await fetchStatus();
    } catch {
      // ignore
    }
  };

  const handleDisconnect = async () => {
    setFeedbackMsg(null);
    try {
      const { headers } = await getAuthHeaders();
      const res = await fetch(`/api/strava/disconnect/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setEmail('');
        setPassword('');
        setSessionCookie('');
        setFeedbackMsg({ type: 'success', text: 'Strava account disconnected.' });
        await fetchStatus();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to disconnect.' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-backdrop)] backdrop-blur-xs"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-[var(--bg-card)] border border-[var(--border-hover)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle-bg)] border border-[var(--accent-subtle-border)] flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-[var(--accent-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Strava Daily Auto-Sync Microservice
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Automated Strava scraper · Syncs entire ride history into Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Microservice & Connection Status Banner */}
          {loadingStatus ? (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-text)]" />
              Checking Strava Scraper status...
            </div>
          ) : status?.serviceOffline ? (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <Unplug className="w-4 h-4 shrink-0" />
                Scraper Container Offline
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {status.error}
              </p>
            </div>
          ) : status?.connected ? (
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hover)] space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--accent-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Strava Connected
                  </span>
                  {status.stravaEmail && (
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      ({status.stravaEmail})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    disabled={isSyncingNow || status.lastSyncStatus === 'running'}
                    onClick={() => handleSyncNow(true)}
                    className="ff-btn-sage px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSyncingNow || status.lastSyncStatus === 'running' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Sync Full History
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="p-1.5 rounded-lg border border-[var(--border-hover)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                    title="Disconnect Strava"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                <div>
                  <div className="text-[var(--text-muted)]">Last Synced</div>
                  <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
                    {status.lastSyncAt
                      ? new Date(status.lastSyncAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Synced Rides</div>
                  <div className="font-mono font-semibold text-[var(--accent-text)] mt-0.5">
                    {status.lastSyncedCount ?? 0} rides
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Daily Schedule</div>
                  <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--accent-text)]" />
                    {status.cronSchedule || '0 2 * * *'}
                  </div>
                </div>
              </div>

              {status.lastSyncError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400">
                  Last error: {status.lastSyncError}
                </div>
              )}
            </div>
          ) : null}

          {/* Feedback banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-[var(--accent-subtle-bg)] border-[var(--accent-subtle-border)] text-[var(--text-primary)]'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--accent-text)] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Auth Method Switcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {status?.connected ? 'Update Strava Authentication' : 'Connect Strava Account'}
              </span>
              <div className="inline-flex p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setAuthMethod('cookie')}
                  className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    authMethod === 'cookie'
                      ? 'bg-[var(--bg-pill)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Cookie className="w-3 h-3" />
                  Session Cookie (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('credentials')}
                  className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    authMethod === 'credentials'
                      ? 'bg-[var(--bg-pill)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  Email & Password
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAndSync} className="space-y-3.5">
              {authMethod === 'cookie' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Strava <code className="font-mono text-[var(--text-primary)]">_strava4_session</code> Cookie
                  </label>
                  <input
                    type="password"
                    value={sessionCookie}
                    onChange={(e) => setSessionCookie(e.target.value)}
                    placeholder="Paste _strava4_session value from strava.com DevTools..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hover)] focus:border-[var(--accent-focus)] text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
                    <div className="font-semibold text-[var(--text-primary)]">
                      How to copy in 15 seconds (bypasses email OTP codes):
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Open your logged-in <strong>strava.com</strong> tab</li>
                      <li>Press <strong>Cmd + Option + I</strong> (Inspect) → <strong>Application</strong> tab</li>
                      <li>Click <strong>Cookies</strong> → <strong>https://www.strava.com</strong></li>
                      <li>Copy the <strong>Value</strong> of <code className="font-mono text-[var(--accent-text)]">_strava4_session</code> and paste above</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Strava Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="athlete@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hover)] focus:border-[var(--accent-focus)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Strava Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hover)] focus:border-[var(--accent-focus)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Daily auto-sync toggle */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Run Daily Automated Scrape (Docker Cron)
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Scrapes new rides once a day and handles rides without HR/Power gracefully
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => handleToggleDailySync(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent-text)] rounded cursor-pointer"
                />
              </label>

              <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                <span>
                  Credentials & cookies are encrypted at rest with <strong>AES-256-GCM</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3.5 py-2 rounded-lg border border-[var(--border-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Close
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  className="ff-btn-sage px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting & Scraping...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Save & Sync Now
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
