export interface StravaCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface ScrapedActivityRow {
  id: number;
  user_id: string;
  strava_activity_id: string;
  date_millis: number;
  name: string;
  type: string;
  moving_time_sec: number;
  elapsed_time_sec: number;
  distance_meters: number;
  elevation_gain_meters: number;
  avg_watts: number | null;
  max_watts: number | null;
  weighted_watts: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  kilojoules: number | null;
  strava_tss: number | null;
  is_planned: boolean;
  is_manual: boolean;
  notes: string | null;
}

export interface ScrapeUserOptions {
  userId: string;
  email?: string | null;
  password?: string | null;
  sessionCookies?: StravaCookie[] | null;
  rawSessionCookieValue?: string | null;
  existingStravaIds?: Set<string>;
  maxPages?: number;
  fullHistory?: boolean;
  baseUrl?: string;
}

export interface ScrapeResult {
  activities: ScrapedActivityRow[];
  updatedCookies: StravaCookie[];
  athleteId: string | null;
  pagesScraped: number;
  totalAvailableOnStrava: number | null;
}

/**
 * Parses either a raw `_strava4_session` cookie value OR a full `Cookie:` header string
 * into an array of `StravaCookie` objects.
 */
export function parseRawCookieInput(rawInput?: string | null): StravaCookie[] {
  if (!rawInput || !rawInput.trim()) return [];
  const trimmed = rawInput.trim().replace(/^cookie:\s*/i, '');

  if (trimmed.includes('=')) {
    const pairs = trimmed.split(';').map((p) => p.trim()).filter(Boolean);
    const cookies: StravaCookie[] = [];
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (name && value) {
          cookies.push({
            name,
            value,
            domain: '.strava.com',
            path: '/',
            httpOnly: true,
            secure: true,
          });
        }
      }
    }
    if (cookies.length > 0) return cookies;
  }

  return [
    {
      name: '_strava4_session',
      value: trimmed,
      domain: '.strava.com',
      path: '/',
      httpOnly: true,
      secure: true,
    },
  ];
}

/**
 * Safely converts optional sensor metrics (Heart Rate, Power, kJ, TSS) to a
 * positive number or `null`. Rides recorded without a heart-rate strap or
 * power meter often return `null`, `undefined`, `0`, `"--"`, or `"N/A"`.
 * Returning `null` ensures the database and PMC engine treat the sensor as absent.
 */
export function toPositiveOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string') {
    const cleaned = raw
      .replace(/,/g, '')
      .replace(/bpm/gi, '')
      .replace(/kj/gi, '')
      .replace(/w/gi, '')
      .trim();
    if (
      !cleaned ||
      cleaned === '--' ||
      cleaned === '-' ||
      cleaned.toLowerCase() === 'null' ||
      cleaned.toLowerCase() === 'n/a' ||
      cleaned.toLowerCase() === 'none'
    ) {
      return null;
    }
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function toNonNegativeOrZero(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }
  if (typeof raw === 'string') {
    const cleaned = raw
      .replace(/,/g, '')
      .replace(/km/gi, '')
      .replace(/m/gi, '')
      .trim();
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  return 0;
}

