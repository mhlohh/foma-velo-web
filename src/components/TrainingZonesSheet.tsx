import React from 'react';
import { motion } from 'motion/react';
import { Heart, Zap, X } from 'lucide-react';
import { UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';
import { useTheme } from '../context/ThemeContext';
import { readableText } from '../utils/contrastText';

interface TrainingZonesSheetProps {
  settings: UserSettings;
  onDismiss: () => void;
}

export const TrainingZonesSheet: React.FC<TrainingZonesSheetProps> = ({
  settings,
  onDismiss,
}) => {
  const { isDark } = useTheme();
  const powerZones = PmcEngine.getPowerZones(settings.ftp);
  const hrZones = PmcEngine.getHrZones(settings.lthr);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      data-testid="training_zones_sheet"
      style={{ backgroundColor: 'var(--bg-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="ff-surface-card rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Training Intensity Zones</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              FTP {settings.ftp}W · LTHR {settings.lthr} bpm
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coggan Power Zones Z1-Z7 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)]">
            <Zap className="w-3.5 h-3.5" />
            <span>Power Zones (Coggan iLevels)</span>
          </div>

          <div className="space-y-1.5">
            {powerZones.map((zone) => (
              <div
                key={zone.name}
                className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)] rounded-xl px-3 py-2 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: zone.colorHex }}
                  />
                  <div>
                    <span className="font-medium block text-[var(--text-primary)]">
                      {zone.name}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {zone.percentRange}
                    </span>
                  </div>
                </div>
                <span
                  className="font-semibold font-mono"
                  style={{ color: readableText(zone.colorHex, isDark) }}
                >
                  {zone.rangeWatts}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Friel Heart Rate Zones Z1-Z5 */}
        <div className="space-y-2 pt-2">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: readableText('#e11d48', isDark) }}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Heart Rate Zones (Friel)</span>
          </div>

          <div className="space-y-1.5">
            {hrZones.map((zone) => (
              <div
                key={zone.name}
                className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)] rounded-xl px-3 py-2 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: zone.colorHex }}
                  />
                  <div>
                    <span className="font-medium block text-[var(--text-primary)]">
                      {zone.name}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {zone.percentRange}
                    </span>
                  </div>
                </div>
                <span
                  className="font-semibold font-mono"
                  style={{ color: readableText(zone.colorHex, isDark) }}
                >
                  {zone.rangeBpm}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="ff-btn-sage px-4 py-2 text-xs font-semibold rounded-lg"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
