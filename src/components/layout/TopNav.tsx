import React from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  Plus,
  PanelLeft,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type PageId = 'calendar' | 'dashboard';

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
  onToggleSidebar?: () => void;
  onQuickAddWorkout?: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; tabTitle: string; icon: React.ElementType }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    tabTitle: 'Performance Dashboard',
    icon: LayoutDashboard,
  },
  { id: 'calendar', label: 'Calendar', tabTitle: 'Training Calendar', icon: CalendarDays },
];

export const TopNav: React.FC<TopNavProps> = ({
  activePage,
  onNavigate,
  user,
  isSyncing,
  onSignOut,
  onToggleSidebar,
  onQuickAddWorkout,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-11 bg-[var(--bg-sidebar)] text-[var(--text-primary)] border-b border-[var(--border-subtle)] transition-colors">
      <div className="flex items-center justify-between h-full px-3 gap-2">
        {/* Left: Sidebar toggle + Workspace Tabs */}
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:inline-flex p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
              title="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile brand */}
          <span className="lg:hidden font-brand text-sm font-bold tracking-tight mr-1.5">
            FomaVelo
          </span>

          {/* Workspace Tab Pills */}
          <nav className="flex items-center gap-1" aria-label="Workspace Tabs">
            {NAV_ITEMS.map(({ id, label, tabTitle, icon: Icon }) => {
              const active = activePage === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`nav_${id}`}
                  onClick={() => onNavigate(id)}
                  className={`relative px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="topnav-active-tab"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] -z-10"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tabTitle}</span>
                  <span className="sm:hidden">{label}</span>
                </button>
              );
            })}
          </nav>

          {onQuickAddWorkout && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={onQuickAddWorkout}
              title="Quick Plan / Log Workout"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        {/* Right: Sync indicator, Theme switcher, User & Sign out */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sync status */}
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--text-muted)]"
            title={isSyncing ? 'Syncing with Supabase…' : 'Workspace synced'}
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isSyncing ? 'animate-spin text-[#10b981]' : 'text-[var(--text-muted)]'
              }`}
            />
            <span className="hidden md:inline">{isSyncing ? 'Syncing' : 'Synced'}</span>
          </span>

          {/* Theme toggle button (Pitch Black <-> Pure White) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={toggleTheme}
            data-testid="theme_toggle_btn"
            className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
            title={isDark ? 'Switch to Pure White Light Theme' : 'Switch to Pitch Black Dark Theme'}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[var(--text-primary)]" />
            )}
            <span className="hidden sm:inline">{isDark ? 'Black' : 'White'}</span>
          </motion.button>

          {user && (
            <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-[var(--border-subtle)]">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-[var(--border-hover)]"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-[var(--bg-pill)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'A')[0].toUpperCase()}
                </span>
              )}
              <span className="hidden md:block text-xs font-medium text-[var(--text-secondary)] max-w-[120px] truncate">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </div>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onSignOut}
            data-testid="auth_signout_btn"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
};
