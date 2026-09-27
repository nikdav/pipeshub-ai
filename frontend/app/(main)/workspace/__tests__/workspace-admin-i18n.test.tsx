import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SearchableCheckboxDropdown } from '../components/searchable-checkbox-dropdown';
import { StatusBadge } from '../components/status-badge';

afterEach(cleanup);

async function createTestI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: {
        common: { loading: 'Loading...', moreOptions: 'More options' },
        workspace: {
          common: { unknownUser: 'Unknown user' },
          selector: {
            removeOption: 'Remove {{option}}',
            searchOrSelect: 'Search or select',
            noOptionsAvailable: 'No options available',
          },
          users: { statuses: { pending: 'Pending' } },
        },
      } },
      'de-DE': { translation: {
        common: { loading: 'Wird geladen …', moreOptions: 'Weitere Optionen' },
        workspace: {
          common: { unknownUser: 'Unbekannte Person' },
          selector: {
            removeOption: '{{option}} entfernen',
            searchOrSelect: 'Suchen oder auswählen',
            noOptionsAvailable: 'Keine Optionen verfügbar',
          },
          users: { statuses: { pending: 'Ausstehend' } },
        },
      } },
    },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('workspace admin labels', () => {
  it('retranslates status display while preserving the status enum', async () => {
    const i18n = await createTestI18n();
    render(<I18nextProvider i18n={i18n}><Theme><StatusBadge status="Pending" /></Theme></I18nextProvider>);

    expect(screen.getByText('Pending')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Ausstehend')).toBeTruthy();
    expect(screen.queryByText('Pending')).toBeNull();
  });

  it('retranslates missing-name options and accessible remove labels without changing IDs', async () => {
    const i18n = await createTestI18n();
    const selection = ['user-1'];
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <SearchableCheckboxDropdown
          options={[{ id: 'user-1', label: 'Unknown User', isUnknownUser: true }]}
          selectedIds={selection}
          onSelectionChange={() => {}}
        />
      </Theme></I18nextProvider>,
    );

    expect(screen.getByText('Unknown user')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Unknown user' })).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Unbekannte Person')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unbekannte Person entfernen' })).toBeTruthy();
    expect(selection).toEqual(['user-1']);
  });
});
