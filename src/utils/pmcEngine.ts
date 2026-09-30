import {
  ActivityEntity,
  CalculationMode,
  DailyPmcData,
  FormStatusInfo,
  HrZoneInfo,
  PmcSummary,
  PowerZoneInfo,
  UserSettings,
} from '../types';

export const FORM_STATUSES: Record<string, FormStatusInfo> = {
  HIGH_RISK: {
    id: 'HIGH_RISK',
    title: 'Overreaching / High Fatigue',
    description: 'TSB < -30. High risk of burnout or injury. Consider a rest day.',
    colorHex: '#EF4444',
  },
  OPTIMAL_TRAINING: {
    id: 'OPTIMAL_TRAINING',
    title: 'Productive Training Zone',
    description: 'TSB -30 to -10. Building strong cardiovascular & muscular fitness.',
    colorHex: '#3B82F6',
  },
  NEUTRAL: {
    id: 'NEUTRAL',
    title: 'Maintenance Zone',
    description: 'TSB -10 to +5. Balanced training load.',
    colorHex: '#10B981',
  },
  RACE_READY: {
    id: 'RACE_READY',
    title: 'Race Ready / Peak Form',
    description: 'TSB +5 to +25. High freshness and primed for peak event performance!',
    colorHex: '#F59E0B',
  },
  TRANSITION: {
    id: 'TRANSITION',
    title: 'Fresh / Loss of Fitness',
    description: 'TSB > +25. Very well rested, but fitness will begin to decay if sustained.',
    colorHex: '#8B5CF6',
  },
};

export class PmcEngine {
  static calculateSingleActivityTss(
    activity: ActivityEntity,
    settings: UserSettings
  ): number {
    // If TSS is explicitly supplied in Strava export
    if (activity.stravaTss !== null && activity.stravaTss !== undefined && activity.stravaTss > 0) {
      return activity.stravaTss;
    }

    const mode = settings.calculationMode;
    const durationSec = activity.movingTimeSec;
    if (durationSec <= 0) return 0;

    const powerTss = this.calculatePowerTss(activity, settings.ftp, durationSec);
    const hrTss = this.calculateHrTss(activity, settings.lthr, durationSec);

    switch (mode) {
      case CalculationMode.POWER:
        return powerTss ?? hrTss ?? this.estimateFallbackTss(durationSec);
      case CalculationMode.HEART_RATE:
        return hrTss ?? powerTss ?? this.estimateFallbackTss(durationSec);
      case CalculationMode.AUTO:
      default:
        return powerTss ?? hrTss ?? this.estimateFallbackTss(durationSec);
    }
  }

  static resolveActivityTssSource(
    activity: ActivityEntity,
    settings: UserSettings
  ): string {
    if (activity.stravaTss !== null && activity.stravaTss !== undefined && activity.stravaTss > 0) {
      return 'Strava Load';
    }
    const durationSec = activity.movingTimeSec;
    if (durationSec <= 0) return 'Estimated';

    const hasPower =
      this.calculatePowerTss(activity, settings.ftp, durationSec) !== null;
    const hasHr =
      this.calculateHrTss(activity, settings.lthr, durationSec) !== null;

    if (settings.calculationMode === CalculationMode.HEART_RATE) {
      if (hasHr) return 'Heart Rate';
      if (hasPower) return 'Power';
      return 'Estimated';
    }

    if (hasPower) return 'Power';
    if (hasHr) return 'Heart Rate';
    return 'Estimated';
  }

  private static calculatePowerTss(
    activity: ActivityEntity,
    ftp: number,
    durationSec: number
  ): number | null {
    const np =
      activity.weightedWatts ??
      (activity.avgWatts && activity.avgWatts > 0 ? activity.avgWatts * 1.05 : null);
    if (!np || np <= 0 || !ftp || ftp <= 0) return null;

    const intensityFactor = np / ftp;
    return ((durationSec * np * intensityFactor) / (ftp * 3600)) * 100;
  }

  private static calculateHrTss(
    activity: ActivityEntity,
    lthr: number,
    durationSec: number
  ): number | null {
    const avgHr = activity.avgHr;
    if (!avgHr || avgHr <= 0 || !lthr || lthr <= 0) return null;

    const hrFactor = avgHr / lthr;
    // Exponential factor for cardiovascular stress
    return (durationSec / 3600) * 100 * Math.pow(hrFactor, 2.0);
  }

  private static estimateFallbackTss(durationSec: number): number {
    // ~50 TSS per hour moderate endurance baseline
    return (durationSec / 3600) * 50;
  }

