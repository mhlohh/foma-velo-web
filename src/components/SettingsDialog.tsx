import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { UserSettings } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className={`border rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Athlete Thresholds & Settings</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure training parameters
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

        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Set your FTP and LTHR to ensure accurate TSS, Training Stress Balance (TSB), and Power/HR zones calculations.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              FTP (Watts)
            </label>
            <input
              data-testid="setting_ftp_field"
              type="number"
              value={ftpText}
              onChange={(e) => setFtpText(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              LTHR (bpm)
            </label>
            <input
              data-testid="setting_lthr_field"
              type="number"
              value={lthrText}
              onChange={(e) => setLthrText(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Max HR (bpm)
            </label>
            <input
              data-testid="setting_maxhr_field"
              type="number"
              value={maxHrText}
              onChange={(e) => setMaxHrText(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Weight (kg)
            </label>
            <input
              data-testid="setting_weight_field"
              type="number"
              step="0.1"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_settings_btn"
            onClick={onDismiss}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border ${
              isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-700' : 'text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            data-testid="save_settings_btn"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-sm transition-all"
          >
            Save Thresholds
          </button>
        </div>
      </div>
    </div>
  );
};
