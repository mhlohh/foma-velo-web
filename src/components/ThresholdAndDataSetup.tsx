import React, { useState } from 'react';
import {
  ActivityEntity,
  CalculationMode,
  CALCULATION_MODES,
  UserSettings,
} from '../types';
import { StravaCsvParser } from '../utils/stravaCsvParser';
import { generatePresetSampleData } from '../utils/sampleData';
import { Upload, Database, CheckCircle2, ArrowRight, Activity, Sliders, Shield, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThresholdAndDataSetupProps {
  currentUser: {
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  currentSettings: UserSettings;
  currentActivities: ActivityEntity[];
  onComplete: (updatedSettings: UserSettings, initialActivities: ActivityEntity[]) => void;
}

export const ThresholdAndDataSetup: React.FC<ThresholdAndDataSetupProps> = ({
  currentUser,
  currentSettings,
  currentActivities,
  onComplete,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const [ftp, setFtp] = useState<number>(currentSettings.ftp || 250);
  const [lthr, setLthr] = useState<number>(currentSettings.lthr || 168);
  const [maxHr, setMaxHr] = useState<number>(currentSettings.maxHr || 190);
  const [weightKg, setWeightKg] = useState<number>(currentSettings.weightKg || 72);
  const [calcMode, setCalcMode] = useState<CalculationMode>(currentSettings.calculationMode || CalculationMode.AUTO);

  const [dataOption, setDataOption] = useState<'sample' | 'csv' | 'keep' | 'empty'>(
    currentActivities.length > 0 ? 'keep' : 'sample'
  );
  const [csvText, setCsvText] = useState<string>('');
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleFinish = () => {
    setCsvError(null);
    let finalActivities: ActivityEntity[] = currentActivities;

    if (dataOption === 'sample') {
      finalActivities = generatePresetSampleData();
    } else if (dataOption === 'empty') {
      finalActivities = [];
    } else if (dataOption === 'csv') {
      if (!csvText.trim()) {
        setCsvError('Please paste CSV text or select another data option.');
        return;
      }
      const parsed = StravaCsvParser.parseCsv(csvText);
      if (parsed.length === 0) {
        setCsvError('Failed to parse CSV. Make sure it is a valid Strava activities.csv format.');
        return;
      }
      finalActivities = parsed;
    }

    const newSettings: UserSettings = {
      ...currentSettings,
      ftp,
      lthr,
      maxHr,
      weightKg,
      calculationMode: calcMode,
    };

    onComplete(newSettings, finalActivities);
  };

  const card = isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200';
  const subCard = isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Theme Toggle in top corner */}
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

      <div className={`w-full max-w-2xl border rounded-3xl p-6 sm:p-8 shadow-md space-y-6 transition-colors ${card}`}>
        {/* Welcome Header */}
        <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName || 'User'}
              className="w-12 h-12 rounded-2xl border border-[#2f6fe4]/40 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-[#0c1c3d] flex items-center justify-center font-bold text-white text-lg">
              {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold">
                Welcome, {currentUser.displayName || currentUser.email?.split('@')[0]}!
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Authenticated
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Configure your threshold settings and initial activity data to unlock your PMC dashboard.
            </p>
          </div>
        </div>

        {/* STEP 1: Threshold Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#2f6fe4] text-sm font-bold">
            <Sliders className="w-4 h-4" />
            <span>Step 1: Set Athlete Training Thresholds</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`border rounded-2xl p-3 ${subCard}`}>
              <label className="text-[11px] font-bold block mb-1">FTP (Watts)</label>
              <input
                data-testid="setup_ftp_input"
                type="number"
                value={ftp}
                onChange={(e) => setFtp(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className={`w-full border rounded-xl px-2.5 py-1.5 text-sm font-bold text-[#2f6fe4] focus:outline-none focus:border-[#2f6fe4] ${
                  isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
              <span className={`text-[9px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Functional Threshold Power
              </span>
            </div>

            <div className={`border rounded-2xl p-3 ${subCard}`}>
              <label className="text-[11px] font-bold block mb-1">LTHR (bpm)</label>
              <input
                data-testid="setup_lthr_input"
                type="number"
                value={lthr}
                onChange={(e) => setLthr(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className={`w-full border rounded-xl px-2.5 py-1.5 text-sm font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:border-[#2f6fe4] ${
                  isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
              <span className={`text-[9px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Lactate Threshold HR
              </span>
            </div>

            <div className={`border rounded-2xl p-3 ${subCard}`}>
              <label className="text-[11px] font-bold block mb-1">Max HR (bpm)</label>
              <input
                data-testid="setup_maxhr_input"
                type="number"
                value={maxHr}
                onChange={(e) => setMaxHr(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className={`w-full border rounded-xl px-2.5 py-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:border-[#2f6fe4] ${
                  isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
              <span className={`text-[9px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Maximum Heart Rate
              </span>
            </div>

            <div className={`border rounded-2xl p-3 ${subCard}`}>
              <label className="text-[11px] font-bold block mb-1">Weight (kg)</label>
              <input
                data-testid="setup_weight_input"
                type="number"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(Math.max(1, parseFloat(e.target.value) || 0))}
                className={`w-full border rounded-xl px-2.5 py-1.5 text-sm font-bold text-purple-600 dark:text-purple-300 focus:outline-none focus:border-[#2f6fe4] ${
                  isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
              <span className={`text-[9px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Athlete Body Mass
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className={`border rounded-2xl p-3 space-y-2 ${subCard}`}>
            <label className="text-xs font-bold block">TSS Calculation Engine Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(CALCULATION_MODES).map((modeObj) => (
                <button
                  key={modeObj.mode}
                  type="button"
                  onClick={() => setCalcMode(modeObj.mode)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    calcMode === modeObj.mode
                      ? 'bg-[#2f6fe4] text-white border-[#2f6fe4] shadow-sm'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{modeObj.label}</div>
                  <div className="text-[9px] opacity-80 mt-0.5 leading-tight">{modeObj.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 2: Activity Data Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2f6fe4] text-sm font-bold">
            <Database className="w-4 h-4" />
            <span>Step 2: Choose Activity Dataset</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {currentActivities.length > 0 && (
              <button
                type="button"
                onClick={() => setDataOption('keep')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  dataOption === 'keep'
                    ? 'bg-[#2f6fe4] text-white border-[#2f6fe4] shadow-sm'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <CheckCircle2 className={`w-4 h-4 ${dataOption === 'keep' ? 'text-white' : 'text-emerald-500'}`} />
                  <span>Keep Current Data ({currentActivities.length})</span>
                </div>
                <p className={`text-[11px] ${dataOption === 'keep' ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Retain existing activities in storage.
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDataOption('sample')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                dataOption === 'sample'
                  ? 'bg-[#2f6fe4] text-white border-[#2f6fe4] shadow-sm'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Activity className={`w-4 h-4 ${dataOption === 'sample' ? 'text-white' : 'text-[#2f6fe4]'}`} />
                <span>Preset Sample Dataset</span>
              </div>
              <p className={`text-[11px] ${dataOption === 'sample' ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                90 days of realistic rides to test PMC charts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDataOption('csv')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                dataOption === 'csv'
                  ? 'bg-[#2f6fe4] text-white border-[#2f6fe4] shadow-sm'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Upload className={`w-4 h-4 ${dataOption === 'csv' ? 'text-white' : 'text-purple-500'}`} />
                <span>Import Strava CSV</span>
              </div>
              <p className={`text-[11px] ${dataOption === 'csv' ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Paste raw Strava export activities.csv content.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDataOption('empty')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                dataOption === 'empty'
                  ? 'bg-[#2f6fe4] text-white border-[#2f6fe4] shadow-sm'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Zap className={`w-4 h-4 ${dataOption === 'empty' ? 'text-white' : 'text-amber-500'}`} />
                <span>Start Blank</span>
              </div>
              <p className={`text-[11px] ${dataOption === 'empty' ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Start with 0 activities and add workouts manually.
              </p>
            </button>
          </div>

          {/* CSV Input textarea if option is 'csv' */}
          {dataOption === 'csv' && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold block">
                Paste Strava activities.csv content:
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={4}
                placeholder="Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,..."
                className={`w-full border rounded-2xl p-3 text-xs font-mono focus:outline-none focus:border-[#2f6fe4] ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
              {csvError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-300 text-xs">
                  {csvError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Synced securely to Supabase</span>
          </div>

          <button
            data-testid="save_and_open_dashboard_btn"
            onClick={handleFinish}
            className="px-6 py-2.5 bg-[#2f6fe4] hover:bg-[#245cc4] text-white font-bold text-sm rounded-2xl shadow-sm flex items-center gap-2 transition-all"
          >
            <span>Save & Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
