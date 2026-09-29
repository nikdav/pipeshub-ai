import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Theme } from '@radix-ui/themes';
import { locales } from '@/lib/i18n/locales';
import { MarkdownEditor } from '../markdown-editor';

vi.mock('@radix-ui/themes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/themes')>();
  return {
    ...actual,
    Tooltip: ({ content, children }: React.PropsWithChildren<{ content: string }>) => (
      <span title={content}>{children}</span>
    ),
  };
});

afterEach(() => cleanup());

async function makeI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: Object.fromEntries(
      ['en-US', 'de-DE'].map((language) => [
        language,
        { translation: locales[language as keyof typeof locales] },
      ]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('MarkdownEditor localization', () => {
  it('updates the real placeholder decoration when the language changes', async () => {
    const i18n = await makeI18n();
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <Theme><MarkdownEditor value="" onChange={() => {}} /></Theme>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(container.querySelector('.ProseMirror p')?.getAttribute('data-placeholder'))
        .toBe('Describe how to perform this skill…');
    });
    const editorElement = container.querySelector('.ProseMirror');
    expect(editorElement).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    await waitFor(() => {
      expect(container.querySelector('.ProseMirror p')?.getAttribute('data-placeholder'))
        .toBe('Beschreiben Sie, wie dieser Skill ausgeführt werden soll…');
    });
    expect(container.querySelector('.ProseMirror')).toBe(editorElement);
  });

  it('keeps content and undo history while toolbar labels follow the locale', async () => {
    const i18n = await makeI18n();
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <Theme><MarkdownEditor value="Existing skill content" onChange={() => {}} /></Theme>
      </I18nextProvider>,
    );

    const editorElement = await waitFor(() => {
      const element = container.querySelector('.ProseMirror');
      expect(element).toBeTruthy();
      expect(element?.textContent).toBe('Existing skill content');
      return element;
    });
    expect(screen.getByRole('button', { name: 'Bold (Ctrl+B)' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Heading 2' }));
    expect(container.querySelector('.ProseMirror h2')?.textContent).toBe('Existing skill content');

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(screen.getByRole('button', { name: 'Fett (Strg+B)' })).toBeTruthy();
    expect(container.querySelector('.ProseMirror')).toBe(editorElement);
    expect(container.querySelector('.ProseMirror h2')?.textContent).toBe('Existing skill content');

    fireEvent.click(screen.getByRole('button', { name: i18n.t('workspace.skills.editorToolbar.undo') }));
    expect(container.querySelector('.ProseMirror p')?.textContent).toBe('Existing skill content');
  });

  it.each(['Custom placeholder', ''])(
    'keeps an explicit placeholder override (%j), including an empty string',
    async (placeholder) => {
      const i18n = await makeI18n();
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <Theme><MarkdownEditor value="" onChange={() => {}} placeholder={placeholder} /></Theme>
        </I18nextProvider>,
      );

      await waitFor(() => {
        expect(container.querySelector('.ProseMirror p')?.getAttribute('data-placeholder')).toBe(placeholder);
      });

      await act(async () => { await i18n.changeLanguage('de-DE'); });

      expect(container.querySelector('.ProseMirror p')?.getAttribute('data-placeholder')).toBe(placeholder);
    },
  );
});
