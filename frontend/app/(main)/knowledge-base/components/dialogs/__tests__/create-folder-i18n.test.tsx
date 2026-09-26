import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { CreateFolderDialog } from '../create-folder-dialog';

vi.mock('@/app/components/ui', () => ({ FolderIcon: () => null }));

afterEach(() => { cleanup(); });

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(locales).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('collection and folder creation localization', () => {
  it.each(Object.keys(locales))('has both placeholder keys directly in %s', async (language) => {
    const i18n = await translations();
    for (const key of ['form.enterTitle', 'form.enterDescription']) {
      expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
    }
  });

  it.each([false, true])('retranslates placeholders without changing entered contents (collection=%s)', async (isCollection) => {
    const i18n = await translations();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <CreateFolderDialog open isCollection={isCollection} onSubmit={onSubmit} onOpenChange={onOpenChange} parentFolderName="User-supplied parent" />
      </Theme></I18nextProvider>,
    );
    const title = screen.getByPlaceholderText(i18n.t('form.enterTitle')) as HTMLInputElement;
    const description = screen.getByPlaceholderText(i18n.t('form.enterDescription')) as HTMLInputElement;
    fireEvent.change(title, { target: { value: '  User title  ' } });
    fireEvent.change(description, { target: { value: '  User description  ' } });
    for (const language of ['de-DE', 'zh-CN']) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(screen.getByPlaceholderText(i18n.t('form.enterTitle'))).toBe(title);
      expect(screen.getByPlaceholderText(i18n.t('form.enterDescription'))).toBe(description);
      expect(title.value).toBe('  User title  ');
      expect(description.value).toBe('  User description  ');
      expect(screen.getByText('User-supplied parent')).toBeTruthy();
    }
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('action.create') }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('User title', 'User description');
  });
});
