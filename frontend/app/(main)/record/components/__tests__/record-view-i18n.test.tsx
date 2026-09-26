import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { RecordViewShell } from '../record-view-shell';

const mocks = vi.hoisted(() => ({
  details: vi.fn(), stream: vi.fn(), push: vi.fn(), presentation: false,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/theme-provider', () => ({ useThemeAppearance: () => ({ appearance: 'light' }) }));
vi.mock('@/app/(main)/knowledge-base/api', () => ({
  KnowledgeBaseApi: { getRecordDetails: mocks.details, streamRecord: mocks.stream },
}));
vi.mock('@/app/components/file-preview/utils', () => ({
  isPresentationFile: () => mocks.presentation,
  isDocxFile: () => false,
  shouldShowPagination: () => ({ shouldShow: true }),
  resolvePreviewIconExtension: () => 'pdf',
  resolvePreviewMimeAfterStream: (mime: string) => mime,
}));
vi.mock('@/app/components/file-preview/resolve-web-url', () => ({ resolveWebUrl: () => null }));
vi.mock('@/lib/navigation', () => ({ withCurrentOrgId: (value: string) => value }));
vi.mock('@/app/(main)/knowledge-base/utils/reindex-label', () => ({
  canShowReindexMenu: () => false,
  getReindexNodeFromHubItem: (value: unknown) => value,
  requiresForceReindexConfirmation: () => false,
}));
vi.mock('@/lib/store/toast-store', () => ({ toast: {} }));
vi.mock('@/app/(main)/knowledge-base/components/dialogs/delete-confirmation-dialog', () => ({ DeleteConfirmationDialog: () => null }));
vi.mock('../record-metadata-panel', () => ({ RecordMetadataPanel: () => null }));
vi.mock('../zoom-action-bar', () => ({ ZoomActionBar: () => null }));
vi.mock('@/app/components/ui/auth-guard', () => ({ LoadingScreen: () => <div data-testid="loading" /> }));
vi.mock('@/app/components/file-preview/renderers/file-preview-renderer', () => ({
  FilePreviewRenderer: ({ fileName, pagination }: {
    fileName: string;
    pagination: { currentPage: number; onTotalPagesDetected: (pages: number) => void };
  }) => {
    React.useEffect(() => {
      const timer = setTimeout(() => pagination.onTotalPagesDetected(3), 0);
      return () => clearTimeout(timer);
    }, [pagination.onTotalPagesDetected]);
    return <div data-testid="preview-page" data-file-name={fileName}>{pagination.currentPage}</div>;
  },
}));

beforeEach(() => {
  mocks.presentation = false;
  mocks.details.mockResolvedValue({
    record: { recordType: 'FILE', recordName: 'User report.pdf', mimeType: 'application/pdf', origin: 'KB' },
  });
  mocks.stream.mockResolvedValue(new Blob(['fixture'], { type: 'application/pdf' }));
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:record-preview'; }
    static revokeObjectURL() {}
  });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(locales).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

async function renderRecord() {
  const i18n = await translations();
  render(<I18nextProvider i18n={i18n}><Theme><RecordViewShell recordId="unchanged-record-id" /></Theme></I18nextProvider>);
  await waitFor(() => { expect(screen.queryByTestId('loading')).toBeNull(); });
  return i18n;
}

describe('record-view localization', () => {
  it.each(Object.keys(locales))('has the reused labels and fallbacks in %s', async (language) => {
    const i18n = await translations();
    for (const key of [
      'common.previous', 'common.next', 'itemType.record',
      'recordView.labels.recordTypes.MESSAGE', 'recordView.previewConversionFailed',
      'recordView.previewUnavailable', 'recordView.loadFailed',
    ]) {
      expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
    }
  });

  it('retranslates navigation without fetching again or resetting the preview page', async () => {
    const i18n = await renderRecord();
    const next = await screen.findByRole('button', { name: i18n.t('common.next') });
    await waitFor(() => { expect((next as HTMLButtonElement).disabled).toBe(false); });
    fireEvent.click(next);
    expect(screen.getByTestId('preview-page').textContent).toBe('2');
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('button', { name: i18n.t('common.previous') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('common.next') })).toBeTruthy();
    expect(screen.getByTestId('preview-page').textContent).toBe('2');
    expect(screen.getByTestId('preview-page').getAttribute('data-file-name')).toBe('User report.pdf');
    expect(mocks.details).toHaveBeenCalledTimes(1);
    expect(mocks.details).toHaveBeenCalledWith('unchanged-record-id');
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(mocks.stream).toHaveBeenCalledWith('unchanged-record-id');
  });

  it.each(['metadata', 'stream'] as const)('retranslates an existing %s fallback without retrying the request', async (stage) => {
    if (stage === 'metadata') mocks.details.mockRejectedValue({});
    else mocks.stream.mockRejectedValue({});
    const key = stage === 'metadata' ? 'recordView.loadFailed' : 'recordView.previewUnavailable';
    const i18n = await renderRecord();
    const english = i18n.t(key);
    expect(screen.getAllByText(english).length).toBeGreaterThan(0);
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.queryByText(english)).toBeNull();
    expect(screen.getAllByText(i18n.t(key)).length).toBeGreaterThan(0);
    expect(mocks.details).toHaveBeenCalledTimes(1);
    expect(mocks.stream).toHaveBeenCalledTimes(stage === 'metadata' ? 0 : 1);
  });

  it('keeps the original file downloadable after a conversion failure and retranslates its hint', async () => {
    mocks.presentation = true;
    mocks.stream.mockRejectedValueOnce(new Error('Conversion unavailable'));
    const i18n = await renderRecord();
    expect(screen.getByText(i18n.t('recordView.previewConversionFailed'))).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(i18n.t('recordView.previewConversionFailed'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('recordView.download') })).toBeTruthy();
    expect(mocks.stream).toHaveBeenNthCalledWith(1, 'unchanged-record-id', { convertTo: 'application/pdf' });
    expect(mocks.stream).toHaveBeenNthCalledWith(2, 'unchanged-record-id');
    expect(mocks.stream).toHaveBeenCalledTimes(2);
  });

  it('preserves a backend error message across language changes', async () => {
    mocks.stream.mockRejectedValue(new Error('Server-provided explanation'));
    const i18n = await renderRecord();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Server-provided explanation')).toBeTruthy();
    expect(mocks.stream).toHaveBeenCalledTimes(1);
  });

  it.each(['MESSAGE', 'VENDOR_RECORD_TYPE'])('localizes a known type but preserves unknown metadata (%s)', async (recordType) => {
    mocks.details.mockResolvedValue({ record: { recordType, recordName: 'Record', origin: 'CONNECTOR' } });
    const i18n = await renderRecord();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    const label = recordType === 'MESSAGE' ? i18n.t('recordView.labels.recordTypes.MESSAGE') : recordType;
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getAllByText('Record').length).toBeGreaterThan(0);
    expect(mocks.details).toHaveBeenCalledTimes(1);
  });

  it('localizes only the missing-name display fallback, not the download filename', async () => {
    mocks.details.mockResolvedValue({ record: { recordType: 'FILE', mimeType: 'application/pdf', origin: 'KB' } });
    const i18n = await renderRecord();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(i18n.t('itemType.record'))).toBeTruthy();
    expect(screen.getByTestId('preview-page').getAttribute('data-file-name')).toBe('Record');
    expect(mocks.details).toHaveBeenCalledTimes(1);
  });
});
