import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import type { KnowledgeHubApiResponse } from '../types';
import { FolderDetailsSidebar } from '../components/dialogs/folder-details-sidebar';

afterEach(() => cleanup());

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'es-ES',
    fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(locales).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('folder details localization', () => {
  it('translates the name metadata label when the language changes', async () => {
    const i18n = await translations();
    const tableData: KnowledgeHubApiResponse = {
      success: true,
      error: null,
      id: 'folder-id',
      currentNode: {
        id: 'folder-id',
        name: 'Engineering',
        nodeType: 'folder',
      },
      parentNode: null,
      items: [],
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    render(
      <I18nextProvider i18n={i18n}>
        <Theme>
          <FolderDetailsSidebar open onOpenChange={() => undefined} tableData={tableData} />
        </Theme>
      </I18nextProvider>,
    );

    expect(i18n.t('form.name')).toBe('Nombre');
    expect(screen.getByText('Nombre')).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('zh-CN'); });
    expect(i18n.t('form.name')).toBe('名称');
    expect(screen.getByText('名称')).toBeTruthy();
  });
});
