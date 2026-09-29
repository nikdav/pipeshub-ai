import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/supported-languages';
import { formatConversationDateForSearch } from '../formatters';

const created = new Date(2026, 8, 15, 12);
const oneMonthLater = new Date(2026, 9, 15, 12);
const twoMonthsLater = new Date(2026, 10, 15, 12);
const options = { month: 'long', year: 'numeric' } as const;

describe('conversation search date localization', () => {
  it.each(Object.keys(SUPPORTED_LANGUAGES))('uses %s and keeps the existing month-selection rules', (locale) => {
    expect(formatConversationDateForSearch(created.toISOString(), oneMonthLater.toISOString(), locale))
      .toBe(new Intl.DateTimeFormat(locale, options).format(created));
    expect(formatConversationDateForSearch(created.toISOString(), twoMonthsLater.toISOString(), locale))
      .toBe(new Intl.DateTimeFormat(locale, options).format(twoMonthsLater));
  });

  it('keeps the English default for callers without a locale', () => {
    expect(formatConversationDateForSearch(created.toISOString(), oneMonthLater.toISOString()))
      .toBe(new Intl.DateTimeFormat('en-US', options).format(created));
  });
});
