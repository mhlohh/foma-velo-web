import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Upload } from 'lucide-react';
import { ActivityEntity, DailyPmcData, PmcSummary, UserSettings } from '../../../types';
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

const HR_ZONE_COLORS = ['#71717a', '#60a5fa', '#10b981', '#f59e0b', '#f43f5e'];

/** "Time in Heart Rate Zones" — minimalist stacked weekly bars with smooth entrance animation. */
function TimeInHrZonesCard({
  activities,
  settings,
}: {
  activities: ActivityEntity[];
  settings: UserSettings;
}) {
  const weeks = useMemo(() => {
    const completed = activities.filter((a) => !a.isPlanned && a.movingTimeSec > 0);
    const byWeek = new Map<string, ActivityEntity[]>();
    for (const act of completed) {
      const d = new Date(act.dateMillis);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(act);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, acts]) => {
        const zoneMinutes = [0, 0, 0, 0, 0];
        for (const act of acts) {
          if (!act.avgHr || act.avgHr <= 0) {
            zoneMinutes[1] += act.movingTimeSec / 60;
            continue;
          }
          const ratio = act.avgHr / settings.lthr;
          const zone =
            ratio < 0.68 ? 0 : ratio < 0.83 ? 1 : ratio < 0.94 ? 2 : ratio < 1.05 ? 3 : 4;
          zoneMinutes[zone] += act.movingTimeSec / 60;
        }
        const total = zoneMinutes.reduce((s, v) => s + v, 0) || 1;
        return { key, zoneMinutes, total };
      });
  }, [activities, settings.lthr]);

  const maxTotal = Math.max(...weeks.map((w) => w.total), 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.08 }}
      className="ff-surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Time in Heart Rate Zones
          </h3>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">12w Friel</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Weekly training minutes distributed across Friel heart-rate intensity zones.
        </p>
      </div>

      <div className="h-48 flex items-end gap-1.5 pt-2">
        {weeks.length === 0 && (
          <p className="text-xs m-auto text-[var(--text-muted)]">
            Import rides to see your zone distribution.
          </p>
        )}
        {weeks.map((week, idx) => (
          <div
            key={week.key}
            className="flex-1 h-full flex flex-col justify-end items-center group"
          >
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                duration: 0.45,
                delay: idx * 0.03,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                height: `${Math.max(4, (week.total / maxTotal) * 100)}%`,
                transformOrigin: 'bottom',
              }}
              className="w-full max-w-[32px] flex flex-col justify-end rounded-t-sm overflow-hidden group-hover:opacity-85 transition-opacity"
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
            </motion.div>
          </div>
        ))}
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)] text-[10px] font-medium text-[var(--text-muted)]">
        {['Z1 Rec', 'Z2 End', 'Z3 Tempo', 'Z4 Thresh', 'Z5 Anaer'].map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-xs"
              style={{ backgroundColor: HR_ZONE_COLORS[i] }}
            />
            <span>{label}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/** "Duration by Week" — minimalist bar chart of weekly training hours. */
function DurationByWeekCard({ activities }: { activities: ActivityEntity[] }) {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.12 }}
      className="ff-surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Duration by Week</h3>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">Hours / wk</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Total completed ride duration for each of the last 12 weeks.
        </p>
      </div>

      <div className="h-48 flex items-end gap-1.5 pt-2">
        {weeks.length === 0 && (
          <p className="text-xs m-auto text-[var(--text-muted)]">No completed rides yet.</p>
        )}
        {weeks.map((week, idx) => (
          <div
            key={week.key}
            className="flex-1 h-full flex flex-col justify-end items-center group"
          >
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                duration: 0.45,
                delay: idx * 0.03,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                height: `${Math.max(4, (week.hours / maxHours) * 100)}%`,
                transformOrigin: 'bottom',
              }}
              className="w-full max-w-[32px] bg-[var(--chart-bar-primary)] opacity-85 group-hover:opacity-100 rounded-t-sm transition-opacity"
              title={`Week of ${week.key}: ${week.hours.toFixed(1)} h`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
        <span>{weeks[0]?.key.slice(5) ?? '—'}</span>
        <span>{weeks[weeks.length - 1]?.key.slice(5) ?? '—'}</span>
      </div>
    </motion.div>
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
  const horizons = [
    { days: 30, label: '30d', fullLabel: '30 Days' },
    { days: 60, label: '60d', fullLabel: '60 Days' },
    { days: 90, label: '90d', fullLabel: '90 Days' },
    { days: 180, label: '180d', fullLabel: '180 Days' },
    { days: -1, label: 'All', fullLabel: 'All Time' },
  ];

  return (
    <div className="space-y-4">
      {/* Range selector header with animated sliding pill */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {horizonDays > 0 ? `Last ${horizonDays} Days` : 'All Time Performance'}
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">· Coggan PMC</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Animated segmented horizon pill bar */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            {horizons.map((h) => {
              const active = horizonDays === h.days;
              return (
                <button
                  key={h.days}
                  type="button"
                  onClick={() => onHorizonChange(h.days)}
                  className={`relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="horizon-active-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-md bg-[var(--bg-pill)] -z-10"
                    />
                  )}
                  {h.label}
                </button>
              );
            })}
          </div>

          <select
            data-testid="horizon_select"
            aria-label="Select chart horizon"
            value={horizonDays}
            onChange={(e) => onHorizonChange(Number(e.target.value))}
            className="sr-only"
          >
            {horizons.map((h) => (
              <option key={h.days} value={h.days}>
                {h.fullLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
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

        {/* Minimalist Freebuff-style CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.16 }}
          className="ff-surface-card xl:col-span-2 rounded-xl p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-[var(--text-muted)] block">
              AI Coach · foma-velo.app
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Keep building.
            </h3>
            <p className="text-xs sm:text-sm max-w-xl leading-relaxed text-[var(--text-secondary)]">
              Generate a personalized physiological audit of your CTL fitness curve, acute fatigue
              balance, and targeted workout recommendations for the next 7–14 days.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="dashboard_ai_btn"
              onClick={onAiClick}
              className="ff-btn-sage group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg"
            >
              <span>Ask the Coach</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="dashboard_import_btn"
              onClick={onImportClick}
              className="inline-flex items-center gap-2 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
