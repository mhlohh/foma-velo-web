import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Calendar,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  ActivityEntity,
  CalculationMode,
  DailyPmcData,
  UserSettings,
} from '../types';
import { PmcEngine } from '../utils/pmcEngine';
import { StravaCsvParser } from '../utils/stravaCsvParser';
import { generatePresetSampleData } from '../utils/sampleData';
import {
  loadStoredActivities,
  saveStoredActivities,
  loadStoredSettings,
  saveStoredSettings,
} from '../utils/storage';

import { auth, testFirestoreConnection } from '../lib/firebase';
import {
  subscribeToUserActivities,
  subscribeToUserSettings,
  saveActivityToFirestore,
  saveBatchActivitiesToFirestore,
  deleteActivityFromFirestore,
  clearAllActivitiesFromFirestore,
  saveUserSettingsToFirestore,
} from '../lib/firestoreService';

import { useTheme } from '../context/ThemeContext';
import { AuthBar } from './AuthBar';
import { LoginScreen } from './LoginScreen';
import { ThresholdAndDataSetup } from './ThresholdAndDataSetup';
import { MetricsSummaryCards } from './MetricsSummaryCards';
import { PmcChart } from './PmcChart';
import { FilterHeader } from './FilterHeader';
import { ActivityListItem } from './ActivityListItem';
import { ImportCsvDialog } from './ImportCsvDialog';
import { SettingsDialog } from './SettingsDialog';
import { AddWorkoutDialog } from './AddWorkoutDialog';
import { TrainingZonesSheet } from './TrainingZonesSheet';
import { ClearConfirmDialog } from './ClearConfirmDialog';
import { AiTrainingAnalysisModal } from './AiTrainingAnalysisModal';

