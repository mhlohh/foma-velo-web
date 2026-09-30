import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  LogOut,
  Plus,
  Sparkles,
  Zap,
  ChevronDown,
  FolderKanban,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PageId } from './TopNav';

export interface SideRailProps {
  activePage?: PageId;
  onDashboard: () => void;
  onCalendar?: () => void;
  onStravaSync?: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onPlanWorkout?: () => void;
  onZones?: () => void;
  onAiCoach?: () => void;
  activityCount?: number;
  plannedCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SideRail: React.FC<SideRailProps> = ({
  activePage = 'dashboard',
  onDashboard,
  onCalendar,
  onStravaSync,
  onSettings,
  onToggleTheme,
  onSignOut,
  onPlanWorkout,
  onZones,
  onAiCoach,
  activityCount = 0,
  plannedCount = 0,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { isDark } = useTheme();
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);

  const navItems: {
    id: PageId;
    label: string;
    icon: React.ElementType;
    badge: number;
    onClick: () => void;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: activityCount,
      onClick: onDashboard,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
      badge: plannedCount,
      onClick: onCalendar ?? onDashboard,
    },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 228 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      data-siderail
      className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-col shrink-0 select-none border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] text-[var(--text-primary)] overflow-hidden z-20 transition-colors"
    >
      {/* Top Brand Header */}
      <div className="h-12 px-3.5 flex items-center justify-between shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {!collapsed ? (
            <motion.div
              key="brand-full"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-2 min-w-0"
            >
              <span className="font-brand text-[19px] font-bold tracking-tight text-[var(--text-primary)] truncate">
                FomaVelo
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="brand-mini"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.16 }}
              className="w-full flex items-center justify-center"
            >
              <span className="font-brand text-base font-bold text-[var(--accent-text)]">FV</span>
            </motion.div>
          )}
        </AnimatePresence>

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-4">
        <div className="space-y-0.5">
          {onPlanWorkout && (
            <motion.button
              type="button"
              whileHover={{ x: collapsed ? 0 : 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlanWorkout}
              title="Plan Workout"
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Plus className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              {!collapsed && <span className="truncate">Plan workout</span>}
            </motion.button>
          )}

          {!collapsed && (
            <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-medium tracking-wide text-[var(--text-muted)]">
              Workspace
            </div>
          )}

          {navItems.map(({ id, label, icon: Icon, badge, onClick }) => {
            const active = activePage === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileHover={{ x: collapsed ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                data-testid={`sidebar_nav_${id}`}
                title={label}
                className={`relative w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]/60'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-lg bg-[var(--bg-pill)] -z-10"
                  />
                )}
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </span>

                {!collapsed && (
                  <span className="ff-badge ml-2 px-2 py-0.2 rounded-full text-[10px] font-bold font-mono leading-4 transition-colors">
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}

          {onAiCoach && (
            <motion.button
              type="button"
              whileHover={{ x: collapsed ? 0 : 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAiCoach}
              title="AI Training Coach"
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]/60 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
              {!collapsed && <span className="truncate">AI Coach insights</span>}
            </motion.button>
          )}

          {onZones && (
            <motion.button
              type="button"
              whileHover={{ x: collapsed ? 0 : 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onZones}
              title="Training Zones"
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]/60 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Zap className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              {!collapsed && <span className="truncate">Training zones</span>}
            </motion.button>
          )}
        </div>

        {/* Projects / Data Tree Section */}
        {!collapsed && (
          <div className="pt-1 space-y-1">
            <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
              Training Data
            </div>

            <div>
              <button
                type="button"
                onClick={() => setToolsExpanded((v) => !v)}
                className="w-full flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <motion.span
                  animate={{ rotate: toolsExpanded ? 0 : -90 }}
                  transition={{ duration: 0.16 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </motion.span>
                <FolderKanban className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="truncate">strava_dataset</span>
              </button>

              <AnimatePresence initial={false}>
                {toolsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden pl-5 pr-1 pt-0.5 space-y-0.5"
                  >
                    {onStravaSync && (
                      <motion.button
                        type="button"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onStravaSync}
                        data-testid="sidebar_strava_sync"
                        className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium text-[var(--accent-text)] hover:bg-[var(--bg-card-hover)]/60 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        <span className="truncate">Strava Auto-Sync</span>
                      </motion.button>
                    )}

                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onSettings}
                      className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]/60 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="truncate">Thresholds (FTP/HR)</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setViewsExpanded((v) => !v)}
                className="w-full flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <motion.span
                  animate={{ rotate: viewsExpanded ? 0 : -90 }}
                  transition={{ duration: 0.16 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </motion.span>
                <FolderKanban className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="truncate">foma-velo-pmc</span>
              </button>

              <AnimatePresence initial={false}>
                {viewsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden pl-4 pr-1 pt-1"
                  >
                    <button
                      type="button"
                      onClick={
                        activePage === 'dashboard' ? onDashboard : (onCalendar ?? onDashboard)
                      }
                      className="w-full rounded-lg bg-[var(--bg-pill)] px-3 py-1.5 text-left text-[12px] font-medium text-[var(--text-primary)] truncate transition-colors hover:opacity-90"
                    >
                      {activePage === 'dashboard'
                        ? 'PMC Performance Chart'
                        : 'Training Calendar'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {collapsed && onStravaSync && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onStravaSync}
              data-testid="sidebar_strava_sync"
              title="Strava Auto-Sync"
              className="p-2 rounded-lg text-[var(--accent-text)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Utility Bar */}
      <div
        data-siderail-actions
        className={`border-t border-[var(--border-subtle)] px-3 py-2.5 flex items-center ${
          collapsed ? 'flex-col gap-2 justify-center' : 'justify-between'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'flex-col gap-1.5' : 'gap-1'}`}>
          {collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onSettings}
            data-testid="sidebar_settings"
            title="Settings & Thresholds"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            data-testid="sidebar_theme"
            title={isDark ? 'Switch to White Light Theme' : 'Switch to Pitch-Black Dark Theme'}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors flex items-center gap-1"
          >
            <motion.span
              key={isDark ? 'dark' : 'light'}
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[var(--accent-text)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-primary)]" />
              )}
            </motion.span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onSignOut}
            data-testid="sidebar_signout"
            title="Sign Out"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-2 py-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)] transition-colors"
            title={isDark ? 'Switch to Pure White theme' : 'Switch to Pitch Black theme'}
          >
            {isDark ? 'Black' : 'White'}
          </button>
        )}
      </div>
    </motion.aside>
  );
};
