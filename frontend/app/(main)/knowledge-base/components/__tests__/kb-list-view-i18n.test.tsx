import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { KbListView } from '../kb-list-view';

type Props = React.ComponentProps<typeof KbListView>;
type Item = Props['items'][number];
vi.mock('@/lib/hooks/use-is-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/app/(main)/workspace/connectors/demo-data/use-demo-data', () => ({ useDemoDataActive: () => {} }));
vi.mock('@/app/(main)/workspace/connectors/demo-data/components', () => ({ DemoSourceBadge: () => null }));
vi.mock('../../utils/kb-node-name-icon', () => ({ KbNodeNameIcon: () => null }));
vi.mock('../../utils/kb-table-item-actions', () => ({
  shouldHideIndexingStatusForHubRecord: () => false,
  shouldShowDownloadForTableItem: () => true,
  runItemMenuOpenFromMenu: (item: Item, onClick: (item: Item) => void) => onClick(item),
}));
vi.mock('../../utils/reindex-label', () => ({
  getReindexNodeForTableItem: () => ({}),
  getReindexMenuState: () => ({ options: [], showMenu: false }),
  mapReindexOptionsToMenuActions: () => [],
}));
vi.mock('@radix-ui/themes', async (importOriginal) => ({
  ...await importOriginal<typeof import('@radix-ui/themes')>(),
  Tooltip: ({ content, children }: React.PropsWithChildren<{ content: string }>) => (
    <><span data-testid="status-tooltip">{content}</span>{children}</>
  ),
}));
vi.mock('../item-action-menu', () => ({
  ItemActionMenu: ({ actions }: { actions: (false | undefined | { label: string; onClick?: () => void })[] }) => (
    <div>{actions.filter((action): action is { label: string; onClick?: () => void } => !!action)
      .map((action) => <button type="button" key={action.label} onClick={action.onClick}>{action.label}</button>)}</div>
  ),
}));

afterEach(cleanup);
const createdAt = new Date(2026, 2, 5, 12).getTime();
const updatedAt = new Date(2026, 8, 26, 12).getTime();
const item = {
  id: 'original-record-id', name: 'User document.pdf', nodeType: 'record', origin: 'UPLOAD',
  indexingStatus: 'FAILED', reason: 'Original server reason', createdAt, updatedAt,
  permission: { canEdit: true, canDelete: true, role: 'OWNER' },
} as Item;

async function setup(override: Partial<Props> = {}) {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  const onSort = vi.fn(), onDownload = vi.fn(), onDelete = vi.fn(), onItemClick = vi.fn();
  const onPageChange = vi.fn();
  const props: Props = {
    items: [structuredClone(item)], selectedItems: new Set(), allSelected: false,
    sort: { field: 'createdAt', order: 'asc' },
    onSelectAll: vi.fn(), onSelectItem: vi.fn(), onItemClick, onSort,
    onRename: vi.fn(async () => {}), onReplace: vi.fn(), onMove: vi.fn(), onDelete, onDownload,
    pagination: { page: 2, limit: 10, totalItems: 35, totalPages: 4, hasNext: true, hasPrev: true },
    onPageChange, ...override,
  };
  render(<I18nextProvider i18n={i18n}><Theme><KbListView {...props} /></Theme></I18nextProvider>);
  return { i18n, props, onSort, onDownload, onDelete, onItemClick, onPageChange };
}

describe('collection list localization', () => {
  it('retranslates headers, status, actions and dates without changing values or callbacks', async () => {
    const { i18n, props, onSort, onDownload, onDelete, onItemClick, onPageChange } = await setup();
    for (const language of ['en-US', 'de-DE', 'zh-CN']) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(screen.getByText(i18n.t('table.fileName'))).toBeTruthy();
      expect(screen.getByText(i18n.t('table.status'))).toBeTruthy();
      expect(screen.getByText(`${i18n.t('status.failed')} - Original server reason`)).toBeTruthy();
      expect(screen.getByRole('button', { name: i18n.t('action.download') })).toBeTruthy();
      expect(screen.getByRole('row', { name: 'User document.pdf' })).toBeTruthy();
      for (const timestamp of [createdAt, updatedAt]) {
        expect(screen.getByText(new Date(timestamp).toLocaleDateString(language, {
          day: 'numeric', month: 'short', year: 'numeric',
        }))).toBeTruthy();
      }
    }
    fireEvent.click(screen.getByText(i18n.t('table.created')));
    expect(onSort).toHaveBeenCalledWith({ field: 'createdAt', order: 'desc' });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('action.download') }));
    expect(onDownload).toHaveBeenCalledWith(props.items[0]);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('action.delete') }));
    expect(onDelete).toHaveBeenCalledWith(props.items[0]);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('recordView.openExternal') }));
    expect(onItemClick).toHaveBeenCalledWith(props.items[0]);
    fireEvent.click(screen.getByText(i18n.t('common.previous')));
    fireEvent.click(screen.getByText(i18n.t('common.next')));
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
    expect(props.items[0]).toEqual(item);
  });

  it('does not expose edit or delete actions for a read-only record after a language change', async () => {
    const readonly = { ...item, permission: { canEdit: false, canDelete: false, role: 'READER' } } as Item;
    const { i18n, onDelete } = await setup({ items: [readonly] });
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    for (const key of ['menu.rename', 'action.replace', 'action.move', 'action.delete']) {
      expect(screen.queryByRole('button', { name: i18n.t(key) })).toBeNull();
    }
    expect(onDelete).not.toHaveBeenCalled();
  });
});
