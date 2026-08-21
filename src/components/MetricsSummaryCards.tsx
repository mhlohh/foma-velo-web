import React from 'react';
import { Activity, Gauge, Sparkles, Zap } from 'lucide-react';
import { PmcSummary } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MetricsSummaryCardsProps {
  summary: PmcSummary | null;
  onOpenAiAnalysis?: () => void;
}

export const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = React.memo(({ summary, onOpenAiAnalysis }) => {
  const { isDark } = useTheme();

  if (!summary) return null;

  const {
    currentCtl,
    currentAtl,
    currentTsb,
    rampRate7d,
    totalTssLast7d,
    weeklyTss,
    weeklyDistanceKm,
    weeklyHours,
    totalDistanceKm,
    formStatus,
  } = summary;

  return (
    <div className="w-full space-y-3">
      {/* Top 3 PMC Core Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Fitness (CTL) */}
        <div
          data-testid="metric_ctl_card"
          className={`border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isDark ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              42-day load
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className={`text-xs font-medium block truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Fitness (CTL)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">
                {currentCtl.toFixed(1)}
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TSS/d</span>
            </div>
          </div>
        </div>

        {/* Fatigue (ATL) */}
        <div
          data-testid="metric_atl_card"
          className={`border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isDark ? 'bg-rose-950 text-rose-400' : 'bg-rose-50 text-rose-600'
            }`}>
              <Gauge className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              7-day load
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className={`text-xs font-medium block truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Fatigue (ATL)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {currentAtl.toFixed(1)}
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TSS/d</span>
            </div>
          </div>
        </div>

        {/* Form (TSB) */}
        <div
          data-testid="metric_tsb_card"
          className={`border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${formStatus.colorHex}20` }}
            >
              <Zap className="w-4 h-4" style={{ color: formStatus.colorHex }} />
            </div>
            <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Readiness
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className={`text-xs font-medium block truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Form (TSB)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className="text-base sm:text-2xl font-extrabold"
                style={{ color: formStatus.colorHex }}
              >
                {currentTsb >= 0 ? `+${currentTsb.toFixed(1)}` : currentTsb.toFixed(1)}
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TSB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Readiness Banner Card */}
      <div
        data-testid="form_status_banner"
        className={`w-full rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all ${
          isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: formStatus.colorHex }}
            />
            <h3
              className="text-sm sm:text-base font-bold"
              style={{ color: formStatus.colorHex }}
            >
              {formStatus.title}
            </h3>
          </div>

          {/* Actions & Ramp Rate Pill */}
          <div className="flex items-center gap-2">
            {onOpenAiAnalysis && (
              <button
                type="button"
                onClick={onOpenAiAnalysis}
                data-testid="ai_analysis_banner_btn"
                className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                title="Open AI Training Analysis"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Coach Analysis</span>
              </button>
            )}

            {/* Ramp Rate Pill */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                rampRate7d > 8.0
                  ? isDark
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                  : isDark
                  ? 'bg-slate-900 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Ramp: {rampRate7d >= 0 ? `+${rampRate7d.toFixed(1)}` : rampRate7d.toFixed(1)} /wk
            </span>
          </div>
        </div>

        <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {formStatus.description}
        </p>

        {/* Weekly TSS, weekly metrics, and distance summary */}
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-2.5 border-t text-xs font-medium ${
          isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}>
          <div>
            Weekly Load: <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(weeklyTss ?? totalTssLast7d)} TSS/wk</span>
          </div>
          {typeof weeklyDistanceKm === 'number' && weeklyDistanceKm > 0 && (
            <div>
              Weekly Dist: <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(weeklyDistanceKm)} km/wk</span>
            </div>
          )}
          {typeof weeklyHours === 'number' && weeklyHours > 0 && (
            <div>
              Weekly Time: <span className="font-bold text-slate-900 dark:text-slate-100">{weeklyHours >= 10 ? weeklyHours.toFixed(1) : weeklyHours.toFixed(1)} hrs/wk</span>
            </div>
          )}
          <div>
            Total Dist: <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(totalDistanceKm)} km</span>
          </div>
        </div>
      </div>
    </div>
  );
});
