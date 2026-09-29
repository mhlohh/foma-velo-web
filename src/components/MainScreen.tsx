import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, Upload, Zap, Calendar, Search } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { ActivityEntity, CalculationMode, DailyPmcData, UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';
import { StravaCsvParser } from '../utils/stravaCsvParser';
import {
  loadStoredActivities,
  saveStoredActivities,
  loadStoredSettings,
  saveStoredSettings,
} from '../utils/storage';

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  fetchActivities,
  fetchUserSettings,
  subscribeToActivities,
  subscribeToSettings,
  upsertActivity,
  upsertActivities,
  deleteActivity as deleteActivityRemote,
  saveUserSettings,
} from '../lib/supabaseService';

import { useTheme } from '../context/ThemeContext';
import { TopNav, PageId } from './layout/TopNav';
import { SideRail } from './layout/SideRail';
import { LoginPage } from './pages/LoginPage';
import { ActivityListItem } from './ActivityListItem';
import { MetricsSummaryCards } from './MetricsSummaryCards';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { ImportCsvDialog } from './ImportCsvDialog';
import { SettingsDialog } from './SettingsDialog';
import { AddWorkoutDialog } from './AddWorkoutDialog';
import { TrainingZonesSheet } from './TrainingZonesSheet';
import { AiTrainingAnalysisModal } from './AiTrainingAnalysisModal';

