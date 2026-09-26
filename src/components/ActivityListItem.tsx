import React from 'react';
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

export const ActivityListItem: React.FC<ActivityListItemProps> = React.memo(({
  activity,
  settings,
  onDelete,
}) => {
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
      return { icon: Calendar, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60' };
    }
    switch (activity.type.toLowerCase()) {
      case 'virtualride':
      case 'zwift':
        return { icon: Tv, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60' };
      case 'gravel':
      case 'mountain bike':
      case 'mtb':
        return { icon: Mountain, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60' };
      default:
        return { icon: Bike, color: 'text-[#2f6fe4] bg-[#eef3fd]' };
    }
  };

  const { icon: TypeIcon, color: typeColorClass } = getTypeMeta();

  return (
    <div
      data-testid={`activity_item_${activity.id}`}
      className={`w-full border rounded-lg px-3.5 py-3 flex items-center justify-between gap-3 transition-all ${
        activity.isPlanned
          ? 'border-purple-300 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20'
          : isDark
          ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeColorClass}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {activity.isPlanned && (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                PLANNED
              </span>
            )}
            {(activity.isManual || (!activity.stravaActivityId && !activity.isPlanned)) && (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                MANUAL
              </span>
            )}
            <h4 className="text-sm font-bold truncate">
              {activity.name}
            </h4>
          </div>

          <div className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {dateStr} • {formatDuration(activity.movingTimeSec)}
            {activity.distanceMeters > 0 &&
              ` • ${(activity.distanceMeters / 1000).toFixed(1)} km`}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold">
            {activity.avgWatts && activity.avgWatts > 0 && (
              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Zap className="w-3 h-3" />
                <span>
                  {Math.round(activity.avgWatts)}W
                  {activity.weightedWatts ? ` (${Math.round(activity.weightedWatts)}W NP)` : ''}
                </span>
              </div>
            )}

            {activity.avgHr && activity.avgHr > 0 && (
              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <Heart className="w-3 h-3" />
                <span>{Math.round(activity.avgHr)} bpm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TSS Badge & Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`border rounded-md px-2.5 py-1 text-center min-w-[54px] ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-sm font-extrabold block leading-tight" style={{ color: readableText('#1d4ed8', isDark) }}>
            {Math.round(tss)}
          </span>
          <span className={`text-[9px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            TSS
          </span>
        </div>

        <button
          data-testid={`delete_act_${activity.id}`}
          onClick={() => onDelete(activity.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-700' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
          }`}
          title="Delete activity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
