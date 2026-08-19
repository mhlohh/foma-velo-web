import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Activity, ShieldCheck, Zap, Cloud, BarChart3, Upload, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 transition-colors ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-md space-y-6 transition-colors ${
        isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-600 text-white mb-1 shadow-sm">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center justify-center gap-2">
            Foma Velo
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
              isDark ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}>
              PMC 2.0
            </span>
          </h1>
          <p className={`text-xs sm:text-sm max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cycling Performance Management Chart, Strava dataset analytics, and Coggan training stress balance tracking.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className={`p-3 border rounded-2xl flex items-start gap-2.5 ${
            isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">PMC Engine</h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Fitness (CTL), Fatigue (ATL) & Form (TSB)
              </p>
            </div>
          </div>

          <div className={`p-3 border rounded-2xl flex items-start gap-2.5 ${
            isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">Thresholds</h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Power FTP, LTHR & custom zones
              </p>
            </div>
          </div>

          <div className={`p-3 border rounded-2xl flex items-start gap-2.5 ${
            isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">Strava CSV</h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Import activities dataset directly
              </p>
            </div>
          </div>

          <div className={`p-3 border rounded-2xl flex items-start gap-2.5 ${
            isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">Cloud Sync</h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Secure Firebase sync under account
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 space-y-3">
          <button
            data-testid="login_google_btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 text-sm"
          >
            {loading ? (
              <span>Connecting to Google...</span>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google to Open Dashboard</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          <div className={`flex items-center justify-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Dashboard unlocks after sign-in & threshold setup.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
