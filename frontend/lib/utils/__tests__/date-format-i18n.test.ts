import { describe, expect, it } from 'vitest';
import { SUPPORTED_LNG_KEYS } from '@/lib/i18n/supported-languages';
import { formatDate } from '../formatters';

const timestamps = [
  0,
  new Date(2026, 0, 2, 12).getTime(),
  new Date(2026, 8, 26, 12).getTime(),
  new Date(2026, 11, 31, 12).getTime(),
];

describe('absolute dates use the supplied UI language', () => {
  it.each(SUPPORTED_LNG_KEYS)('uses native date order and month names in %s', (locale) => {
    for (const timestamp of timestamps) {
      const date = new Date(timestamp);
      const expected = date.toLocaleDateString(locale, {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      expect(formatDate(timestamp, locale)).toBe(expected);
      expect(formatDate(date.toISOString(), locale)).toBe(expected);
    }
  });

  it('does not cache the first language', () => {
    const timestamp = new Date(2026, 2, 5, 12).getTime();
    const english = formatDate(timestamp, 'en-US');
    expect(formatDate(timestamp, 'de-DE')).not.toBe(english);
    expect(formatDate(timestamp, 'zh-CN')).not.toBe(english);
    expect(formatDate(timestamp, 'en-US')).toBe(english);
  });

  it('keeps the existing output for callers without a locale', () => {
    const timestamp = new Date(2026, 2, 5, 12).getTime();
    expect(formatDate(timestamp)).toBe('5 Mar 2026');
    expect(formatDate(new Date(timestamp).toISOString())).toBe('5 Mar 2026');
  });
});