  static computePmc(
    activities: ActivityEntity[],
    settings: UserSettings,
    futureDaysHorizon: number = 30
  ): PmcSummary {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayMillis = now.getTime();

    const sortedActivities = [...activities].sort((a, b) => a.dateMillis - b.dateMillis);

    // Find earliest date
    const earliestMillis =
      sortedActivities.length > 0
        ? Math.min(sortedActivities[0].dateMillis, todayMillis - 60 * 86400000)
        : todayMillis - 90 * 86400000;

    const startCal = new Date(earliestMillis);
    startCal.setHours(0, 0, 0, 0);

    const latestActivityMillis =
      sortedActivities.length > 0
        ? sortedActivities[sortedActivities.length - 1].dateMillis
        : todayMillis;

    const endCal = new Date(Math.max(todayMillis, latestActivityMillis));
    endCal.setDate(endCal.getDate() + futureDaysHorizon);
    endCal.setHours(0, 0, 0, 0);

    // Group activities by date string "YYYY-MM-DD"
    const activityMap = new Map<string, ActivityEntity[]>();
    for (const act of sortedActivities) {
      const d = new Date(act.dateMillis);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!activityMap.has(key)) {
        activityMap.set(key, []);
      }
      activityMap.get(key)!.push(act);
    }

    let currentCtl = 0;
    let currentAtl = 0;

    const dailyList: DailyPmcData[] = [];
    const currCal = new Date(startCal.getTime());

    const ctlAlpha = 1.0 / (settings.ctlDays || 42); // e.g. 1/42
    const atlAlpha = 1.0 / (settings.atlDays || 7);  // e.g. 1/7

    let ctlToday = 0;
    let atlToday = 0;
    let tsbToday = 0;
    let ctl7DaysAgo = 0;
    let totalTssLast7d = 0;

    const nonPlannedActivities = sortedActivities.filter((it) => !it.isPlanned);
    const totalDist = nonPlannedActivities.reduce((acc, curr) => acc + curr.distanceMeters, 0) / 1000.0;
    const totalTime = nonPlannedActivities.reduce((acc, curr) => acc + curr.movingTimeSec, 0);

    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    while (currCal.getTime() <= endCal.getTime()) {
      const dateMillis = currCal.getTime();
      const dateKey = `${currCal.getFullYear()}-${String(currCal.getMonth() + 1).padStart(2, '0')}-${String(currCal.getDate()).padStart(2, '0')}`;
      const isFuture = dateMillis > todayMillis;

      const dayActivities = activityMap.get(dateKey) ?? [];
      const dayTss = dayActivities.reduce(
        (sum, act) => sum + this.calculateSingleActivityTss(act, settings),
        0
      );

      const tsb = currentCtl - currentAtl;
      currentCtl += (dayTss - currentCtl) * ctlAlpha;
      currentAtl += (dayTss - currentAtl) * atlAlpha;

      const item: DailyPmcData = {
        dateMillis,
        dateString: dateKey,
        tss: dayTss,
        ctl: currentCtl,
        atl: currentAtl,
        tsb,
        isFuture,
        activities: dayActivities,
      };
      dailyList.push(item);

      if (dateKey === todayKey) {
        ctlToday = currentCtl;
        atlToday = currentAtl;
        tsbToday = tsb;
      }

      currCal.setDate(currCal.getDate() + 1);
    }

    // Calculate weekly stats (Calendar Week: Mon - Sun) and 7-day ramp rate up to today
    const todayIndex = dailyList.findIndex(
      (d) => d.dateString === todayKey
    );
    const effectiveTodayIndex = todayIndex >= 0 ? todayIndex : dailyList.length - 1;

    let weeklyTss = 0;
    let weeklyDistanceKm = 0;
    let weeklyMovingTimeSec = 0;

    if (effectiveTodayIndex >= 0) {
      const todayPmc = dailyList[effectiveTodayIndex];
      ctlToday = todayPmc.ctl;
      atlToday = todayPmc.atl;
      tsbToday = todayPmc.tsb;

      // 7-day rolling ramp rate (CTL change over past 7 days)
      const ctlBefore7dIndex = Math.max(0, effectiveTodayIndex - 7);
      ctl7DaysAgo = dailyList[ctlBefore7dIndex].ctl;

      // 7-day rolling TSS for reference
      const index7DaysAgo = Math.max(0, effectiveTodayIndex - 6);
      totalTssLast7d = 0;
      for (let i = index7DaysAgo; i <= effectiveTodayIndex; i++) {
        totalTssLast7d += dailyList[i].tss;
      }

      // Calendar Week (Monday to Sunday):
      // In JavaScript getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday.
      const [ty, tm, td] = todayPmc.dateString.split('-').map(Number);
      const todayDate = new Date(ty, tm - 1, td);
      const dayOfWeek = todayDate.getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7; // Monday = 0, Tuesday = 1, ..., Saturday = 5, Sunday = 6
      const mondayIndex = Math.max(0, effectiveTodayIndex - daysSinceMonday);
      // End of this calendar week (Sunday), bounded by available dailyList
      const sundayIndex = Math.min(dailyList.length - 1, mondayIndex + 6);

      weeklyTss = 0;
      weeklyDistanceKm = 0;
      weeklyMovingTimeSec = 0;

      for (let i = mondayIndex; i <= sundayIndex; i++) {
        weeklyTss += dailyList[i].tss;
        for (const act of dailyList[i].activities) {
          weeklyDistanceKm += (act.distanceMeters || 0) / 1000;
          weeklyMovingTimeSec += (act.movingTimeSec || 0);
        }
      }
    }

