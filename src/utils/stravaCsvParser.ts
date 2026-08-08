import { ActivityEntity } from '../types';

export class StravaCsvParser {
  static isCyclingType(typeStr: string = '', nameStr: string = ''): boolean {
    const typeLower = typeStr.toLowerCase().trim();
    const nameLower = nameStr.toLowerCase().trim();

    if (this.isNonCyclingType(typeLower) || this.isNonCyclingType(nameLower)) {
      return false;
    }

    if (!typeLower) {
      return this.isCyclingKeyword(nameLower);
    }

    return this.isCyclingKeyword(typeLower) || this.isCyclingKeyword(nameLower);
  }

  private static isNonCyclingType(str: string): boolean {
    if (!str) return false;
    const nonCyclingTerms = [
      'walk',
      'run',
      'hike',
      'workout',
      'gym',
      'yoga',
      'stair',
      'swim',
      'rowing',
      'ski',
      'squat',
      'crunch',
      'push up',
      'calf raise',
      'lunge',
      'plank',
    ];
    return nonCyclingTerms.some((term) => str.includes(term));
  }

  private static isCyclingKeyword(str: string): boolean {
    const cyclingTerms = ['ride', 'cycle', 'cycling', 'bike', 'gravel', 'zwift', 'mtb', 'velo'];
    return cyclingTerms.some((term) => str.includes(term));
  }

  static parseCsv(csvText: string): ActivityEntity[] {
    const rows = this.parseCsvRows(csvText);
    if (rows.length === 0) return [];

    const headerTokens = rows[0].map((h) => h.toLowerCase().trim());

    const idIdx = this.findHeaderIndex(headerTokens, ['activity id', 'id']);
    const dateIdx = this.findHeaderIndex(headerTokens, ['activity date', 'date']);
    const startTimeIdx = this.findHeaderIndex(headerTokens, ['start time', 'weather observation time']);
    const nameIdx = this.findHeaderIndex(headerTokens, ['activity name', 'name', 'title']);
    const typeIdx = this.findHeaderIndex(headerTokens, ['activity type', 'type']);
    const movTimeIdx = this.findHeaderIndex(headerTokens, ['moving time', 'duration', 'timer time']);
    const elpTimeIdx = this.findHeaderIndex(headerTokens, ['elapsed time']);
    const distIdx = this.findHeaderIndex(headerTokens, ['distance', 'grade adjusted distance']);
    const elevIdx = this.findHeaderIndex(headerTokens, ['elevation gain', 'elevation']);
    const avgHrIdx = this.findHeaderIndex(headerTokens, ['average heart rate', 'avg hr', 'heart rate']);
    const maxHrIdx = this.findHeaderIndex(headerTokens, ['max heart rate', 'max hr']);
    const avgWattsIdx = this.findHeaderIndex(headerTokens, ['average watts', 'avg watts', 'average power', 'watts']);
    const maxWattsIdx = this.findHeaderIndex(headerTokens, ['max watts', 'max power']);
    const weightedWattsIdx = this.findHeaderIndex(headerTokens, ['weighted average power', 'normalized power', 'np']);
    const kjIdx = this.findHeaderIndex(headerTokens, ['total work', 'kilojoules', 'energy output']);
    const tssIdx = this.findHeaderIndex(headerTokens, [
      'training load',
      'tss',
      'relative effort',
      'training stress score',
      'suffer score',
      'intensity',
    ]);

    const result: ActivityEntity[] = [];

    for (let i = 1; i < rows.length; i++) {
      const tokens = rows[i];
      if (tokens.every((t) => !t.trim())) continue;

      const rawName = this.getValue(tokens, nameIdx);
      const rawType = this.getValue(tokens, typeIdx);

      // Only parse cycle rides
      if (!this.isCyclingType(rawType, rawName)) {
        continue;
      }

      const rawDatePrimary = this.getValue(tokens, dateIdx);
      const rawDateSecondary = this.getValue(tokens, startTimeIdx);
      const dateMillis = this.parseDate(rawDatePrimary) ?? this.parseDate(rawDateSecondary);
      if (!dateMillis) continue;

      const name = rawName.trim() || (rawType.trim() ? rawType.trim() : 'Cycling Ride');
      const type = this.normalizeActivityType(rawType.trim() || 'Ride');

      const movingTime = this.parseDurationSec(this.getValue(tokens, movTimeIdx));
      const elapsedTimeRaw = this.parseDurationSec(this.getValue(tokens, elpTimeIdx));
      const elapsedTime = elapsedTimeRaw <= 0 ? movingTime : elapsedTimeRaw;

      const distance = this.parseDistanceMeters(this.getValue(tokens, distIdx));
      const elevation = this.parseDoubleNull(this.getValue(tokens, elevIdx)) ?? 0;

      const avgHr = this.parseDoubleNull(this.getValue(tokens, avgHrIdx));
      const maxHr = this.parseDoubleNull(this.getValue(tokens, maxHrIdx));
      const avgWatts = this.parseDoubleNull(this.getValue(tokens, avgWattsIdx));
      const maxWatts = this.parseDoubleNull(this.getValue(tokens, maxWattsIdx));
      const weightedWatts = this.parseDoubleNull(this.getValue(tokens, weightedWattsIdx));
      const kj = this.parseDoubleNull(this.getValue(tokens, kjIdx));
      const tss = this.parseDoubleNull(this.getValue(tokens, tssIdx));
      const actId = this.getValue(tokens, idIdx) || null;

      result.push({
        id: Date.now() * 1000 + i * 10 + Math.floor(Math.random() * 1000),
        stravaActivityId: actId,
        dateMillis,
        name,
        type,
        movingTimeSec: movingTime,
        elapsedTimeSec: elapsedTime,
        distanceMeters: distance,
        elevationGainMeters: elevation,
        avgWatts,
        maxWatts,
        weightedWatts,
        avgHr,
        maxHr,
        kilojoules: kj,
        stravaTss: tss,
        isPlanned: false,
      });
    }

    return result;
  }

