import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { DailyPmcData } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { readableText } from '../../../utils/contrastText';

interface PmcChartProps {
  dailyList: DailyPmcData[];
  selectedDay: DailyPmcData | null;
  horizonDays: number;
  onDaySelected: (day: DailyPmcData) => void;
}

/**
 * TrainingPeaks-style Performance Management Chart:
 * - CTL: blue line with grey shaded fill
 * - ATL: pink line
 * - TSB: orange line
 * - Daily TSS bars in the background
 */
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

  const chartGeometry = useMemo(() => {
    if (visibleList.length === 0) return null;

    const maxTss = Math.max(...visibleList.map((d) => d.tss), 100);
    const maxLineVal = Math.max(...visibleList.map((d) => Math.max(d.ctl, d.atl)), 100);
    const minTsb = Math.min(...visibleList.map((d) => d.tsb), -40);
    const maxTsb = Math.max(...visibleList.map((d) => d.tsb), 40);

    const chartHeight = 260;
    const chartWidth = 1000;
    const xStep = chartWidth / Math.max(visibleList.length - 1, 1);

    let ctlPathD = '';
    let atlPathD = '';
    let tsbPathD = '';
    let fillPathD = '';

    visibleList.forEach((d, i) => {
      const x = i * xStep;
      const ctlY = chartHeight - (d.ctl / maxLineVal) * (chartHeight * 0.9);
      const atlY = chartHeight - (d.atl / maxLineVal) * (chartHeight * 0.9);
      const tsbRatio = (d.tsb - minTsb) / (maxTsb - minTsb);
      const tsbY = chartHeight * (1.0 - tsbRatio);

      if (i === 0) {
        ctlPathD += `M ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
        atlPathD += `M ${x.toFixed(1)} ${atlY.toFixed(1)}`;
        tsbPathD += `M ${x.toFixed(1)} ${tsbY.toFixed(1)}`;
        fillPathD += `M ${x.toFixed(1)} ${chartHeight} L ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
      } else {
        ctlPathD += ` L ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
        atlPathD += ` L ${x.toFixed(1)} ${atlY.toFixed(1)}`;
        tsbPathD += ` L ${x.toFixed(1)} ${tsbY.toFixed(1)}`;
        fillPathD += ` L ${x.toFixed(1)} ${ctlY.toFixed(1)}`;
      }
    });

    // Close the CTL area fill down to the baseline
    const lastX = (visibleList.length - 1) * xStep;
    fillPathD += ` L ${lastX.toFixed(1)} ${chartHeight} Z`;

    const zeroTsbY = chartHeight * (maxTsb / (maxTsb - minTsb));

    const bars = visibleList.map((d, i) => {
      const x = i * xStep;
      const barWidth = Math.max(2, (chartWidth / visibleList.length) * 0.6);
      const barHeight = (d.tss / maxTss) * (chartHeight * 0.5);
      const barTop = chartHeight - barHeight;
      return { x, barWidth, barHeight, barTop, isFuture: d.isFuture };
    });

    return {
      maxLineVal,
      chartHeight,
      chartWidth,
      xStep,
      ctlPathD,
      atlPathD,
      tsbPathD,
      fillPathD,
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

  const processPointerEvent = useCallback(
    (clientX: number) => {
      if (!rectRef.current) updateRect();
      const rect = rectRef.current;
      if (!rect || rect.width <= 0 || visibleList.length === 0) return;

      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const idx = Math.round(ratio * (visibleList.length - 1));

      if (hoverIndexRef.current !== idx) {
        hoverIndexRef.current = idx;
        setHoverIndex(idx);
        if (visibleList[idx]) onDaySelected(visibleList[idx]);
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
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => processPointerEvent(clientX));
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
        className={`w-full h-72 border border-slate-200 rounded-lg flex items-center justify-center text-sm ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white text-slate-500'
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
    fillPathD,
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

  // TrainingPeaks palette
  const gridColor = isDark ? '#1e293b' : '#e5e9f0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      data-testid="pmc_chart_card"
      className={`w-full border rounded-lg p-4 sm:p-5 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-base font-bold">Performance Management Chart</h2>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded bg-[#e11d48]" />
            Fatigue (ATL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded bg-[#1d4ed8]" />
            Fitness (CTL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded bg-[#f59e0b]" />
            Form (TSB)
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-64 sm:h-72 relative cursor-crosshair touch-none select-none"
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        >
          {/* Horizontal grid */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke={gridColor}
              strokeWidth="1"
            />
          ))}

          {/* TSS bars (grey past / orange future) */}
          {bars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x - bar.barWidth / 2}
              y={bar.barTop}
              width={bar.barWidth}
              height={bar.barHeight}
              fill={bar.isFuture ? '#fb923c' : '#94a3b8'}
              opacity={bar.isFuture ? 0.35 : 0.3}
            />
          ))}

          {/* CTL area fill */}
          <path d={fillPathD} fill={isDark ? '#33415555' : '#e2e8f066'} stroke="none" />

          {/* TSB zero baseline */}
          <line
            x1="0"
            y1={zeroTsbY}
            x2={chartWidth}
            y2={zeroTsbY}
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth="1.5"
          />

          {/* Lines: TSB, ATL, CTL (CTL last = on top) */}
          <path d={tsbPathD} fill="none" stroke="#f59e0b" strokeWidth="1.75" />
          <path d={atlPathD} fill="none" stroke="#e11d48" strokeWidth="1.75" />
          <path d={ctlPathD} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />

          {/* Scrubber */}
          {activeX !== null && (
            <g>
              <line
                x1={activeX}
                y1="0"
                x2={activeX}
                y2={chartHeight}
                stroke={isDark ? '#f8fafc' : '#0f172a'}
                strokeDasharray="4 3"
                strokeWidth="1"
              />
              {activeDay && (
                <>
                  <circle
                    cx={activeX}
                    cy={chartHeight - (activeDay.ctl / maxLineVal) * (chartHeight * 0.9)}
                    r="4"
                    fill="#1d4ed8"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={activeX}
                    cy={chartHeight - (activeDay.atl / maxLineVal) * (chartHeight * 0.9)}
                    r="4"
                    fill="#e11d48"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Scrubber detail strip */}
      {activeDay && (
        <div
          className={`mt-3 border rounded-md px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span>{formatDate(activeDay.dateMillis)}</span>
            <span className={`font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              • {activeDay.activities.length > 0 ? `${activeDay.activities.length} activity${activeDay.activities.length > 1 ? 'ies' : ''}` : 'Rest Day'}
            </span>
          </div>
          <div className={`flex items-center gap-4 font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <span>
              <span style={{ color: readableText('#e11d48', isDark) }}>Fatigue:</span> {activeDay.atl.toFixed(0)}
            </span>
            <span>
              <span style={{ color: readableText('#1d4ed8', isDark) }}>Fitness:</span> {activeDay.ctl.toFixed(0)}
            </span>
            <span>
              <span style={{ color: readableText('#f59e0b', isDark) }}>Form:</span>{' '}
              {activeDay.tsb >= 0 ? `+${activeDay.tsb.toFixed(0)}` : activeDay.tsb.toFixed(0)}
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              TSS {Math.round(activeDay.tss)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
