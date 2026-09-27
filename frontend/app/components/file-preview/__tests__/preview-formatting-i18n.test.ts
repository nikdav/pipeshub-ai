import { describe, expect, it } from 'vitest';
import { formatLocalizedBytes } from '@/lib/i18n/localized-text';
import { locales } from '@/lib/i18n/locales';

function unitsFor(language: 'en-US' | 'de-DE') {
  const units = locales[language].units as Record<string, string>;
  return [units.bytes, units.kb, units.mb, units.gb, units.tb];
}

describe('preview byte formatting', () => {
  it('keeps binary size thresholds and quantities while formatting numbers for the active locale', () => {
    expect(formatLocalizedBytes(0, 'en-US', { base: 1024, minimumFractionDigits: 0, maximumFractionDigits: 2, units: unitsFor('en-US') }))
      .toBe('0 Bytes');
    expect(formatLocalizedBytes(1023, 'en-US', { base: 1024, minimumFractionDigits: 0, maximumFractionDigits: 2, units: unitsFor('en-US') }))
      .toBe('1,023 Bytes');
    expect(formatLocalizedBytes(1536, 'en-US', { base: 1024, minimumFractionDigits: 0, maximumFractionDigits: 2, units: unitsFor('en-US') }))
      .toBe('1.5 KB');
    expect(formatLocalizedBytes(1536, 'de-DE', { base: 1024, minimumFractionDigits: 0, maximumFractionDigits: 2, units: unitsFor('de-DE') }))
      .toBe('1,5 KB');
    expect(formatLocalizedBytes(1024, 'en-US', { base: 1024, minimumFractionDigits: 0, maximumFractionDigits: 2, units: unitsFor('en-US') }))
      .toBe('1 KB');
  });
});
