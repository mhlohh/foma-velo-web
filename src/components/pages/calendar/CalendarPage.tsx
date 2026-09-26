import React, { useMemo, useState } from 'react';
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

  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first offset
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

  // Weekly summary for the selected week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedWeekStart]);

  const weekSummary = useMemo(() => {
    let durationSec = 0;
    let distanceM = 0;
    let tss = 0;
    let rideTss = 0;
    for (const d of weekDays) {
      const acts = byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? [];
      for (const act of acts) {
        durationSec += act.movingTimeSec;
        distanceM += act.distanceMeters;
        const actTss = PmcEngine.calculateSingleActivityTss(act, settings);
        tss += actTss;
        rideTss += act.distanceMeters > 0 ? actTss : 0;
      }
    }
    return { durationSec, distanceKm: distanceM / 1000, tss, rideTss };
  }, [weekDays, byDay, settings]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{monthLabel}</h2>
          <button
            onClick={goToday}
            className={`text-xs font-semibold border rounded-md px-3 py-1.5 transition-colors ${
              isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={() => shiftMonth(-1)}
              className={`p-1.5 border rounded-l-md transition-colors ${
                isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
              }`}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shiftMonth(1)}
              className={`p-1.5 border rounded-r-md border-l-0 transition-colors ${
                isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
              }`}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={onImportClick}
          className="inline-flex items-center gap-2 bg-[#2f6fe4] hover:bg-[#245cc4] text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>
      </div>

      <div className="flex gap-4 items-start">
        {/* Month grid */}
        <div
          className={`flex-1 border rounded-lg overflow-hidden transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          {/* Weekday header */}
          <div className={`grid grid-cols-7 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className={`px-2 py-2 text-[11px] font-bold tracking-wider text-center ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {grid.map((date, idx) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className={`min-h-[64px] sm:min-h-[104px] border-b border-r ${
                      isDark ? 'border-slate-700/50' : 'border-slate-100'
                    } ${idx % 7 === 6 ? '' : ''}`}
                  />
                );
              }
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const acts = byDay.get(key) ?? [];
              const isToday =
                new Date().toDateString() === date.toDateString();
              const isSunday = idx % 7 === 6;

              return (
                <div
                  key={key}
                  onClick={() => {
                    const monday = new Date(date);
                    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
                    monday.setHours(0, 0, 0, 0);
                    setSelectedWeekStart(monday);
                  }}
                  className={`min-h-[64px] sm:min-h-[104px] border-b border-r p-1 sm:p-1.5 cursor-pointer transition-colors ${
                    isDark
                      ? 'border-slate-700/50 hover:bg-slate-700/30'
                      : 'border-slate-100 hover:bg-slate-50'
                  } ${isSunday ? '' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-[#2f6fe4] text-white'
                          : isDark
                          ? 'text-slate-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {acts.slice(0, 3).map((act, actIdx) => {
                      const Icon = typeIcon(act.type);
                      const tss = Math.round(PmcEngine.calculateSingleActivityTss(act, settings));
                      return (
                        <div
                          key={act.id}
                          className={`rounded px-1.5 py-1 text-[10px] leading-tight border-l-2 ${
                            actIdx > 0 ? 'hidden sm:block' : ''}
                            act.isPlanned
                              ? isDark
                                ? 'bg-purple-950/40 border-purple-500'
                                : 'bg-purple-50 border-purple-400'
                              : isDark
                              ? 'bg-slate-700/60 border-[#2f6fe4]'
                              : 'bg-slate-100 border-[#2f6fe4]'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold truncate">
                            <Icon className="w-2.5 h-2.5 shrink-0 text-[#7c3aed]" />
                            <span className="truncate">{act.name}</span>
                          </div>
                          <div className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="hidden sm:inline">
                              {formatHms(act.movingTimeSec)}
                              {act.distanceMeters > 0 && ` · ${(act.distanceMeters / 1000).toFixed(1)} km`}
                              {tss > 0 && ` · ${tss} TSS`}
                            </span>
                            <span className="sm:hidden">{tss > 0 ? `${tss} TSS` : formatHms(act.movingTimeSec)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {acts.length > 3 && (
                      <div className={`text-[9px] font-semibold px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        +{acts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly summary rail */}
        <div
          className={`hidden xl:block w-[280px] shrink-0 border rounded-lg p-4 transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className={`text-[11px] font-bold tracking-widest uppercase mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Week Summary
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase" style={{ color: readableText('#1d4ed8', isDark) }}>Fitness</div>
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>CTL</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase" style={{ color: readableText('#e11d48', isDark) }}>Fatigue</div>
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>ATL</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase" style={{ color: readableText('#f59e0b', isDark) }}>Form</div>
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>TSB</div>
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Duration</span>
              <span className="font-bold font-mono">{formatHms(weekSummary.durationSec)}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Distance</span>
              <span className="font-bold font-mono">{weekSummary.distanceKm.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>TSS</span>
              <span className="font-bold font-mono">{Math.round(weekSummary.tss)}</span>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t text-xs space-y-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Click any day in the calendar to inspect its week. Values reflect the week's
              planned and completed workouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
