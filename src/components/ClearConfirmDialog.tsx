import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ClearConfirmDialogProps {
  onDismiss: () => void;
  onClear: () => void;
  onResetSample: () => void;
}

export const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  onDismiss,
  onClear,
  onResetSample,
}) => {
  return (
    <div
      data-testid="clear_confirm_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Clear Dataset?</h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Are you sure you want to clear all imported activities and workouts? You can also reload the preset 90-day sample dataset.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            data-testid="confirm_reset_sample_btn"
            onClick={() => {
              onResetSample();
              onDismiss();
            }}
            className="w-full py-2.5 text-xs font-bold text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-xl"
          >
            Reset to Sample Dataset
          </button>

          <button
            data-testid="confirm_clear_all_btn"
            onClick={() => {
              onClear();
              onDismiss();
            }}
            className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm"
          >
            Clear All Activities (Empty)
          </button>

          <button
            data-testid="cancel_clear_btn"
            onClick={onDismiss}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
