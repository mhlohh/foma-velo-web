import React from 'react';
import { BarChart3, BookOpen, Map, Target } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type RailTool = 'charts' | 'workouts' | 'routes' | 'plans';

interface SideRailProps {
  activeTool: RailTool;
  onToolChange: (tool: RailTool) => void;
}

const TOOLS: { id: RailTool; label: string; icon: React.ElementType }[] = [
  { id: 'charts', label: 'Charts Library', icon: BarChart3 },
  { id: 'workouts', label: 'Workout Library', icon: BookOpen },
  { id: 'routes', label: 'Routes Library', icon: Map },
  { id: 'plans', label: 'Training Plans', icon: Target },
];

export const SideRail: React.FC<SideRailProps> = ({ activeTool, onToolChange }) => {
  const { isDark } = useTheme();
  return (
    <aside className={`hidden lg:flex w-[92px] shrink-0 flex-col items-center border-r py-4 gap-1 transition-colors ${
      isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
    }`}>
      {TOOLS.map(({ id, label, icon: Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={label}
            className={`w-[76px] rounded-lg py-3 flex flex-col items-center gap-1.5 transition-colors ${
              active
                ? 'bg-[#2f6fe4] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
          </button>
        );
      })}
    </aside>
  );
};
