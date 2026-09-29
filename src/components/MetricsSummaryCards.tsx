import React from 'react';
import { motion } from 'motion/react';
import { Activity, Gauge, Sparkles, Zap, ArrowUpRight } from 'lucide-react';
import { PmcSummary } from '../types';
import { useTheme } from '../context/ThemeContext';
import { readableText } from '../utils/contrastText';

interface MetricsSummaryCardsProps {
  summary: PmcSummary | null;
  onOpenAiAnalysis?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 360, damping: 28 },
  },
};

export const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = React.memo(
  ({ summary, onOpenAiAnalysis }) => {
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

    const cardCls = 'ff-surface-card rounded-xl p-3.5 sm:p-4';

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full space-y-3"
      >
        {/* Top 3 PMC Core Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Fitness (CTL) */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            data-testid="metric_ctl_card"
            className={cardCls}
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[#7cabf5] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">42d CTL</span>
            </div>
            <div className="mt-2.5">
              <span className="text-[11px] font-medium block text-[var(--text-muted)]">
                Fitness (CTL)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className="text-lg min-[420px]:text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight"
                  style={{ color: readableText('#3b82f6', isDark) }}
                >
                  {currentCtl.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">TSS/d</span>
              </div>
            </div>
          </motion.div>

          {/* Fatigue (ATL) */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            data-testid="metric_atl_card"
            className={cardCls}
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-rose-400 flex items-center justify-center">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">7d ATL</span>
            </div>
            <div className="mt-2.5">
              <span className="text-[11px] font-medium block text-[var(--text-muted)]">
                Fatigue (ATL)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className="text-lg min-[420px]:text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight"
                  style={{ color: readableText('#e11d48', isDark) }}
                >
                  {currentAtl.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">TSS/d</span>
              </div>
            </div>
          </motion.div>

          {/* Form (TSB) */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            data-testid="metric_tsb_card"
            className={cardCls}
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                <Zap
                  className="w-3.5 h-3.5"
                  style={{ color: readableText(formStatus.colorHex, isDark) }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Readiness</span>
            </div>
            <div className="mt-2.5">
              <span className="text-[11px] font-medium block text-[var(--text-muted)]">
                Form (TSB)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className="text-lg min-[420px]:text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight"
                  style={{ color: readableText(formStatus.colorHex, isDark) }}
                >
                  {currentTsb >= 0 ? `+${currentTsb.toFixed(1)}` : currentTsb.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">TSB</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Form Readiness Banner Card */}
        <motion.div
          variants={itemVariants}
          data-testid="form_status_banner"
          className="ff-surface-card w-full rounded-xl p-4"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: formStatus.colorHex }}
              />
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: readableText(formStatus.colorHex, isDark) }}
              >
                {formStatus.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {onOpenAiAnalysis && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onOpenAiAnalysis}
                  data-testid="ai_analysis_banner_btn"
                  className="ff-btn-sage px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  title="Open AI Training Analysis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Coach Analysis</span>
                  <ArrowUpRight className="w-3 h-3 opacity-80" />
                </motion.button>
              )}

              <span
                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md border ${
                  rampRate7d > 8.0
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                }`}
              >
                Ramp: {rampRate7d >= 0 ? `+${rampRate7d.toFixed(1)}` : rampRate7d.toFixed(1)} /wk
              </span>
            </div>
          </div>

          <p className="text-xs mt-1.5 leading-relaxed text-[var(--text-secondary)]">
            {formStatus.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
            <div>
              Weekly Load:{' '}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {Math.round(weeklyTss ?? totalTssLast7d)} TSS/wk
              </span>
            </div>
            {typeof weeklyDistanceKm === 'number' && weeklyDistanceKm > 0 && (
              <div>
                Weekly Dist:{' '}
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {Math.round(weeklyDistanceKm)} km/wk
                </span>
              </div>
            )}
            {typeof weeklyHours === 'number' && weeklyHours > 0 && (
              <div>
                Weekly Time:{' '}
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {weeklyHours.toFixed(1)} hrs/wk
                </span>
              </div>
            )}
            <div>
              Total Dist:{' '}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {Math.round(totalDistanceKm)} km
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);
