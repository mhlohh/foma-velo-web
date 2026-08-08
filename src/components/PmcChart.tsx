import React, { useMemo, useState, useRef } from 'react';
import { DailyPmcData } from '../types';

interface PmcChartProps {
  dailyList: DailyPmcData[];
  selectedDay: DailyPmcData | null;
  horizonDays: number;
  onDaySelected: (day: DailyPmcData) => void;
}

export const PmcChart: React.FC<PmcChartProps> = ({
  dailyList,
  selectedDay,
  horizonDays,
  onDaySelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleList = useMemo(() => {
    if (!dailyList || dailyList.length === 0) return [];
    if (horizonDays <= 0 || horizonDays >= dailyList.length) {
      return dailyList;
    }
    return dailyList.slice(-horizonDays);
  }, [dailyList, horizonDays]);

  const activeDay = useMemo(() => {
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleList.length) {
      return visibleList[hoverIndex];
    }
    return selectedDay ?? visibleList[visibleList.length - 1] ?? null;
  }, [hoverIndex, visibleList, selectedDay]);

  if (visibleList.length === 0) {
    return (
      <div
        data-testid="pmc_chart_card"
        className="w-full h-64 bg-slate-800/80 border border-slate-700/80 rounded-3xl flex items-center justify-center p-6 text-slate-400 text-sm"
      >
        No activity data available for PMC chart
      </div>
    );
  }

  // Calculate Chart Extents
  const maxTss = Math.max(...visibleList.map((d) => d.tss), 100);
  const maxLineVal = Math.max(...visibleList.map((d) => Math.max(d.ctl, d.atl)), 100);
  const minTsb = Math.min(...visibleList.map((d) => d.tsb), -40);
  const maxTsb = Math.max(...visibleList.map((d) => d.tsb), 40);

  const chartHeight = 220;
  const chartWidth = 800; // SVG viewBox width

  const xStep = chartWidth / Math.max(visibleList.length - 1, 1);

  // Calculate SVG Paths
  let ctlPathD = '';
  let atlPathD = '';
  let tsbPathD = '';

  visibleList.forEach((d, i) => {
    const x = i * xStep;

    const ctlY = chartHeight - (d.ctl / maxLineVal) * (chartHeight * 0.85);
    const atlY = chartHeight - (d.atl / maxLineVal) * (chartHeight * 0.85);

    const tsbRatio = (d.tsb - minTsb) / (maxTsb - minTsb);
    const tsbY = chartHeight * (1.0 - tsbRatio);

    if (i === 0) {
      ctlPathD += `M ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
      atlPathD += `M ${x.toFixed(1)} ${atlY.toFixed(1)}`;
      tsbPathD += `M ${x.toFixed(1)} ${tsbY.toFixed(1)}`;
    } else {
      ctlPathD += ` L ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
      atlPathD += ` L ${x.toFixed(1)} ${atlY.toFixed(1)}`;
      tsbPathD += ` L ${x.toFixed(1)} ${tsbY.toFixed(1)}`;
    }
  });

  // TSB Zero Y line
  const zeroTsbY = chartHeight * (maxTsb / (maxTsb - minTsb));

  // Handle pointer scrub
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(ratio * (visibleList.length - 1));
    if (idx !== hoverIndex) {
      setHoverIndex(idx);
      onDaySelected(visibleList[idx]);
    }
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const activeIndex = visibleList.findIndex((d) => d.dateString === activeDay?.dateString);
  const activeX = activeIndex >= 0 ? activeIndex * xStep : null;

  const formatDate = (millis: number) => {
    const d = new Date(millis);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      data-testid="pmc_chart_card"
      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3"
    >
      {/* Legend Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm sm:text-base font-bold text-slate-100">
          Performance Management Chart
        </h2>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-medium">CTL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-slate-300 font-medium">ATL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">TSB</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div ref={containerRef} className="w-full h-52 sm:h-60 relative cursor-crosshair touch-none select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerMove}
        >
          {/* Dashed Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke="#334155"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          ))}

          {/* Zero Line for TSB = 0 */}
          <line
            x1="0"
            y1={zeroTsbY}
            x2={chartWidth}
            y2={zeroTsbY}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* TSS Daily Bars */}
          {visibleList.map((d, i) => {
            const x = i * xStep;
            const barWidth = Math.max(2, (chartWidth / visibleList.length) * 0.65);
            const barHeight = (d.tss / maxTss) * (chartHeight * 0.45);
            const barTop = chartHeight - barHeight;
            const isFuture = d.isFuture;

            return (
              <rect
                key={i}
                x={x - barWidth / 2}
                y={barTop}
                width={barWidth}
                height={barHeight}
                fill={isFuture ? '#FC5200' : '#38BDF8'}
                opacity={isFuture ? 0.6 : 0.35}
                rx="1"
              />
            );
          })}

          {/* TSB Path */}
          <path d={tsbPathD} fill="none" stroke="#10B981" strokeWidth="2.5" />

          {/* ATL Path */}
          <path d={atlPathD} fill="none" stroke="#F43F5E" strokeWidth="2.5" />

          {/* CTL Path */}
          <path d={ctlPathD} fill="none" stroke="#06B6D4" strokeWidth="3" />

          {/* Active Scrubber Line & Highlight Dots */}
          {activeX !== null && (
            <g>
              <line
                x1={activeX}
                y1="0"
                x2={activeX}
                y2={chartHeight}
                stroke="#F8FAFC"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />

              {activeDay && (
                <>
                  <circle
                    cx={activeX}
                    cy={chartHeight - (activeDay.ctl / maxLineVal) * (chartHeight * 0.85)}
                    r="4"
                    fill="#06B6D4"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={activeX}
                    cy={chartHeight - (activeDay.atl / maxLineVal) * (chartHeight * 0.85)}
                    r="4"
                    fill="#F43F5E"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Scrubber Day Detail Pill */}
      {activeDay && (
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">
              {formatDate(activeDay.dateMillis)}
              {activeDay.isFuture ? ' (Planned)' : ''}
            </span>
            <span className="text-slate-400">
              • {activeDay.activities.length > 0 ? `${activeDay.activities.length} activity` : 'Rest Day'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300 font-mono">
            <div>
              <span className="text-cyan-400 font-semibold">CTL:</span> {activeDay.ctl.toFixed(1)}
            </div>
            <div>
              <span className="text-rose-400 font-semibold">ATL:</span> {activeDay.atl.toFixed(1)}
            </div>
            <div>
              <span className={`${activeDay.tsb >= 0 ? 'text-emerald-400' : 'text-amber-400'} font-semibold`}>
                TSB:
              </span>{' '}
              {activeDay.tsb >= 0 ? `+${activeDay.tsb.toFixed(1)}` : activeDay.tsb.toFixed(1)}
            </div>
            <div>
              <span className="text-blue-400 font-semibold">TSS:</span> {Math.round(activeDay.tss)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
