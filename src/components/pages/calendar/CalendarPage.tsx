import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mountain, Tv, Upload } from 'lucide-react';
import { ActivityEntity, UserSettings } from '../../../types';
import { PmcEngine } from '../../../utils/pmcEngine';
import { useTheme } from '../../../context/ThemeContext';
import { readableText } from '../../../utils/contrastText';

interface CalendarPageProps {
  activities: ActivityEntity[];
  settings: UserSettings;
  onImportClick: () => void;
}

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function typeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('virtual')) return Tv;
  if (t.includes('mountain') || t.includes('gravel')) return Mountain;
  return Bike;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  activities,
  settings,
  onImportClick,
}) => {
  const { isDark } = useTheme();
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityEntity[]>();
    for (const act of activities) {
      const d = new Date(act.dateMillis);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(act);
    }
    return map;
  }, [activities]);

  const pmcByDay = useMemo(() => {
    const summary = PmcEngine.computePmc(activities, settings, 60);
    const map = new Map<string, { ctl: number; atl: number; tsb: number }>();
    for (const day of summary.dailyList) {
      const d = new Date(day.dateMillis);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, { ctl: day.ctl, atl: day.atl, tsb: day.tsb });
    }
    return {
      map,
      currentCtl: summary.currentCtl,
      currentAtl: summary.currentAtl,
      currentTsb: summary.currentTsb,
    };
  }, [activities, settings]);

  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    setSelectedWeekStart(monday);
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedWeekStart]);

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (!start || !end) return '';
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  const weekSummary = useMemo(() => {
    let durationSec = 0;
    let distanceM = 0;
    let tss = 0;
    let workoutCount = 0;
    let latestPmc: { ctl: number; atl: number; tsb: number } | null = null;

    for (const d of weekDays) {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const acts = byDay.get(key) ?? [];
      const dayPmc = pmcByDay.map.get(key);
      if (dayPmc) {
        latestPmc = dayPmc;
      }
      for (const act of acts) {
        workoutCount += 1;
        durationSec += act.movingTimeSec;
        distanceM += act.distanceMeters;
        const actTss = PmcEngine.calculateSingleActivityTss(act, settings);
        tss += actTss;
      }
    }
    return {
      durationSec,
      distanceKm: distanceM / 1000,
      tss,
      workoutCount,
      ctl: latestPmc?.ctl ?? pmcByDay.currentCtl,
      atl: latestPmc?.atl ?? pmcByDay.currentAtl,
      tsb: latestPmc?.tsb ?? pmcByDay.currentTsb,
    };
  }, [weekDays, byDay, pmcByDay, settings]);

  const isDateInSelectedWeek = (date: Date) => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (!start || !end) return false;
    const t = date.getTime();
    const endOfSunday = new Date(end);
    endOfSunday.setHours(23, 59, 59, 999);
    return t >= start.getTime() && t <= endOfSunday.getTime();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {monthLabel}
          </h2>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={goToday}
            className="text-xs sm:text-sm font-semibold border border-[var(--border-hover)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg px-3.5 py-2 transition-colors"
          >
            Today
          </motion.button>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-2 border border-[var(--border-hover)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] rounded-l-lg text-[var(--text-primary)] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-2 border border-[var(--border-hover)] border-l-0 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] rounded-r-lg text-[var(--text-primary)] transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-xs font-medium text-[var(--text-secondary)]">
            <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span>Selected Week:</span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              {weekRangeLabel}
            </span>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onImportClick}
            className="ff-btn-sage inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 items-stretch xl:items-start">
        {/* Month grid */}
        <div className="ff-surface-card flex-1 rounded-xl overflow-hidden border border-[var(--border-hover)]">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-[var(--border-hover)] bg-[var(--bg-elevated)]">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="px-2 py-3 text-xs font-mono font-bold tracking-widest text-center text-[var(--text-primary)]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Animated Day cells */}
          <AnimatePresence mode="wait">
            <motion.div
              key={monthLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-7"
            >
              {grid.map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[105px] sm:min-h-[148px] lg:min-h-[164px] border-b border-r border-[var(--border-hover)] bg-[var(--bg-canvas)]/60"
                    />
                  );
                }
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const acts = byDay.get(key) ?? [];
                const isToday = new Date().toDateString() === date.toDateString();
                const inSelectedWeek = isDateInSelectedWeek(date);
                const dayTotalTss = acts.reduce(
                  (sum, a) => sum + Math.round(PmcEngine.calculateSingleActivityTss(a, settings)),
                  0
                );

                return (
                  <div
                    key={key}
                    onClick={() => {
                      const monday = new Date(date);
                      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
                      monday.setHours(0, 0, 0, 0);
                      setSelectedWeekStart(monday);
                    }}
                    className={`min-h-[105px] sm:min-h-[148px] lg:min-h-[164px] border-b border-r border-[var(--border-hover)] p-2 sm:p-2.5 cursor-pointer transition-colors ${
                      inSelectedWeek
                        ? 'bg-[var(--bg-elevated)]/75 hover:bg-[var(--bg-card-hover)]'
                        : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {/* Day cell header: Date number + Daily total TSS */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs sm:text-sm font-mono font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'ff-badge shadow-sm'
                            : acts.length > 0
                              ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-hover)]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {dayTotalTss > 0 && (
                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-pill)] text-[var(--accent-text)] border border-[var(--border-hover)]">
                          {dayTotalTss} TSS
                        </span>
                      )}
                    </div>

                    {/* Workout Cards */}
                    <div className="space-y-1.5">
                      {acts.slice(0, 3).map((act, actIdx) => {
                        const Icon = typeIcon(act.type);
                        const tss = Math.round(
                          PmcEngine.calculateSingleActivityTss(act, settings)
                        );
                        return (
                          <div
                            key={act.id}
                            title={act.name}
                            className={`rounded-lg px-2.5 py-2 border border-[var(--border-hover)] border-l-[3.5px] shadow-sm transition-transform hover:scale-[1.01] ${
                              actIdx > 0 ? 'hidden sm:block' : ''
                            } ${
                              act.isPlanned
                                ? 'bg-[var(--accent-subtle-bg)] border-l-[var(--accent-text)] text-[var(--text-primary)]'
                                : 'bg-[var(--bg-elevated)] border-l-[#3b82f6] text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-start gap-1.5 font-semibold text-xs sm:text-[13px] leading-snug text-[var(--text-primary)]">
                              <Icon
                                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                  act.isPlanned ? 'text-[var(--accent-text)]' : 'text-[#60a5fa]'
                                }`}
                              />
                              <span className="line-clamp-1 sm:line-clamp-2 break-words">
                                {act.name}
                              </span>
                            </div>

                            <div className="font-mono text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="hidden sm:inline text-[var(--text-primary)]/90">
                                {formatHms(act.movingTimeSec)}
                              </span>
                              {act.distanceMeters > 0 && (
                                <span className="hidden sm:inline text-[var(--text-secondary)]">
                                  {(act.distanceMeters / 1000).toFixed(1)} km
                                </span>
                              )}
                              {tss > 0 && (
                                <span className="font-bold text-[var(--accent-text)]">
                                  {tss} TSS
                                </span>
                              )}
                              {tss === 0 && (
                                <span className="sm:hidden">
                                  {formatHms(act.movingTimeSec)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {acts.length > 3 && (
                        <div className="text-[11px] font-mono font-bold px-1.5 py-0.5 text-[var(--text-secondary)]">
                          +{acts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Weekly summary rail */}
        <div className="w-full xl:w-[320px] shrink-0 ff-surface-card rounded-xl p-5 border border-[var(--border-hover)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--text-primary)]">
              Week Summary
            </h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-secondary)]">
              {weekRangeLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hover)]">
            <div className="text-center">
              <div
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: readableText('#3b82f6', isDark) }}
              >
                Fitness
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)] mt-0.5">
                {Math.round(weekSummary.ctl)}
              </div>
              <div className="text-[10px] font-mono font-semibold text-[var(--text-secondary)]">
                CTL
              </div>
            </div>
            <div className="text-center border-x border-[var(--border-hover)] px-1">
              <div
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: readableText('#e11d48', isDark) }}
              >
                Fatigue
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)] mt-0.5">
                {Math.round(weekSummary.atl)}
              </div>
              <div className="text-[10px] font-mono font-semibold text-[var(--text-secondary)]">
                ATL
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: readableText('#f59e0b', isDark) }}
              >
                Form
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)] mt-0.5">
                {weekSummary.tsb > 0 ? `+${Math.round(weekSummary.tsb)}` : Math.round(weekSummary.tsb)}
              </div>
              <div className="text-[10px] font-mono font-semibold text-[var(--text-secondary)]">
                TSB
              </div>
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Workouts</span>
              <span className="font-bold font-mono text-base text-[var(--text-primary)]">
                {weekSummary.workoutCount}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Duration</span>
              <span className="font-bold font-mono text-base text-[var(--text-primary)]">
                {formatHms(weekSummary.durationSec)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Distance</span>
              <span className="font-bold font-mono text-base text-[var(--text-primary)]">
                {weekSummary.distanceKm.toFixed(1)} km
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[var(--text-secondary)] font-semibold">Total TSS</span>
              <span className="font-bold font-mono text-lg text-[var(--accent-text)]">
                {Math.round(weekSummary.tss)} TSS
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border-hover)] text-xs leading-relaxed text-[var(--text-secondary)]">
            Click any day in the calendar to inspect its week. Values reflect planned and completed
            workouts.
          </div>
        </div>
      </div>
    </div>
  );
};