export function parseDurationToSec(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw !== 'string') return 0;
  const cleaned = raw.trim();
  if (!cleaned) return 0;

  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return Math.max(0, Math.round(parseFloat(cleaned)));
  }

  // Handle "1h 25m", "45m 12s"
  const hmMatch = cleaned.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);
  if (hmMatch && (hmMatch[1] || hmMatch[2] || hmMatch[3]) && /[hms]/i.test(cleaned)) {
    const h = parseInt(hmMatch[1] || '0', 10);
    const m = parseInt(hmMatch[2] || '0', 10);
    const s = parseInt(hmMatch[3] || '0', 10);
    return h * 3600 + m * 60 + s;
  }

  // Handle "HH:MM:SS" or "MM:SS"
  const parts = cleaned.split(':').map((p) => parseInt(p.trim(), 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function isCyclingActivity(typeStr: string = '', nameStr: string = ''): boolean {
  const t = typeStr.toLowerCase().trim();
  const n = nameStr.toLowerCase().trim();

  const nonCycling = ['run', 'walk', 'hike', 'swim', 'yoga', 'weight', 'workout', 'row', 'ski'];
  if (nonCycling.some((term) => t.includes(term))) return false;

  const cycling = [
    'ride',
    'virtualride',
    'virtual_ride',
    'gravel',
    'mountain',
    'mtb',
    'ebike',
    'cycle',
    'cycling',
    'zwift',
    'velodrome',
    'handcycle',
  ];
  return cycling.some((term) => t.includes(term) || n.includes(term));
}

export function normalizeCyclingType(raw: string = ''): string {
  const lower = raw.toLowerCase();
  if (lower.includes('virtual') || lower.includes('zwift')) return 'VirtualRide';
  if (lower.includes('mountain') || lower.includes('mtb')) return 'Mountain Bike';
  if (lower.includes('gravel')) return 'Gravel';
  return 'Ride';
}

export function deterministicActivityId(stravaId: string): number {
  const numeric = Number(stravaId.replace(/\D/g, ''));
  if (Number.isSafeInteger(numeric) && numeric > 0) {
    return numeric;
  }
  let hash = 5381;
  for (let i = 0; i < stravaId.length; i++) {
    hash = (hash * 33) ^ stravaId.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Parses Strava's `/athlete/training_activities` JSON models into normalized
 * Supabase `public.activities` rows, preserving `null` for missing heart-rate or power data.
 */
export function parseTrainingActivitiesModels(
  userId: string,
  rawModels: any[]
): Map<string, ScrapedActivityRow> {
  const activitiesMap = new Map<string, ScrapedActivityRow>();

  for (const item of rawModels) {
    const stravaId = String(item.id ?? item.activity_id ?? '').trim();
    if (!stravaId) continue;

    const rawType = String(item.type ?? item.sport_type ?? item.display_type ?? 'Ride');
    const rawName = String(item.name ?? 'Cycling Ride').trim();

    if (!isCyclingActivity(rawType, rawName)) {
      continue;
    }

    let dateMillis = Date.now();
    if (typeof item.start_time === 'string' && item.start_time) {
      const parsed = Date.parse(item.start_time);
      if (!Number.isNaN(parsed)) dateMillis = parsed;
    } else if (typeof item.start_date_local_raw === 'number') {
      dateMillis = item.start_date_local_raw * 1000;
    } else if (typeof item.start_date === 'string') {
      const parsed = Date.parse(item.start_date);
      if (!Number.isNaN(parsed)) dateMillis = parsed;
    }

    const movingTimeSec =
      toNonNegativeOrZero(item.moving_time_raw) || parseDurationToSec(item.moving_time);
    const elapsedTimeSec =
      toNonNegativeOrZero(item.elapsed_time_raw) ||
      parseDurationToSec(item.elapsed_time) ||
      movingTimeSec;

    let distanceMeters = toNonNegativeOrZero(item.distance_raw);
    if (distanceMeters === 0 && item.distance != null) {
      const d = toNonNegativeOrZero(item.distance);
      distanceMeters = d < 500 ? d * 1000 : d;
    } else if (distanceMeters > 0 && distanceMeters < 400 && movingTimeSec > 600) {
      distanceMeters = distanceMeters * 1000;
    }

    const elevationGainMeters = toNonNegativeOrZero(
      item.elevation_gain_raw ?? item.elevation_gain ?? item.total_elevation_gain
    );

    // Explicitly null when absent (e.g. ride recorded without HR strap or power meter)
    const avgWatts = toPositiveOrNull(item.avg_watts ?? item.average_watts);
    const maxWatts = toPositiveOrNull(item.max_watts);
    const weightedWatts = toPositiveOrNull(
      item.weighted_average_power ?? item.weighted_watts ?? item.np
    );
    const avgHr = toPositiveOrNull(
      item.avg_hr ?? item.average_heartrate ?? item.heart_rate
    );
    const maxHr = toPositiveOrNull(item.max_hr ?? item.max_heartrate);
    const kilojoules = toPositiveOrNull(item.kilojoules ?? item.total_work);
    const stravaTss = toPositiveOrNull(
      item.suffer_score ?? item.relative_effort ?? item.training_load
    );

    activitiesMap.set(stravaId, {
      id: deterministicActivityId(stravaId),
      user_id: userId,
      strava_activity_id: stravaId,
      date_millis: dateMillis,
      name: rawName || 'Cycling Ride',
      type: normalizeCyclingType(rawType),
      moving_time_sec: Math.round(movingTimeSec),
      elapsed_time_sec: Math.round(elapsedTimeSec),
      distance_meters: distanceMeters,
      elevation_gain_meters: elevationGainMeters,
      avg_watts: avgWatts,
      max_watts: maxWatts,
      weighted_watts: weightedWatts,
      avg_hr: avgHr,
      max_hr: maxHr,
      kilojoules,
      strava_tss: stravaTss,
      is_planned: false,
      is_manual: false,
      notes:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : null,
    });
  }

  return activitiesMap;
}

export function extractActivityDetailStatsFromText(text: string) {
  const extractStat = (pattern: RegExp): string | null => {
    const m = text.match(pattern);
    return m && m[1] ? m[1].trim() : null;
  };

  return {
    avgHr:
      extractStat(/Average\s+Heart\s+Rate\s*[:\n]\s*([\d.]+|--|N\/A)\s*(?:bpm)?/i) ??
      extractStat(/Avg\s+HR\s*[:\n]\s*([\d.]+|--|N\/A)/i),
    maxHr:
      extractStat(/Max\s+Heart\s+Rate\s*[:\n]\s*([\d.]+|--|N\/A)\s*(?:bpm)?/i) ??
      extractStat(/Max\s+HR\s*[:\n]\s*([\d.]+|--|N\/A)/i),
    avgWatts: extractStat(/Average\s+Power\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:W)?/i),
    maxWatts: extractStat(/Max\s+Power\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:W)?/i),
    weightedWatts:
      extractStat(/Weighted\s+Average\s+Power\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:W)?/i) ??
      extractStat(/Normalized\s+Power\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:W)?/i),
    kilojoules:
      extractStat(/Total\s+Work\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:kJ)?/i) ??
      extractStat(/Energy\s+Output\s*[:\n]\s*([\d.,]+|--|N\/A)\s*(?:kJ)?/i),
    tss:
      extractStat(/Relative\s+Effort\s*[:\n]\s*([\d.]+|--|N\/A)/i) ??
      extractStat(/Training\s+Load\s*[:\n]\s*([\d.]+|--|N\/A)/i),
  };
}

