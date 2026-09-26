import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_LNG_KEYS } from '@/lib/i18n/supported-languages';
import { formatRelativeTime } from '../formatters';

const now = new Date('2026-09-26T12:00:00Z').getTime();
const day = 86_400_000;
const relativeCases: [number, number, Intl.RelativeTimeFormatUnit][] = [
  [0, -0, 'second'],
  [59_000, -59, 'second'],
  [60_000, -1, 'minute'],
  [59 * 60_000, -59, 'minute'],
  [3_600_000, -1, 'hour'],
  [23 * 3_600_000, -23, 'hour'],
  [day, -1, 'day'],
  [6 * day, -6, 'day'],
  [7 * day, -1, 'week'],
  [27 * day, -3, 'week'],
];

afterEach(() => { vi.restoreAllMocks(); });

describe('relative time uses the selected UI language', () => {
  it.each(SUPPORTED_LNG_KEYS)('preserves thresholds and localizes relative dates in %s', (locale) => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const [age, value, unit] of relativeCases) {
      expect(formatRelativeTime(now - age, locale)).toBe(formatter.format(value, unit));
    }
    const old = now - 28 * day;
    expect(formatRelativeTime(old, locale)).toBe(
      new Date(old).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    );
  });

  it('preserves missing values and the existing default-locale behavior', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    for (const missing of [undefined, null, 0]) {
      expect(formatRelativeTime(missing, 'de-DE')).toBe('-');
    }
    expect(formatRelativeTime(now - day)).toBe(
      new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-1, 'day'),
    );
  });
});
