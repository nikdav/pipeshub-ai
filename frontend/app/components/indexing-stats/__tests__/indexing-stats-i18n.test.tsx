import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { IndexingStatsPanel, type IndexingStatsPanelProps } from '../indexing-stats-panel';

vi.mock('../stat-card', () => ({
  StatCard: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/app/(main)/workspace/connectors/components/instance-panel/overview-stats-shimmer', () => ({
  OverviewStatsGridShimmer: () => null,
  OverviewRecordTypesShimmer: () => null,
  OverviewTypesBadgeShimmer: () => null,
}));

afterEach(cleanup);

const stats = {
  stats: { total: 10, indexingStatus: { COMPLETED: 5, FAILED: 2, AUTO_INDEX_OFF: 3 } },
  byRecordType: [
    { recordType: 'FILE', total: 5 },
    { recordType: 'CUSTOM_FUTURE_TYPE', total: 5 },
  ],
} as NonNullable<IndexingStatsPanelProps['stats']>;

async function setup(overrides: Partial<IndexingStatsPanelProps> = {}) {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  const onSync = vi.fn(async () => {});
  const onReindexFailed = vi.fn(async () => {});
  const onManualIndex = vi.fn(async () => {});
  const onNavigateToRecords = vi.fn();
  render(
    <I18nextProvider i18n={i18n}><Theme>
      <IndexingStatsPanel
        stats={stats}
        showSyncActions
        onRefresh={async () => {}}
        onSync={onSync}
        onReindexFailed={onReindexFailed}
        onManualIndex={onManualIndex}
        onNavigateToRecords={onNavigateToRecords}
        {...overrides}
      />
    </Theme></I18nextProvider>,
  );
  return { i18n, onSync, onReindexFailed, onManualIndex, onNavigateToRecords };
}

describe('indexing statistics localization', () => {
  it('retranslates actions, the type counter and known record types without changing API values', async () => {
    const { i18n, onSync, onReindexFailed, onManualIndex, onNavigateToRecords } = await setup();
    for (const language of Object.keys(locales)) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(screen.getByText(i18n.t('workspace.connectors.overview.syncButton'))).toBeTruthy();
      expect(screen.getByText(`${i18n.t('workspace.connectors.overview.reindexFailed')} (2)`)).toBeTruthy();
      expect(screen.getByText(`${i18n.t('menu.startManualIndex')} (3)`)).toBeTruthy();
      expect(screen.getByText(`${i18n.t('filter.types')}: 2`)).toBeTruthy();
      expect(screen.getByText(i18n.t('recordView.labels.recordTypes.FILE'))).toBeTruthy();
      expect(screen.getByText('CUSTOM FUTURE TYPE')).toBeTruthy();
    }
    fireEvent.click(screen.getByText(i18n.t('workspace.connectors.overview.syncButton')));
    fireEvent.click(screen.getByText(`${i18n.t('workspace.connectors.overview.reindexFailed')} (2)`));
    fireEvent.click(screen.getByText(`${i18n.t('menu.startManualIndex')} (3)`));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('workspace.connectors.overview.statCompleted') }));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onReindexFailed).toHaveBeenCalledTimes(1);
    expect(onManualIndex).toHaveBeenCalledTimes(1);
    expect(onNavigateToRecords).toHaveBeenCalledWith(['COMPLETED']);
    expect(stats.byRecordType?.[0]?.recordType).toBe('FILE');
  });

  it('keeps reindex actions disabled while synchronization is busy', async () => {
    const { i18n, onReindexFailed, onManualIndex } = await setup({ isSyncBusy: true });
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    const reindex = screen.getByText(`${i18n.t('workspace.connectors.overview.reindexFailed')} (2)`) as HTMLButtonElement;
    const manual = screen.getByText(`${i18n.t('menu.startManualIndex')} (3)`) as HTMLButtonElement;
    expect(reindex.disabled).toBe(true);
    expect(manual.disabled).toBe(true);
    fireEvent.click(reindex);
    fireEvent.click(manual);
    expect(onReindexFailed).not.toHaveBeenCalled();
    expect(onManualIndex).not.toHaveBeenCalled();
  });
});
