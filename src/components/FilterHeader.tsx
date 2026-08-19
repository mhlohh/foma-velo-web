import React from 'react';
import { Filter, Zap, Heart, RefreshCw, Search } from 'lucide-react';
import { CalculationMode, UserSettings } from '../types';
import { useTheme } from '../context/ThemeContext';

interface FilterHeaderProps {
  settings: UserSettings;
  selectedType: string | null;
  selectedHorizonDays: number;
  includePlanned: boolean;
  sourceFilter: 'all' | 'strava' | 'manual' | 'planned';
  searchQuery: string;
  availableTypes: string[];
  onModeChanged: (mode: CalculationMode) => void;
  onTypeChanged: (type: string | null) => void;
  onHorizonChanged: (days: number) => void;
  onIncludePlannedChanged: (include: boolean) => void;
  onSourceFilterChanged: (source: 'all' | 'strava' | 'manual' | 'planned') => void;
  onSearchChanged: (query: string) => void;
}

export const FilterHeader: React.FC<FilterHeaderProps> = React.memo(({
  settings,
  selectedType,
  selectedHorizonDays,
  includePlanned,
  sourceFilter,
  searchQuery,
  availableTypes,
  onModeChanged,
  onTypeChanged,
  onHorizonChanged,
  onIncludePlannedChanged,
  onSourceFilterChanged,
  onSearchChanged,
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
    <div
      data-testid="filter_header_card"
      className={`w-full border rounded-2xl p-4 shadow-sm space-y-3.5 transition-colors ${
        isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      {/* Title & Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-bold">Metric & Chart Filters</h3>
        </div>

        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}>
          <span>Planned Workouts</span>
          <input
            data-testid="toggle_planned_switch"
            type="checkbox"
            checked={includePlanned}
            onChange={(e) => onIncludePlannedChanged(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500/30 accent-cyan-600"
          />
        </label>
      </div>

      {/* Activity Source Segmented Filter */}
      <div className="space-y-1.5">
        <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Activity Source:
        </span>
        <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border text-xs ${
          isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            data-testid="source_btn_all"
            onClick={() => onSourceFilterChanged('all')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              sourceFilter === 'all'
                ? 'bg-cyan-600 text-white shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            data-testid="source_btn_strava"
            onClick={() => onSourceFilterChanged('strava')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              sourceFilter === 'strava'
                ? 'bg-orange-600 text-white shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Strava
          </button>
          <button
            data-testid="source_btn_manual"
            onClick={() => onSourceFilterChanged('manual')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              sourceFilter === 'manual'
                ? 'bg-amber-600 text-white shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual TSS
          </button>
          <button
            data-testid="source_btn_planned"
            onClick={() => onSourceFilterChanged('planned')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              sourceFilter === 'planned'
                ? 'bg-purple-600 text-white shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Planned
          </button>
        </div>
      </div>

      {/* Calculation Metric Source Segmented Buttons */}
      <div className="space-y-1.5">
        <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Calculation Metric Source:
        </span>
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
          isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            data-testid="mode_btn_auto"
            onClick={() => onModeChanged(CalculationMode.AUTO)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.AUTO
                ? 'bg-cyan-600 text-white shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Auto
          </button>

          <button
            data-testid="mode_btn_power"
            onClick={() => onModeChanged(CalculationMode.POWER)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.POWER
                ? 'bg-amber-600 text-white shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Power
          </button>

          <button
            data-testid="mode_btn_heart_rate"
            onClick={() => onModeChanged(CalculationMode.HEART_RATE)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.HEART_RATE
                ? 'bg-rose-600 text-white shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            HR
          </button>
        </div>
      </div>

      {/* Horizon Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className={`text-[11px] font-medium shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Horizon:
        </span>
        {horizons.map(({ days, label }) => (
          <button
            key={days}
            data-testid={`horizon_chip_${days}`}
            onClick={() => onHorizonChanged(days)}
            className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
              selectedHorizonDays === days
                ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                : isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Type Chips */}
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className={`text-[11px] font-medium shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Type:
          </span>
          <button
            data-testid="type_chip_all"
            onClick={() => onTypeChanged(null)}
            className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
              selectedType === null
                ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                : isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            All Types
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              data-testid={`type_chip_${type}`}
              onClick={() => onTypeChanged(selectedType === type ? null : type)}
              className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
                selectedType === type
                  ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        <input
          data-testid="search_activities_field"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChanged(e.target.value)}
          placeholder="Search ride or workout title..."
          className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500'
              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
          }`}
        />
      </div>
    </div>
  );
});
