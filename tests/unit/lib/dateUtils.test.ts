import { formatRelativeTime, isDateStaleOrHistorical, getDynamicRecentDate } from '@/lib/dateUtils';

describe('dateUtils', () => {
  describe('formatRelativeTime', () => {
    it('returns "Just now" for dates within 40 seconds', () => {
      const recent = new Date(Date.now() - 20 * 1000).toISOString();
      const res = formatRelativeTime(recent);
      expect(res.display).toBe('Just now');
      expect(res.isRecent).toBe(true);
      expect(res.fullDate).toBeDefined();
    });

    it('returns minutes ago for dates within 1 hour', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const res = formatRelativeTime(tenMinsAgo);
      expect(res.display).toBe('10m ago');
      expect(res.isRecent).toBe(true);
    });

    it('returns hours ago for dates within 24 hours', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
      const res = formatRelativeTime(fiveHoursAgo);
      expect(res.display).toBe('5h ago');
      expect(res.isRecent).toBe(false);

      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
      const res1 = formatRelativeTime(oneHourAgo);
      expect(res1.display).toBe('1h ago');
      expect(res1.isRecent).toBe(true);
    });

    it('returns Yesterday for dates from 1 day ago', () => {
      const oneDayAgo = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
      const res = formatRelativeTime(oneDayAgo);
      expect(res.display).toBe('Yesterday');
      expect(res.isRecent).toBe(false);
    });

    it('returns days ago for dates within a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const res = formatRelativeTime(threeDaysAgo);
      expect(res.display).toBe('3d ago');
      expect(res.isRecent).toBe(false);
    });

    it('falls back to short date for older dates', () => {
      const monthAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
      const res = formatRelativeTime(monthAgo);
      expect(res.display).toMatch(/[A-Za-z]{3}\s+\d+/);
      expect(res.isRecent).toBe(false);
    });

    it('handles invalid or empty inputs gracefully', () => {
      expect(formatRelativeTime('').display).toBe('Recently');
      expect(formatRelativeTime('invalid-date').display).toBe('invalid-date');
    });
  });

  describe('isDateStaleOrHistorical', () => {
    it('identifies dates older than 48 hours as historical', () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
      expect(isDateStaleOrHistorical(threeDaysAgo)).toBe(true);

      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
      expect(isDateStaleOrHistorical(oneHourAgo)).toBe(false);
    });
  });

  describe('getDynamicRecentDate', () => {
    it('produces staggered recent timestamps', () => {
      const d0 = new Date(getDynamicRecentDate(0)).getTime();
      const d1 = new Date(getDynamicRecentDate(1)).getTime();
      const now = Date.now();

      expect(d0).toBeLessThan(now);
      expect(d1).toBeLessThan(d0);
    });
  });
});
