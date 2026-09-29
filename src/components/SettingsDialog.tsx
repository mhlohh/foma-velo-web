import React, { useState } from 'react';
import { motion } from 'motion/react';
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

  const inputCls =
    'w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent-focus)] transition-colors';

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      data-testid="settings_dialog"
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
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Athlete Thresholds & Settings</h3>
              <p className="text-xs text-[var(--text-muted)]">Configure physiological parameters</p>
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

        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          Set your FTP and LTHR to ensure accurate TSS, Training Stress Balance (TSB), and
          Power/HR zone calculations.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
              FTP (Watts)
            </label>
            <input
              data-testid="setting_ftp_field"
              type="number"
              value={ftpText}
              onChange={(e) => setFtpText(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
              LTHR (bpm)
            </label>
            <input
              data-testid="setting_lthr_field"
              type="number"
              value={lthrText}
              onChange={(e) => setLthrText(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
              Max HR (bpm)
            </label>
            <input
              data-testid="setting_maxhr_field"
              type="number"
              value={maxHrText}
              onChange={(e) => setMaxHrText(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block text-[var(--text-secondary)]">
              Weight (kg)
            </label>
            <input
              data-testid="setting_weight_field"
              type="number"
              step="0.1"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            data-testid="cancel_settings_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            data-testid="save_settings_btn"
            onClick={handleSave}
            className="ff-btn-sage px-4 py-2 text-xs font-semibold rounded-lg"
          >
            Save Thresholds
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
