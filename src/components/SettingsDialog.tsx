import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsDialogProps {
  currentSettings: UserSettings;
  onDismiss: () => void;
  onSave: (settings: UserSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  currentSettings,
  onDismiss,
  onSave,
}) => {
  const [ftpText, setFtpText] = useState(String(currentSettings.ftp));
  const [lthrText, setLthrText] = useState(String(currentSettings.lthr));
  const [maxHrText, setMaxHrText] = useState(String(currentSettings.maxHr));
  const [weightText, setWeightText] = useState(String(currentSettings.weightKg));

  const handleSave = () => {
    const newFtp = parseInt(ftpText, 10) || currentSettings.ftp;
    const newLthr = parseInt(lthrText, 10) || currentSettings.lthr;
    const newMaxHr = parseInt(maxHrText, 10) || currentSettings.maxHr;
    const newWeight = parseFloat(weightText) || currentSettings.weightKg;

    onSave({
      ...currentSettings,
      ftp: newFtp,
      lthr: newLthr,
      maxHr: newMaxHr,
      weightKg: newWeight,
    });
    onDismiss();
  };

  return (
    <div
      data-testid="settings_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Athlete Thresholds & Settings</h3>
              <p className="text-xs text-slate-400">Configure training parameters</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Set your FTP and LTHR to ensure accurate TSS, Training Stress Balance (TSB), and Power/HR zones calculations.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">FTP (Watts)</label>
            <input
              data-testid="setting_ftp_field"
              type="number"
              value={ftpText}
              onChange={(e) => setFtpText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">LTHR (bpm)</label>
            <input
              data-testid="setting_lthr_field"
              type="number"
              value={lthrText}
              onChange={(e) => setLthrText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Max HR (bpm)</label>
            <input
              data-testid="setting_maxhr_field"
              type="number"
              value={maxHrText}
              onChange={(e) => setMaxHrText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Weight (kg)</label>
            <input
              data-testid="setting_weight_field"
              type="number"
              step="0.1"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_settings_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700/60 rounded-xl border border-slate-700"
          >
            Cancel
          </button>

          <button
            data-testid="save_settings_btn"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-sm transition-all"
          >
            Save Thresholds
          </button>
        </div>
      </div>
    </div>
  );
};
