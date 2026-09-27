import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Toast, type Toast as ToastType } from '../toast';
import testI18n from '@/lib/__tests__/test-i18n';
import { localizedText } from '@/lib/i18n/localized-text';
import { toast as toastApi, useToastStore } from '@/lib/store/toast-store';

afterEach(async () => {
  cleanup();
  useToastStore.setState({ toasts: [] });
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
    expect(screen.getByRole('region', { name: 'English title' })).toBeTruthy();
    expect(screen.getByText('English action')).toBeTruthy();

    await act(async () => { await testI18n.changeLanguage('de-DE'); });

    expect(screen.getByText('Deutscher Titel')).toBeTruthy();
    expect(screen.getByText('Deutsche Beschreibung')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Deutscher Titel' })).toBeTruthy();
    expect(screen.getByText('Deutsche Aktion')).toBeTruthy();
  });

  it('clears an explicitly undefined description and its localized descriptor', () => {
    const id = useToastStore.getState().addToast({
      variant: 'loading',
      title: 'English title',
      titleText: localizedText('testToast.title'),
      description: 'English description',
      descriptionText: localizedText('testToast.description'),
    });

    toastApi.update(id, { description: undefined });

    const updated = useToastStore.getState().toasts.find((item) => item.id === id);
    expect(updated?.description).toBeUndefined();
    expect(updated?.descriptionText).toBeUndefined();
    expect(updated?.title).toBe('English title');
    expect(updated?.titleText).toEqual(localizedText('testToast.title'));
  });

  it('removes localized metadata without changing the displayed snapshot', () => {
    const id = useToastStore.getState().addToast({
      variant: 'loading',
      title: 'English title',
      titleText: localizedText('testToast.title'),
      description: 'English description',
      descriptionText: localizedText('testToast.description'),
    });

    toastApi.update(id, { titleText: undefined, descriptionText: undefined });

    const updated = useToastStore.getState().toasts.find((item) => item.id === id);
    expect(updated?.title).toBe('English title');
    expect(updated?.titleText).toBeUndefined();
    expect(updated?.description).toBe('English description');
    expect(updated?.descriptionText).toBeUndefined();
  });

  it('clears stale descriptors when text is replaced with plain strings', () => {
    const id = useToastStore.getState().addToast({
      variant: 'loading',
      title: 'English title',
      titleText: localizedText('testToast.title'),
      description: 'English description',
      descriptionText: localizedText('testToast.description'),
    });

    toastApi.update(id, { title: 'Saved', description: 'Saved details' });

    const updated = useToastStore.getState().toasts.find((item) => item.id === id);
    expect(updated?.title).toBe('Saved');
    expect(updated?.titleText).toBeUndefined();
    expect(updated?.description).toBe('Saved details');
    expect(updated?.descriptionText).toBeUndefined();
  });
});
