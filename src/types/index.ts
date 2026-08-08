export interface ActivityEntity {
  id: number;
  stravaActivityId?: string | null;
  dateMillis: number;
  name: string;
  type: string; // Ride, VirtualRide, Gravel, Mountain Bike, Run, etc.
  movingTimeSec: number;
  elapsedTimeSec: number;
  distanceMeters: number;
  elevationGainMeters: number;
  avgWatts?: number | null;
  maxWatts?: number | null;
  weightedWatts?: number | null; // Normalized Power (NP)
  avgHr?: number | null;
  maxHr?: number | null;
  kilojoules?: number | null;
  stravaTss?: number | null;
  isPlanned: boolean;
  notes?: string | null;
}

export enum CalculationMode {
  AUTO = 'AUTO',
  POWER = 'POWER',
  HEART_RATE = 'HEART_RATE',
}

export interface CalculationModeInfo {
  mode: CalculationMode;
  label: string;
  description: string;
}

export const CALCULATION_MODES: Record<CalculationMode, CalculationModeInfo> = {
  [CalculationMode.AUTO]: {
    mode: CalculationMode.AUTO,
    label: 'Combined (Auto)',
    description: 'Uses Power TSS when available, falls back to Heart Rate TSS (hrTSS)',
  },
  [CalculationMode.POWER]: {
    mode: CalculationMode.POWER,
    label: 'Power Only',
    description: 'Strictly calculates TSS from Normalized Power & FTP',
  },
  [CalculationMode.HEART_RATE]: {
    mode: CalculationMode.HEART_RATE,
    label: 'Heart Rate Only',
    description: 'Strictly calculates hrTSS / TRIMP from heart rate and LTHR',
  },
};

export interface UserSettings {
  ftp: number; // e.g. 250
  lthr: number; // e.g. 168
  maxHr: number; // e.g. 190
  weightKg: number; // e.g. 72.0
  calculationMode: CalculationMode;
  ctlDays: number; // 42
  atlDays: number; // 7
}

export interface DailyPmcData {
  dateMillis: number;
  dateString: string; // "yyyy-MM-dd"
  tss: number;
  ctl: number; // Fitness
  atl: number; // Fatigue
  tsb: number; // Form / Readiness = CTL - ATL
  isFuture: boolean;
  activities: ActivityEntity[];
}

export interface FormStatusInfo {
  id: 'HIGH_RISK' | 'OPTIMAL_TRAINING' | 'NEUTRAL' | 'RACE_READY' | 'TRANSITION';
  title: string;
  description: string;
  colorHex: string;
}

export interface PmcSummary {
  currentCtl: number;
  currentAtl: number;
  currentTsb: number;
  rampRate7d: number;
  totalTssLast7d: number;
  totalDistanceKm: number;
  totalMovingTimeSec: number;
  formStatus: FormStatusInfo;
  dailyList: DailyPmcData[];
}

export interface PowerZoneInfo {
  name: string;
  rangeWatts: string;
  percentRange: string;
  colorHex: string;
}

export interface HrZoneInfo {
  name: string;
  rangeBpm: string;
  percentRange: string;
  colorHex: string;
}

export interface FilterParams {
  typeFilter: string | null;
  horizonDays: number; // 30, 60, 90, 180, -1
  includePlanned: boolean;
  searchQuery: string;
}
