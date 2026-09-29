import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { DateRangePicker } from '../date-range-picker';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('calendar localization', () => {
  it('updates calendar names and Clear while preserving the selected ISO date', async () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: {
        'en-US': { translation: en },
        'de-DE': { translation: de },
      },
      interpolation: { escapeValue: false },
    });
    const onApply = vi.fn();
    const onClear = vi.fn();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <DateRangePicker label="Created date" startDate="2026-03-15" dateType="on"
          fixedDateType="on" triggerVariant="field" summaryBelowTrigger
          onApply={onApply} onClear={onClear} />
      </Theme></I18nextProvider>,
    );
    expect(screen.getByRole('button', { name: en.common.clear })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${en.dateRangePicker.type.on}`) }));
    const monthOptions = { month: 'long', year: 'numeric', calendar: 'gregory' } as const;
    const weekdayOptions = { weekday: 'short', calendar: 'gregory' } as const;
    const month = new Date(2026, 2, 1);
    const sunday = new Date(2023, 0, 1);
    expect(await screen.findByText(new Intl.DateTimeFormat('en-US', monthOptions).format(month))).toBeTruthy();
    expect(screen.getByText(new Intl.DateTimeFormat('en-US', weekdayOptions).format(sunday))).toBeTruthy();
    expect(screen.getByRole('button', { name: en.dateRangePicker.previousMonth })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.dateRangePicker.apply })).toBeTruthy();
    expect(screen.getByText(new Intl.DateTimeFormat('en-US', { dateStyle: 'short', calendar: 'gregory' }).format(new Date(2026, 2, 15)))).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(new Intl.DateTimeFormat('de-DE', monthOptions).format(month))).toBeTruthy();
    expect(screen.getByText(new Intl.DateTimeFormat('de-DE', weekdayOptions).format(sunday))).toBeTruthy();
    expect(screen.getByRole('button', { name: de.dateRangePicker.previousMonth })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.dateRangePicker.apply })).toBeTruthy();
    expect(screen.getByText(new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', calendar: 'gregory' }).format(new Date(2026, 2, 15)))).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: de.dateRangePicker.apply }));
    expect(onApply).toHaveBeenCalledWith('2026-03-15', undefined, 'on');
    const clear = await screen.findByRole('button', { name: de.common.clear });
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
