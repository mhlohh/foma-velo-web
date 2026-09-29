import React from 'react';
import { motion } from 'motion/react';
import { Bike, Heart, Mountain, Trash2, Tv, Zap, Calendar } from 'lucide-react';
import { ActivityEntity, UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';
import { useTheme } from '../context/ThemeContext';
import { readableText } from '../utils/contrastText';

interface ActivityListItemProps {
  activity: ActivityEntity;
  settings: UserSettings;
  onDelete: (id: number) => void;
}

export const ActivityListItem: React.FC<ActivityListItemProps> = React.memo(
  ({ activity, settings, onDelete }) => {
    const { isDark } = useTheme();
    const tss = PmcEngine.calculateSingleActivityTss(activity, settings);
    const dateStr = new Date(activity.dateMillis).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const formatDuration = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    const getTypeMeta = () => {
      if (activity.isPlanned) {
        return {
          icon: Calendar,
          color:
            'text-[var(--accent-text)] bg-[var(--accent-subtle-bg)] border-[var(--accent-subtle-border)]',
        };
      }
      switch (activity.type.toLowerCase()) {
        case 'virtualride':
        case 'zwift':
          return {
            icon: Tv,
            color: 'text-sky-500 bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
          };
        case 'gravel':
        case 'mountain bike':
        case 'mtb':
          return {
            icon: Mountain,
            color: 'text-emerald-500 bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
          };
        default:
          return {
            icon: Bike,
            color:
              'text-[var(--text-primary)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
          };
      }
    };

    const { icon: TypeIcon, color: typeColorClass } = getTypeMeta();

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.18 }}
        data-testid={`activity_item_${activity.id}`}
        className={`w-full rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 border transition-colors ${
          activity.isPlanned
            ? 'bg-[var(--bg-card)] border-[var(--accent-subtle-border)] hover:border-[var(--accent-text)]'
            : 'ff-surface-card'
        }`}
      >
        {/* Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${typeColorClass}`}
          >
            <TypeIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {activity.isPlanned && (
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-subtle-bg)] text-[var(--accent-text)] border border-[var(--accent-subtle-border)] shrink-0">
                  PLANNED
                </span>
              )}
              {(activity.isManual || (!activity.stravaActivityId && !activity.isPlanned)) && (
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                  MANUAL
                </span>
              )}
              <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                {activity.name}
              </h4>
            </div>

            <div className="text-[11px] mt-0.5 truncate text-[var(--text-muted)] font-mono">
              {dateStr} · {formatDuration(activity.movingTimeSec)}
              {activity.distanceMeters > 0 &&
                ` · ${(activity.distanceMeters / 1000).toFixed(1)} km`}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono font-medium">
              {activity.avgWatts && activity.avgWatts > 0 && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: readableText('#f59e0b', isDark) }}
                >
                  <Zap className="w-3 h-3" />
                  <span>
                    {Math.round(activity.avgWatts)}W
                    {activity.weightedWatts ? ` (${Math.round(activity.weightedWatts)}W NP)` : ''}
                  </span>
                </div>
              )}

              {activity.avgHr && activity.avgHr > 0 && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: readableText('#e11d48', isDark) }}
                >
                  <Heart className="w-3 h-3" />
                  <span>{Math.round(activity.avgHr)} bpm</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TSS Badge & Delete */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1 text-center min-w-[54px]">
            <span
              className="text-sm font-bold font-mono tabular-nums block leading-tight"
              style={{ color: readableText('#3b82f6', isDark) }}
            >
              {Math.round(tss)}
            </span>
            <span className="text-[9px] font-mono font-medium uppercase text-[var(--text-muted)]">
              TSS
            </span>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            data-testid={`delete_act_${activity.id}`}
            onClick={() => onDelete(activity.id)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-elevated)] transition-colors"
            title="Delete activity"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    );
  }
);
