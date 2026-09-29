import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sun,
  Moon,
  ShieldCheck,
  BarChart3,
  Zap,
  Upload,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = supabase !== null;

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart the server.'
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      console.warn('Google login failed:', err);
      setError(err?.message || 'Failed to start Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[var(--bg-canvas)] text-[var(--text-primary)] relative transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-[var(--accent-text)]" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          )}
          <span>{isDark ? 'White Theme' : 'Black Theme'}</span>
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-md ff-surface-card rounded-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Logo and Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-brand text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              FomaVelo
            </span>
            <span className="ff-badge text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
              PMC 2.0
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Minimalist Cycling Performance Management Chart, Strava dataset analytics, and Coggan
            training stress balance workspace.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              icon: BarChart3,
              title: 'PMC Engine',
              desc: 'Fitness, Fatigue & Form',
            },
            {
              icon: Zap,
              title: 'Thresholds',
              desc: 'Power FTP & LTHR zones',
            },
            {
              icon: Upload,
              title: 'Strava CSV',
              desc: 'Direct archive import',
            },
            {
              icon: Cloud,
              title: 'Cloud Sync',
              desc: 'Realtime Supabase storage',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-start gap-2.5"
            >
              <Icon className="w-4 h-4 text-[var(--accent-text)] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">{title}</h4>
                <p className="text-[11px] text-[var(--text-muted)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-1 space-y-3">
          {!configured && (
            <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] text-xs text-center">
              Supabase env vars missing — see <code>.env.example</code> and MIGRATION.md.
            </div>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            data-testid="login_google_btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="ff-btn-sage group w-full py-2.5 px-4 font-semibold rounded-xl flex items-center justify-center gap-2.5 disabled:opacity-60 text-xs sm:text-sm"
          >
            {loading ? (
              <span>Redirecting to Google...</span>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center">
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span>Workspace unlocks after sign-in & threshold setup.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
