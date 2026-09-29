import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
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
 * Minimalist Performance Management Chart:
 * - CTL: crisp sky/blue line with subtle shaded fill
 * - ATL: rose line
 * - TSB: amber line
 * - Daily TSS bars in the background
 */
export const PmcChart: React.FC<PmcChartProps> = React.memo(
  ({ dailyList, selectedDay, horizonDays, onDaySelected }) => {
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
          className="ff-surface-card w-full h-72 rounded-xl flex items-center justify-center text-xs text-[var(--text-muted)]"
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

    const gridColor = isDark ? '#1a1a1d' : '#eaeaea';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
        data-testid="pmc_chart_card"
        className="ff-surface-card w-full rounded-xl p-4 sm:p-5"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Performance Management Chart
          </h2>
          <div className="flex items-center gap-4 text-[11px] font-medium text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[#fb7185]" />
              Fatigue (ATL)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[#60a5fa]" />
              Fitness (CTL)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[#fbbf24]" />
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

            {/* TSS bars */}
            {bars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x - bar.barWidth / 2}
                y={bar.barTop}
                width={bar.barWidth}
                height={bar.barHeight}
                fill={bar.isFuture ? (isDark ? '#b5d5a7' : '#15803d') : (isDark ? '#52525b' : '#a1a1aa')}
                opacity={bar.isFuture ? 0.45 : 0.35}
              />
            ))}

            {/* CTL area fill */}
            <path d={fillPathD} fill={isDark ? '#60a5fa14' : '#3b82f612'} stroke="none" />

            {/* TSB zero baseline */}
            <line
              x1="0"
              y1={zeroTsbY}
              x2={chartWidth}
              y2={zeroTsbY}
              stroke={isDark ? '#2c2c31' : '#d4d4d8'}
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Lines: TSB, ATL, CTL */}
            <path d={tsbPathD} fill="none" stroke={isDark ? '#fbbf24' : '#d97706'} strokeWidth="1.75" />
            <path d={atlPathD} fill="none" stroke={isDark ? '#fb7185' : '#e11d48'} strokeWidth="1.75" />
            <path d={ctlPathD} fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} strokeWidth="2.25" />

            {/* Scrubber */}
            {activeX !== null && (
              <g>
                <line
                  x1={activeX}
                  y1="0"
                  x2={activeX}
                  y2={chartHeight}
                  stroke={isDark ? '#f0f0f0' : '#09090b'}
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  opacity="0.6"
                />
                {activeDay && (
                  <>
                    <circle
                      cx={activeX}
                      cy={chartHeight - (activeDay.ctl / maxLineVal) * (chartHeight * 0.9)}
                      r="4"
                      fill={isDark ? '#60a5fa' : '#2563eb'}
                      stroke={isDark ? '#080808' : '#ffffff'}
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={activeX}
                      cy={chartHeight - (activeDay.atl / maxLineVal) * (chartHeight * 0.9)}
                      r="4"
                      fill={isDark ? '#fb7185' : '#e11d48'}
                      stroke={isDark ? '#080808' : '#ffffff'}
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
          <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
              <span>{formatDate(activeDay.dateMillis)}</span>
              <span className="text-[var(--text-muted)]">
                ·{' '}
                {activeDay.activities.length > 0
                  ? `${activeDay.activities.length} activity${
                      activeDay.activities.length > 1 ? 'ies' : ''
                    }`
                  : 'Rest Day'}
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
              <span>
                <span style={{ color: readableText('#e11d48', isDark) }}>ATL:</span>{' '}
                {activeDay.atl.toFixed(0)}
              </span>
              <span>
                <span style={{ color: readableText('#3b82f6', isDark) }}>CTL:</span>{' '}
                {activeDay.ctl.toFixed(0)}
              </span>
              <span>
                <span style={{ color: readableText('#f59e0b', isDark) }}>TSB:</span>{' '}
                {activeDay.tsb >= 0 ? `+${activeDay.tsb.toFixed(0)}` : activeDay.tsb.toFixed(0)}
              </span>
              <span className="text-[var(--text-muted)]">TSS {Math.round(activeDay.tss)}</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);
