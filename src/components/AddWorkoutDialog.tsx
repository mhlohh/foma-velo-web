import React, { useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { ActivityEntity } from '../types';

interface AddWorkoutDialogProps {
  onDismiss: () => void;
  onAdd: (workout: ActivityEntity) => void;
}

export const AddWorkoutDialog: React.FC<AddWorkoutDialogProps> = ({
  onDismiss,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [dayOffset, setDayOffset] = useState('2'); // default +2 days
  const [type, setType] = useState('Ride');
  const [durationMins, setDurationMins] = useState('75');
  const [tssText, setTssText] = useState('85');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;

    const offsetNum = parseInt(dayOffset, 10) || 0;
    const dateObj = new Date();
    dateObj.setHours(0, 0, 0, 0);
    dateObj.setDate(dateObj.getDate() + offsetNum);

    const durSec = (parseInt(durationMins, 10) || 60) * 60;
    const tssVal = parseInt(tssText, 10) || 50;

    const newWorkout: ActivityEntity = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      dateMillis: dateObj.getTime(),
      name: title.trim().startsWith('[PLANNED]') ? title.trim() : `[PLANNED] ${title.trim()}`,
      type,
      movingTimeSec: durSec,
      elapsedTimeSec: durSec,
      distanceMeters: durSec * 8, // ~28 km/h estimate
      elevationGainMeters: 200,
      stravaTss: tssVal,
      isPlanned: offsetNum >= 0,
      notes: notes.trim() || undefined,
    };

    onAdd(newWorkout);
    onDismiss();
  };

  return (
    <div
      data-testid="add_workout_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Plan Structured Workout</h3>
              <p className="text-xs text-slate-400">Add future training session</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              Workout Title *
            </label>
            <input
              data-testid="workout_title_field"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 4x8m VO2Max Intervals"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Target Date
              </label>
              <select
                data-testid="workout_offset_select"
                value={dayOffset}
                onChange={(e) => setDayOffset(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="0">Today</option>
                <option value="1">Tomorrow (+1d)</option>
                <option value="2">In 2 Days (+2d)</option>
                <option value="3">In 3 Days (+3d)</option>
                <option value="5">In 5 Days (+5d)</option>
                <option value="7">In 1 Week (+7d)</option>
                <option value="14">In 2 Weeks (+14d)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Type</label>
              <select
                data-testid="workout_type_select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="Ride">Outdoor Ride</option>
                <option value="VirtualRide">Virtual / Zwift</option>
                <option value="Gravel">Gravel Ride</option>
                <option value="Mountain Bike">Mountain Bike</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Duration (Mins)
              </label>
              <input
                data-testid="workout_duration_field"
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Planned TSS
              </label>
              <input
                data-testid="workout_tss_field"
                type="number"
                value={tssText}
                onChange={(e) => setTssText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              Pacing Notes
            </label>
            <textarea
              data-testid="workout_notes_field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Target 115% FTP during work efforts..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 h-16"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_workout_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700/60 rounded-xl border border-slate-700"
          >
            Cancel
          </button>

          <button
            data-testid="confirm_add_workout_btn"
            disabled={!title.trim()}
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl shadow-sm transition-all flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Workout
          </button>
        </div>
      </div>
    </div>
  );
};
