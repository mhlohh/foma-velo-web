import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { DailyPmcData } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PmcChartProps {
  dailyList: DailyPmcData[];
  selectedDay: DailyPmcData | null;
  horizonDays: number;
  onDaySelected: (day: DailyPmcData) => void;
}

export const PmcChart: React.FC<PmcChartProps> = React.memo(({
  dailyList,
  selectedDay,
  horizonDays,
  onDaySelected,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleList = useMemo(() => {
    if (!dailyList || dailyList.length === 0) return [];
    if (horizonDays <= 0 || horizonDays >= dailyList.length) {
      return dailyList;
    }
    return dailyList.slice(-horizonDays);
  }, [dailyList, horizonDays]);

  // Pre-calculate and memoize all chart SVG paths, scales, and bars
  const chartGeometry = useMemo(() => {
    if (visibleList.length === 0) return null;

    const maxTss = Math.max(...visibleList.map((d) => d.tss), 100);
    const maxLineVal = Math.max(...visibleList.map((d) => Math.max(d.ctl, d.atl)), 100);
    const minTsb = Math.min(...visibleList.map((d) => d.tsb), -40);
    const maxTsb = Math.max(...visibleList.map((d) => d.tsb), 40);

    const chartHeight = 220;
    const chartWidth = 800;
    const xStep = chartWidth / Math.max(visibleList.length - 1, 1);

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

    const zeroTsbY = chartHeight * (maxTsb / (maxTsb - minTsb));

    const bars = visibleList.map((d, i) => {
      const x = i * xStep;
      const barWidth = Math.max(2, (chartWidth / visibleList.length) * 0.65);
      const barHeight = (d.tss / maxTss) * (chartHeight * 0.45);
      const barTop = chartHeight - barHeight;
      return { x, barWidth, barHeight, barTop, isFuture: d.isFuture };
    });

    return {
      maxTss,
      maxLineVal,
      minTsb,
      maxTsb,
      chartHeight,
      chartWidth,
      xStep,
      ctlPathD,
      atlPathD,
      tsbPathD,
      zeroTsbY,
      bars,
    };
  }, [visibleList]);

  const activeDay = useMemo(() => {
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleList.length) {
      return visibleList[hoverIndex];
    }
    return selectedDay ?? visibleList[visibleList.length - 1] ?? null;
  }, [hoverIndex, visibleList, selectedDay]);

  // Update rect cache
  const updateRect = useCallback(() => {
    if (containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updateRect]);

  // Process pointer coordinates inside RAF to ensure smooth 60/120fps tracking
  const processPointerEvent = useCallback(
    (clientX: number) => {
      if (!rectRef.current) {
        updateRect();
      }
      const rect = rectRef.current;
      if (!rect || rect.width <= 0 || visibleList.length === 0) return;

      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const idx = Math.round(ratio * (visibleList.length - 1));

      if (hoverIndexRef.current !== idx) {
        hoverIndexRef.current = idx;
        setHoverIndex(idx);
        if (visibleList[idx]) {
          onDaySelected(visibleList[idx]);
        }
      }
    },
    [visibleList, onDaySelected, updateRect]
  );

  const handlePointerEnter = (e: React.PointerEvent<SVGSVGElement>) => {
    updateRect();
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const clientX = e.clientX;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      processPointerEvent(clientX);
    });
  };

  const handlePointerLeave = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    hoverIndexRef.current = null;
    setHoverIndex(null);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    updateRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    processPointerEvent(e.clientX);
  };

  if (!chartGeometry || visibleList.length === 0) {
    return (
      <div
        data-testid="pmc_chart_card"
        className={`w-full h-64 border rounded-3xl flex items-center justify-center p-6 text-sm font-medium ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        No activity data available for PMC chart
      </div>
    );
  }

  const {
    maxLineVal,
    chartHeight,
    chartWidth,
    xStep,
    ctlPathD,
    atlPathD,
    tsbPathD,
    zeroTsbY,
    bars,
  } = chartGeometry;

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
      className={`w-full border rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors ${
        isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      {/* Legend Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm sm:text-base font-bold">
          Performance Management Chart
        </h2>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>CTL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>ATL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>TSB</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div ref={containerRef} className="w-full h-52 sm:h-60 relative cursor-crosshair touch-none select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        >
          {/* Dashed Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke={isDark ? '#334155' : '#E2E8F0'}
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
            stroke={isDark ? '#475569' : '#94A3B8'}
            strokeWidth="1.5"
          />

          {/* TSS Daily Bars */}
          {bars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x - bar.barWidth / 2}
              y={bar.barTop}
              width={bar.barWidth}
              height={bar.barHeight}
              fill={bar.isFuture ? '#FC5200' : '#0284C7'}
              opacity={bar.isFuture ? 0.6 : 0.35}
              rx="1"
            />
          ))}

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
                stroke={isDark ? '#F8FAFC' : '#0F172A'}
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
        <div className={`border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {formatDate(activeDay.dateMillis)}
              {activeDay.isFuture ? ' (Planned)' : ''}
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              • {activeDay.activities.length > 0 ? `${activeDay.activities.length} activity` : 'Rest Day'}
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono font-medium">
            <div>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">CTL:</span> {activeDay.ctl.toFixed(1)}
            </div>
            <div>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">ATL:</span> {activeDay.atl.toFixed(1)}
            </div>
            <div>
              <span className={`${activeDay.tsb >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} font-semibold`}>
                TSB:
              </span>{' '}
              {activeDay.tsb >= 0 ? `+${activeDay.tsb.toFixed(1)}` : activeDay.tsb.toFixed(1)}
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">TSS:</span> {Math.round(activeDay.tss)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

