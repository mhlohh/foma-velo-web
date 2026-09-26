import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Plus, RotateCcw, Settings, Sparkles, Upload, Zap, Calendar } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { ActivityEntity, CalculationMode, DailyPmcData, UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';
import { StravaCsvParser } from '../utils/stravaCsvParser';
import { generatePresetSampleData } from '../utils/sampleData';
import { loadStoredActivities, saveStoredActivities, loadStoredSettings, saveStoredSettings } from '../utils/storage';

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  fetchActivities,
  fetchUserSettings,
  subscribeToActivities,
  subscribeToSettings,
  upsertActivity,
  upsertActivities,
  deleteActivity as deleteActivityRemote,
  deleteActivities as deleteActivitiesRemote,
  deleteAllActivities,
  saveUserSettings,
} from '../lib/supabaseService';

import { useTheme } from '../context/ThemeContext';
import { TopNav, PageId } from './layout/TopNav';
import { SideRail, RailTool } from './layout/SideRail';
import { LoginPage } from './pages/LoginPage';
import { ActivityListItem } from './ActivityListItem';
import { MetricsSummaryCards } from './MetricsSummaryCards';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { HomePage } from './pages/home/HomePage';
import { ImportCsvDialog } from './ImportCsvDialog';
import { SettingsDialog } from './SettingsDialog';
import { AddWorkoutDialog } from './AddWorkoutDialog';
import { TrainingZonesSheet } from './TrainingZonesSheet';
import { AiTrainingAnalysisModal } from './AiTrainingAnalysisModal';