/**
 * Direct HTTP scraper (used when Playwright binary is not present on host or in lightweight environments).
 */
async function scrapeViaHttpFetch(options: ScrapeUserOptions): Promise<ScrapeResult> {
  const {
    userId,
    sessionCookies,
    rawSessionCookieValue,
    existingStravaIds = new Set<string>(),
    maxPages = 500,
    fullHistory = existingStravaIds.size === 0,
    baseUrl = 'https://www.strava.com',
  } = options;

  const cookieMap = new Map<string, StravaCookie>();
  for (const c of sessionCookies || []) {
    if (c && c.name && c.value) cookieMap.set(c.name, c);
  }
  for (const c of parseRawCookieInput(rawSessionCookieValue)) {
    cookieMap.set(c.name, c);
  }

  const cookiesList = Array.from(cookieMap.values());
  const cookieHeader = cookiesList.map((c) => `${c.name}=${c.value}`).join('; ');

  let csrfToken: string | null = null;
  let athleteId: string | null = null;

  // Optional pre-flight to /athlete/training to extract CSRF token and verify authentication on real Strava
  if (baseUrl.includes('strava.com')) {
    if (cookiesList.length === 0) {
      throw new Error(
        'Strava requires a session cookie when running outside the Playwright Docker container (or when Strava sends a 6-digit email OTP). Please switch to the "Session Cookie" tab and paste your _strava4_session cookie from strava.com.'
      );
    }

    const trainingPageRes = await fetch(`${baseUrl}/athlete/training`, {
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const location = trainingPageRes.headers.get('location') || '';
    if (location.includes('/login') || location.includes('/session')) {
      throw new Error(
        'Strava session expired or invalid _strava4_session cookie. Please copy a fresh _strava4_session cookie from strava.com (DevTools -> Application -> Cookies).'
      );
    }

    // Merge any rotated Set-Cookie headers from Rails so CSRF token + session stay in sync
    const setCookieHeaders: string[] =
      typeof (trainingPageRes.headers as any).getSetCookie === 'function'
        ? (trainingPageRes.headers as any).getSetCookie()
        : [];
    for (const sc of setCookieHeaders) {
      const firstPair = sc.split(';')[0]?.trim();
      if (!firstPair) continue;
      const eqIdx = firstPair.indexOf('=');
      if (eqIdx <= 0) continue;
      const cName = firstPair.slice(0, eqIdx).trim();
      const cVal = firstPair.slice(eqIdx + 1).trim();
      if (cName && cVal) {
        cookieMap.set(cName, {
          name: cName,
          value: cVal,
          domain: '.strava.com',
          path: '/',
          httpOnly: true,
          secure: true,
        });
      }
    }

    const trainingHtml = await trainingPageRes.text().catch(() => '');
    const csrfMatch = trainingHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
    if (csrfMatch && csrfMatch[1]) {
      csrfToken = csrfMatch[1];
    }
    const athleteMatch = trainingHtml.match(/\/athletes\/(\d+)/);
    if (athleteMatch && athleteMatch[1]) {
      athleteId = athleteMatch[1];
    }
  }

  const finalCookiesList = Array.from(cookieMap.values());
  const finalCookieHeader = finalCookiesList.map((c) => `${c.name}=${c.value}`).join('; ');

  const rawModels: any[] = [];
  let pagesScraped = 0;
  let totalAvailableOnStrava: number | null = null;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${baseUrl}/athlete/training_activities?new_activity_only=false&per_page=20&page=${pageNum}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${baseUrl}/athlete/training`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(finalCookieHeader ? { Cookie: finalCookieHeader } : {}),
      },
    });
    if (!res.ok) break;
    const pageData: any = await res.json().catch(() => null);
    if (!pageData || !Array.isArray(pageData.models) || pageData.models.length === 0) {
      break;
    }

    pagesScraped++;
    if (typeof pageData.total === 'number') {
      totalAvailableOnStrava = pageData.total;
    }

    rawModels.push(...pageData.models);

    if (!fullHistory && existingStravaIds.size > 0) {
      const allOnPageAlreadySynced = pageData.models.every((m: any) =>
        existingStravaIds.has(String(m.id ?? m.activity_id ?? '').trim())
      );
      if (allOnPageAlreadySynced) {
        break;
      }
    }

    if (totalAvailableOnStrava !== null && rawModels.length >= totalAvailableOnStrava) {
      break;
    }
  }

  const activitiesMap = parseTrainingActivitiesModels(userId, rawModels);

  const candidatesForDetail = Array.from(activitiesMap.values())
    .filter(
      (a) =>
        !existingStravaIds.has(a.strava_activity_id) &&
        (a.avg_hr === null || a.avg_watts === null || a.weighted_watts === null)
    )
    .slice(0, 25);

  for (const act of candidatesForDetail) {
    try {
      const res = await fetch(`${baseUrl}/activities/${act.strava_activity_id}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          ...(finalCookieHeader ? { Cookie: finalCookieHeader } : {}),
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const plainText = html.replace(/<[^>]+>/g, '\n');
      const details = extractActivityDetailStatsFromText(plainText);

      if (act.avg_hr === null) act.avg_hr = toPositiveOrNull(details.avgHr);
      if (act.max_hr === null) act.max_hr = toPositiveOrNull(details.maxHr);
      if (act.avg_watts === null) act.avg_watts = toPositiveOrNull(details.avgWatts);
      if (act.max_watts === null) act.max_watts = toPositiveOrNull(details.maxWatts);
      if (act.weighted_watts === null) act.weighted_watts = toPositiveOrNull(details.weightedWatts);
      if (act.kilojoules === null) act.kilojoules = toPositiveOrNull(details.kilojoules);
      if (act.strava_tss === null) act.strava_tss = toPositiveOrNull(details.tss);
    } catch {
      // Preserve null for missing sensors
    }
  }

  return {
    activities: Array.from(activitiesMap.values()),
    updatedCookies: finalCookiesList,
    athleteId,
    pagesScraped,
    totalAvailableOnStrava,
  };
}

