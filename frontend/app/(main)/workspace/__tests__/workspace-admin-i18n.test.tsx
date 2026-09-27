import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('retranslates the default selector placeholder while closed and open, preserving an empty override', async () => {
    const i18n = await createTestI18n();
    const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    try {
      const view = render(
        <I18nextProvider i18n={i18n}><Theme>
          <SearchableCheckboxDropdown options={[]} selectedIds={[]} onSelectionChange={() => {}} />
        </Theme></I18nextProvider>,
      );

      expect(screen.getByText('Search or select')).toBeTruthy();
      await act(async () => { await i18n.changeLanguage('de-DE'); });
      expect(screen.getByText('Suchen oder auswählen')).toBeTruthy();

      fireEvent.click(screen.getByText('Suchen oder auswählen'));
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
      expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe('Suchen oder auswählen');
      await act(async () => { await i18n.changeLanguage('en-US'); });
      expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe('Search or select');

      view.rerender(
        <I18nextProvider i18n={i18n}><Theme>
          <SearchableCheckboxDropdown
            options={[]}
            selectedIds={[]}
            onSelectionChange={() => {}}
            placeholder=""
          />
        </Theme></I18nextProvider>,
      );
      expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe('');
    } finally {
      if (scrollIntoViewDescriptor) {
        Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoViewDescriptor);
      } else {
        Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
      }
    }
  });

  it('retranslates missing-name options and accessible remove labels without changing IDs', async () => {
    const i18n = await createTestI18n();
    const onSelectionChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <SearchableCheckboxDropdown
          options={[{ id: 'user-1', label: 'Unknown User', isUnknownUser: true }]}
          selectedIds={['user-1']}
          onSelectionChange={onSelectionChange}
        />
      </Theme></I18nextProvider>,
    );

    expect(screen.getByText('Unknown user')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Unknown user' })).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Unbekannte Person')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unbekannte Person entfernen' })).toBeTruthy();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('keeps chip removal keyboard and pointer accessible while respecting disabled state', async () => {
    const i18n = await createTestI18n();
    const onEnabledSelectionChange = vi.fn();
    const onDisabledSelectionChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <SearchableCheckboxDropdown
          options={[{ id: 'enabled', label: 'Enabled' }]}
          selectedIds={['enabled']}
          onSelectionChange={onEnabledSelectionChange}
        />
        <SearchableCheckboxDropdown
          options={[{ id: 'disabled', label: 'Disabled' }]}
          selectedIds={['disabled']}
          onSelectionChange={onDisabledSelectionChange}
          disabled
        />
      </Theme></I18nextProvider>,
    );

    const enabledRemoveButton = screen.getByRole('button', { name: 'Remove Enabled' });
    const disabledRemoveButton = screen.getByRole('button', { name: 'Remove Disabled' });
    expect(disabledRemoveButton.getAttribute('aria-disabled')).toBe('true');
    expect(disabledRemoveButton.getAttribute('tabindex')).toBe('-1');

    fireEvent.click(enabledRemoveButton);
    fireEvent.keyDown(enabledRemoveButton, { key: 'Enter' });
    fireEvent.keyDown(enabledRemoveButton, { key: ' ' });
    fireEvent.click(disabledRemoveButton);
    fireEvent.keyDown(disabledRemoveButton, { key: 'Enter' });
    fireEvent.keyDown(disabledRemoveButton, { key: ' ' });

    expect(onEnabledSelectionChange).toHaveBeenCalledTimes(3);
    expect(onEnabledSelectionChange).toHaveBeenNthCalledWith(1, []);
    expect(onEnabledSelectionChange).toHaveBeenNthCalledWith(2, []);
    expect(onEnabledSelectionChange).toHaveBeenNthCalledWith(3, []);
    expect(onDisabledSelectionChange).not.toHaveBeenCalled();
  });
});
