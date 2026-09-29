import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { Toast } from '@/app/components/feedback/toast';
import { useToastStore } from '@/lib/store/toast-store';
import { MessageActions } from '../message-actions';

const mocks = vi.hoisted(() => ({
  writeText: vi.fn(),
  submitFeedback: vi.fn(),
  onTtsError: undefined as ((error: string) => void) | undefined,
}));
vi.mock('@/lib/store/command-store', () => ({ useCommandStore: {} }));
vi.mock('@/lib/hooks/use-chat-speech-synthesis', () => ({
  useChatSpeechSynthesis: ({ onError }: { onError: (error: string) => void }) => {
    mocks.onTtsError = onError;
    return { isSpeaking: false, isSupported: false, speak: vi.fn(), stop: vi.fn() };
  },
}));
vi.mock('../../../api', () => ({ ChatApi: { submitFeedback: mocks.submitFeedback } }));
vi.mock('../../../store', () => ({
  useChatStore: { getState: () => ({ activeSlotId: 'slot', slots: { slot: { convId: 'original-conversation' } } }) },
}));

afterEach(() => {
  cleanup();
  useToastStore.getState().clearAll();
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks();
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

function renderActions(i18n: Awaited<ReturnType<typeof translations>>, props: React.ComponentProps<typeof MessageActions>) {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  return render(
    <Theme>
      <I18nextProvider i18n={i18n}>
        <MessageActions {...props} />
        <StoredToast />
      </I18nextProvider>
    </Theme>,
  );
}

function StoredToast() {
  const currentToast = useToastStore((state) => state.toasts[0]);
  return currentToast ? <Toast toast={currentToast} onDismiss={() => undefined} /> : null;
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
    renderActions(i18n, { content: '**User text**' });
    fireEvent.click(screen.getByRole('button', { name: /content_copy/ }));
    fireEvent.click(screen.getByText(i18n.t(option)));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { complete(); });
    expect(screen.getByRole('tooltip').textContent).toBe(i18n.t(feedback));
    expect(mocks.writeText).toHaveBeenCalledTimes(1);
    expect(mocks.writeText).toHaveBeenCalledWith(expectedText);
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(screen.getByRole('tooltip').textContent).toBe(i18n.t(feedback));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText(i18n.t(feedback))).toBeNull();
  });

  it.each([
    ['chat.feedbackCategoryExcellentAnswer', true, 'excellent_answer'],
    ['chat.feedbackCategoryIncorrectInfo', false, 'incorrect_information'],
  ] as const)('localizes stored %s feedback toasts after the request and on later language changes', async (category, isHelpful, value) => {
    const i18n = await translations();
    let complete!: () => void;
    mocks.submitFeedback.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    renderActions(i18n, { content: 'User text', messageId: 'original-message' });
    fireEvent.click(screen.getByRole('button', { name: isHelpful ? /thumb_up_off_alt/ : /thumb_down_off_alt/ }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t(category) }));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { complete(); });
    expect(screen.getByText(i18n.t('chat.thankYouForFeedback'))).toBeTruthy();
    expect(screen.getByText(i18n.t('chat.feedbackHelpsImprove'))).toBeTruthy();
    expect(mocks.submitFeedback).toHaveBeenCalledWith('original-conversation', 'original-message', {
      isHelpful, categories: [value],
    });
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(screen.getByText(i18n.t('chat.thankYouForFeedback'))).toBeTruthy();
    expect(screen.getByText(i18n.t('chat.feedbackHelpsImprove'))).toBeTruthy();
  });

  it('localizes feedback errors when the request language has changed', async () => {
    const i18n = await translations();
    let fail!: (error: Error) => void;
    mocks.submitFeedback.mockReturnValue(new Promise<void>((_resolve, reject) => { fail = reject; }));
    renderActions(i18n, { content: 'User text', messageId: 'original-message' });
    fireEvent.click(screen.getByRole('button', { name: /thumb_up_off_alt/ }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('chat.feedbackCategoryExcellentAnswer') }));
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { fail(new Error('Server failure')); });
    expect(screen.getByText(i18n.t('chat.feedbackError'))).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(screen.getByText(i18n.t('chat.feedbackError'))).toBeTruthy();
  });

  it.each([
    ['not-supported', 'chat.ttsNotSupported'],
    ['failed', 'chat.ttsFailed'],
  ] as const)('updates stored TTS toast text for %s when the language changes', async (error, key) => {
    const i18n = await translations();
    renderActions(i18n, { content: 'User text' });
    act(() => { mocks.onTtsError?.(error); });
    expect(screen.getByText(i18n.t(key))).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(i18n.t(key))).toBeTruthy();
  });

  it('retranslates built-in mode labels without changing model names', async () => {
    const i18n = await translations();
    const modelInfo = { modelKey: 'original-model-key', chatMode: 'agent:verification', modelName: 'Original provider model' };
    renderActions(i18n, { content: 'User text', modelInfo });
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    const label = `${i18n.t('chat.queryModes.agent.label')} (${i18n.t('chat.agentStrategy.modes.plan-execute.label')})`;
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Original provider model')).toBeTruthy();
    expect(modelInfo.chatMode).toBe('agent:verification');
  });
});
