import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, X, Zap, Clock } from 'lucide-react';
import { ActivityEntity } from '../types';

interface AddWorkoutDialogProps {
  onDismiss: () => void;
  onAdd: (workout: ActivityEntity) => void;
}

export const AddWorkoutDialog: React.FC<AddWorkoutDialogProps> = ({ onDismiss, onAdd }) => {
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

  const inputCls =
    'w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent-focus)] transition-colors';

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      data-testid="add_workout_dialog"
      style={{ backgroundColor: 'var(--bg-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="ff-surface-card rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-text)] flex items-center justify-center">
              {entryMode === 'manual' ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {entryMode === 'manual'
                  ? 'Manual TSS & Activity Entry'
                  : 'Plan Structured Workout'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {entryMode === 'manual'
                  ? 'Log completed session with custom TSS'
                  : 'Schedule future training session'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs with sliding layoutId pill */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <button
            type="button"
            data-testid="mode_tab_manual"
            onClick={() => setEntryMode('manual')}
            className={`relative py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              entryMode === 'manual'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {entryMode === 'manual' && (
              <motion.span
                layoutId="workout-mode-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-lg bg-[var(--bg-pill)] -z-10"
              />
            )}
            <Clock className="w-3.5 h-3.5" />
            Manual TSS Entry
          </button>
          <button
            type="button"
            data-testid="mode_tab_planned"
            onClick={() => setEntryMode('planned')}
            className={`relative py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              entryMode === 'planned'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {entryMode === 'planned' && (
              <motion.span
                layoutId="workout-mode-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-lg bg-[var(--bg-pill)] -z-10"
              />
            )}
            <Calendar className="w-3.5 h-3.5" />
            Plan Future
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
              Workout Title / Name *
            </label>
            <input
              data-testid="workout_title_field"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                entryMode === 'manual'
                  ? 'e.g. Afternoon Endurance Ride'
                  : 'e.g. 4x8m VO2Max Intervals'
              }
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
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
              <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
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
              <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
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
                className={`${inputCls} font-mono font-bold text-[var(--accent-text)]`}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
                Duration (Mins)
              </label>
              <input
                data-testid="workout_duration_field"
                type="number"
                min="1"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          {/* Optional Metrics for Manual Entry */}
          {entryMode === 'manual' && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-medium mb-1 block text-[var(--text-muted)]">
                  Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 45"
                  className={`${inputCls} font-mono`}
                />
              </div>

              <div>
                <label className="text-[10px] font-medium mb-1 block text-[var(--text-muted)]">
                  Avg Power (W)
                </label>
                <input
                  type="number"
                  value={avgWatts}
                  onChange={(e) => setAvgWatts(e.target.value)}
                  placeholder="e.g. 210"
                  className={`${inputCls} font-mono`}
                />
              </div>

              <div>
                <label className="text-[10px] font-medium mb-1 block text-[var(--text-muted)]">
                  Avg HR (bpm)
                </label>
                <input
                  type="number"
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  placeholder="e.g. 152"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
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
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            data-testid="cancel_workout_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            data-testid="confirm_add_workout_btn"
            disabled={!title.trim()}
            onClick={handleCreate}
            className="ff-btn-sage px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            {entryMode === 'manual' ? 'Save Manual Entry' : 'Schedule Workout'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
