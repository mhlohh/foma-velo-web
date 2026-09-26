/**
 * Contrast-safe text colors.
 *
 * Chart / brand colors are chosen for graphic clarity (lines, bars, legend
 * swatches). When those same colors are used for *text*, several fail WCAG AA
 * on white (#f59e0b amber is 2.15:1, #10B981 emerald is 2.54:1). This helper
 * maps every chart color to a darker (light theme) or lighter (dark theme)
 * text variant that passes AA ≥ 4.5:1 against the surfaces actually used.
 */

export interface ReadableColors {
  /** Text color for light theme surfaces (white / slate-50 / #eef3fd). */
  light: string;
  /** Text color for dark theme surfaces (slate-800 / slate-900). */
  dark: string;
}

const MAP: Record<string, ReadableColors> = {
  // Chart / brand source colors
  '#f59e0b': { light: '#b45309', dark: '#fbbf24' }, // amber (Form)
  '#fbbf24': { light: '#b45309', dark: '#fbbf24' },
  '#10b981': { light: '#047857', dark: '#34d399' }, // emerald
  '#34d399': { light: '#047857', dark: '#34d399' },
  '#e11d48': { light: '#be123c', dark: '#fb7185' }, // ATL pink/rose
  '#fb7185': { light: '#be123c', dark: '#fb7185' },
  '#ec4899': { light: '#be185d', dark: '#f472b6' }, // pink
  '#f472b6': { light: '#be185d', dark: '#f472b6' },
  '#ef4444': { light: '#b91c1c', dark: '#f87171' }, // red
  '#f87171': { light: '#b91c1c', dark: '#f87171' },
  '#1d4ed8': { light: '#1d4ed8', dark: '#93c5fd' }, // CTL blue
  '#93c5fd': { light: '#1d4ed8', dark: '#93c5fd' },
  '#2f6fe4': { light: '#245cc4', dark: '#7cabf5' }, // brand blue
  '#245cc4': { light: '#245cc4', dark: '#7cabf5' },
  '#3b82f6': { light: '#1d4ed8', dark: '#93c5fd' }, // blue-500
  '#8b5cf6': { light: '#6d28d9', dark: '#c4b5fd' }, // violet
  '#a855f7': { light: '#7e22ce', dark: '#d8b4fe' }, // purple
  '#94a3b8': { light: '#475569', dark: '#cbd5e1' }, // slate swatch
  '#a16207': { light: '#854d0e', dark: '#fbbf24' },
};

// Case-insensitive lookup
export function readableText(hex: string, isDark: boolean): string {
  if (!hex) return hex;
  const hit = MAP[hex.trim().toLowerCase()];
  if (hit) return isDark ? hit.dark : hit.light;
  return hex;
}
