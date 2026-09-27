import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Toast, type Toast as ToastType } from '../toast';
import testI18n from '@/lib/__tests__/test-i18n';
import { localizedText } from '@/lib/i18n/localized-text';

afterEach(async () => {
  cleanup();
  await act(async () => { await testI18n.changeLanguage('en-US'); });
});

describe('Toast localized descriptors', () => {
  it('updates a stored toast when the active language changes', async () => {
    testI18n.addResourceBundle('en-US', 'translation', {
      testToast: { title: 'English title', description: 'English description', action: 'English action' },
    }, true, true);
    testI18n.addResourceBundle('de-DE', 'translation', {
      testToast: { title: 'Deutscher Titel', description: 'Deutsche Beschreibung', action: 'Deutsche Aktion' },
    }, true, true);
    await act(async () => { await testI18n.changeLanguage('en-US'); });

    const toast: ToastType = {
      id: 'localized-toast',
      variant: 'error',
      title: 'English title',
      titleText: localizedText('testToast.title'),
      description: 'English description',
      descriptionText: localizedText('testToast.description'),
      action: {
        label: 'English action',
        labelText: localizedText('testToast.action'),
      },
      createdAt: Date.now(),
    };

    render(
      <I18nextProvider i18n={testI18n}>
        <Toast toast={toast} onDismiss={() => undefined} />
      </I18nextProvider>,
    );

    expect(screen.getByText('English title')).toBeTruthy();
    expect(screen.getByText('English description')).toBeTruthy();
    expect(screen.getByText('English action')).toBeTruthy();

    await act(async () => { await testI18n.changeLanguage('de-DE'); });

    expect(screen.getByText('Deutscher Titel')).toBeTruthy();
    expect(screen.getByText('Deutsche Beschreibung')).toBeTruthy();
    expect(screen.getByText('Deutsche Aktion')).toBeTruthy();
  });
});
