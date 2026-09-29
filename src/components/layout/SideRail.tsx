import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export interface SideRailProps {
  // Sticky top group
  onDashboard: () => void;
  // Bottom reveal group
  onImport: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

const STICKY_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤' },
  { id: 'calendar', label: 'Calendar', icon: '⊞' },
];

const TOUCHABLE_ITEMS = [
  { id: 'import', label: 'Import CSV', icon: '⬆' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'theme', label: 'Dark/Light', icon: '◎' },
  { id: 'signout', label: 'Sign Out', icon: '⇳' },
];

export const SideRail: React.FC<SideRailProps> = ({
  onDashboard,
  onImport,
  onSettings,
  onToggleTheme,
  onSignOut,
}) => {
  const { isDark } = useTheme();

  return (
    <aside
      className={`relative flex flex-col items-center border-r py-3 gap-1 transition-colors overflow-hidden z-0 ${
        isDark ? 'border-slate-700 bg-slate-800/95' : 'border-slate-200 bg-white/95'
      }`}
      onMouseEnter={() => document.querySelector('[data-siderail]')?.classList.add('expanded')}
      onMouseLeave={() => document.querySelector('[data-siderail]')?.classList.remove('expanded')}
      onFocus={() => document.querySelector('[data-siderail]')?.classList.add('expanded')}
      onBlur={() => document.querySelector('[data-siderail]')?.classList.remove('expanded')}
      tabIndex={0}
      data-siderail
    >
      {/* Sticky top: always visible. */}
      {STICKY_ITEMS.map(({ id, label, icon }) => {
        const active = id === 'dashboard';
        return (
          <button
            key={id}
            onClick={onDashboard}
            className={`w-[76px] rounded-lg py-2.5 flex flex-col items-center gap-1.5 transition-colors ${
              active
                ? 'bg-[#2f6fe4] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
          </button>
        );
      })}

      {/* Bottom group: visible only on hover/focus. */}
      <div
        className={`flex flex-col items-center gap-1 mt-1 transition-all duration-200 overflow-hidden ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}
        data-siderail-actions
      >
        {TOUCHABLE_ITEMS.map(({ id, label, icon }) => {
          let onClick: () => void;
          switch (id) {
            case 'theme': onClick = onToggleTheme; break;
            case 'signout': onClick = onSignOut; break;
            case 'import': onClick = onImport; break;
            case 'settings': onClick = onSettings; break;
            default: onClick = () => {};
          }

          return (
            <button
              key={id}
              onClick={onClick}
              data-testid={`sidebar_${id}`}
              title={label}
              className={`w-[76px] rounded-lg py-2.5 flex flex-col items-center gap-1.5 transition-colors ${
                id === 'theme'
                  ? 'bg-[#2f6fe4] text-white'
                  : 'hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Reveal drawer: visible only while hovered/focused. */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[200px] sm:w-[220px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-xl transition-transform duration-200 z-50 ${
          isDark ? 'bg-slate-900' : 'bg-white'
        }`}
        style={{ transform: 'translateX(0)', transitionDelay: '0ms' }}
      >
        <div className="p-3 space-y-1">
          {STICKY_ITEMS.map(({ id, label, icon }) => {
            const active = id === 'dashboard';
            return (
              <button
                key={id}
                onClick={onDashboard}
                className={`w-full rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  active ? 'bg-[#2f6fe4] text-white' : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="px-3 space-y-1 pb-3">
          {TOUCHABLE_ITEMS.map(({ id, label, icon }) => {
            let onClick: () => void;
            switch (id) {
              case 'theme': onClick = onToggleTheme; break;
              case 'signout': onClick = onSignOut; break;
              case 'import': onClick = onImport; break;
              case 'settings': onClick = onSettings; break;
              default: onClick = () => {};
            }
            return (
              <button
                key={id}
                onClick={onClick}
                data-testid={`sidebar_nav_${id}`}
                className={`w-full rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  id === 'theme'
                    ? 'bg-[#2f6fe4] text-white'
                    : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