export const MainScreen: React.FC = () => {
  const { isDark } = useTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [hasConfiguredThresholds, setHasConfiguredThresholds] = useState<boolean>(() => {
    return localStorage.getItem('foma_velo_setup_done') === 'true';
  });

  const [activities, setActivities] = useState<ActivityEntity[]>(() => loadStoredActivities());
  const [settings, setSettings] = useState<UserSettings>(() => loadStoredSettings());

  // Navigation state
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [activeTool, setActiveTool] = useState<RailTool>('charts');

  // Filters (dashboard list)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [horizonDays, setHorizonDays] = useState<number>(90);
  const [includePlanned, setIncludePlanned] = useState<boolean>(true);
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
          // First login: push local data up
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
  // Handlers
  // ---------------------------------------------------------------
  const handleSetupComplete = async (
    updatedSettings: UserSettings,
    initialActivities: ActivityEntity[]
  ) => {
    setSettings(updatedSettings);
    setActivities(initialActivities);
    setHasConfiguredThresholds(true);
    localStorage.setItem('foma_velo_setup_done', 'true');

    if (session?.user) {
      setIsSyncing(true);
      try {
        await saveUserSettings(session.user.id, updatedSettings, true);
        if (initialActivities.length > 0) {
          await upsertActivities(session.user.id, initialActivities);
        }
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.type) set.add(act.type);
    });
    return Array.from(set).sort();
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (!includePlanned && act.isPlanned) return false;
      if (sourceFilter === 'strava' && !act.stravaActivityId) return false;
      if (sourceFilter === 'manual' && (!act.isManual && (act.stravaActivityId || act.isPlanned))) return false;
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
      <div className={`min-h-screen flex items-center justify-center text-xs font-medium ${
        isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'
      }`}>
        Initializing authentication...
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-6">
        <div className="max-w-md border border-amber-300 bg-amber-50 rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-amber-800">Supabase not configured</h1>
          <p className="text-xs text-amber-700 leading-relaxed">
            Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your <code className="font-mono">.env</code> file,
            then restart the dev server. See <strong>MIGRATION.md</strong> for the full setup guide.
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md border border-amber-300 bg-amber-50 rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-amber-800">Thresholds required</h1>
          <p className="text-xs text-amber-700 leading-relaxed">
            Complete the threshold setup to unlock your PMC dashboard and activity history.
          </p>
        </div>
      </div>
    );
  }

  const user = session.user;

  const displayName: string | null =
    user.user_metadata?.['full_name'] ?? user.user_metadata?.['name'] ?? user.email?.split('@')[0] ?? null;
  const avatarUrl: string | null = user.user_metadata?.['avatar_url'] ?? user.user_metadata?.['picture'] ?? null;

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
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <TopNav
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          if (page !== 'dashboard') setActiveTool('charts');
        }}
        user={{ displayName, email: user.email, avatarUrl }}
        isSyncing={isSyncing}
        onSignOut={handleSignOut}
      />

      <div className="flex flex-1 flex-col lg:flex-row lg:min-h-0">
        <SideRail activeTool={activeTool} onToolChange={setActiveTool} />

        {/* Mobile tool tabs (SideRail replacement) */}
        <div className="lg:hidden border-b w-full px-4 py-2 flex gap-2 overflow-x-auto">
          {(['charts', 'workouts', 'routes', 'plans'] as RailTool[]).map((tool) => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap capitalize ${
                activeTool === tool ? 'bg-[#2f6fe4] text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tool}
            </button>
          ))}
        </div>

        <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-x-hidden">
          {/* Quick action bar */}
          <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
            <button
              data-testid="import_csv_btn"
              onClick={() => setShowImportDialog(true)}
              className="p-2 sm:px-3 sm:py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-all"
              title="Import Strava CSV"
            >
              <Upload className="w-3.5 h-3.5 text-[#2f6fe4]" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            <button
              data-testid="add_workout_btn"
              onClick={() => setShowAddWorkoutDialog(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-[#2f6fe4] hover:bg-[#245cc4] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Plan Workout"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plan Workout</span>
            </button>

            <button
              data-testid="btn_training_zones"
              onClick={() => setShowZonesSheet(true)}
              className="p-2 sm:px-3 sm:py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-all"
              title="Training Zones"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Zones</span>
            </button>

            <button
              data-testid="ai_coach_btn"
              onClick={() => setShowAiAnalysisModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-[#0c1c3d] hover:bg-[#12295a] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              title="AI Training Coach & Analysis"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            <button
              data-testid="settings_btn"
              onClick={() => setShowSettingsDialog(true)}
              className="p-2 border rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>


          </div>

          {activePage === 'home' && (
            <HomePage
              summary={pmcSummary}
              activities={activities}
              userName={displayName}
              onAddWorkoutClick={() => setShowAddWorkoutDialog(true)}
              onImportClick={() => setShowImportDialog(true)}
            />
          )}

          {activePage === 'calendar' && (
            <CalendarPage
              activities={activities}
              settings={settings}
              onImportClick={() => setShowImportDialog(true)}
            />
          )}

          {activePage === 'dashboard' && (
            <>
              <MetricsSummaryCards
                summary={pmcSummary}
                onOpenAiAnalysis={() => setShowAiAnalysisModal(true)}
              />

              <div className="mt-4">
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
              </div>

              {/* Activity history */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2f6fe4]" />
                    Activity History & Planned Workouts ({displayActivityList.length})
                  </h3>
                  <button
                    onClick={() => setShowAddWorkoutDialog(true)}
                    className={`text-xs hover:underline font-semibold flex items-center gap-1 transition-colors ${
                      isDark ? 'text-[#7cabf5] hover:text-[#93c5fd]' : 'text-[#2f6fe4] hover:text-[#245cc4]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Workout
                  </button>
                </div>

                {displayActivityList.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center space-y-2 bg-white dark:bg-slate-800 dark:border-slate-700">
                    <p className="text-sm font-semibold">No activities found</p>
                    <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Try adjusting your search query, type filters, or import your Strava activities.csv dataset.
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      <button
                        onClick={() => setShowImportDialog(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#2f6fe4] hover:bg-[#245cc4] rounded-lg"
                      >
                        Import CSV
                      </button>

                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayActivityList.map((activity, index) => (
                      <ActivityListItem
                        key={`${activity.id}-${activity.dateMillis}-${index}`}
                        activity={activity}
                        settings={settings}
                        onDelete={handleDeleteActivity}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      {showImportDialog && (
        <ImportCsvDialog onDismiss={() => setShowImportDialog(false)} onImport={handleImportCsv} />
      )}
      {showSettingsDialog && (
        <SettingsDialog
          currentSettings={settings}
          onDismiss={() => setShowSettingsDialog(false)}
          onSave={handleSaveSettings}
        />
      )}
      {showAddWorkoutDialog && (
        <AddWorkoutDialog onDismiss={() => setShowAddWorkoutDialog(false)} onAdd={handleAddWorkout} />
      )}
      {showZonesSheet && <TrainingZonesSheet settings={settings} onDismiss={() => setShowZonesSheet(false)} />}
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
