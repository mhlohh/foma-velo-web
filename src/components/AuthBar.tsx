import React, { useState } from 'react';
import { LogOut, RefreshCw, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface AuthBarProps {
  onUserChanged?: (user: { uid: string; displayName: string | null; email: string | null; avatarUrl: string | null } | null) => void;
  isSyncing?: boolean;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onUserChanged, isSyncing = false }) => {
  const { isDark } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      onUserChanged?.(null);
    } catch (err) {
      console.error('Sign-Out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
        }`}
        title="Sign out"
        data-testid="auth_signout_btn"
      >
        {signingOut ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
      </button>

      <span
        className={`hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
          isSyncing
            ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800'
            : 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800'
        }`}
        title={isSyncing ? 'Syncing with Supabase' : 'All changes saved to Supabase'}
      >
        {isSyncing ? (
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <Cloud className="w-2.5 h-2.5" />
        )}
        {isSyncing ? 'Syncing' : 'Synced'}
      </span>
    </div>
  );
};
