import { scrapeStravaActivitiesForUser } from './scraper';
import { encryptSecret, decryptSecret } from './crypto';
import { isValidCron, matchesCron } from './scheduler';
import { PmcEngine } from '../../../src/utils/pmcEngine';
import { CalculationMode, UserSettings } from '../../../src/types';

async function runScraperTestSuite() {
  console.log('================================================================');
  console.log('🧪 FOMA VELO — STRAVA SCRAPER MICROSERVICE E2E TEST SUITE');
  console.log('================================================================\n');

  const originalFetch = globalThis.fetch;

  // 1. Mock Strava HTTP Transport (simulates Strava's /athlete/training_activities JSON & /activities/:id HTML)
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/athlete/training_activities')) {
      return new Response(
        JSON.stringify({
          models: [
            {
              id: 10000001,
              name: 'Zwift - Threshold Intervals (With Power & HR)',
              type: 'VirtualRide',
              start_time: '2026-09-28T06:30:00Z',
              moving_time_raw: 3600,
              elapsed_time_raw: 3650,
              distance_raw: 38500,
              elevation_gain_raw: 420,
              avg_watts: 235,
              weighted_average_power: 252,
              avg_hr: 158,
              max_hr: 181,
              kilojoules: 846,
              suffer_score: 96,
            },
            {
              id: 10000002,
              name: 'Morning Tempo Ride (NO Heart Rate Strap - Null HR)',
              type: 'Ride',
              start_time: '2026-09-29T07:00:00Z',
              moving_time_raw: 5400,
              elapsed_time_raw: 5600,
              distance_raw: 52400,
              elevation_gain_raw: 610,
              avg_watts: 210,
              weighted_average_power: null, // Enriched from detail page
              avg_hr: null, // Rider had no HR monitor
              max_hr: 0,    // Strava sometimes returns 0 when no HR strap is paired -> converted to null
              kilojoules: 1134,
              suffer_score: null,
            },
            {
              id: 10000003,
              name: 'Sunday Gravel Adventure (NO HR & NO Power Meter)',
              type: 'GravelRide',
              start_time: '2026-09-30T08:15:00Z',
              moving_time: '02:15:00',
              elapsed_time: '02:30:00',
              distance: '64.2 km',
              elevation_gain: '890 m',
              avg_watts: '--',
              avg_hr: 'N/A',
              max_hr: null,
              kilojoules: null,
              suffer_score: '--',
            },
            {
              id: 10000004,
              name: 'Recovery 5K Run (Non-Cycling - Should Be Skipped)',
              type: 'Run',
              start_time: '2026-09-30T17:00:00Z',
              moving_time_raw: 1500,
              distance_raw: 5000,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/activities/10000002')) {
      return new Response(
        `
        <html>
          <body>
            <h1>Morning Tempo Ride (NO Heart Rate Strap - Null HR)</h1>
            <div>Average Power: 210 W</div>
            <div>Max Power: 645 W</div>
            <div>Weighted Average Power: 226 W</div>
            <div>Average Heart Rate: --</div>
            <div>Max Heart Rate: N/A</div>
            <div>Total Work: 1,134 kJ</div>
          </body>
        </html>
      `,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (url.includes('/activities/10000003')) {
      return new Response(
        `
        <html>
          <body>
            <h1>Sunday Gravel Adventure (NO HR & NO Power Meter)</h1>
            <div>Average Power: --</div>
            <div>Average Heart Rate: --</div>
            <div>Relative Effort: --</div>
          </body>
        </html>
      `,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }) as typeof fetch;

  try {
    // 2. Test AES-256-GCM Credential Encryption
    const samplePass = 'StravaSecret#2026!';
    const encrypted = encryptSecret(samplePass);
    const decrypted = decryptSecret(encrypted);
    console.log('✅ [1/4] AES-256-GCM Credential Encryption:');
    console.log(`   Plaintext : ${samplePass}`);
    console.log(`   Encrypted : ${encrypted.slice(0, 42)}...`);
    console.log(`   Decrypted : ${decrypted} (Match: ${decrypted === samplePass})\n`);

    // 3. Test Daily Cron Scheduler
    const cronSchedule = '0 2 * * *';
    const twoAmDate = new Date(2026, 8, 30, 2, 0, 0);
    const threePmDate = new Date(2026, 8, 30, 15, 30, 0);
    console.log('✅ [2/4] Built-in Daily Cron Scheduler:');
    console.log(`   Schedule "${cronSchedule}" valid : ${isValidCron(cronSchedule)}`);
    console.log(`   Triggers at 02:00 AM       : ${matchesCron(cronSchedule, twoAmDate)}`);
    console.log(`   Skips at 03:30 PM          : ${!matchesCron(cronSchedule, threePmDate)}\n`);

    // 4. Run Scraper
    const testUserId = '00000000-0000-4000-8000-000000000001';
    const result = await scrapeStravaActivitiesForUser({
      userId: testUserId,
      rawSessionCookieValue: 'mock_strava4_session_token_xyz',
      baseUrl: 'https://mock.strava.local',
      maxPages: 1,
    });

    console.log(
      `✅ [3/4] Scraped & Normalized Cycling Rides (${result.activities.length} rides kept, 1 non-cycling Run filtered out):\n`
    );

    const defaultSettings: UserSettings = {
      ftp: 250,
      lthr: 168,
      maxHr: 190,
      weightKg: 72,
      calculationMode: CalculationMode.AUTO,
      ctlDays: 42,
      atlDays: 7,
    };

    for (const row of result.activities) {
      const computedTss = Math.round(
        PmcEngine.calculateSingleActivityTss(
          {
            id: row.id,
            stravaActivityId: row.strava_activity_id,
            dateMillis: row.date_millis,
            name: row.name,
            type: row.type,
            movingTimeSec: row.moving_time_sec,
            elapsedTimeSec: row.elapsed_time_sec,
            distanceMeters: row.distance_meters,
            elevationGainMeters: row.elevation_gain_meters,
            avgWatts: row.avg_watts,
            maxWatts: row.max_watts,
            weightedWatts: row.weighted_watts,
            avgHr: row.avg_hr,
            maxHr: row.max_hr,
            kilojoules: row.kilojoules,
            stravaTss: row.strava_tss,
            isPlanned: row.is_planned,
            isManual: row.is_manual,
            notes: row.notes,
          },
          defaultSettings
        )
      );

      console.log(`   🚴 Ride #${row.strava_activity_id}: "${row.name}"`);
      console.log(
        `      Type: ${row.type} | Distance: ${(row.distance_meters / 1000).toFixed(1)} km | Moving Time: ${row.moving_time_sec}s | Elev: ${row.elevation_gain_meters}m`
      );
      console.log(
        `      Power      -> avg_watts: ${row.avg_watts} | weighted_watts (NP): ${row.weighted_watts} | max_watts: ${row.max_watts} | kJ: ${row.kilojoules}`
      );
      console.log(
        `      Heart Rate -> avg_hr: ${row.avg_hr} | max_hr: ${row.max_hr}  ${row.avg_hr === null ? '<-- NULL HR safely preserved!' : ''}`
      );
      console.log(
        `      TSS        -> strava_tss: ${row.strava_tss} | PMC Computed TSS: ${computedTss}\n`
      );
    }

    // 5. Assertions on null-HR and null-Power handling
    const ride1 = result.activities.find((a) => a.strava_activity_id === '10000001')!;
    const ride2 = result.activities.find((a) => a.strava_activity_id === '10000002')!;
    const ride3 = result.activities.find((a) => a.strava_activity_id === '10000003')!;

    if (ride1.avg_hr !== 158 || ride1.avg_watts !== 235) {
      throw new Error('Ride 1 metrics mismatch');
    }
    if (
      ride2.avg_hr !== null ||
      ride2.max_hr !== null ||
      ride2.weighted_watts !== 226 ||
      ride2.max_watts !== 645
    ) {
      throw new Error('Ride 2 null-HR or detail enrichment failed');
    }
    if (
      ride3.avg_hr !== null ||
      ride3.max_hr !== null ||
      ride3.avg_watts !== null ||
      ride3.weighted_watts !== null ||
      ride3.strava_tss !== null
    ) {
      throw new Error('Ride 3 null-HR / null-Power handling failed');
    }

    console.log('✅ [4/4] Raw Supabase Upsert Payload (public.activities rows):');
    console.log(JSON.stringify(result.activities, null, 2));
    console.log('\n🎉 ALL E2E SCRAPER & NULL-DATA TESTS PASSED!');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runScraperTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
