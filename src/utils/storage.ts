import { ActivityEntity, CalculationMode, UserSettings } from '../types';
import { generatePresetSampleData } from './sampleData';

const ACTIVITIES_KEY = 'foma_velo_activities';
const SETTINGS_KEY = 'foma_velo_settings';
const DARK_MODE_KEY = 'foma_velo_dark_mode';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ftp: 250,
  lthr: 168,
  maxHr: 190,
  weightKg: 72.0,
  calculationMode: CalculationMode.AUTO,
  ctlDays: 42,
  atlDays: 7,
};

export const MOCK_SAMPLE_NAMES = [
  'Easy Recovery Spin',
  'Zwift - 3x12m SweetSpot Intervals',
  'Tuesday Night SST Repeats',
  'Mid-week Zone 2 Aerobic Base',
  'Zwift Racing League - Crit Sprint',
  'Saturday Alpine Ridge Endurance Ride',
  'Sunday Paceline & Espresso Ride',
  '[PLANNED] 4x8m VO2Max Intervals',
  '[PLANNED] Weekend Century Gran Fondo',
];

const MOCK_SAMPLE_NAME_SET = new Set(MOCK_SAMPLE_NAMES);

export function isMockSampleActivity(activity: ActivityEntity): boolean {
  if (activity.stravaActivityId) return false;
  if (activity.id >= 1000 && activity.id < 10000 && !activity.isManual) {
    return true;
  }
  if (MOCK_SAMPLE_NAME_SET.has((activity.name || '').trim()) && !activity.isManual) {
    return true;
  }
  return false;
}

export function loadStoredActivities(): ActivityEntity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((a: ActivityEntity) => !isMockSampleActivity(a));
      if (cleaned.length !== parsed.length) {
        saveStoredActivities(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error('Error loading stored activities:', e);
    return [];
  }
}

export function saveStoredActivities(activities: ActivityEntity[]): void {
  try {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  } catch (e) {
    console.error('Error saving activities:', e);
  }
}

export function loadStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading settings:', e);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function loadDarkModePreference(): boolean {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

export function saveDarkModePreference(isDark: boolean): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, String(isDark));
  } catch (e) {
    console.error('Error saving dark mode preference:', e);
  }
}
