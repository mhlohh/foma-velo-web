import React from 'react';
import { Activity, Gauge, Zap } from 'lucide-react';
import { PmcSummary } from '../types';

interface MetricsSummaryCardsProps {
  summary: PmcSummary | null;
}

export const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const {
    currentCtl,
    currentAtl,
    currentTsb,
    rampRate7d,
    totalTssLast7d,
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
          className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">42-day load</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xs text-slate-400 font-medium block truncate">Fitness (CTL)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-2xl font-bold text-cyan-400">
                {currentCtl.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">TSS/d</span>
            </div>
          </div>
        </div>

        {/* Fatigue (ATL) */}
        <div
          data-testid="metric_atl_card"
          className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">7-day load</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xs text-slate-400 font-medium block truncate">Fatigue (ATL)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-2xl font-bold text-rose-400">
                {currentAtl.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">TSS/d</span>
            </div>
          </div>
        </div>

        {/* Form (TSB) */}
        <div
          data-testid="metric_tsb_card"
          className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${formStatus.colorHex}20` }}
            >
              <Zap className="w-4 h-4" style={{ color: formStatus.colorHex }} />
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">Readiness</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xs text-slate-400 font-medium block truncate">Form (TSB)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className="text-base sm:text-2xl font-bold"
                style={{ color: formStatus.colorHex }}
              >
                {currentTsb >= 0 ? `+${currentTsb.toFixed(1)}` : currentTsb.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">TSB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Readiness Banner Card */}
      <div
        data-testid="form_status_banner"
        className="w-full rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all"
        style={{
          backgroundColor: `${formStatus.colorHex}12`,
          borderColor: `${formStatus.colorHex}40`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: formStatus.colorHex }}
            />
            <h3
              className="text-sm sm:text-base font-bold"
              style={{ color: formStatus.colorHex }}
            >
              {formStatus.title}
            </h3>
          </div>

          {/* Ramp Rate Pill */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              rampRate7d > 8.0
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/80'
            }`}
          >
            Ramp: {rampRate7d >= 0 ? `+${rampRate7d.toFixed(1)}` : rampRate7d.toFixed(1)} /wk
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
          {formStatus.description}
        </p>

        {/* 7-day TSS and distance summary */}
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-700/40 text-xs font-medium text-slate-400">
          <div>
            7d Load: <span className="font-bold text-slate-200">{Math.round(totalTssLast7d)} TSS</span>
          </div>
          <div>
            Total Dist: <span className="font-bold text-slate-200">{Math.round(totalDistanceKm)} km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
