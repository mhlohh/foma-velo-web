import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Plus,
  RotateCcw,
  Settings,
  Upload,
  Zap,
} from 'lucide-react';
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

import { MetricsSummaryCards } from './MetricsSummaryCards';
import { PmcChart } from './PmcChart';
import { FilterHeader } from './FilterHeader';
import { ActivityListItem } from './ActivityListItem';
import { ImportCsvDialog } from './ImportCsvDialog';
import { SettingsDialog } from './SettingsDialog';
import { AddWorkoutDialog } from './AddWorkoutDialog';
import { TrainingZonesSheet } from './TrainingZonesSheet';
import { ClearConfirmDialog } from './ClearConfirmDialog';

export const MainScreen: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEntity[]>(() => loadStoredActivities());
  const [settings, setSettings] = useState<UserSettings>(() => loadStoredSettings());

  // Filter state
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedHorizonDays, setSelectedHorizonDays] = useState<number>(90);
  const [includePlanned, setIncludePlanned] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Day on PMC Chart
  const [selectedDay, setSelectedDay] = useState<DailyPmcData | null>(null);

  // Dialog Visibility
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false);
  const [showZonesSheet, setShowZonesSheet] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Save changes
  useEffect(() => {
    saveStoredActivities(activities);
  }, [activities]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

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
      if (selectedType && act.type.toLowerCase() !== selectedType.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = act.name.toLowerCase().includes(q);
        const typeMatch = act.type.toLowerCase().includes(q);
        if (!nameMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [activities, includePlanned, selectedType, searchQuery]);

  // Compute PMC Summary
  const pmcSummary = useMemo(() => {
    return PmcEngine.computePmc(filteredActivities, settings, 30);
  }, [filteredActivities, settings]);

  // Sorted activities list for display
  const displayActivityList = useMemo(() => {
    return [...filteredActivities].sort((a, b) => b.dateMillis - a.dateMillis);
  }, [filteredActivities]);

  // Handlers
  const handleImportCsv = (csvText: string) => {
    const imported = StravaCsvParser.parseCsv(csvText);
    if (imported.length > 0) {
      setActivities(imported);
    }
  };

  const handleAddWorkout = (workout: ActivityEntity) => {
    setActivities((prev) => [workout, ...prev]);
  };

  const handleDeleteActivity = (id: number) => {
    setActivities((prev) => prev.filter((act) => act.id !== id));
  };

  const handleClearAll = () => {
    setActivities([]);
  };

  const handleResetSample = () => {
    const sample = generatePresetSampleData();
    setActivities(sample);
  };

  const handleModeChanged = (mode: CalculationMode) => {
    setSettings((prev) => ({ ...prev, calculationMode: mode }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Branding Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Foma Velo
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PMC 2.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Cycling PMC & Strava Dataset Analytics
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              data-testid="btn_training_zones"
              onClick={() => setShowZonesSheet(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Training Zones"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Zones</span>
            </button>

            <button
              data-testid="import_csv_btn"
              onClick={() => setShowImportDialog(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Import Strava CSV"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            <button
              data-testid="add_workout_btn"
              onClick={() => setShowAddWorkoutDialog(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Plan Workout"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plan Workout</span>
            </button>

            <button
              data-testid="settings_btn"
              onClick={() => setShowSettingsDialog(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              data-testid="clear_dataset_btn"
              onClick={() => setShowClearDialog(true)}
              className="p-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-xl transition-all"
              title="Clear or Reset Dataset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Top PMC Metrics Cards */}
        <MetricsSummaryCards summary={pmcSummary} />

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
          searchQuery={searchQuery}
          availableTypes={availableTypes}
          onModeChanged={handleModeChanged}
          onTypeChanged={setSelectedType}
          onHorizonChanged={setSelectedHorizonDays}
          onIncludePlannedChanged={setIncludePlanned}
          onSearchChanged={setSearchQuery}
        />

        {/* Activities List Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Activity History & Planned Workouts ({displayActivityList.length})
            </h3>

            <button
              onClick={() => setShowAddWorkoutDialog(true)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Workout
            </button>
          </div>

          {displayActivityList.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">No activities found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query, type filters, or import your Strava activities.csv dataset.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-3 py-1.5 text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 rounded-xl"
                >
                  Import CSV
                </button>
                <button
                  onClick={handleResetSample}
                  className="px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 rounded-xl"
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
      <footer className="border-t border-slate-800 py-4 px-4 text-center text-xs text-slate-500">
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
          onSave={(newSettings) => setSettings(newSettings)}
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
          onResetSample={handleResetSample}
        />
      )}
    </div>
  );
};
