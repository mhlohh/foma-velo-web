import React, { useState, useEffect } from 'react';
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
    prompt: 'Provide a comprehensive sports-science analysis of my current PMC curve, fitness progression, fatigue accumulation, and readiness.',
  },
  {
    id: 'ramp',
    label: 'Ramp Rate & Fatigue Check',
    icon: TrendingUp,
    description: 'Audit fitness build rate and prevent overreaching or burnout.',
    prompt: 'Analyze my 7-day ramp rate and acute fatigue load. Am I increasing volume too fast or am I in a safe, productive sweet spot?',
  },
  {
    id: 'recovery',
    label: 'Recovery & Freshness Plan',
    icon: Flame,
    description: 'Tailored rest, active recovery, and upcoming load recommendations.',
    prompt: 'Based on my current TSB and recent training stress, what recovery or training balance should I follow over the next 7-10 days?',
  },
  {
    id: 'taper',
    label: 'Race Day / Event Taper',
    icon: Zap,
    description: 'Optimize TSB to achieve peak race readiness (+10 to +25 TSB).',
    prompt: 'How should I structure my upcoming training and taper to peak for an important event while shedding fatigue and preserving fitness?',
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

  // In-memory & Persistent cache per topic
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

  // Save to localStorage when cache changes
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

  // Generate or refresh analysis
  const handleGenerateAnalysis = async (topicId?: string, overridePrompt?: string) => {
    if (!summary) return;

    const targetTopicId = topicId || selectedTopic;
    const topic = PRESET_TOPICS.find((t) => t.id === targetTopicId);
    const finalPrompt = overridePrompt || (customQuestion.trim() ? customQuestion : topic?.prompt);

    setIsLoading(true);
    setErrorMessage(null);

    // Helper to format date cleanly with day of week (e.g. "2026-08-19 (Wed)")
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

    // Prepare rich training data snapshot with correctly computed TSS for each ride
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
        weeklyDistanceKm: summary.weeklyDistanceKm ? Math.round(summary.weeklyDistanceKm) : undefined,
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
        if (typeof msg === 'string' && (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE'))) {
          msg = 'The AI service is experiencing temporary peak demand. Please click Retry in a few seconds.';
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
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        errMsg = 'The AI service is experiencing temporary peak demand. Please click Retry in a few seconds.';
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
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight">
                  AI Training Intelligence & Physiological Coach
                </h2>
                <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Gemini AI
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Contextual analysis of your CTL, ATL, TSB, Ramp Rate, and workout loads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Snapshot Stat Strip */}
        {summary && (
          <div
            className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
              isDark ? 'bg-slate-950/30 border-slate-800 text-slate-300' : 'bg-slate-100/70 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <span>
                CTL (Fitness): <strong className="text-cyan-600 dark:text-cyan-400">{summary.currentCtl.toFixed(1)}</strong>
              </span>
              <span>
                ATL (Fatigue): <strong className="text-rose-600 dark:text-rose-400">{summary.currentAtl.toFixed(1)}</strong>
              </span>
              <span>
                TSB (Form):{' '}
                <strong style={{ color: readableText(summary.formStatus.colorHex, isDark) }}>
                  {summary.currentTsb >= 0 ? `+${summary.currentTsb.toFixed(1)}` : summary.currentTsb.toFixed(1)}
                </strong>
              </span>
              <span>
                Ramp:{' '}
                <strong className={summary.rampRate7d > 8 ? 'text-amber-500 font-bold' : ''}>
                  {summary.rampRate7d >= 0 ? `+${summary.rampRate7d.toFixed(1)}` : summary.rampRate7d.toFixed(1)}/wk
                </strong>
              </span>
              <span>
                Week Load: <strong>{Math.round(summary.weeklyTss ?? summary.totalTssLast7d)} TSS</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: summary.formStatus.colorHex }}
              />
              <span style={{ color: readableText(summary.formStatus.colorHex, isDark) }}>{summary.formStatus.title}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Focus Selectors */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Select Coaching Focus Area:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_TOPICS.map((topic) => {
                const IconComponent = topic.icon;
                const isSelected = selectedTopic === topic.id;
                const hasCached = !!cache[topic.id]?.text;
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopic(topic.id);
                    }}
                    disabled={isLoading}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-cyan-950/40 border-cyan-500/50 ring-1 ring-cyan-500/30'
                          : 'bg-cyan-50/80 border-cyan-400 ring-1 ring-cyan-400'
                        : isDark
                        ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                        : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <IconComponent className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        {topic.label}
                      </span>
                      {hasCached ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Saved
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                      ) : null}
                    </div>
                    <p className={`text-[11px] leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {topic.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                isDark ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Analysis Request Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
                <button
                  onClick={() => handleGenerateAnalysis(selectedTopic)}
                  className="mt-2 text-xs font-bold underline hover:no-underline cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="p-6 rounded-3xl border border-cyan-500/20 bg-cyan-950/10 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin" />
                <span className="text-sm font-bold text-cyan-500">
                  Synthesizing physiological training metrics with Gemini...
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-4 bg-slate-700/30 rounded-lg w-5/6" />
                <div className="h-4 bg-slate-700/30 rounded-lg w-full" />
                <div className="h-4 bg-slate-700/30 rounded-lg w-4/6" />
                <div className="h-4 bg-slate-700/30 rounded-lg w-3/4" />
              </div>
            </div>
          )}

          {/* Empty / Unanalyzed State for current topic */}
          {!isLoading && !analysisText && !errorMessage && (
            <div
              className={`p-6 sm:p-8 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3 ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Ready to analyze {PRESET_TOPICS.find((t) => t.id === selectedTopic)?.label}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Click below to generate a physiological breakdown. Results are stored locally so you can review them anytime without repeating API calls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateAnalysis(selectedTopic)}
                className="mt-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Analysis</span>
              </button>
            </div>
          )}

          {/* Analysis Content Output (Cached or freshly generated) */}
          {!isLoading && analysisText && (
            <div
              className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/30 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <BrainCircuit className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Physiological Coach Assessment
                  </h3>
                  {generatedAt && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                      isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                      Saved from {formatTimestamp(generatedAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateAnalysis(selectedTopic)}
                    disabled={isLoading}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-cyan-600 border-slate-200 shadow-sm'
                    }`}
                    title="Refresh this analysis"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                    }`}
                    title="Copy analysis"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Render Formatted Markdown */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed space-y-3">
                <Markdown>{analysisText}</Markdown>
              </div>
            </div>
          )}

          {/* Custom Question Bar */}
          <div className="pt-2">
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Ask a Specific Follow-up or Goal Question:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customQuestion.trim()) {
                  handleGenerateAnalysis(selectedTopic, customQuestion.trim());
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g., 'I have a 100km hilly road race in 3 weeks. How should I adjust my weekly TSS?'"
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !customQuestion.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask Coach</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t text-xs ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          <span>Powered by Gemini Sports Science & Coggan PMC Engine</span>
          <button
            onClick={() => handleGenerateAnalysis(selectedTopic)}
            disabled={isLoading}
            className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
