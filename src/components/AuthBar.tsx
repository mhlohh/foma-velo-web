import React, { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogOut, Cloud, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AuthBarProps {
  onUserChanged?: (user: User | null) => void;
  isSyncing?: boolean;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onUserChanged, isSyncing = false }) => {
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (onUserChanged) {
        onUserChanged(currentUser);
      }
    });

    return () => unsubscribe();
  }, [onUserChanged]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';

      // User closed popup or cancelled: expected user behavior
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled' ||
        message.includes('popup-closed-by-user') ||
        message.includes('cancelled-popup-request')
      ) {
        console.info('Google sign-in popup closed by user.');
        return;
      }

      if (code === 'auth/popup-blocked') {
        setAuthError('Sign-in pop-up was blocked. Please allow pop-ups and try again.');
        return;
      }

      console.warn('Google Sign-In failed:', err);
      setAuthError(message || 'Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-Out error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle Button */}
      <button
        type="button"
        data-testid="theme_toggle_btn"
        onClick={toggleTheme}
        className={`p-1.5 rounded-xl border transition-all ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
        }`}
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {loading ? (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
        }`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span>Checking Auth...</span>
        </div>
      ) : user ? (
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}>
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.email || 'User'}
              className="w-5 h-5 rounded-full object-cover border border-cyan-500/40"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center">
              {(user.displayName || user.email || 'G')[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex flex-col text-left">
            <span className="font-semibold text-[11px] leading-none max-w-[120px] sm:max-w-[160px] truncate">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-medium mt-0.5">
              {isSyncing ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-500" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  Firestore Synced
                </>
              )}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="ml-1 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
            title="Sign Out"
            data-testid="auth_signout_btn"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {authError && (
            <span className="text-[10px] text-rose-500 max-w-[140px] truncate" title={authError}>
              {authError}
            </span>
          )}
          <button
            onClick={handleSignIn}
            data-testid="auth_google_signin_btn"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in</span>
          </button>
        </div>
      )}
    </div>
  );
};
