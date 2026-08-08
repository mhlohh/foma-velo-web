import React from 'react';
import { Heart, Zap, X } from 'lucide-react';
import { UserSettings } from '../types';
import { PmcEngine } from '../utils/pmcEngine';

interface TrainingZonesSheetProps {
  settings: UserSettings;
  onDismiss: () => void;
}

export const TrainingZonesSheet: React.FC<TrainingZonesSheetProps> = ({
  settings,
  onDismiss,
}) => {
  const powerZones = PmcEngine.getPowerZones(settings.ftp);
  const hrZones = PmcEngine.getHrZones(settings.lthr);

  return (
    <div
      data-testid="training_zones_sheet"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Training Intensity Zones</h3>
            <p className="text-xs text-slate-400">
              Based on FTP ({settings.ftp}W) and LTHR ({settings.lthr} bpm)
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coggan Power Zones Z1-Z7 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Zap className="w-4 h-4" />
            <span>Power Zones (Coggan iLevels)</span>
          </div>

          <div className="space-y-1.5">
            {powerZones.map((zone) => (
              <div
                key={zone.name}
                className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: zone.colorHex }}
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">{zone.name}</span>
                    <span className="text-[10px] text-slate-400">{zone.percentRange}</span>
                  </div>
                </div>
                <span className="font-bold font-mono" style={{ color: zone.colorHex }}>
                  {zone.rangeWatts}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Friel Heart Rate Zones Z1-Z5 */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
            <Heart className="w-4 h-4" />
            <span>Heart Rate Zones (Friel)</span>
          </div>

          <div className="space-y-1.5">
            {hrZones.map((zone) => (
              <div
                key={zone.name}
                className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: zone.colorHex }}
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">{zone.name}</span>
                    <span className="text-[10px] text-slate-400">{zone.percentRange}</span>
                  </div>
                </div>
                <span className="font-bold font-mono" style={{ color: zone.colorHex }}>
                  {zone.rangeBpm}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
