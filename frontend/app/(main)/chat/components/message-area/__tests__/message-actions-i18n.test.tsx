import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { MessageActions } from '../message-actions';

const mocks = vi.hoisted(() => ({
  writeText: vi.fn(), submitFeedback: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('@/lib/store/command-store', () => ({ useCommandStore: {} }));
vi.mock('@/lib/store/toast-store', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/lib/hooks/use-chat-speech-synthesis', () => ({
  useChatSpeechSynthesis: () => ({ isSpeaking: false, isSupported: false, speak: vi.fn(), stop: vi.fn() }),
}));
vi.mock('../../../api', () => ({ ChatApi: { submitFeedback: mocks.submitFeedback } }));
vi.mock('../../../store', () => ({
  useChatStore: { getState: () => ({ activeSlotId: 'slot', slots: { slot: { convId: 'original-conversation' } } }) },
}));
vi.mock('@/app/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));
// Keep portal behavior out of this test; the component's actual state and callbacks remain in use.
vi.mock('@radix-ui/themes', () => {
  const Wrapper = ({ children, onClick }: React.PropsWithChildren<{ onClick?: React.MouseEventHandler<HTMLDivElement> }>) => (
    <div onClick={onClick}>{children}</div>
  );
  return {
    Flex: Wrapper, Box: Wrapper, Text: Wrapper,
    IconButton: ({ children, onClick }: React.PropsWithChildren<{ onClick?: React.MouseEventHandler<HTMLButtonElement> }>) => (
      <button type="button" onClick={onClick}>{children}</button>
    ),
    Popover: { Root: Wrapper, Trigger: Wrapper, Content: Wrapper },
    Tooltip: ({ children, content }: React.PropsWithChildren<{ content: string }>) => (
      <><span data-testid="tooltip-content">{content}</span>{children}</>
    ),
  };
});

afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks();
});

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: { 'en-US': { translation: en }, 'de-DE': { translation: de } },
    interpolation: { escapeValue: false },
  });
  vi.useFakeTimers();
  return i18n;
}

describe('message-action language changes', () => {
  it.each([
    ['chat.markdownWithCitations', 'chat.copiedAsMarkdown', '**User text**'],
    ['chat.onlyTextWithoutCitations', 'chat.copiedAsText', 'User text'],
  ] as const)('resolves %s after the clipboard finishes and updates an already-visible tooltip', async (option, feedback, expectedText) => {
    const i18n = await translations();
    let complete!: () => void;
    mocks.writeText.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText: mocks.writeText } });
    render(<I18nextProvider i18n={i18n}><MessageActions content="**User text**" /></I18nextProvider>);
    fireEvent.click(screen.getByText(i18n.t(option)));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { complete(); });
    expect(screen.getByTestId('tooltip-content').textContent).toBe(i18n.t(feedback));
    expect(mocks.writeText).toHaveBeenCalledTimes(1);
    expect(mocks.writeText).toHaveBeenCalledWith(expectedText);
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(screen.getByTestId('tooltip-content').textContent).toBe(i18n.t(feedback));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('tooltip-content').textContent).toBe(i18n.t('chat.copy'));
  });

  it.each([
    ['chat.feedbackCategoryExcellentAnswer', true, 'excellent_answer'],
    ['chat.feedbackCategoryIncorrectInfo', false, 'incorrect_information'],
  ] as const)('uses the response-time language for %s feedback toasts', async (category, isHelpful, value) => {
    const i18n = await translations();
    let complete!: () => void;
    mocks.submitFeedback.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    render(<I18nextProvider i18n={i18n}><MessageActions content="User text" messageId="original-message" /></I18nextProvider>);
    fireEvent.click(screen.getByText(i18n.t(category)));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { complete(); });
    expect(mocks.success).toHaveBeenCalledWith(i18n.t('chat.thankYouForFeedback'), {
      description: i18n.t('chat.feedbackHelpsImprove'),
    });
    expect(mocks.submitFeedback).toHaveBeenCalledWith('original-conversation', 'original-message', {
      isHelpful, categories: [value],
    });
  });

  it('localizes feedback errors when the request language has changed', async () => {
    const i18n = await translations();
    let fail!: (error: Error) => void;
    mocks.submitFeedback.mockReturnValue(new Promise<void>((_resolve, reject) => { fail = reject; }));
    render(<I18nextProvider i18n={i18n}><MessageActions content="User text" messageId="original-message" /></I18nextProvider>);
    fireEvent.click(screen.getByText(i18n.t('chat.feedbackCategoryExcellentAnswer')));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { fail(new Error('Server failure')); });
    expect(mocks.error).toHaveBeenCalledWith(i18n.t('chat.feedbackError'));
  });

  it('retranslates built-in mode labels without changing model names', async () => {
    const i18n = await translations();
    const modelInfo = { modelKey: 'original-model-key', chatMode: 'agent:verification', modelName: 'Original provider model' };
    render(<I18nextProvider i18n={i18n}><MessageActions content="User text" modelInfo={modelInfo} /></I18nextProvider>);
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    const label = `${i18n.t('chat.queryModes.agent.label')} (${i18n.t('chat.agentStrategy.modes.plan-execute.label')})`;
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Original provider model')).toBeTruthy();
    expect(modelInfo.chatMode).toBe('agent:verification');
  });
});
