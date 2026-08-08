import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, FolderOpen } from 'lucide-react';
import { StravaCsvParser } from '../utils/stravaCsvParser';

interface ImportCsvDialogProps {
  onDismiss: () => void;
  onImport: (csvText: string) => void;
}

export const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({
  onDismiss,
  onImport,
}) => {
  const [csvInput, setCsvInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
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
        const parsed = StravaCsvParser.parseCsv(content);
        setPreviewCount(parsed.length);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Import activities.csv</h3>
              <p className="text-xs text-slate-400">Upload Strava archive dataset</p>
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
          Select your Strava activities.csv archive file from your storage. The parser will filter cycle rides and compute TSS, CTL, ATL, and TSB.
        </p>

        {/* Upload File Zone */}
        <label
          data-testid="browse_phone_storage_btn"
          className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            selectedFileName
              ? 'bg-cyan-950/30 border-cyan-500/80'
              : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedFileName ? (
              <FileText className="w-6 h-6 text-cyan-400 shrink-0" />
            ) : (
              <FolderOpen className="w-6 h-6 text-slate-400 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-100 block">
                {selectedFileName || 'Select CSV File'}
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedFileName ? 'File loaded successfully' : 'Click to select activities.csv'}
              </span>
            </div>
          </div>

          {selectedFileName && <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />}

          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        </label>

        {/* Preview Summary */}
        {previewCount !== null && (
          <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-cyan-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Found {previewCount} cycle rides ready for import</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Text Paste Option */}
        <div>
          <button
            data-testid="toggle_manual_csv_text"
            onClick={() => setShowManualText(!showManualText)}
            className="text-xs text-cyan-400 font-medium hover:underline focus:outline-none"
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
                  setPreviewCount(StravaCsvParser.parseCsv(text).length);
                } else {
                  setPreviewCount(null);
                }
              }}
              placeholder="Activity ID,Activity Date,Activity Name,Activity Type,Moving Time,Distance..."
              className="w-full mt-2 h-28 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            data-testid="cancel_import_btn"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700/60 rounded-xl border border-slate-700"
          >
            Cancel
          </button>

          <button
            data-testid="confirm_import_btn"
            disabled={!csvInput.trim()}
            onClick={() => {
              if (csvInput.trim()) {
                onImport(csvInput);
                onDismiss();
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl shadow-sm transition-all"
          >
            Import Dataset
          </button>
        </div>
      </div>
    </div>
  );
};