  private static parseCsvRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentTokens: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < csvText.length) {
      const ch = csvText[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        currentTokens.push(currentField.trim().replace(/^"|"$/g, ''));
        currentField = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
          i++;
        }
        currentTokens.push(currentField.trim().replace(/^"|"$/g, ''));
        currentField = '';
        if (currentTokens.some((t) => t.trim() !== '')) {
          rows.push([...currentTokens]);
        }
        currentTokens = [];
      } else {
        currentField += ch;
      }
      i++;
    }

    if (currentField.length > 0 || currentTokens.length > 0) {
      currentTokens.push(currentField.trim().replace(/^"|"$/g, ''));
      if (currentTokens.some((t) => t.trim() !== '')) {
        rows.push(currentTokens);
      }
    }

    return rows;
  }

  private static findHeaderIndex(headers: string[], candidates: string[]): number {
    for (const candidate of candidates) {
      const idx = headers.findIndex((h) => h === candidate || h.includes(candidate));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  private static getValue(tokens: string[], idx: number): string {
    return idx >= 0 && idx < tokens.length ? tokens[idx].trim() : '';
  }

  private static parseDate(raw: string): number | null {
    if (!raw.trim()) return null;
    const cleaned = raw.replace(/"/g, '').trim();

    // Check numeric epoch timestamp
    if (/^\d+$/.test(cleaned)) {
      const num = parseInt(cleaned, 10);
      return num < 100000000000 ? num * 1000 : num;
    }

    // Try standard JS Date parsing
    const parsedDate = new Date(cleaned);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.getTime();
    }

    // Custom regex parsing for formats like "Jan 15, 2024, 08:30:00 AM" or "15/01/2024"
    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const textDateMatch = cleaned.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:,\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?)?/i);
    if (textDateMatch) {
      const monthStr = textDateMatch[1].toLowerCase();
      const month = monthsMap[monthStr] ?? 0;
      const day = parseInt(textDateMatch[2], 10);
      const year = parseInt(textDateMatch[3], 10);
      let hour = textDateMatch[4] ? parseInt(textDateMatch[4], 10) : 12;
      const min = textDateMatch[5] ? parseInt(textDateMatch[5], 10) : 0;
      const sec = textDateMatch[6] ? parseInt(textDateMatch[6], 10) : 0;
      const ampm = textDateMatch[7] ? textDateMatch[7].toUpperCase() : null;

      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      return new Date(year, month, day, hour, min, sec).getTime();
    }

    return null;
  }

  private static parseDurationSec(raw: string): number {
    if (!raw || raw.toLowerCase() === 'null' || raw === '--') return 0;
    const cleaned = raw.replace(/"/g, '').replace(/,/g, '').trim();

    const num = parseFloat(cleaned);
    if (!isNaN(num) && !cleaned.includes(':')) {
      return Math.floor(num);
    }

    const parts = cleaned.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const s = Math.floor(parseFloat(parts[2]) || 0);
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = Math.floor(parseFloat(parts[1]) || 0);
      return m * 60 + s;
    }
    return 0;
  }

  private static parseDistanceMeters(raw: string): number {
    const valDouble = this.parseDoubleNull(raw);
    if (valDouble === null) return 0;
    // If distance is less than 500, it's exported as kilometers in Strava CSV
    return valDouble < 500 ? valDouble * 1000 : valDouble;
  }

  private static parseDoubleNull(raw: string): number | null {
    if (!raw.trim()) return null;
    const cleaned = raw
      .replace(/"/g, '')
      .replace(/,/g, '')
      .replace(/bpm/gi, '')
      .replace(/w/gi, '')
      .replace(/km/gi, '')
      .replace(/m/gi, '')
      .trim();

    if (
      cleaned.toLowerCase() === 'null' ||
      cleaned.toLowerCase() === 'n/a' ||
      cleaned === '--' ||
      cleaned.toLowerCase() === 'none'
    ) {
      return null;
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  private static normalizeActivityType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes('virtual') || lower.includes('zwift')) return 'VirtualRide';
    if (lower.includes('mountain') || lower.includes('mtb')) return 'Mountain Bike';
    if (lower.includes('gravel')) return 'Gravel';
    if (lower.includes('ride') || lower.includes('cycle') || lower.includes('cycling')) return 'Ride';
    return 'Ride';
  }
}
