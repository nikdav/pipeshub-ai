import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { I18nextProvider } from 'react-i18next';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import testI18n from '@/lib/__tests__/test-i18n';
import es from '@/lib/i18n/locales/es-ES.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { i18n } from '@/lib/i18n';
import type { ApiErrorResponse } from '@/lib/api/api-error';
import { processError } from '@/lib/api/api-error';
import { useChatStore } from '@/chat/store';
import { ChatInputWrapper } from '../chat-panel/chat-input-wrapper';
import { SearchResultsView } from '../search-results/search-results-view';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  uploadAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
  append: vi.fn(),
}));

vi.mock('@assistant-ui/react', () => ({
  useThreadRuntime: () => ({ append: mocks.append }),
}));
vi.mock('@/chat/api', () => ({
  ChatApi: {
    search: mocks.search,
    uploadAttachments: mocks.uploadAttachments,
    deleteAttachment: mocks.deleteAttachment,
  },
}));
vi.mock('@/chat/hooks/use-effective-agent-id', () => ({ useEffectiveAgentId: () => null }));
vi.mock('@/chat/utils/fetch-models-for-context', () => ({ fetchModelsForContext: vi.fn(async () => {}) }));
vi.mock('../chat-input', () => ({
  ChatInput: ({ onSend }: { onSend?: (message: string) => void }) => (
    <button type="button" onClick={() => onSend?.('find this')}>Run search</button>
  ),
}));
vi.mock('../message-area/response-tabs/citations/use-citation-actions', () => ({
  useCitationActions: () => ({ onPreview: vi.fn() }),
}));
vi.mock('../search-results/search-result-card', () => ({ SearchResultCard: () => null }));
vi.mock('@/app/(main)/workspace/connectors/demo-data/use-demo-data', () => ({ useDemoDataActive: () => false }));

describe('search error localization', () => {
  beforeEach(async () => {
    i18n.addResourceBundle('de-DE', 'translation', de, true, true);
    testI18n.addResourceBundle('de-DE', 'translation', de, true, true);
    testI18n.addResourceBundle('es-ES', 'translation', es, true, true);
    await i18n.changeLanguage('de-DE');
    await testI18n.changeLanguage('de-DE');
    const state = useChatStore.getState();
    useChatStore.setState({
      settings: { ...state.settings, mode: 'search' },
      searchResults: [],
      searchQuery: '',
      searchError: null,
      searchErrorText: null,
      isSearching: false,
    });
    mocks.search.mockReset();
    mocks.search.mockRejectedValue(
      processError(new AxiosError<ApiErrorResponse>('Network Error', AxiosError.ERR_NETWORK)),
    );
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    const state = useChatStore.getState();
    useChatStore.setState({
      settings: { ...state.settings, mode: 'chat' },
      searchResults: [],
      searchQuery: '',
      searchError: null,
      searchErrorText: null,
      isSearching: false,
    });
    await Promise.all([i18n.changeLanguage('en-US'), testI18n.changeLanguage('en-US')]);
  });

  it('retains a processed network-error descriptor through the store and switches German to Spanish without another search', async () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <Theme>
          <ChatInputWrapper />
          <SearchResultsView />
        </Theme>
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run search' }));
    expect(await screen.findByText('Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.')).toBeTruthy();
    expect(useChatStore.getState().searchErrorText).toEqual({ key: 'common.errors.api.network' });
    expect(mocks.search).toHaveBeenCalledTimes(1);

    await act(async () => {
      await testI18n.changeLanguage('es-ES');
    });

    expect(await screen.findByText('Error de red. Comprueba tu conexión.')).toBeTruthy();
    expect(mocks.search).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(useChatStore.getState().isSearching).toBe(false));
  });

  it('keeps backend-authored search error text literal across a language change', async () => {
    mocks.search.mockRejectedValue(new Error('The search index is temporarily unavailable.'));

    render(
      <I18nextProvider i18n={testI18n}>
        <Theme>
          <ChatInputWrapper />
          <SearchResultsView />
        </Theme>
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run search' }));
    expect(await screen.findByText('The search index is temporarily unavailable.')).toBeTruthy();
    expect(useChatStore.getState().searchErrorText).toBeNull();
    expect(mocks.search).toHaveBeenCalledTimes(1);

    await act(async () => {
      await testI18n.changeLanguage('es-ES');
    });

    expect(screen.getByText('The search index is temporarily unavailable.')).toBeTruthy();
    expect(useChatStore.getState().searchErrorText).toBeNull();
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });
});
