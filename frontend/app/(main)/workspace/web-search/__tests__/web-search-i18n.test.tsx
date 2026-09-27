import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { localizedText } from '@/lib/i18n/localized-text';
import { ConfigurePanel } from '../components/configure-panel';
import { WebSearchProviderRow } from '../components/web-search-provider-row';
import type { ConfiguredWebSearchProvider, WebSearchProviderMeta } from '../types';

const mocks = vi.hoisted(() => ({
  addProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  getProviderUsage: vi.fn(),
}));

vi.mock('../api', () => ({ WebSearchApi: mocks }));
vi.mock('@/app/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));
vi.mock('@radix-ui/themes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/themes')>();
  return { ...actual, Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/config', () => ({ InheritedConfigNotice: () => null }));
vi.mock('../../components/confirmation-dialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('../../components/workspace-right-panel', () => ({
  WorkspaceRightPanel: ({
    children,
    title,
    primaryLabel,
    primaryDisabled,
    onPrimaryClick,
  }: {
    children: React.ReactNode;
    title: string;
    primaryLabel: string;
    primaryDisabled?: boolean;
    onPrimaryClick?: () => void;
  }) => (
    <section>
      <h2>{title}</h2>
      <button disabled={primaryDisabled} onClick={() => onPrimaryClick?.()}>{primaryLabel}</button>
      {children}
    </section>
  ),
}));

const resources = {
  'en-US': { translation: {
    action: { save: 'Save', cancel: 'Cancel' },
    workspace: { webSearch: { configure: {
      update: 'Update',
      apiKeyLabel: 'API Key',
      apiKeyPlaceholder: 'Enter {{provider}} API key',
      apiKeyHelp: 'Get the key from {{url}}',
      errors: { save: 'English local fallback', delete: 'English delete fallback' },
    } } },
  } },
  'de-DE': { translation: {
    action: { save: 'Speichern', cancel: 'Abbrechen' },
    workspace: { webSearch: { configure: {
      update: 'Aktualisieren',
      apiKeyLabel: 'API-Schlüssel',
      apiKeyPlaceholder: 'API-Schlüssel für {{provider}} eingeben',
      apiKeyHelp: 'Schlüssel beziehen über {{url}}',
      errors: { save: 'Deutscher lokaler Fehler', delete: 'Deutscher Löschfehler' },
    } } },
  } },
};

async function makeI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources,
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return i18n;
}

const providerMeta: WebSearchProviderMeta = {
  type: 'serper',
  label: 'Serper',
  description: 'Fast Google Search API with generous free tier',
  icon: '/serper.svg',
  iconType: 'image',
  configurable: true,
  docUrl: 'https://serper.dev/docs',
  apiKeyUrl: 'https://serper.dev',
};

function renderWithI18n(node: React.ReactNode, i18n: Awaited<ReturnType<typeof makeI18n>>) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('web-search localized feedback', () => {
  it('retranslates a stored local save fallback after a language change without repeating the mutation', async () => {
    const i18n = await makeI18n();
    const error = Object.assign(new Error('Failed to save provider'), {
      messageText: localizedText('workspace.webSearch.configure.errors.save'),
    });
    mocks.addProvider.mockRejectedValue(error);
    const { rerender } = renderWithI18n(
      <ConfigurePanel
        open
        provider="serper"
        providerMeta={providerMeta}
        existingProvider={null}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
        onDeleteSuccess={vi.fn()}
      />,
      i18n,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter Serper API key'), {
      target: { value: 'unchanged-api-key' },
    });
    expect(screen.getByText('Get the key from https://serper.dev')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('English local fallback')).toBeTruthy();
    expect(mocks.addProvider).toHaveBeenCalledTimes(1);

    await act(async () => { await i18n.changeLanguage('de-DE'); });
    rerender(
      <I18nextProvider i18n={i18n}>
        <ConfigurePanel
          open
          provider="serper"
          providerMeta={providerMeta}
          existingProvider={null}
          onClose={vi.fn()}
          onSaveSuccess={vi.fn()}
          onDeleteSuccess={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(await screen.findByText('Deutscher lokaler Fehler')).toBeTruthy();
    expect(mocks.addProvider).toHaveBeenCalledTimes(1);
    expect(mocks.updateProvider).not.toHaveBeenCalled();
  });

  it('preserves provider feature copy and provider/server-authored errors', async () => {
    const i18n = await makeI18n();
    const configured: ConfiguredWebSearchProvider = {
      providerKey: 'serper-key',
      provider: 'serper',
      configuration: { apiKey: 'unchanged-api-key' },
      isDefault: true,
    };
    const { rerender } = renderWithI18n(
      <WebSearchProviderRow
        meta={providerMeta}
        configured={configured}
        isDefault
        isSettingDefault={false}
        anyActionInProgress={false}
        onSetDefault={vi.fn()}
        onConfigure={vi.fn()}
        onDelete={vi.fn()}
      />,
      i18n,
    );
    expect(screen.getByText('Fast Google Search API with generous free tier')).toBeTruthy();

    mocks.updateProvider.mockRejectedValue(new Error('Provider supplied API error'));
    rerender(
      <I18nextProvider i18n={i18n}>
        <ConfigurePanel
          open
          provider="serper"
          providerMeta={providerMeta}
          existingProvider={configured}
          onClose={vi.fn()}
          onSaveSuccess={vi.fn()}
          onDeleteSuccess={vi.fn()}
        />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(await screen.findByText('Provider supplied API error')).toBeTruthy();
    expect(mocks.updateProvider).toHaveBeenCalledTimes(1);
  });
});
