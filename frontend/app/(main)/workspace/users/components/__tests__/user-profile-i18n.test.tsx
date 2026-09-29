import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { UserProfileSidebar } from '../user-profile-sidebar';
import { useUsersStore } from '../../store';

afterEach(() => {
  cleanup();
  useUsersStore.setState({ isProfilePanelOpen: false, profileUser: null });
});

async function createTestI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

const profileUser = {
  id: 'user-1',
  userId: 'mongo-user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  hasLoggedIn: true,
  isActive: true,
  role: 'Member',
};

describe('user profile role localization', () => {
  it('retranslates known roles and preserves unknown role labels', async () => {
    const i18n = await createTestI18n();
    useUsersStore.getState().openProfilePanel(profileUser);

    render(
      <I18nextProvider i18n={i18n}><Theme><UserProfileSidebar /></Theme></I18nextProvider>,
    );

    expect(screen.getByText('Member')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Mitglied')).toBeTruthy();
    expect(screen.queryByText('Member')).toBeNull();
    expect(useUsersStore.getState().profileUser?.role).toBe('Member');

    act(() => {
      useUsersStore.getState().openProfilePanel({
        ...profileUser,
        role: 'External',
      });
    });
    expect(screen.getByText('External')).toBeTruthy();
  });
});
