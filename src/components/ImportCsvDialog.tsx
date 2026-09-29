import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, FolderOpen } from 'lucide-react';
import { StravaCsvParser } from '../utils/stravaCsvParser';

interface ImportCsvDialogProps {
  onDismiss: () => void;
  onImport: (csvText: string) => void;
}

export const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({ onDismiss, onImport }) => {
  const [csvInput, setCsvInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<{
    activities: number;
    skipped: number;
    error: string | null;
  }>({
    activities: 0,
    skipped: 0,
    error: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualText, setShowManualText] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && content.trim()) {
        setCsvInput(content);
        setSelectedFileName(file.name);
        const result = StravaCsvParser.parseCsvDetailed(content);
        setCsvResult({
          activities: result.activities.length,
          skipped: result.skipped,
          error: result.parseErrors.join('; ') || null,
        });
        setErrorMessage(null);
      } else {
        setErrorMessage('The selected file is empty.');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file.');
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      data-testid="import_csv_dialog"
      style={{ backgroundColor: 'var(--bg-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="ff-surface-card rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-text)] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Import activities.csv</h3>
              <p className="text-xs text-[var(--text-muted)]">Upload Strava archive dataset</p>
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
          Select your Strava <code className="font-mono">activities.csv</code> archive file. The
          parser filters cycle rides and computes TSS, CTL, ATL, and TSB.
        </p>

        {/* Upload File Zone */}
        <label
          data-testid="browse_phone_storage_btn"
          className={`flex items-center justify-between p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${
            selectedFileName
              ? 'bg-[var(--accent-subtle-bg)] border-[var(--accent-subtle-border)]'
              : 'bg-[var(--bg-canvas)] border-[var(--border-hover)] hover:border-[var(--accent-text)]'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedFileName ? (
              <FileText className="w-5 h-5 text-[var(--accent-text)] shrink-0" />
            ) : (
              <FolderOpen className="w-5 h-5 shrink-0 text-[var(--text-muted)]" />
            )}
            <div>
              <span className="text-xs font-semibold block text-[var(--text-primary)]">
                {selectedFileName || 'Select CSV File'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {selectedFileName ? 'File loaded successfully' : 'Click to select activities.csv'}
              </span>
            </div>
          </div>

          {selectedFileName && (
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
          )}

          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        </label>

        {/* Preview Summary */}
        {csvResult.activities > 0 && (
          <div className="rounded-xl p-3 flex items-center gap-2.5 text-xs font-medium bg-[var(--accent-subtle-bg)] border border-[var(--accent-subtle-border)] text-[var(--accent-text)]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {csvResult.activities} cycle ride{csvResult.activities === 1 ? '' : 's'} ready for
              import
            </span>
          </div>
        )}

        {/* Skipped rows */}
        {csvResult.skipped !== null && csvResult.skipped > 0 && (
          <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            {csvResult.skipped} row{csvResult.skipped === 1 ? ' was' : 's were'} skipped (not cycle
            rides, or unparseable date)
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-500">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Text Paste Option */}
        <div>
          <button
            type="button"
            data-testid="toggle_manual_csv_text"
            onClick={() => setShowManualText(!showManualText)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium hover:underline focus:outline-none"
          >
            {showManualText ? '▼ Hide manual text box' : '▶ Or paste CSV text manually'}
          </button>

          {showManualText && (
            <textarea
              data-testid="csv_input_field"
              value={csvInput}
              onChange={(e) => {
                const text = e.target.value;
                setCsvInput(text);
                setSelectedFileName('Pasted CSV Text');
                if (text.trim()) {
                  const result = StravaCsvParser.parseCsvDetailed(text);
                  setCsvResult({
                    activities: result.activities.length,
                    skipped: result.skipped,
                    error: result.parseErrors.join('; ') || null,
                  });
                } else {
                  setCsvResult({ activities: 0, skipped: 0, error: null });
                }
              }}
              placeholder="Activity ID,Activity Date,Activity Name,Activity Type,Moving Time,Distance..."
              className="w-full mt-2 h-28 border border-[var(--border-subtle)] bg-[var(--bg-input)] focus:border-[var(--accent-focus)] rounded-xl p-3 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            data-testid="cancel_import_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            data-testid="confirm_import_btn"
            disabled={!csvInput.trim() || csvResult.activities === 0}
            onClick={() => {
              if (csvInput.trim() && csvResult.activities > 0) {
                onImport(csvInput);
                onDismiss();
              }
            }}
            className="ff-btn-sage px-4 py-2 text-xs font-semibold disabled:opacity-40 rounded-lg"
          >
            Import Dataset ({csvResult.activities > 0 ? csvResult.activities : 0})
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
