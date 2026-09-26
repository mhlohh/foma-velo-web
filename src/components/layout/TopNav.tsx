import React from 'react';
import { CalendarDays, Home, LayoutDashboard, LogOut, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type PageId = 'home' | 'calendar' | 'dashboard';

interface TopNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  user: {
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  isSyncing: boolean;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export const TopNav: React.FC<TopNavProps> = ({
  activePage,
  onNavigate,
  user,
  isSyncing,
  onSignOut,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-[#0c1c3d] text-white shadow-md">
      <div className="flex items-center justify-between h-14 pl-4 pr-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#2f6fe4]" fill="currentColor" aria-hidden>
            <path d="M3 20 8 8l3.2 7L14 6l2.4 8L19 9l2 11h-2.4l-1-5.4-2.2 5.4h-2.2L11 12l-2.4 8H3z" />
          </svg>
          <span className="hidden sm:inline text-lg font-black tracking-tight select-none">FOMAVELO</span>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              data-testid={`nav_${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`px-4 py-2 rounded-md text-[15px] font-semibold transition-colors ${
                activePage === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile page tabs (icons only — text would overflow phones) */}
        <nav className="md:hidden flex items-center gap-0.5" aria-label="Pages">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-testid={`nav_${id}`}
              onClick={() => onNavigate(id)}
              aria-label={label}
              title={label}
              className={`p-2 rounded-md transition-colors ${
                activePage === id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          ))}
        </nav>
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          <span className="hidden lg:inline-flex items-center rounded-full bg-[#2f6fe4] text-white text-xs font-bold px-3.5 py-1.5">
            Coach
          </span>

          {user && (
            <div className="flex items-center gap-2">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white/30"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-[#2f6fe4] text-white text-xs font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'A')[0].toUpperCase()}
                </span>
              )}
              <span className="hidden sm:block text-sm font-bold">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </div>
          )}

          {/* Sync indicator (hidden on phones to save space) */}
          <span
            className="hidden sm:inline-flex p-1.5 rounded-md text-slate-300 hover:text-white"
            title={isSyncing ? 'Syncing with Supabase…' : 'Synced'}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </span>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            data-testid="theme_toggle_btn"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
            title={isDark ? 'Switch to light' : 'Switch to dark'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            data-testid="auth_signout_btn"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
