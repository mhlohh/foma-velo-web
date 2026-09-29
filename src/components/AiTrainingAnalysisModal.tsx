import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  X,
  RefreshCw,
  Send,
  BrainCircuit,
  TrendingUp,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { ActivityEntity, DailyPmcData, PmcSummary, UserSettings } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PmcEngine } from '../utils/pmcEngine';
import { readableText } from '../utils/contrastText';

interface AiTrainingAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PmcSummary | null;
  activities: ActivityEntity[];
  settings: UserSettings;
  selectedDay?: DailyPmcData | null;
}

const PRESET_TOPICS = [
  {
    id: 'full',
    label: 'Comprehensive PMC Analysis',
    icon: BrainCircuit,
    description: 'Deep physiological audit of Fitness, Fatigue, Form, and Ramp Rate.',
    prompt:
      'Provide a comprehensive sports-science analysis of my current PMC curve, fitness progression, fatigue accumulation, and readiness.',
  },
  {
    id: 'ramp',
    label: 'Ramp Rate & Fatigue Check',
    icon: TrendingUp,
    description: 'Audit fitness build rate and prevent overreaching or burnout.',
    prompt:
      'Analyze my 7-day ramp rate and acute fatigue load. Am I increasing volume too fast or am I in a safe, productive sweet spot?',
  },
  {
    id: 'recovery',
    label: 'Recovery & Freshness Plan',
    icon: Flame,
    description: 'Tailored rest, active recovery, and upcoming load recommendations.',
    prompt:
      'Based on my current TSB and recent training stress, what recovery or training balance should I follow over the next 7-10 days?',
  },
  {
    id: 'taper',
    label: 'Race Day / Event Taper',
    icon: Zap,
    description: 'Optimize TSB to achieve peak race readiness (+10 to +25 TSB).',
    prompt:
      'How should I structure my upcoming training and taper to peak for an important event while shedding fatigue and preserving fitness?',
  },
];

interface CachedAnalysis {
  text: string;
  generatedAt: number;
  prompt: string;
}

const STORAGE_CACHE_KEY = 'foma_velo_ai_analysis_cache';

