import React from 'react';
import { Bike, Calendar, Heart, Mountain, Trash2, Tv, Zap } from 'lucide-react';
import { ActivityEntity, UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';

interface ActivityListItemProps {
  activity: ActivityEntity;
  settings: UserSettings;
  onDelete: (id: number) => void;
}

export const ActivityListItem: React.FC<ActivityListItemProps> = ({
  activity,
  settings,
  onDelete,
}) => {
  const tss = PmcEngine.calculateSingleActivityTss(activity, settings);
  const dateStr = new Date(activity.dateMillis).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getTypeMeta = () => {
    if (activity.isPlanned) {
      return { icon: Calendar, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' };
    }
    switch (activity.type.toLowerCase()) {
      case 'virtualride':
      case 'zwift':
        return { icon: Tv, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' };
      case 'gravel':
      case 'mountain bike':
      case 'mtb':
        return { icon: Mountain, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
      default:
        return { icon: Bike, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' };
    }
  };

  const { icon: TypeIcon, color: typeColorClass } = getTypeMeta();

  return (
    <div
      data-testid={`activity_item_${activity.id}`}
      className={`w-full bg-slate-800/80 border rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm transition-all hover:border-slate-600/80 ${
        activity.isPlanned ? 'border-purple-500/40 bg-purple-950/10' : 'border-slate-700/80'
      }`}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${typeColorClass}`}
        >
          <TypeIcon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {activity.isPlanned && (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                PLANNED
              </span>
            )}
            <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {activity.name}
            </h4>
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {dateStr} • {formatDuration(activity.movingTimeSec)}
            {activity.distanceMeters > 0 &&
              ` • ${(activity.distanceMeters / 1000).toFixed(1)} km`}
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-3 mt-1 text-[11px] font-medium">
            {activity.avgWatts && activity.avgWatts > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <Zap className="w-3 h-3" />
                <span>
                  {Math.round(activity.avgWatts)}W
                  {activity.weightedWatts ? ` (${Math.round(activity.weightedWatts)}W NP)` : ''}
                </span>
              </div>
            )}

            {activity.avgHr && activity.avgHr > 0 && (
              <div className="flex items-center gap-1 text-rose-400">
                <Heart className="w-3 h-3" />
                <span>{Math.round(activity.avgHr)} bpm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TSS Badge & Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-center min-w-[50px]">
          <span className="text-sm font-extrabold text-cyan-400 block leading-tight">
            {Math.round(tss)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium uppercase">TSS</span>
        </div>

        <button
          data-testid={`delete_act_${activity.id}`}
          onClick={() => onDelete(activity.id)}
          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
          title="Delete activity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
