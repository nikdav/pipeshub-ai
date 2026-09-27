import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const mocks = vi.hoisted(() => {
  const chain = {
    focus: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleCode: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    toggleCodeBlock: vi.fn(() => chain),
    toggleBlockquote: vi.fn(() => chain),
    setHorizontalRule: vi.fn(() => chain),
    undo: vi.fn(() => chain),
    redo: vi.fn(() => chain),
    run: vi.fn(),
  };
  const editor = {
    isEmpty: true,
    content: 'unchanged skill body',
    isActive: vi.fn(() => false),
    chain: vi.fn(() => chain),
    setEditable: vi.fn(),
    view: { dispatch: vi.fn() },
    state: { tr: {} },
    commands: { setContent: vi.fn() },
    storage: { markdown: { getMarkdown: vi.fn(() => 'unchanged skill body') } },
  };
  return { editor, chain, placeholderExtensions: [] as Array<{ options: { placeholder: () => string } }> };
});

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mocks.editor),
  EditorContent: ({ editor }: { editor: typeof mocks.editor }) => (
    <div data-testid="editor-content">{editor.content}</div>
  ),
}));
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: (options: { placeholder: () => string }) => {
      const extension = { options };
      mocks.placeholderExtensions.push(extension);
      return extension;
    },
  },
}));
vi.mock('tiptap-markdown', () => ({ Markdown: { configure: () => ({}) } }));
vi.mock('@/app/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));
vi.mock('@radix-ui/themes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/themes')>();
  return {
    ...actual,
    Tooltip: ({ content, children }: React.PropsWithChildren<{ content: string }>) => (
      <span data-testid="tooltip-label" data-label={content}>{children}</span>
    ),
  };
});

import { MarkdownEditor } from '../markdown-editor';

async function makeI18n() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: { keyboard: { modifier: { ctrl: 'Ctrl' } }, workspace: { skills: {
        form: { bodyPlaceholder: 'Describe the skill' }, editorToolbar: {
          bold: 'Bold ({{modifier}}+B)', italic: 'Italic ({{modifier}}+I)', inlineCode: 'Inline code',
          heading2: 'Heading 2', bulletList: 'Bullet list', numberedList: 'Numbered list',
          codeBlock: 'Code block', blockquote: 'Blockquote', horizontalRule: 'Horizontal rule', undo: 'Undo', redo: 'Redo',
        },
      } } } },
      'de-DE': { translation: { keyboard: { modifier: { ctrl: 'Strg' } }, workspace: { skills: {
        form: { bodyPlaceholder: 'Fähigkeit beschreiben' }, editorToolbar: {
          bold: 'Fett ({{modifier}}+B)', italic: 'Kursiv ({{modifier}}+I)', inlineCode: 'Inlinecode',
          heading2: 'Überschrift 2', bulletList: 'Aufzählung', numberedList: 'Nummerierung',
          codeBlock: 'Codeblock', blockquote: 'Zitat', horizontalRule: 'Trennlinie', undo: 'Rückgängig', redo: 'Wiederholen',
        },
      } } } },
    },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return i18n;
}

afterEach(() => {
  cleanup();
  mocks.placeholderExtensions.length = 0;
  vi.clearAllMocks();
});

describe('MarkdownEditor localization', () => {
  it('updates placeholder and accessible toolbar labels on language changes without replacing editor content or commands', async () => {
    const i18n = await makeI18n();
    const onChange = vi.fn();
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <MarkdownEditor value="unchanged skill body" onChange={onChange} />
      </I18nextProvider>,
    );

    expect(screen.getByTestId('editor-content').textContent).toBe('unchanged skill body');
    expect(screen.getByRole('button', { name: 'Bold (Ctrl+B)' })).toBeTruthy();
    const initialPlaceholder = mocks.placeholderExtensions[0].options.placeholder;
    expect(initialPlaceholder()).toBe('Describe the skill');

    await act(async () => { await i18n.changeLanguage('de-DE'); });
    rerender(
      <I18nextProvider i18n={i18n}>
        <MarkdownEditor value="unchanged skill body" onChange={onChange} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('button', { name: 'Fett (Strg+B)' })).toBeTruthy();
    expect(initialPlaceholder()).toBe('Fähigkeit beschreiben');
    expect(mocks.editor.view.dispatch).toHaveBeenCalled();
    expect(screen.getByTestId('editor-content').textContent).toBe('unchanged skill body');
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.editor.commands.setContent).not.toHaveBeenCalled();
  });
});
