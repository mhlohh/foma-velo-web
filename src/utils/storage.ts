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

export function loadStoredActivities(): ActivityEntity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (!raw) {
      const defaultSample = generatePresetSampleData();
      saveStoredActivities(defaultSample);
      return defaultSample;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const defaultSample = generatePresetSampleData();
    saveStoredActivities(defaultSample);
    return defaultSample;
  } catch (e) {
    console.error('Error loading stored activities:', e);
    return generatePresetSampleData();
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
