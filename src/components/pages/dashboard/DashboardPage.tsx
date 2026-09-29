import React, { useMemo } from 'react';
import { Info, Plus, Upload } from 'lucide-react';
import { ActivityEntity, DailyPmcData, PmcSummary, UserSettings } from '../../../types';
import { PmcEngine } from '../../../utils/pmcEngine';
import { useTheme } from '../../../context/ThemeContext';
import { PmcChart } from './PmcChart';

interface DashboardPageProps {
  summary: PmcSummary;
  activities: ActivityEntity[];
  settings: UserSettings;
  horizonDays: number;
  onHorizonChange: (days: number) => void;
  selectedDay: DailyPmcData | null;
  onDaySelected: (day: DailyPmcData) => void;
  onImportClick: () => void;
  onAiClick: () => void;
}

const HR_ZONE_COLORS = ['#fda4af', '#f87171', '#ef4444', '#dc2626', '#b91c1c'];

/** "Time in Heart Rate Zones" — stacked weekly bars derived from hrTSS share per zone. */
function TimeInHrZonesCard({ activities, settings }: { activities: ActivityEntity[]; settings: UserSettings }) {
  const { isDark } = useTheme();

  const weeks = useMemo(() => {
    const completed = activities.filter((a) => !a.isPlanned && a.movingTimeSec > 0);
    const byWeek = new Map<string, ActivityEntity[]>();
    for (const act of completed) {
      const d = new Date(act.dateMillis);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = `${monday.getFullYear()}-${monday.getMonth()}`;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(act);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, acts]) => {
        // Approximate zone distribution from avg HR vs LTHR
        const zoneMinutes = [0, 0, 0, 0, 0];
        for (const act of acts) {
          if (!act.avgHr || act.avgHr <= 0) {
            zoneMinutes[1] += act.movingTimeSec / 60; // default Z2
            continue;
          }
          const ratio = act.avgHr / settings.lthr;
          const zone = ratio < 0.68 ? 0 : ratio < 0.83 ? 1 : ratio < 0.94 ? 2 : ratio < 1.05 ? 3 : 4;
          zoneMinutes[zone] += act.movingTimeSec / 60;
        }
        const total = zoneMinutes.reduce((s, v) => s + v, 0) || 1;
        return { key, zoneMinutes, total };
      });
  }, [activities, settings.lthr]);

  const maxTotal = Math.max(...weeks.map((w) => w.total), 60);

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-white bg-[#2f6fe4] rounded px-1.5 py-0.5 uppercase tracking-wide">Sample</span>
        <h3 className="text-sm font-bold">Time in Heart Rate Zones</h3>
      </div>

      <div className={`flex items-start gap-3 rounded-md p-3 mb-4 text-xs ${isDark ? 'bg-[#eef3fd]/10' : 'bg-[#eef3fd]'}`}>
        <Info className="w-4 h-4 text-[#2f6fe4] shrink-0 mt-0.5" />
        <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
          Get an overview of the zones you're hitting — how much training time lands in each
          Friel heart-rate zone each week.
        </p>
      </div>

      <div className="h-52 flex items-end gap-1.5">
        {weeks.length === 0 && (
          <p className={`text-xs m-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Import rides to see your zone distribution.
          </p>
        )}
        {weeks.map((week) => (
          <div key={week.key} className="flex-1 flex flex-col justify-end items-center group">
            <div
              className="w-full max-w-[38px] flex flex-col justify-end rounded-t-sm overflow-hidden"
              style={{ height: `${(week.total / maxTotal) * 100}%` }}
              title={`Week of ${week.key}: ${Math.round(week.total)} min`}
            >
              {week.zoneMinutes.map((mins, zi) =>
                mins > 0 ? (
                  <div
                    key={zi}
                    style={{
                      height: `${(mins / week.total) * 100}%`,
                      backgroundColor: HR_ZONE_COLORS[zi],
                    }}
                  />
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 text-[10px] font-medium">
        {['Z1 Recovery', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Threshold', 'Z5 Anaerobic'].map((label, i) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HR_ZONE_COLORS[i] }} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Duration by Week" — bar chart of weekly training hours. */
function DurationByWeekCard({ activities }: { activities: ActivityEntity[] }) {
  const { isDark } = useTheme();

  const weeks = useMemo(() => {
    const completed = activities.filter((a) => !a.isPlanned && a.movingTimeSec > 0);
    const byWeek = new Map<string, number>();
    for (const act of completed) {
      const d = new Date(act.dateMillis);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      byWeek.set(key, (byWeek.get(key) ?? 0) + act.movingTimeSec / 3600);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, hours]) => ({ key, hours }));
  }, [activities]);

  const maxHours = Math.max(...weeks.map((w) => w.hours), 2);

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-white bg-[#2f6fe4] rounded px-1.5 py-0.5 uppercase tracking-wide">Sample</span>
        <h3 className="text-sm font-bold">Duration by Week</h3>
      </div>

      <div className={`flex items-start gap-3 rounded-md p-3 mb-4 text-xs ${isDark ? 'bg-[#eef3fd]/10' : 'bg-[#eef3fd]'}`}>
        <Info className="w-4 h-4 text-[#2f6fe4] shrink-0 mt-0.5" />
        <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
          Easily see how closely you're following your plan — total ride duration for each of
          the last 12 weeks.
        </p>
      </div>

      <div className="h-52 flex items-end gap-1.5">
        {weeks.length === 0 && (
          <p className={`text-xs m-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            No completed rides yet.
          </p>
        )}
        {weeks.map((week) => (
          <div key={week.key} className="flex-1 flex flex-col justify-end items-center">
            <div
              className="w-full max-w-[38px] bg-[#5b8def] rounded-t-sm"
              style={{ height: `${Math.max(2, (week.hours / maxHours) * 100)}%` }}
              title={`Week of ${week.key}: ${week.hours.toFixed(1)} h`}
            />
          </div>
        ))}
      </div>
      <div className={`flex justify-between mt-2 text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <span>{weeks[0]?.key.slice(5) ?? ''}</span>
        <span>{weeks[weeks.length - 1]?.key.slice(5) ?? ''}</span>
      </div>
    </div>
  );
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  activities,
  settings,
  horizonDays,
  onHorizonChange,
  selectedDay,
  onDaySelected,
  onImportClick,
  onAiClick,
}) => {
  const { isDark } = useTheme();

  const horizons = [
    { days: 30, label: '30 Days' },
    { days: 60, label: '60 Days' },
    { days: 90, label: '90 Days' },
    { days: 180, label: '180 Days' },
    { days: -1, label: 'All Time' },
  ];

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold">
          Last {horizonDays > 0 ? `${horizonDays} Days` : 'All Time'}
        </h2>
        <select
          data-testid="horizon_select"
          value={horizonDays}
          onChange={(e) => onHorizonChange(Number(e.target.value))}
          className={`text-xs font-semibold rounded-md border px-2.5 py-1.5 focus:outline-none ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-200'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        >
          {horizons.map((h) => (
            <option key={h.days} value={h.days}>
              {h.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* PMC */}
          <PmcChart
            dailyList={summary.dailyList}
            selectedDay={selectedDay}
            horizonDays={horizonDays}
            onDaySelected={onDaySelected}
          />
        </div>

        <div className="space-y-4">
          <TimeInHrZonesCard activities={activities} settings={settings} />
        </div>

        <div>
          <DurationByWeekCard activities={activities} />
        </div>

        {/* Coach upsell — opens AI analysis */}
        <div
          className={`border rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h3 className="text-lg font-bold mb-2">Gain Deeper Training Insights</h3>
          <p className={`text-xs max-w-xs mb-5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Get a personalized physiological analysis of your CTL, ATL, TSB and ramp rate, plus
            targeted coaching recommendations for the next 7–14 days.
          </p>
          <div className="flex items-center gap-2">
            <button
              data-testid="dashboard_ai_btn"
              onClick={onAiClick}
              className="inline-flex items-center gap-2 bg-[#2f6fe4] hover:bg-[#245cc4] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              Ask the Coach
            </button>
            <button
              data-testid="dashboard_import_btn"
              onClick={onImportClick}
              className="inline-flex items-center gap-2 border border-slate-300 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
