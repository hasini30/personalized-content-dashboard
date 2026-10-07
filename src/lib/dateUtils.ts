/**
 * Utility functions for real-time dynamic recency and relative time formatting.
 */

export interface FormattedTimeResult {
  display: string;
  isRecent: boolean;
  fullDate: string;
}

/**
 * Formats a date timestamp into human-readable relative time (e.g. "Just now", "12m ago", "2h ago").
 * Also flags whether the item is fresh/recent (published within the last 2 hours).
 */
export function formatRelativeTime(dateInput: string | Date | number): FormattedTimeResult {
  if (!dateInput) {
    return { display: 'Recently', isRecent: false, fullDate: '' };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { display: String(dateInput), isRecent: false, fullDate: String(dateInput) };
  }

  const now = Date.now();
  const diffMs = now - d.getTime();

  // If timestamp is slightly in the future (due to clock skew), treat as Just now
  if (diffMs < 0 && diffMs > -60000) {
    return {
      display: 'Just now',
      isRecent: true,
      fullDate: d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  }

  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  const fullDate = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffSec < 45) {
    return { display: 'Just now', isRecent: true, fullDate };
  }
  if (diffMin < 60) {
    return { display: `${diffMin}m ago`, isRecent: true, fullDate };
  }
  if (diffHours < 24) {
    return { display: `${diffHours}h ago`, isRecent: diffHours <= 2, fullDate };
  }
  if (diffDays === 1) {
    return { display: 'Yesterday', isRecent: false, fullDate };
  }
  if (diffDays < 7) {
    return { display: `${diffDays}d ago`, isRecent: false, fullDate };
  }

  const display = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { display, isRecent: false, fullDate };
}

/**
 * Checks if a date is historical/stale (e.g. from fixed past fixtures months ago).
 */
export function isDateStaleOrHistorical(
  dateInput: string | Date | number,
  maxAgeHours = 48
): boolean {
  if (!dateInput) return true;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return true;

  const diffMs = Date.now() - d.getTime();
  return diffMs > maxAgeHours * 60 * 60 * 1000 || diffMs < 0;
}

/**
 * Computes a realistic dynamic recency date anchored to current time.
 * Perfect for demo news and social feeds so they always reflect today's news cycle.
 */
export function getDynamicRecentDate(
  index: number,
  baseMinutes = 8,
  incrementMinutes = 18
): string {
  const minutesAgo = baseMinutes + index * incrementMinutes;
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

/**
 * Checks if a date belongs to previous calendar years (e.g. 2024, 2025 when current year is 2026).
 */
export function isDateFromPreviousYears(dateInput: string | Date | number): boolean {
  if (!dateInput) return true;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return true;
  const currentYear = new Date().getFullYear();
  return d.getFullYear() < currentYear;
}

/**
 * Validates whether an article was published recently (within maxAgeDays, default 7 days)
 * and definitely not from a previous calendar year.
 */
export function isArticleDateFresh(dateInput: string | Date | number, maxAgeDays = 7): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  if (isDateFromPreviousYears(d)) return false;

  const now = Date.now();
  const diffMs = now - d.getTime();
  // Allow up to 2 hours future clock drift
  if (diffMs < -2 * 60 * 60 * 1000) return false;
  return diffMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}
