import React from 'react';
import { Filter, Zap, Heart, RefreshCw, Search } from 'lucide-react';
import { CalculationMode, UserSettings } from '../types';

interface FilterHeaderProps {
  settings: UserSettings;
  selectedType: string | null;
  selectedHorizonDays: number;
  includePlanned: boolean;
  searchQuery: string;
  availableTypes: string[];
  onModeChanged: (mode: CalculationMode) => void;
  onTypeChanged: (type: string | null) => void;
  onHorizonChanged: (days: number) => void;
  onIncludePlannedChanged: (include: boolean) => void;
  onSearchChanged: (query: string) => void;
}

export const FilterHeader: React.FC<FilterHeaderProps> = ({
  settings,
  selectedType,
  selectedHorizonDays,
  includePlanned,
  searchQuery,
  availableTypes,
  onModeChanged,
  onTypeChanged,
  onHorizonChanged,
  onIncludePlannedChanged,
  onSearchChanged,
}) => {
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
      className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3.5"
    >
      {/* Title & Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">Metric & Chart Filters</h3>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
          <span>Planned</span>
          <input
            data-testid="toggle_planned_switch"
            type="checkbox"
            checked={includePlanned}
            onChange={(e) => onIncludePlannedChanged(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500/30 accent-cyan-500"
          />
        </label>
      </div>

      {/* Calculation Metric Source Segmented Buttons */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-400">Calculation Metric Source:</span>
        <div className="grid grid-cols-3 gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
          <button
            data-testid="mode_btn_auto"
            onClick={() => onModeChanged(CalculationMode.AUTO)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.AUTO
                ? 'bg-cyan-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Auto
          </button>

          <button
            data-testid="mode_btn_power"
            onClick={() => onModeChanged(CalculationMode.POWER)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.POWER
                ? 'bg-amber-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Power
          </button>

          <button
            data-testid="mode_btn_heart_rate"
            onClick={() => onModeChanged(CalculationMode.HEART_RATE)}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              settings.calculationMode === CalculationMode.HEART_RATE
                ? 'bg-rose-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            HR
          </button>
        </div>
      </div>

      {/* Horizon Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-medium text-slate-400 shrink-0">Horizon:</span>
        {horizons.map(({ days, label }) => (
          <button
            key={days}
            data-testid={`horizon_chip_${days}`}
            onClick={() => onHorizonChanged(days)}
            className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
              selectedHorizonDays === days
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:bg-slate-700/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Type Chips */}
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-medium text-slate-400 shrink-0">Type:</span>
          <button
            data-testid="type_chip_all"
            onClick={() => onTypeChanged(null)}
            className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
              selectedType === null
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:bg-slate-700/50'
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
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                  : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:bg-slate-700/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          data-testid="search_activities_field"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChanged(e.target.value)}
          placeholder="Search ride or workout title..."
          className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>
  );
};