export const MainScreen: React.FC = () => {
  const { isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Track if threshold setup & data configuration has been confirmed
  const [hasConfiguredThresholds, setHasConfiguredThresholds] = useState<boolean>(() => {
    return localStorage.getItem('foma_velo_setup_done') === 'true';
  });

  const [activities, setActivities] = useState<ActivityEntity[]>(() => loadStoredActivities());
  const [settings, setSettings] = useState<UserSettings>(() => loadStoredSettings());

  // Filter state
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedHorizonDays, setSelectedHorizonDays] = useState<number>(90);
  const [includePlanned, setIncludePlanned] = useState<boolean>(true);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'strava' | 'manual' | 'planned'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Day on PMC Chart
  const [selectedDay, setSelectedDay] = useState<DailyPmcData | null>(null);

  // Dialog Visibility
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false);
  const [showZonesSheet, setShowZonesSheet] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);

  // Monitor auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  // Test connection on mount
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Save changes to localStorage as secondary backup
  useEffect(() => {
    saveStoredActivities(activities);
  }, [activities]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Handle Firebase Real-time Synchronization when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncing(true);

    // 1. Subscribe to User Activities
    const unsubActivities = subscribeToUserActivities(
      currentUser.uid,
      (firestoreActivities) => {
        if (firestoreActivities.length > 0) {
          setActivities(firestoreActivities);
          setHasConfiguredThresholds(true);
          localStorage.setItem('foma_velo_setup_done', 'true');
        } else if (activities.length > 0) {
          saveBatchActivitiesToFirestore(currentUser.uid, activities);
        }
        setIsSyncing(false);
      },
      () => setIsSyncing(false)
    );

    // 2. Subscribe to User Settings
    const unsubSettings = subscribeToUserSettings(
      currentUser.uid,
      (firestoreSettings) => {
        if (firestoreSettings) {
          setSettings(firestoreSettings);
          setHasConfiguredThresholds(true);
          localStorage.setItem('foma_velo_setup_done', 'true');
        }
      },
      () => setIsSyncing(false)
    );

    return () => {
      if (unsubActivities) unsubActivities();
      if (unsubSettings) unsubSettings();
    };
  }, [currentUser]);

  // Setup completion handler from ThresholdAndDataSetup
  const handleSetupComplete = async (updatedSettings: UserSettings, initialActivities: ActivityEntity[]) => {
    setSettings(updatedSettings);
    setActivities(initialActivities);
    setHasConfiguredThresholds(true);
    localStorage.setItem('foma_velo_setup_done', 'true');

    if (currentUser) {
      setIsSyncing(true);
      await saveUserSettingsToFirestore(currentUser.uid, updatedSettings);
      if (initialActivities.length > 0) {
        await saveBatchActivitiesToFirestore(currentUser.uid, initialActivities);
      }
      setIsSyncing(false);
    }
  };

  // Compute available activity types
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.type) set.add(act.type);
    });
    return Array.from(set).sort();
  }, [activities]);

  // Filter activities for PMC Engine and list
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (!includePlanned && act.isPlanned) return false;

      // Source Filter
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

  // Compute PMC Summary
  const pmcSummary = useMemo(() => {
    return PmcEngine.computePmc(filteredActivities, settings, 30);
  }, [filteredActivities, settings]);

  // Sorted activities list for display
  const displayActivityList = useMemo(() => {
    return [...filteredActivities].sort((a, b) => b.dateMillis - a.dateMillis);
  }, [filteredActivities]);

  // Handlers with Firestore integration
  const handleImportCsv = async (csvText: string) => {
    const imported = StravaCsvParser.parseCsv(csvText);
    if (imported.length > 0) {
      setActivities(imported);
      if (currentUser) {
        setIsSyncing(true);
        await saveBatchActivitiesToFirestore(currentUser.uid, imported);
        setIsSyncing(false);
      }
    }
  };

  const handleAddWorkout = async (workout: ActivityEntity) => {
    setActivities((prev) => [workout, ...prev]);
    if (currentUser) {
      setIsSyncing(true);
      await saveActivityToFirestore(currentUser.uid, workout);
      setIsSyncing(false);
    }
  };

  const handleDeleteActivity = async (id: number) => {
    setActivities((prev) => prev.filter((act) => act.id !== id));
    if (currentUser) {
      setIsSyncing(true);
      await deleteActivityFromFirestore(currentUser.uid, id);
      setIsSyncing(false);
    }
  };

  const handleClearAll = async () => {
    const previous = [...activities];
    setActivities([]);
    if (currentUser) {
      setIsSyncing(true);
      await clearAllActivitiesFromFirestore(currentUser.uid, previous);
      setIsSyncing(false);
    }
  };

  const handleDeleteManualOnly = async () => {
    const manualAndPlannedIds = activities
      .filter((act) => act.isManual || act.isPlanned || !act.stravaActivityId)
      .map((act) => act.id);

    setActivities((prev) => prev.filter((act) => !manualAndPlannedIds.includes(act.id)));

    if (currentUser) {
      setIsSyncing(true);
      for (const id of manualAndPlannedIds) {
        await deleteActivityFromFirestore(currentUser.uid, id);
      }
      setIsSyncing(false);
    }
  };

  const handleResetSample = async () => {
    const sample = generatePresetSampleData();
    setActivities(sample);
    if (currentUser) {
      setIsSyncing(true);
      await saveBatchActivitiesToFirestore(currentUser.uid, sample);
      setIsSyncing(false);
    }
  };

  const handleModeChanged = async (mode: CalculationMode) => {
    const updated = { ...settings, calculationMode: mode };
    setSettings(updated);
    if (currentUser) {
      await saveUserSettingsToFirestore(currentUser.uid, updated);
    }
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (currentUser) {
      await saveUserSettingsToFirestore(currentUser.uid, newSettings);
    }
  };

  const handleUserChanged = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (!user) {
      // If user logs out, reset setup status for next user
      setHasConfiguredThresholds(false);
      localStorage.removeItem('foma_velo_setup_done');
    }
  }, []);

  // 1. Unauthenticated Gate
  if (!authInitialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center text-xs font-medium ${
        isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'
      }`}>
        Initializing authentication...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // 2. Threshold Settings & Data Setup Gate (if not yet configured)
  if (!hasConfiguredThresholds) {
    return (
      <ThresholdAndDataSetup
        currentUser={currentUser}
        currentSettings={settings}
        currentActivities={activities}
        onComplete={handleSetupComplete}
      />
    );
  }

  // 3. Full PMC Dashboard (Unlocked after login + threshold setup)
  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navigation Header */}
      <header className={`sticky top-0 z-30 border-b px-4 py-3 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Branding Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                Foma Velo
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  isDark ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}>
                  PMC 2.0
                </span>
              </h1>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cycling PMC & Strava Dataset Analytics
              </p>
            </div>
          </div>

          {/* Right Header Controls & Auth */}
          <div className="flex items-center gap-2 flex-wrap">
            <AuthBar onUserChanged={handleUserChanged} isSyncing={isSyncing} />

            <div className={`h-6 w-[1px] hidden sm:block mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                data-testid="ai_coach_btn"
                onClick={() => setShowAiAnalysisModal(true)}
                className="p-2 sm:px-3 sm:py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                title="AI Training Coach & Analysis"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Coach</span>
              </button>

              <button
                data-testid="btn_training_zones"
                onClick={() => setShowZonesSheet(true)}
                className={`p-2 sm:px-3 sm:py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Training Zones"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Zones</span>
              </button>

              <button
                data-testid="import_csv_btn"
                onClick={() => setShowImportDialog(true)}
                className={`p-2 sm:px-3 sm:py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Import Strava CSV"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>

              <button
                data-testid="add_workout_btn"
                onClick={() => setShowAddWorkoutDialog(true)}
                className="p-2 sm:px-3 sm:py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                title="Plan Workout"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plan Workout</span>
              </button>

              <button
                data-testid="settings_btn"
                onClick={() => setShowSettingsDialog(true)}
                className={`p-2 border rounded-xl transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                data-testid="clear_dataset_btn"
                onClick={() => setShowClearDialog(true)}
                className={`p-2 border rounded-xl transition-all ${
                  isDark
                    ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border-slate-700'
                    : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 shadow-sm'
                }`}
                title="Clear or Reset Dataset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Top PMC Metrics Cards */}
        <MetricsSummaryCards
          summary={pmcSummary}
          onOpenAiAnalysis={() => setShowAiAnalysisModal(true)}
        />

        {/* Interactive PMC Chart */}
        <PmcChart
          dailyList={pmcSummary.dailyList}
          selectedDay={selectedDay}
          horizonDays={selectedHorizonDays}
          onDaySelected={setSelectedDay}
        />

        {/* Filter Header */}
        <FilterHeader
          settings={settings}
          selectedType={selectedType}
          selectedHorizonDays={selectedHorizonDays}
          includePlanned={includePlanned}
          sourceFilter={sourceFilter}
          searchQuery={searchQuery}
          availableTypes={availableTypes}
          onModeChanged={handleModeChanged}
          onTypeChanged={setSelectedType}
          onHorizonChanged={setSelectedHorizonDays}
          onIncludePlannedChanged={setIncludePlanned}
          onSourceFilterChanged={setSourceFilter}
          onSearchChanged={setSearchQuery}
        />

        {/* Activities List Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Activity History & Planned Workouts ({displayActivityList.length})
            </h3>

            <button
              onClick={() => setShowAddWorkoutDialog(true)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Workout
            </button>
          </div>

          {displayActivityList.length === 0 ? (
            <div className={`border rounded-2xl p-8 text-center space-y-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <p className="text-sm font-semibold">No activities found</p>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Try adjusting your search query, type filters, or import your Strava activities.csv dataset.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl"
                >
                  Import CSV
                </button>
                <button
                  onClick={handleResetSample}
                  className={`px-3 py-1.5 text-xs font-bold border rounded-xl ${
                    isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  Load Sample Data
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
      </main>

      {/* Footer */}
      <footer className={`border-t py-4 px-4 text-center text-xs ${
        isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
      }`}>
        Foma Velo Cycling Performance Management System • Form = CTL - ATL • Coggan & Friel Training Metrics
      </footer>

      {/* Modals & Dialogs */}
      {showImportDialog && (
        <ImportCsvDialog
          onDismiss={() => setShowImportDialog(false)}
          onImport={handleImportCsv}
        />
      )}

      {showSettingsDialog && (
        <SettingsDialog
          currentSettings={settings}
          onDismiss={() => setShowSettingsDialog(false)}
          onSave={handleSaveSettings}
        />
      )}

      {showAddWorkoutDialog && (
        <AddWorkoutDialog
          onDismiss={() => setShowAddWorkoutDialog(false)}
          onAdd={handleAddWorkout}
        />
      )}

      {showZonesSheet && (
        <TrainingZonesSheet
          settings={settings}
          onDismiss={() => setShowZonesSheet(false)}
        />
      )}

      {showClearDialog && (
        <ClearConfirmDialog
          onDismiss={() => setShowClearDialog(false)}
          onClear={handleClearAll}
          onDeleteManualOnly={handleDeleteManualOnly}
          onResetSample={handleResetSample}
        />
      )}

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