export const MainScreen: React.FC = () => {
  const { toggleTheme } = useTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [hasConfiguredThresholds, setHasConfiguredThresholds] = useState<boolean>(() => {
    return localStorage.getItem('foma_velo_setup_done') === 'true';
  });

  const [activities, setActivities] = useState<ActivityEntity[]>(() => loadStoredActivities());
  const [settings, setSettings] = useState<UserSettings>(() => loadStoredSettings());

  // Navigation state
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  // Filters (dashboard list)
  const [selectedType] = useState<string | null>(null);
  const [horizonDays, setHorizonDays] = useState<number>(90);
  const [includePlanned] = useState<boolean>(true);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'strava' | 'manual' | 'planned'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDay, setSelectedDay] = useState<DailyPmcData | null>(null);

  // Dialogs
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false);
  const [showZonesSheet, setShowZonesSheet] = useState(false);
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);

  // ---------------------------------------------------------------
  // Supabase auth bootstrap
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!supabase) {
      setAuthInitialized(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthInitialized(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // localStorage backup
  useEffect(() => {
    saveStoredActivities(activities);
  }, [activities]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Realtime sync when authenticated
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    let cancelled = false;
    setIsSyncing(true);

    const loadInitial = async () => {
      try {
        const [remoteActivities, remoteSettings] = await Promise.all([
          fetchActivities(userId),
          fetchUserSettings(userId),
        ]);
        if (cancelled) return;

        if (remoteActivities.length > 0) {
          setActivities(remoteActivities);
          setHasConfiguredThresholds(true);
          localStorage.setItem('foma_velo_setup_done', 'true');
        } else if (activities.length > 0) {
          await upsertActivities(userId, activities);
        }

        if (remoteSettings) {
          setSettings(remoteSettings);
          setHasConfiguredThresholds(true);
          localStorage.setItem('foma_velo_setup_done', 'true');
        }
      } catch (err) {
        console.error('Initial Supabase sync failed:', err);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    loadInitial();

    const unsubActivities = subscribeToActivities(userId, (remote) => {
      if (remote.length > 0) {
        setActivities(remote);
      } else {
        setActivities((prev) => {
          if (prev.length > 0) {
            upsertActivities(userId, prev).catch(() => {});
          }
          return prev;
        });
      }
    });

    const unsubSettings = subscribeToSettings(userId, (remoteSettings) => {
      if (remoteSettings) {
        setSettings(remoteSettings);
        setHasConfiguredThresholds(true);
        localStorage.setItem('foma_velo_setup_done', 'true');
      }
    });

    return () => {
      cancelled = true;
      unsubActivities();
      unsubSettings();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // ---------------------------------------------------------------
  // Computed data & Handlers
  // ---------------------------------------------------------------
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (!includePlanned && act.isPlanned) return false;
      if (sourceFilter === 'strava' && !act.stravaActivityId) return false;
      if (
        sourceFilter === 'manual' &&
        (!act.isManual && (act.stravaActivityId || act.isPlanned))
      )
        return false;
      if (sourceFilter === 'planned' && !act.isPlanned) return false;
      if (selectedType && act.type.toLowerCase() !== selectedType.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = act.name.toLowerCase().includes(q);
        const typeMatch = act.type.toLowerCase().includes(q);
        if (!nameMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [activities, includePlanned, sourceFilter, selectedType, searchQuery]);

  const pmcSummary = useMemo(() => {
    return PmcEngine.computePmc(filteredActivities, settings, 30);
  }, [filteredActivities, settings]);

  const displayActivityList = useMemo(() => {
    return [...filteredActivities].sort((a, b) => b.dateMillis - a.dateMillis);
  }, [filteredActivities]);

  const completedCount = useMemo(
    () => activities.filter((a) => !a.isPlanned).length,
    [activities]
  );
  const plannedCount = useMemo(
    () => activities.filter((a) => a.isPlanned).length,
    [activities]
  );

  const handleImportCsv = async (csvText: string) => {
    const imported = StravaCsvParser.parseCsv(csvText);
    if (imported.length > 0) {
      setActivities(imported);
      if (session?.user) {
        setIsSyncing(true);
        try {
          await upsertActivities(session.user.id, imported);
        } finally {
          setIsSyncing(false);
        }
      }
    }
  };

  const handleAddWorkout = async (workout: ActivityEntity) => {
    setActivities((prev) => [workout, ...prev]);
    if (session?.user) {
      setIsSyncing(true);
      try {
        await upsertActivity(session.user.id, workout);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleModeChanged = async (mode: CalculationMode) => {
    const updated = { ...settings, calculationMode: mode };
    setSettings(updated);
    if (session?.user) {
      await saveUserSettings(session.user.id, updated, true);
    }
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (session?.user) {
      await saveUserSettings(session.user.id, newSettings, true);
    }
  };

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setHasConfiguredThresholds(false);
    localStorage.removeItem('foma_velo_setup_done');
  }, []);

  // ---------------------------------------------------------------
  // Render gates
  // ---------------------------------------------------------------
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono bg-[var(--bg-canvas)] text-[var(--text-muted)]">
        Initializing workspace...
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6">
        <div className="max-w-md ff-surface-card rounded-xl p-6 text-center space-y-3">
          <h1 className="text-base font-bold text-[var(--accent-text)]">Supabase not configured</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Add <code className="font-mono text-[var(--text-primary)]">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono text-[var(--text-primary)]">VITE_SUPABASE_ANON_KEY</code> to
            your <code className="font-mono text-[var(--text-primary)]">.env</code> file, then
            restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  if (!hasConfiguredThresholds) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-6">
        <div className="max-w-md ff-surface-card rounded-xl p-6 text-center space-y-3">
          <h1 className="text-base font-bold text-[var(--accent-text)]">Thresholds required</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Complete the threshold setup to unlock your PMC dashboard and activity history.
          </p>
        </div>
      </div>
    );
  }

  const user = session.user;

  const displayName: string | null =
    user.user_metadata?.['full_name'] ??
    user.user_metadata?.['name'] ??
    user.email?.split('@')[0] ??
    null;
  const avatarUrl: string | null =
    user.user_metadata?.['avatar_url'] ?? user.user_metadata?.['picture'] ?? null;

  const handleDeleteActivity = async (id: number): Promise<void> => {
    setActivities((prev) => prev.filter((act) => act.id !== id));
    if (session?.user) {
      setIsSyncing(true);
      try {
        await deleteActivityRemote(session.user.id, id);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors">
      {/* Left Sidebar */}
      <SideRail
        activePage={activePage}
        onDashboard={() => setActivePage('dashboard')}
        onCalendar={() => setActivePage('calendar')}
        onImport={() => setShowImportDialog(true)}
        onSettings={() => setShowSettingsDialog(true)}
        onToggleTheme={() => toggleTheme()}
        onSignOut={handleSignOut}
        onPlanWorkout={() => setShowAddWorkoutDialog(true)}
        onZones={() => setShowZonesSheet(true)}
        onAiCoach={() => setShowAiAnalysisModal(true)}
        activityCount={completedCount}
        plannedCount={plannedCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNav
          activePage={activePage}
          onNavigate={(page) => setActivePage(page as PageId)}
          user={{ displayName, email: user.email, avatarUrl }}
          isSyncing={isSyncing}
          onSignOut={handleSignOut}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onQuickAddWorkout={() => setShowAddWorkoutDialog(true)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          {/* Minimalist Quick Action Toolbar */}
          <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
            {/* Calculation Mode Pills (Auto / Power / HR) */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
              {(
                [
                  { mode: CalculationMode.AUTO, label: 'Auto TSS' },
                  { mode: CalculationMode.POWER, label: 'Power' },
                  { mode: CalculationMode.HEART_RATE, label: 'Heart Rate' },
                ] as const
              ).map(({ mode, label }) => {
                const active = settings.calculationMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChanged(mode)}
                    className={`relative px-2.5 py-1 rounded-md font-medium transition-colors ${
                      active
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="calc-mode-pill"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="absolute inset-0 rounded-md bg-[var(--bg-pill)] -z-10"
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                data-testid="import_csv_btn"
                onClick={() => setShowImportDialog(true)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                title="Import Strava CSV"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="hidden sm:inline">Import CSV</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                data-testid="btn_training_zones"
                onClick={() => setShowZonesSheet(true)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                title="Training Zones"
              >
                <Zap className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span className="hidden sm:inline">Zones</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                data-testid="ai_coach_btn"
                onClick={() => setShowAiAnalysisModal(true)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                title="AI Training Coach & Analysis"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span className="hidden sm:inline">AI Coach</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                data-testid="add_workout_btn"
                onClick={() => setShowAddWorkoutDialog(true)}
                className="ff-btn-sage px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                title="Plan Workout"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plan Workout</span>
              </motion.button>
            </div>
          </div>

          {/* Animated Page View Switcher */}
          <AnimatePresence mode="wait">
            {activePage === 'calendar' ? (
              <motion.div
                key="page-calendar"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <CalendarPage
                  activities={activities}
                  settings={settings}
                  onImportClick={() => setShowImportDialog(true)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="page-dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <MetricsSummaryCards
                  summary={pmcSummary}
                  onOpenAiAnalysis={() => setShowAiAnalysisModal(true)}
                />

                <DashboardPage
                  summary={pmcSummary}
                  activities={activities}
                  settings={settings}
                  horizonDays={horizonDays}
                  onHorizonChange={setHorizonDays}
                  selectedDay={selectedDay}
                  onDaySelected={setSelectedDay}
                  onImportClick={() => setShowImportDialog(true)}
                  onAiClick={() => setShowAiAnalysisModal(true)}
                />

                {/* Activity History & Minimalist Search/Filter Bar */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--accent-text)]" />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Activity History & Planned Workouts
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                        {displayActivityList.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Source filter pills */}
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
                        {(
                          [
                            { id: 'all', label: 'All' },
                            { id: 'strava', label: 'Strava' },
                            { id: 'manual', label: 'Manual' },
                            { id: 'planned', label: 'Planned' },
                          ] as const
                        ).map(({ id, label }) => {
                          const active = sourceFilter === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSourceFilter(id)}
                              className={`relative px-2.5 py-1 rounded-md font-medium transition-colors ${
                                active
                                  ? 'text-[var(--bg-canvas)] font-semibold'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="source-filter-pill"
                                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  className="absolute inset-0 rounded-md bg-[var(--text-primary)] -z-10"
                                />
                              )}
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Search input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter rides..."
                          className="pl-8 pr-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-focus)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-40 sm:w-48 transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddWorkoutDialog(true)}
                        className="text-xs font-medium text-[var(--accent-text)] hover:underline flex items-center gap-1 ml-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Workout
                      </button>
                    </div>
                  </div>

                  {displayActivityList.length === 0 ? (
                    <div className="ff-surface-card rounded-xl p-8 text-center space-y-2.5">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        No activities found
                      </p>
                      <p className="text-xs max-w-sm mx-auto text-[var(--text-muted)]">
                        Try adjusting your search query, source filter, or import your Strava
                        activities.csv dataset.
                      </p>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowImportDialog(true)}
                          className="ff-btn-sage px-3.5 py-1.5 text-xs font-semibold rounded-lg"
                        >
                          Import CSV
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.div layout className="space-y-2">
                      <AnimatePresence initial={false}>
                        {displayActivityList.map((activity, index) => (
                          <ActivityListItem
                            key={`${activity.id}-${activity.dateMillis}-${index}`}
                            activity={activity}
                            settings={settings}
                            onDelete={handleDeleteActivity}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Dialogs with AnimatePresence */}
      <AnimatePresence>
        {showImportDialog && (
          <ImportCsvDialog
            onDismiss={() => setShowImportDialog(false)}
            onImport={handleImportCsv}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettingsDialog && (
          <SettingsDialog
            currentSettings={settings}
            onDismiss={() => setShowSettingsDialog(false)}
            onSave={handleSaveSettings}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddWorkoutDialog && (
          <AddWorkoutDialog
            onDismiss={() => setShowAddWorkoutDialog(false)}
            onAdd={handleAddWorkout}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showZonesSheet && (
          <TrainingZonesSheet
            settings={settings}
            onDismiss={() => setShowZonesSheet(false)}
          />
        )}
      </AnimatePresence>
      {showAiAnalysisModal && (
        <AiTrainingAnalysisModal
          isOpen={showAiAnalysisModal}
          onClose={() => setShowAiAnalysisModal(false)}
          summary={pmcSummary}
          activities={activities}
          settings={settings}
          selectedDay={selectedDay}
        />
      )}
    </div>
  );
};
