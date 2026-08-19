import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ClearConfirmDialogProps {
  onDismiss: () => void;
  onClear: () => void;
  onDeleteManualOnly: () => void;
  onResetSample: () => void;
}

export const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  onDismiss,
  onClear,
  onDeleteManualOnly,
  onResetSample,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      data-testid="clear_confirm_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className={`border rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-rose-950 text-rose-400' : 'bg-rose-50 text-rose-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Clear or Reset Dataset</h3>
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
          Choose an action to manage your activities dataset. You can delete only manual/planned entries, reset to sample dataset, or wipe all entries completely.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            data-testid="delete_manual_only_btn"
            onClick={() => {
              onDeleteManualOnly();
              onDismiss();
            }}
            className="w-full py-2.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900 rounded-xl shadow-sm transition-colors border border-amber-300 dark:border-amber-700"
          >
            Delete Manual & Planned Entries Only
          </button>

          <button
            data-testid="confirm_reset_sample_btn"
            onClick={() => {
              onResetSample();
              onDismiss();
            }}
            className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-colors ${
              isDark ? 'text-slate-100 bg-slate-700 hover:bg-slate-600 border-slate-600' : 'text-slate-800 bg-slate-100 hover:bg-slate-200 border-slate-300'
            }`}
          >
            Reset to Sample Dataset
          </button>

          <button
            data-testid="confirm_clear_all_btn"
            onClick={() => {
              onClear();
              onDismiss();
            }}
            className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors"
          >
            Clear All Activities (Empty)
          </button>

          <button
            data-testid="cancel_clear_btn"
            onClick={onDismiss}
            className={`w-full py-2 text-xs font-semibold ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
