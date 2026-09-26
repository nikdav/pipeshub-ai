import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import type { Conversation } from '@/chat/types';
import { ChatRow } from '../chat-row';
import { SearchResultRow } from '../search-result-row';

afterEach(cleanup);

const created = new Date(2026, 2, 15, 12);
const conversation = {
  id: 'i18n-conversation',
  title: 'Original user content',
  createdAt: created.toISOString(),
  updatedAt: created.toISOString(),
} as Conversation;

describe('chat search rows', () => {
  it.each(['chat', 'result'] as const)('updates the %s row date on a live language change', async (kind) => {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: { 'en-US': { translation: en }, 'de-DE': { translation: de } },
      interpolation: { escapeValue: false },
    });
    render(
      <I18nextProvider i18n={i18n}>
        <Theme>
          {kind === 'chat'
            ? <ChatRow conversation={conversation} onClick={() => {}} showDate />
            : <SearchResultRow conversation={conversation} onClick={() => {}} />}
        </Theme>
      </I18nextProvider>,
    );
    const dateOptions = { month: 'long', year: 'numeric' } as const;
    const englishDate = new Intl.DateTimeFormat('en-US', dateOptions).format(created);
    const germanDate = new Intl.DateTimeFormat('de-DE', dateOptions).format(created);
    expect(englishDate).not.toBe(germanDate);
    expect(screen.getByText(englishDate)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(germanDate)).toBeTruthy();
    expect(screen.queryByText(englishDate)).toBeNull();
    expect(screen.getByText(conversation.title)).toBeTruthy();
  });
});
