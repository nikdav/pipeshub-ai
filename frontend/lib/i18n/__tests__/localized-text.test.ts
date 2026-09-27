import { describe, expect, it } from 'vitest';
import {
  formatLocalizedBytes,
  localizedText,
  resolveLocalizedText,
} from '../localized-text';

describe('localized text descriptors', () => {
  it('resolves descriptors with the supplied active translator and leaves source text untouched', () => {
    const translations: Record<string, string> = {
      'sample.retry': 'Retry in {{count}} seconds',
      'sample.reference': '{{message}} Reference: {{requestId}}',
    };
    const t = (key: string, values?: Record<string, unknown>) => {
      let result = translations[key] ?? key;
      for (const [name, value] of Object.entries(values ?? {})) {
        result = result.replaceAll(`{{${name}}}`, String(value));
      }
      return result;
    };

    expect(resolveLocalizedText(localizedText('sample.retry', { count: 3 }), t))
      .toBe('Retry in 3 seconds');
    expect(resolveLocalizedText('Server wording', t)).toBe('Server wording');
  });

  it('resolves nested descriptors inside interpolated wrappers', () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      key === 'sample.reference'
        ? `${String(values?.message)} Reference: ${String(values?.requestId)}`
        : 'Try again';
    const message = localizedText('sample.fallback');

    expect(resolveLocalizedText(
      localizedText('sample.reference', { message, requestId: 'req-42' }),
      t,
    )).toBe('Try again Reference: req-42');
  });
});

describe('formatLocalizedBytes', () => {
  it('preserves the existing binary thresholds and unit labels while localizing decimals', () => {
    expect(formatLocalizedBytes(900, 'de-DE', { units: ['B', 'KB', 'MB'] })).toBe('900 B');
    expect(formatLocalizedBytes(1536, 'en-US', { units: ['B', 'KB', 'MB'] })).toBe('1.5 KB');
    expect(formatLocalizedBytes(1536, 'de-DE', { units: ['B', 'KB', 'MB'] })).toBe('1,5 KB');
    expect(formatLocalizedBytes(1024, 'en-US', { units: ['B', 'KB', 'MB'] })).toBe('1.0 KB');
    expect(formatLocalizedBytes(1024 * 1024, 'en-US', { units: ['B', 'KB', 'MB'] })).toBe('1.0 MB');
  });

  it('allows callers to configure thresholds, precision, and labels', () => {
    expect(formatLocalizedBytes(1500, 'en-US', {
      base: 1000,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      units: ['bytes', 'kB'],
    })).toBe('1.5 kB');
    expect(formatLocalizedBytes(1500, 'en-US', {
      maximumFractionDigits: 0,
      units: ['B', 'KB'],
    })).toBe('1 KB');
  });
});
