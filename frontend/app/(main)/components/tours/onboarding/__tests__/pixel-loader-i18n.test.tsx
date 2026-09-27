import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { PixelLoader } from '../pixel-loader';

afterEach(cleanup);

describe('onboarding progress accessibility localization', () => {
  it.each([
    { percentage: 12.7, expectedRounded: 13 },
    { percentage: 100, expectedRounded: 100 },
  ])('translates $percentage percent without changing progress or pixels', async ({ percentage, expectedRounded }) => {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: 'en-US', fallbackLng: 'en-US',
      resources: Object.fromEntries(
        Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
      ) as Resource,
      interpolation: { escapeValue: false },
    });
    render(<I18nextProvider i18n={i18n}><PixelLoader percentage={percentage} /></I18nextProvider>);
    const progress = screen.getByRole('progressbar');
    const pixels = progress.innerHTML;
    for (const language of ['en-US', 'de-DE']) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(progress.getAttribute('aria-label')).toBe(
        i18n.t('workspace.connectors.overview.progressPercent', { n: expectedRounded }),
      );
      expect(progress.getAttribute('aria-valuenow')).toBe(String(expectedRounded));
      expect(progress.getAttribute('aria-valuemin')).toBe('0');
      expect(progress.getAttribute('aria-valuemax')).toBe('100');
      expect(progress.innerHTML).toBe(pixels);
    }
  });
});
