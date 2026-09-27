import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import * as XLSX from 'xlsx';
import { locales } from '@/lib/i18n/locales';
import { SpreadsheetRenderer } from '../renderers/spreadsheet-renderer';
import { TextRenderer } from '../renderers/text-renderer';

vi.mock('@/app/components/theme-provider', () => ({
  useThemeAppearance: () => ({ appearance: 'light' }),
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setPath(target: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) {
    current[part] ??= {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

async function translations() {
  const catalogs = structuredClone(locales) as Record<string, Record<string, unknown>>;
  setPath(catalogs['en-US'], 'filePreview.textLoadFailed.loading', 'Loading file...');
  setPath(catalogs['en-US'], 'filePreview.textLoadFailed.noUrl', 'File URL not available');
  setPath(catalogs['en-US'], 'filePreview.textLoadFailed.fetchFailed', 'Failed to fetch file content');
  setPath(catalogs['en-US'], 'filePreview.textLoadFailed.loadFailed', 'Failed to load file');
  setPath(catalogs['de-DE'], 'filePreview.textLoadFailed.loading', 'Datei wird geladen...');
  setPath(catalogs['de-DE'], 'filePreview.textLoadFailed.noUrl', 'Datei-URL nicht verfügbar');
  setPath(catalogs['de-DE'], 'filePreview.textLoadFailed.fetchFailed', 'Dateiinhalt konnte nicht geladen werden');
  setPath(catalogs['de-DE'], 'filePreview.textLoadFailed.loadFailed', 'Datei konnte nicht geladen werden');

  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(catalogs).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('preview language changes', () => {
  it('retranslates a stored renderer fallback without fetching the document again', async () => {
    const i18n = await translations();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <I18nextProvider i18n={i18n}>
        <Theme><TextRenderer fileUrl="/report.txt" fileName="report.txt" /></Theme>
      </I18nextProvider>,
    );

    expect(await screen.findByText('Failed to fetch file content')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(screen.getByText('Dateiinhalt konnte nicht geladen werden')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected sheet, workbook values, and single fetch across a language change', async () => {
    const i18n = await translations();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['Heading'], ['First sheet content']]),
      'First sheet',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['User heading'], ['User supplied value']]),
      'Second sheet',
    );
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes,
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <I18nextProvider i18n={i18n}>
        <Theme>
          <SpreadsheetRenderer fileUrl="/workbook.xlsx" fileName="workbook.xlsx" />
        </Theme>
      </I18nextProvider>,
    );

    expect(await screen.findByText('First sheet content')).toBeTruthy();
    fireEvent.click(screen.getByText('Second sheet'));
    expect(await screen.findByText('User supplied value')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(screen.getByText('User heading')).toBeTruthy();
    expect(screen.getByText('User supplied value')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
