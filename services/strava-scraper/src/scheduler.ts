/**
 * Lightweight, zero-dependency 5-field Cron Scheduler ("min hour dom month dow").
 * Checks every minute and invokes the task at the matching schedule (e.g. "0 2 * * *" -> 02:00 AM daily).
 */

function matchesField(field: string, value: number): boolean {
  const trimmed = field.trim();
  if (trimmed === '*') return true;

  for (const part of trimmed.split(',')) {
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      if (step > 0 && value % step === 0) return true;
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(start) && !Number.isNaN(end) && value >= start && value <= end) {
        return true;
      }
    } else {
      const exact = parseInt(part, 10);
      if (exact === value) return true;
    }
  }
  return false;
}

export function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  return parts.length === 5;
}

export function matchesCron(expression: string, date: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minField, hourField, domField, monthField, dowField] = parts;

  return (
    matchesField(minField, date.getMinutes()) &&
    matchesField(hourField, date.getHours()) &&
    matchesField(domField, date.getDate()) &&
    matchesField(monthField, date.getMonth() + 1) &&
    matchesField(dowField, date.getDay())
  );
}

export function scheduleDailyCron(expression: string, task: () => void): () => void {
  const validExpr = isValidCron(expression) ? expression : '0 2 * * *';
  let lastRunMinuteKey = '';

  const timer = setInterval(() => {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (minuteKey === lastRunMinuteKey) return;

    if (matchesCron(validExpr, now)) {
      lastRunMinuteKey = minuteKey;
      task();
    }
  }, 15_000);

  timer.unref?.();
  return () => clearInterval(timer);
}
