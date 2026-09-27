import React, { createContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { localizedText, resolveLocalizedText } from '@/lib/i18n/localized-text';
import { apiErrorDetail } from '@/app/(main)/agents/agent-builder/components/toolset-agent-auth-helpers';

const mocks = vi.hoisted(() => ({
  getToolsetRegistrySchema: vi.fn(),
  listToolsetOAuthConfigs: vi.fn(),
  createToolsetInstance: vi.fn(),
}));

vi.mock('@/app/(main)/toolsets/api', () => ({ ToolsetsApi: mocks }));
vi.mock('@/app/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));
vi.mock('@/app/components/ui/ConnectorIcon', () => ({ ConnectorIcon: () => null, resolveConnectorType: () => 'default' }));
vi.mock('@/app/components/ui/lottie-loader', () => ({ LottieLoader: () => null }));
vi.mock('@/app/(main)/workspace/connectors/components/authenticate-tab/documentation-section', () => ({ DocumentationSection: () => null }));
vi.mock('@/app/(main)/workspace/connectors/components/schema-form-field', () => ({ SchemaFormField: () => null }));
vi.mock('@/app/(main)/workspace/components/form-field', () => ({ FormField: () => null }));
vi.mock('@/app/(main)/workspace/components/workspace-right-panel', async () => {
  const { createElement } = await import('react');
  return {
    WorkspaceRightPanelBodyPortalContext: createContext(null),
    WORKSPACE_DRAWER_POPPER_Z_INDEX: 1000,
    WorkspaceRightPanel: ({ children, title, primaryLabel, onPrimaryClick }: React.PropsWithChildren<{
      title: string;
      primaryLabel: string;
      onPrimaryClick: () => void;
    }>) => createElement('section', null,
      createElement('h2', null, title),
      createElement('button', { type: 'button', onClick: onPrimaryClick }, primaryLabel),
      children,
    ),
  };
});

import { ActionSetupPanel } from '../action-setup-panel';

async function makeI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: { test: { localError: 'English local failure' }, action: { create: 'Create' }, workspace: { actions: { configPanelTitle: 'Create action instance' } } } },
      'de-DE': { translation: { test: { localError: 'Deutscher lokaler Fehler' }, action: { create: 'Erstellen' }, workspace: { actions: { configPanelTitle: 'Akionsinstanz erstellen' } } } },
    },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return i18n;
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('action setup localized errors', () => {
  it('re-resolves stored descriptors after a language change without retrying creation', async () => {
    const i18n = await makeI18n();
    mocks.getToolsetRegistrySchema.mockResolvedValue({});
    mocks.listToolsetOAuthConfigs.mockResolvedValue([]);
    mocks.createToolsetInstance.mockRejectedValue(Object.assign(new Error('English local failure'), {
      messageText: localizedText('test.localError'),
    }));

    render(
      <I18nextProvider i18n={i18n}>
        <ActionSetupPanel
          open
          registryRow={{ name: 'service', displayName: 'Service', supportedAuthTypes: ['NONE'] } as never}
          onOpenChange={vi.fn()}
          onCreated={vi.fn()}
        />
      </I18nextProvider>,
    );

    await waitFor(() => expect(mocks.getToolsetRegistrySchema).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('English local failure')).toBeTruthy();
    expect(mocks.createToolsetInstance).toHaveBeenCalledTimes(1);

    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Deutscher lokaler Fehler')).toBeTruthy();
    expect(mocks.createToolsetInstance).toHaveBeenCalledTimes(1);
  });

  it('keeps backend/provider error wording unchanged', async () => {
    const i18n = await makeI18n();
    const sourceMessage = 'Provider supplied raw authorization detail';
    const resolved = resolveLocalizedText(apiErrorDetail(new Error(sourceMessage)), i18n.t);
    expect(resolved).toBe(sourceMessage);
  });
});
