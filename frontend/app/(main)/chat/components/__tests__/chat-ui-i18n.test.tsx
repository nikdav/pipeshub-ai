import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import i18next, { type i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { ExpandableUserQuery } from '../message-area/expandable-user-query';

afterEach(() => cleanup());

const h = React.createElement;

async function makeI18n(): Promise<i18n> {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'en',
    fallbackLng: false,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          'askUserQuestion.showMore': 'Show more',
          'askUserQuestion.showLess': 'Show less',
          'chat.editQuery': 'Edit query',
          'chat.copy': 'Copy',
          'chatStream.copiedCode': 'Copied',
        },
      },
      de: {
        translation: {
          'askUserQuestion.showMore': 'Mehr anzeigen',
          'askUserQuestion.showLess': 'Weniger anzeigen',
          'chat.editQuery': 'Frage bearbeiten',
          'chat.copy': 'Kopieren',
          'chatStream.copiedCode': 'Kopiert',
        },
      },
    },
  });
  return instance;
}

function renderQuery(instance: i18n, question: string) {
  return render(
    h(I18nextProvider, { i18n: instance },
      h(Theme, null,
        h(ExpandableUserQuery, {
          question,
        }),
      ),
    ),
  );
}

describe('chat UI locale metadata', () => {
  it('retranslates controls without resetting expanded user content', async () => {
    const instance = await makeI18n();
    const question = `User supplied question ${'details '.repeat(40)}`;
    const { container } = renderQuery(instance, question);

    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeTruthy();
    expect(container.textContent).toContain(question);

    await act(async () => {
      await instance.changeLanguage('de');
    });

    expect(screen.getByText('Weniger anzeigen')).toBeTruthy();
    expect(container.textContent).toContain(question);
  });
});
