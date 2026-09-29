import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { usePaginatedUserOptions } from '../use-paginated-user-options';

const mocks = vi.hoisted(() => ({ fetchMergedUsers: vi.fn() }));
vi.mock('../../users/api', () => ({ UsersApi: { fetchMergedUsers: mocks.fetchMergedUsers } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('usePaginatedUserOptions', () => {
  it('maps missing-name fallback labels while preserving source user metadata', async () => {
    mocks.fetchMergedUsers.mockResolvedValue({
      users: [
        {
          id: 'db-1', userId: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com',
          profilePicture: 'https://example.com/ada.png',
        },
        {
          id: 'db-2', userId: 'user-2', name: '', email: 'grace@example.com',
          profilePicture: null,
        },
        { id: 'db-3', userId: 'user-3', name: '', email: '', profilePicture: null },
      ],
      totalCount: 3,
    });
    const { result } = renderHook(() => usePaginatedUserOptions({ enabled: true, limit: 25 }));

    await waitFor(() => expect(result.current.loadedPage).toBe(1));

    expect(result.current.options).toEqual([
      {
        id: 'user-1', label: 'Ada Lovelace', isUnknownUser: false,
        subtitle: 'ada@example.com', profilePicture: 'https://example.com/ada.png',
      },
      {
        id: 'user-2', label: 'grace@example.com', isUnknownUser: false,
        subtitle: 'grace@example.com', profilePicture: null,
      },
      {
        id: 'user-3', label: 'Unknown User', isUnknownUser: true,
        subtitle: '', profilePicture: null,
      },
    ]);
    expect(mocks.fetchMergedUsers).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMergedUsers).toHaveBeenCalledWith({ page: 1, limit: 25, search: undefined });
  });
});
