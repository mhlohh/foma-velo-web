import React, { useState } from 'react';
import { Calendar, Plus, X, Zap, Clock } from 'lucide-react';
import { ActivityEntity } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AddWorkoutDialogProps {
  onDismiss: () => void;
  onAdd: (workout: ActivityEntity) => void;
}

export const AddWorkoutDialog: React.FC<AddWorkoutDialogProps> = ({
  onDismiss,
  onAdd,
}) => {
  const { isDark } = useTheme();

  const [entryMode, setEntryMode] = useState<'manual' | 'planned'>('manual');

  const [title, setTitle] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dayOffset, setDayOffset] = useState('2');
  const [type, setType] = useState('Ride');
  const [durationMins, setDurationMins] = useState('60');
  const [tssText, setTssText] = useState('75');
  const [distanceKm, setDistanceKm] = useState('');
  const [elevationM, setElevationM] = useState('');
  const [avgWatts, setAvgWatts] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [notes, setNotes] = useState('');

  const inputCls = `w-full border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#2f6fe4] ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  const handleCreate = () => {
    if (!title.trim()) return;

    let dateMillis = Date.now();
    let isPlanned = false;

    if (entryMode === 'planned') {
      const offsetNum = parseInt(dayOffset, 10) || 0;
      const dateObj = new Date();
      dateObj.setHours(0, 0, 0, 0);
      dateObj.setDate(dateObj.getDate() + offsetNum);
      dateMillis = dateObj.getTime();
      isPlanned = true;
    } else {
      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map((n) => parseInt(n, 10));
        const dt = new Date(y, m - 1, d, 12, 0, 0);
        dateMillis = dt.getTime();
        const nowZero = new Date();
        nowZero.setHours(23, 59, 59, 999);
        if (dateMillis > nowZero.getTime()) {
          isPlanned = true;
        }
      }
    }

    const durSec = (parseInt(durationMins, 10) || 60) * 60;
    const tssVal = Math.max(0, parseInt(tssText, 10) || 0);
    const distMeters = (parseFloat(distanceKm) || 0) * 1000;
    const elevGain = parseInt(elevationM, 10) || 0;
    const watts = parseInt(avgWatts, 10) || null;
    const hr = parseInt(avgHr, 10) || null;

    let formattedName = title.trim();
    if (isPlanned && !formattedName.startsWith('[PLANNED]')) {
      formattedName = `[PLANNED] ${formattedName}`;
    }

    const newWorkout: ActivityEntity = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      dateMillis,
      name: formattedName,
      type,
      movingTimeSec: durSec,
      elapsedTimeSec: durSec,
      distanceMeters: distMeters > 0 ? distMeters : durSec * 7.5,
      elevationGainMeters: elevGain,
      avgWatts: watts,
      weightedWatts: watts ? Math.round(watts * 1.05) : null,
      avgHr: hr,
      stravaTss: tssVal,
      isPlanned,
      isManual: true,
      notes: notes.trim() || undefined,
    };

    onAdd(newWorkout);
    onDismiss();
  };

  return (
    <div
      data-testid="add_workout_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className={`border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#eef3fd] text-[#2f6fe4] dark:bg-[#eef3fd]/10 dark:text-[#5b8def] flex items-center justify-center">
              {entryMode === 'manual' ? <Zap className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                {entryMode === 'manual' ? 'Manual TSS & Activity Entry' : 'Plan Structured Workout'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {entryMode === 'manual' ? 'Log completed session with custom TSS' : 'Schedule future training session'}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className={`p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg border ${
          isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            data-testid="mode_tab_manual"
            onClick={() => setEntryMode('manual')}
            className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              entryMode === 'manual'
                ? 'bg-[#2f6fe4] text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Manual TSS Entry
          </button>
          <button
            type="button"
            data-testid="mode_tab_planned"
            onClick={() => setEntryMode('planned')}
            className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              entryMode === 'planned'
                ? 'bg-[#2f6fe4] text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Plan Future
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Workout Title / Name *
            </label>
            <input
              data-testid="workout_title_field"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={entryMode === 'manual' ? 'e.g. Afternoon Endurance Ride' : 'e.g. 4x8m VO2Max Intervals'}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Date *
              </label>
              {entryMode === 'manual' ? (
                <input
                  data-testid="workout_date_picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={inputCls}
                />
              ) : (
                <select
                  data-testid="workout_offset_select"
                  value={dayOffset}
                  onChange={(e) => setDayOffset(e.target.value)}
                  className={inputCls}
                >
                  <option value="0">Today</option>
                  <option value="1">Tomorrow (+1d)</option>
                  <option value="2">In 2 Days (+2d)</option>
                  <option value="3">In 3 Days (+3d)</option>
                  <option value="5">In 5 Days (+5d)</option>
                  <option value="7">In 1 Week (+7d)</option>
                  <option value="14">In 2 Weeks (+14d)</option>
                </select>
              )}
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Activity Type
              </label>
              <select
                data-testid="workout_type_select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputCls}
              >
                <option value="Ride">Outdoor Ride</option>
                <option value="VirtualRide">Virtual / Zwift</option>
                <option value="Gravel">Gravel Ride</option>
                <option value="Mountain Bike">Mountain Bike</option>
                <option value="Run">Running</option>
                <option value="Workout">Gym / Strength</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Manual TSS Score *
              </label>
              <input
                data-testid="workout_tss_field"
                type="number"
                min="0"
                max="1000"
                value={tssText}
                onChange={(e) => setTssText(e.target.value)}
                placeholder="e.g. 85"
                className={`${inputCls} font-bold text-[#2f6fe4]`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Duration (Mins)
              </label>
              <input
                data-testid="workout_duration_field"
                type="number"
                min="1"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Optional Metrics for Manual Entry */}
          {entryMode === 'manual' && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 45"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Avg Power (W)
                </label>
                <input
                  type="number"
                  value={avgWatts}
                  onChange={(e) => setAvgWatts(e.target.value)}
                  placeholder="e.g. 210"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Avg HR (bpm)
                </label>
                <input
                  type="number"
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  placeholder="e.g. 152"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Session Notes / Pacing
            </label>
            <textarea
              data-testid="workout_notes_field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Felt strong during hill repeats..."
              className={`${inputCls} h-16 p-2.5`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_workout_btn"
            onClick={onDismiss}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
              isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-700' : 'text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            data-testid="confirm_add_workout_btn"
            disabled={!title.trim()}
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-[#2f6fe4] hover:bg-[#245cc4] rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {entryMode === 'manual' ? 'Save Manual Entry' : 'Schedule Workout'}
          </button>
        </div>
      </div>
    </div>
  );
};