export async function scrapeStravaActivitiesForUser(
  options: ScrapeUserOptions
): Promise<ScrapeResult> {
  const {
    userId,
    email,
    password,
    sessionCookies,
    rawSessionCookieValue,
    existingStravaIds = new Set<string>(),
    maxPages = 500,
    fullHistory = existingStravaIds.size === 0,
    baseUrl = 'https://www.strava.com',
  } = options;

  const hasCookies =
    (Array.isArray(sessionCookies) && sessionCookies.length > 0) ||
    Boolean(rawSessionCookieValue && rawSessionCookieValue.trim());

  // Fast path: when session cookies are available, attempt direct authenticated HTTP scraping first
  if (hasCookies) {
    try {
      const httpResult = await scrapeViaHttpFetch(options);
      if (httpResult.pagesScraped > 0 || httpResult.activities.length > 0) {
        return httpResult;
      }
    } catch (httpErr: any) {
      // If session cookie is explicitly expired/invalid and no email/password is configured, surface immediately
      if (!email || !password) {
        throw httpErr;
      }
    }
  }

  let browser: any = null;
  try {
    const playwrightPkg = 'playwright';
    const pw = (await import(playwrightPkg)) as { chromium: any };
    browser = await pw.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  } catch (launchErr: any) {
    // If Playwright isn't installed or browser executable version mismatches, fall back to HTTP fetch
    if (hasCookies || !baseUrl.includes('strava.com')) {
      return scrapeViaHttpFetch(options);
    }
    throw launchErr;
  }

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
    });

    if (Array.isArray(sessionCookies) && sessionCookies.length > 0) {
      await context.addCookies(sessionCookies);
    }

    const parsedExtraCookies = parseRawCookieInput(rawSessionCookieValue);
    if (parsedExtraCookies.length > 0) {
      await context.addCookies(parsedExtraCookies);
    }

    const page = await context.newPage();

    await page.goto(`${baseUrl}/athlete/training`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    if (page.url().includes('/login') || page.url().includes('/session')) {
      if (!email || !password) {
        throw new Error(
          'Strava session expired or not authenticated. Please provide valid Strava email & password or a fresh _strava4_session cookie.'
        );
      }

      const cookieAcceptBtn = page
        .locator(
          'button[data-cy="accept-cookies"], #CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'
        )
        .first();
      if (await cookieAcceptBtn.isVisible().catch(() => false)) {
        await cookieAcceptBtn.click().catch(() => {});
      }

      const emailInput = page
        .locator('input#email, input[name="email"], input[type="email"]')
        .first();
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(email);

      const passwordInput = page
        .locator('input#password, input[name="password"], input[type="password"]')
        .first();
      const isPasswordVisible = await passwordInput.isVisible().catch(() => false);

      if (!isPasswordVisible) {
        const nextBtn = page.locator('button#login-button, button[type="submit"]').first();
        await nextBtn.click();
        await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
      }

      const usePasswordBtn = page
        .locator(
          'button:has-text("Use password"), a:has-text("Use password"), [data-testid="use-password-button"]'
        )
        .first();
      if (await usePasswordBtn.isVisible().catch(() => false)) {
        await usePasswordBtn.click();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      }

      await passwordInput.fill(password);

      const submitBtn = page.locator('button#login-button, button[type="submit"]').first();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}),
        submitBtn.click(),
      ]);

      if (page.url().includes('/login') || page.url().includes('/session')) {
        const alertText = await page
          .locator('.alert-message, .error-message, [role="alert"]')
          .first()
          .textContent()
          .catch(() => null);
        throw new Error(
          alertText?.trim() ||
            'Strava requested a 6-digit email verification code or blocked automated login. Please switch to the "Session Cookie" tab and paste your _strava4_session cookie from strava.com.'
        );
      }

      await page.goto(`${baseUrl}/athlete/training`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
    }

    const athleteId = await page
      .evaluate(() => {
        const el = document.querySelector('[data-athlete-id], a[href*="/athletes/"]');
        if (!el) return null;
        const attr = el.getAttribute('data-athlete-id');
        if (attr) return attr;
        const href = el.getAttribute('href') || '';
        const match = href.match(/\/athletes\/(\d+)/);
        return match ? match[1] : null;
      })
      .catch(() => null);

    const rawModels: any[] = [];
    let pagesScraped = 0;
    let totalAvailableOnStrava: number | null = null;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageData = await page
        .evaluate(
          async ({ bUrl, p }: { bUrl: string; p: number }) => {
            const url = `${bUrl}/athlete/training_activities?new_activity_only=false&per_page=20&page=${p}`;
            const res = await fetch(url, {
              headers: {
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
              },
              credentials: 'include',
            });
            if (!res.ok) return null;
            return res.json();
          },
          { bUrl: baseUrl, p: pageNum }
        )
        .catch(() => null);

      if (!pageData || !Array.isArray(pageData.models) || pageData.models.length === 0) {
        break;
      }

      pagesScraped++;
      if (typeof pageData.total === 'number') {
        totalAvailableOnStrava = pageData.total;
      }

      rawModels.push(...pageData.models);

      if (!fullHistory && existingStravaIds.size > 0) {
        const allOnPageAlreadySynced = pageData.models.every((m: any) =>
          existingStravaIds.has(String(m.id ?? m.activity_id ?? '').trim())
        );
        if (allOnPageAlreadySynced) {
          break;
        }
      }

      if (totalAvailableOnStrava !== null && rawModels.length >= totalAvailableOnStrava) {
        break;
      }
    }

    const activitiesMap = parseTrainingActivitiesModels(userId, rawModels);

    const candidatesForDetail = Array.from(activitiesMap.values())
      .filter(
        (a) =>
          !existingStravaIds.has(a.strava_activity_id) &&
          (a.avg_hr === null || a.avg_watts === null)
      )
      .slice(0, 25);

    for (const act of candidatesForDetail) {
      try {
        await page.goto(`${baseUrl}/activities/${act.strava_activity_id}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });

        const bodyText = await page.evaluate(() => document.body.innerText || '');
        const details = extractActivityDetailStatsFromText(bodyText);

        if (act.avg_hr === null) act.avg_hr = toPositiveOrNull(details.avgHr);
        if (act.max_hr === null) act.max_hr = toPositiveOrNull(details.maxHr);
        if (act.avg_watts === null) act.avg_watts = toPositiveOrNull(details.avgWatts);
        if (act.max_watts === null) act.max_watts = toPositiveOrNull(details.maxWatts);
        if (act.weighted_watts === null) act.weighted_watts = toPositiveOrNull(details.weightedWatts);
        if (act.kilojoules === null) act.kilojoules = toPositiveOrNull(details.kilojoules);
        if (act.strava_tss === null) act.strava_tss = toPositiveOrNull(details.tss);
      } catch {
        // Non-fatal: preserve null for missing sensors
      }
    }

    const updatedCookies = await context.cookies();

    return {
      activities: Array.from(activitiesMap.values()),
      updatedCookies,
      athleteId,
      pagesScraped,
      totalAvailableOnStrava,
    };
  } finally {
    await browser.close();
  }
}