export const AiTrainingAnalysisModal: React.FC<AiTrainingAnalysisModalProps> = ({
  isOpen,
  onClose,
  summary,
  activities,
  settings,
  selectedDay,
}) => {
  const { isDark } = useTheme();
  const [selectedTopic, setSelectedTopic] = useState<string>('full');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [cache, setCache] = useState<Record<string, CachedAnalysis>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const currentCached = cache[selectedTopic];
  const analysisText = currentCached?.text || null;
  const generatedAt = currentCached?.generatedAt || null;

  const updateCache = (topicId: string, text: string, prompt: string) => {
    const updated = {
      ...cache,
      [topicId]: {
        text,
        generatedAt: Date.now(),
        prompt,
      },
    };
    setCache(updated);
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save AI analysis cache:', e);
    }
  };

  const handleGenerateAnalysis = async (topicId?: string, overridePrompt?: string) => {
    if (!summary) return;

    const targetTopicId = topicId || selectedTopic;
    const topic = PRESET_TOPICS.find((t) => t.id === targetTopicId);
    const finalPrompt = overridePrompt || (customQuestion.trim() ? customQuestion : topic?.prompt);

    setIsLoading(true);
    setErrorMessage(null);

    const formatActivityDate = (millis: number) => {
      try {
        const d = new Date(millis);
        const ymd = d.toLocaleDateString('en-CA');
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        return `${ymd} (${dayName})`;
      } catch {
        return '';
      }
    };

    const recentActivities = [...activities]
      .sort((a, b) => b.dateMillis - a.dateMillis)
      .slice(0, 25)
      .map((a) => {
        const tss = Math.round(PmcEngine.calculateSingleActivityTss(a, settings));
        const durationMin = a.movingTimeSec ? Math.round(a.movingTimeSec / 60) : 0;
        const distanceKm = a.distanceMeters ? (a.distanceMeters / 1000).toFixed(1) : undefined;
        return {
          date: formatActivityDate(a.dateMillis),
          name: a.name || 'Cycling Ride',
          type: a.type || 'Ride',
          tss,
          durationMinutes: durationMin,
          distanceKm: distanceKm ? `${distanceKm} km` : undefined,
          avgWatts: a.avgWatts ? Math.round(a.avgWatts) : undefined,
          weightedNormalizedWatts: a.weightedWatts ? Math.round(a.weightedWatts) : undefined,
          avgHeartRateBpm: a.avgHr ? Math.round(a.avgHr) : undefined,
          maxHeartRateBpm: a.maxHr ? Math.round(a.maxHr) : undefined,
          elevationGainMeters: a.elevationGainMeters ? Math.round(a.elevationGainMeters) : undefined,
          isPlanned: !!a.isPlanned,
          notes: a.notes || undefined,
        };
      });

    const trainingContext = {
      athleteThresholds: {
        ftpWatts: settings.ftp,
        lthrBpm: settings.lthr,
        maxHeartRate: settings.maxHr,
        restingHeartRate: 60,
        weightKg: settings.weightKg,
        calculationMode: settings.calculationMode,
      },
      currentMetrics: {
        ctlFitness: summary.currentCtl.toFixed(1),
        atlFatigue: summary.currentAtl.toFixed(1),
        tsbForm: summary.currentTsb.toFixed(1),
        rampRate7d: summary.rampRate7d.toFixed(1),
        weeklyTss: Math.round(summary.weeklyTss ?? summary.totalTssLast7d),
        weeklyDistanceKm: summary.weeklyDistanceKm
          ? Math.round(summary.weeklyDistanceKm)
          : undefined,
        weeklyHours: summary.weeklyHours ? summary.weeklyHours.toFixed(1) : undefined,
        totalCareerDistanceKm: Math.round(summary.totalDistanceKm),
        formZoneTitle: summary.formStatus.title,
        formZoneDescription: summary.formStatus.description,
      },
      selectedChartDay: selectedDay
        ? {
            date: selectedDay.dateString,
            ctl: selectedDay.ctl.toFixed(1),
            atl: selectedDay.atl.toFixed(1),
            tsb: selectedDay.tsb.toFixed(1),
            dayTss: Math.round(selectedDay.tss),
            ridesOnThisDay: (selectedDay.activities || []).map((act) => ({
              name: act.name,
              type: act.type,
              tss: Math.round(PmcEngine.calculateSingleActivityTss(act, settings)),
              durationMin: Math.round(act.movingTimeSec / 60),
              distanceKm: act.distanceMeters ? (act.distanceMeters / 1000).toFixed(1) : undefined,
              avgWatts: act.avgWatts ?? undefined,
              avgHr: act.avgHr ?? undefined,
            })),
          }
        : undefined,
      recentWorkouts: recentActivities,
    };

    try {
      const response = await fetch('/api/ai/analyze-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          focusArea: topic?.label,
          trainingContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error || 'Failed to retrieve AI analysis.';
        if (typeof msg === 'object') {
          msg = msg.message || JSON.stringify(msg);
        }
        if (
          typeof msg === 'string' &&
          (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE'))
        ) {
          msg =
            'The AI service is experiencing temporary peak demand. Please click Retry in a few seconds.';
        }
        throw new Error(msg);
      }

      updateCache(targetTopicId, data.analysis, finalPrompt || '');
      if (customQuestion.trim()) {
        setCustomQuestion('');
      }
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      let errMsg = err.message || 'Error generating analysis. Please try again.';
      if (
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE')
      ) {
        errMsg =
          'The AI service is experiencing temporary peak demand. Please click Retry in a few seconds.';
      }
      setErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (millis: number) => {
    try {
      const d = new Date(millis);
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      style={{ backgroundColor: 'var(--bg-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="ff-surface-card relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-text)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight">
                  AI Training Intelligence & Physiological Coach
                </h2>
                <span className="ff-badge hidden sm:inline text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Contextual analysis of your CTL, ATL, TSB, Ramp Rate, and workout loads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Snapshot Stat Strip */}
        {summary && (
          <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap text-[var(--text-secondary)]">
              <span>
                CTL:{' '}
                <strong style={{ color: readableText('#3b82f6', isDark) }}>
                  {summary.currentCtl.toFixed(1)}
                </strong>
              </span>
              <span>
                ATL:{' '}
                <strong style={{ color: readableText('#e11d48', isDark) }}>
                  {summary.currentAtl.toFixed(1)}
                </strong>
              </span>
              <span>
                TSB:{' '}
                <strong style={{ color: readableText(summary.formStatus.colorHex, isDark) }}>
                  {summary.currentTsb >= 0
                    ? `+${summary.currentTsb.toFixed(1)}`
                    : summary.currentTsb.toFixed(1)}
                </strong>
              </span>
              <span>
                Ramp:{' '}
                <strong
                  style={
                    summary.rampRate7d > 8
                      ? { color: readableText('#f59e0b', isDark) }
                      : undefined
                  }
                >
                  {summary.rampRate7d >= 0
                    ? `+${summary.rampRate7d.toFixed(1)}`
                    : summary.rampRate7d.toFixed(1)}
                  /wk
                </strong>
              </span>
              <span>
                Week Load:{' '}
                <strong className="text-[var(--text-primary)]">
                  {Math.round(summary.weeklyTss ?? summary.totalTssLast7d)} TSS
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-sans font-semibold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: summary.formStatus.colorHex }}
              />
              <span style={{ color: readableText(summary.formStatus.colorHex, isDark) }}>
                {summary.formStatus.title}
              </span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Focus Selectors */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-2 text-[var(--text-muted)]">
              Select Coaching Focus Area
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRESET_TOPICS.map((topic) => {
                const IconComponent = topic.icon;
                const isSelected = selectedTopic === topic.id;
                const hasCached = !!cache[topic.id]?.text;
                return (
                  <motion.button
                    key={topic.id}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTopic(topic.id)}
                    disabled={isLoading}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'bg-[var(--bg-elevated)] border-[var(--accent-text)]'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-[var(--text-primary)]">
                        <IconComponent className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        {topic.label}
                      </span>
                      {hasCached ? (
                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-subtle-bg)] text-[var(--accent-text)]">
                          Saved
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                      ) : null}
                    </div>
                    <p className="text-[11px] leading-snug line-clamp-2 text-[var(--text-muted)]">
                      {topic.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3 text-xs text-rose-500">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Analysis Request Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => handleGenerateAnalysis(selectedTopic)}
                  className="mt-2 text-xs font-semibold underline hover:no-underline cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-[var(--accent-text)] animate-spin" />
                <span className="text-xs font-semibold text-[var(--accent-text)]">
                  Synthesizing physiological training metrics with Gemini...
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-5/6" />
                <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-full" />
                <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-4/6" />
                <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-3/4" />
              </div>
            </div>
          )}

          {/* Empty / Unanalyzed State */}
          {!isLoading && !analysisText && !errorMessage && (
            <div className="p-6 sm:p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-text)] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Ready to analyze {PRESET_TOPICS.find((t) => t.id === selectedTopic)?.label}
                </h3>
                <p className="text-xs mt-1 leading-relaxed text-[var(--text-muted)]">
                  Generate a physiological breakdown. Results are cached locally so you can review
                  them anytime without repeating API calls.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerateAnalysis(selectedTopic)}
                className="ff-btn-sage mt-2 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Analysis</span>
              </motion.button>
            </div>
          )}

          {/* Analysis Content Output */}
          {!isLoading && analysisText && (
            <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 flex-wrap">
                  <BrainCircuit className="w-4 h-4 text-[var(--accent-text)]" />
                  <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Physiological Coach Assessment
                  </h3>
                  {generatedAt && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {formatTimestamp(generatedAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateAnalysis(selectedTopic)}
                    disabled={isLoading}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Refresh this analysis"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy analysis"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[var(--accent-text)]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed space-y-3">
                <Markdown>{analysisText}</Markdown>
              </div>
            </div>
          )}

          {/* Custom Question Composer */}
          <div className="pt-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customQuestion.trim()) {
                  handleGenerateAnalysis(selectedTopic, customQuestion.trim());
                }
              }}
              className="rounded-xl border border-[var(--border-subtle)] focus-within:border-[var(--accent-focus)] bg-[var(--bg-input)] p-3 space-y-2.5 transition-colors"
            >
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask a follow-up question — e.g., 'I have a 100km road race in 3 weeks, how should I adjust TSS?'"
                disabled={isLoading}
                className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Coggan PMC · Gemini Coach
                </span>
                <button
                  type="submit"
                  disabled={isLoading || !customQuestion.trim()}
                  className="ff-btn-sage px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3" />
                  <span>Continue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
