import { ActivityEntity } from '../types';

export function generatePresetSampleData(): ActivityEntity[] {
  const sampleActivities: ActivityEntity[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Pseudo-random helper with seed for consistency
  let seed = 42;
  function random(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  // Start 90 days ago
  const startDate = new Date(now.getTime() - 90 * 86400000);

  for (let i = 0; i <= 90; i++) {
    const currentDate = new Date(startDate.getTime() + i * 86400000);
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dateMillis = currentDate.getTime();

    switch (dayOfWeek) {
      case 1: // Monday
        // Rest day - 80% rest, 20% easy spin
        if (random() < 0.25) {
          sampleActivities.push({
            id: 1000 + i,
            dateMillis,
            name: 'Easy Recovery Spin',
            type: 'Ride',
            movingTimeSec: 2700, // 45 min
            elapsedTimeSec: 2850,
            distanceMeters: 18500,
            elevationGainMeters: 80,
            avgWatts: 135,
            maxWatts: 210,
            weightedWatts: 142,
            avgHr: 118,
            maxHr: 132,
            kilojoules: 365,
            isPlanned: false,
          });
        }
        break;

      case 2: // Tuesday
        {
          const isZwift = i % 2 === 0;
          sampleActivities.push({
            id: 1000 + i,
            dateMillis,
            name: isZwift ? 'Zwift - 3x12m SweetSpot Intervals' : 'Tuesday Night SST Repeats',
            type: isZwift ? 'VirtualRide' : 'Ride',
            movingTimeSec: 4500, // 1h 15m
            elapsedTimeSec: 4620,
            distanceMeters: 38000,
            elevationGainMeters: 320,
            avgWatts: 215,
            maxWatts: 340,
            weightedWatts: 232,
            avgHr: 152,
            maxHr: 171,
            kilojoules: 967,
            isPlanned: false,
          });
        }
        break;

      case 3: // Wednesday
        sampleActivities.push({
          id: 1000 + i,
          dateMillis,
          name: 'Mid-week Zone 2 Aerobic Base',
          type: 'Ride',
          movingTimeSec: 5400, // 1h 30m
          elapsedTimeSec: 5700,
          distanceMeters: 44500,
          elevationGainMeters: 240,
          avgWatts: 185,
          maxWatts: 275,
          weightedWatts: 192,
          avgHr: 138,
          maxHr: 154,
          kilojoules: 999,
          isPlanned: false,
        });
        break;

      case 4: // Thursday
        sampleActivities.push({
          id: 1000 + i,
          dateMillis,
          name: 'Zwift Racing League - Crit Sprint',
          type: 'VirtualRide',
          movingTimeSec: 3600, // 1h
          elapsedTimeSec: 3660,
          distanceMeters: 34000,
          elevationGainMeters: 180,
          avgWatts: 238,
          maxWatts: 680,
          weightedWatts: 258,
          avgHr: 166,
          maxHr: 183,
          kilojoules: 856,
          isPlanned: false,
        });
        break;

      case 5: // Friday
        // Rest day
        break;

      case 6: // Saturday
        {
          const distKm = 75 + Math.floor(random() * 45);
          const timeHours = distKm / 27.0;
          const elevation = distKm * 14.0;
          sampleActivities.push({
            id: 1000 + i,
            dateMillis,
            name: 'Saturday Alpine Ridge Endurance Ride',
            type: 'Gravel',
            movingTimeSec: Math.floor(timeHours * 3600),
            elapsedTimeSec: Math.floor(timeHours * 3800),
            distanceMeters: distKm * 1000,
            elevationGainMeters: elevation,
            avgWatts: 198,
            maxWatts: 420,
            weightedWatts: 214,
            avgHr: 148,
            maxHr: 175,
            kilojoules: Math.floor(timeHours * 720),
            isPlanned: false,
          });
        }
        break;

      case 0: // Sunday
        sampleActivities.push({
          id: 1000 + i,
          dateMillis,
          name: 'Sunday Paceline & Espresso Ride',
          type: 'Ride',
          movingTimeSec: 7200, // 2h
          elapsedTimeSec: 8100,
          distanceMeters: 58000,
          elevationGainMeters: 410,
          avgWatts: 190,
          maxWatts: 510,
          weightedWatts: 208,
          avgHr: 142,
          maxHr: 168,
          kilojoules: 1368,
          isPlanned: false,
        });
        break;
    }
  }

  // Add 2 future planned workouts for next week
  const plannedDate1 = new Date(now.getTime() + 2 * 86400000);
  sampleActivities.push({
    id: 9001,
    dateMillis: plannedDate1.getTime(),
    name: '[PLANNED] 4x8m VO2Max Intervals',
    type: 'Ride',
    movingTimeSec: 4500,
    elapsedTimeSec: 4500,
    distanceMeters: 35000,
    elevationGainMeters: 250,
    avgWatts: 240,
    weightedWatts: 260,
    avgHr: 168,
    stravaTss: 95,
    isPlanned: true,
    notes: 'Target 115% FTP during work efforts',
  });

  const plannedDate2 = new Date(now.getTime() + 5 * 86400000);
  sampleActivities.push({
    id: 9002,
    dateMillis: plannedDate2.getTime(),
    name: '[PLANNED] Weekend Century Gran Fondo',
    type: 'Gravel',
    movingTimeSec: 14400, // 4h
    elapsedTimeSec: 15000,
    distanceMeters: 110000,
    elevationGainMeters: 1200,
    avgWatts: 200,
    weightedWatts: 215,
    avgHr: 148,
    stravaTss: 220,
    isPlanned: true,
    notes: 'Pacing target 0.78 IF',
  });

  return sampleActivities;
}
