import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, FolderOpen } from 'lucide-react';
import { StravaCsvParser, CsvParseResult } from '../utils/stravaCsvParser';
import { useTheme } from '../context/ThemeContext';

interface ImportCsvDialogProps {
  onDismiss: () => void;
  onImport: (csvText: string) => void;
}

export const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({
  onDismiss,
  onImport,
}) => {
  const { isDark } = useTheme();
  const [csvInput, setCsvInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<{ activities: number; skipped: number; error: string | null }>({
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
    <div
      data-testid="import_csv_dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className={`border rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
            }`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Import activities.csv</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload Strava archive dataset
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Select your Strava activities.csv archive file from your storage. The parser will filter cycle rides and compute TSS, CTL, ATL, and TSB.
        </p>

        {/* Upload File Zone */}
        <label
          data-testid="browse_phone_storage_btn"
          className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            selectedFileName
              ? isDark
                ? 'bg-cyan-950/40 border-cyan-500'
                : 'bg-cyan-50 border-cyan-600'
              : isDark
              ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
              : 'bg-slate-50 border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedFileName ? (
              <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400 shrink-0" />
            ) : (
              <FolderOpen className={`w-6 h-6 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            )}
            <div>
              <span className="text-xs font-bold block">
                {selectedFileName || 'Select CSV File'}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedFileName ? 'File loaded successfully' : 'Click to select activities.csv'}
              </span>
            </div>
          </div>

          {selectedFileName && <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />}

          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        </label>

        {/* Preview Summary */}
        {csvResult.activities > 0 && (
          <div className={`rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold ${csvResult.activities === 0 ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300'}`}>
            {csvResult.activities === 0 ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            )}
            <span>{csvResult.activities} cycle ride{csvResult.activities === 1 ? '' : 's'} ready for import</span>
          </div>
        )}

        {/* Skipped rows (silent drops) */}
        {csvResult.skipped !== null && csvResult.skipped > 0 && (
          <div className="text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}">
            {csvResult.skipped} row{csvResult.skipped === 1 ? ' was' : 's were'} skipped (not cycle rides, or unparseable date)
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Text Paste Option */}
        <div>
          <button
            data-testid="toggle_manual_csv_text"
            onClick={() => setShowManualText(!showManualText)}
            className="text-xs text-cyan-600 dark:text-cyan-400 font-medium hover:underline focus:outline-none"
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
              className={`w-full mt-2 h-28 border rounded-xl p-3 text-xs font-mono focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_import_btn"
            onClick={onDismiss}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border ${
              isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-700' : 'text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            data-testid="confirm_import_btn"
            disabled={!csvInput.trim() || csvResult.activities === 0}
            onClick={() => {
              if (csvInput.trim() && csvResult.activities > 0) {
                onImport(csvInput);
                onDismiss();
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
          >
            Import Dataset ({csvResult.activities > 0 ? csvResult.activities : 0} activities)
          </button>
        </div>
      </div>
    </div>
  );
};
