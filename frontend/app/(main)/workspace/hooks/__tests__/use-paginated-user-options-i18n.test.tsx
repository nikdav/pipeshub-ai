import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { usePaginatedUserOptions } from '../use-paginated-user-options';

const mocks = vi.hoisted(() => ({ fetchMergedUsers: vi.fn() }));
vi.mock('../../users/api', () => ({ UsersApi: { fetchMergedUsers: mocks.fetchMergedUsers } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('usePaginatedUserOptions localization', () => {
  it('keeps missing-name fallback metadata while a language switch does not refetch or reset pagination', async () => {
    mocks.fetchMergedUsers.mockResolvedValue({
      users: [{ id: 'id-1', userId: 'user-1', name: '', email: '', profilePicture: null }],
      totalCount: 26,
    });
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: { 'en-US': { translation: {} }, 'de-DE': { translation: {} } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    );
    const { result } = renderHook(
      () => usePaginatedUserOptions({ enabled: true, limit: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loadedPage).toBe(1));
    expect(mocks.fetchMergedUsers).toHaveBeenCalledTimes(1);
    expect(result.current.options[0]).toMatchObject({
      id: 'user-1',
      label: 'Unknown User',
      isUnknownUser: true,
    });

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(mocks.fetchMergedUsers).toHaveBeenCalledTimes(1);
    expect(result.current.loadedPage).toBe(1);
    expect(result.current.options[0].id).toBe('user-1');
  });
});