    const rampRate = ctlToday - ctl7DaysAgo;

    let formStatusKey = 'NEUTRAL';
    if (tsbToday < -30) {
      formStatusKey = 'HIGH_RISK';
    } else if (tsbToday < -10) {
      formStatusKey = 'OPTIMAL_TRAINING';
    } else if (tsbToday < 5) {
      formStatusKey = 'NEUTRAL';
    } else if (tsbToday <= 25) {
      formStatusKey = 'RACE_READY';
    } else {
      formStatusKey = 'TRANSITION';
    }

    return {
      currentCtl: ctlToday,
      currentAtl: atlToday,
      currentTsb: tsbToday,
      rampRate7d: rampRate,
      totalTssLast7d,
      weeklyTss,
      weeklyDistanceKm,
      weeklyHours: weeklyMovingTimeSec / 3600,
      totalDistanceKm: totalDist,
      totalMovingTimeSec: totalTime,
      formStatus: FORM_STATUSES[formStatusKey],
      dailyList,
    };
  }

  static getPowerZones(ftp: number): PowerZoneInfo[] {
    return [
      { name: 'Z1 Active Recovery', rangeWatts: `< ${Math.floor(ftp * 0.55)} W`, percentRange: '< 55% FTP', colorHex: '#94A3B8' },
      { name: 'Z2 Endurance', rangeWatts: `${Math.floor(ftp * 0.55)} - ${Math.floor(ftp * 0.75)} W`, percentRange: '55% - 75% FTP', colorHex: '#3B82F6' },
      { name: 'Z3 Tempo', rangeWatts: `${Math.floor(ftp * 0.75)} - ${Math.floor(ftp * 0.90)} W`, percentRange: '75% - 90% FTP', colorHex: '#10B981' },
      { name: 'Z4 SweetSpot / Threshold', rangeWatts: `${Math.floor(ftp * 0.90)} - ${Math.floor(ftp * 1.05)} W`, percentRange: '90% - 105% FTP', colorHex: '#F59E0B' },
      { name: 'Z5 VO2 Max', rangeWatts: `${Math.floor(ftp * 1.05)} - ${Math.floor(ftp * 1.20)} W`, percentRange: '105% - 120% FTP', colorHex: '#EF4444' },
      { name: 'Z6 Anaerobic Capacity', rangeWatts: `${Math.floor(ftp * 1.20)} - ${Math.floor(ftp * 1.50)} W`, percentRange: '120% - 150% FTP', colorHex: '#A855F7' },
      { name: 'Z7 Neuromuscular', rangeWatts: `> ${Math.floor(ftp * 1.50)} W`, percentRange: '> 150% FTP', colorHex: '#EC4899' },
    ];
  }

  static getHrZones(lthr: number): HrZoneInfo[] {
    return [
      { name: 'Z1 Active Recovery', rangeBpm: `< ${Math.floor(lthr * 0.68)} bpm`, percentRange: '< 68% LTHR', colorHex: '#94A3B8' },
      { name: 'Z2 Aerobic Endurance', rangeBpm: `${Math.floor(lthr * 0.68)} - ${Math.floor(lthr * 0.83)} bpm`, percentRange: '68% - 83% LTHR', colorHex: '#3B82F6' },
      { name: 'Z3 Tempo', rangeBpm: `${Math.floor(lthr * 0.83)} - ${Math.floor(lthr * 0.94)} bpm`, percentRange: '83% - 94% LTHR', colorHex: '#10B981' },
      { name: 'Z4 Threshold', rangeBpm: `${Math.floor(lthr * 0.94)} - ${Math.floor(lthr * 1.05)} bpm`, percentRange: '94% - 105% LTHR', colorHex: '#F59E0B' },
      { name: 'Z5 Anaerobic', rangeBpm: `> ${Math.floor(lthr * 1.05)} bpm`, percentRange: '> 105% LTHR', colorHex: '#EF4444' },
    ];
  }
}
