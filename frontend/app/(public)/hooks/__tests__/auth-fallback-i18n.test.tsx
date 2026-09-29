import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { localizedText } from '@/lib/i18n/localized-text';
import { useToastStore } from '@/lib/store/toast-store';
import { Toast } from '@/app/components/feedback/toast';
import { useAuthActions } from '../use-auth-actions';

const mocks = vi.hoisted(() => ({
  api: {
    signInWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(), signInWithMicrosoft: vi.fn(),
  },
  setTokens: vi.fn(), setUser: vi.fn(), push: vi.fn(),
}));
vi.mock('../../api', () => ({ AuthApi: mocks.api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/config', () => ({
  useAuthStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));
vi.mock('@/lib/auth/hydrate-user', () => ({ fetchAndSetCurrentUser: async () => true }));
vi.mock('@/lib/utils/api-base-url', () => ({ getApiBaseUrl: () => 'https://app.example.org' }));

afterEach(() => {
  cleanup();
  useToastStore.getState().clearAll();
  vi.resetAllMocks();
});

type Actions = ReturnType<typeof useAuthActions>;
const cases: {
  method: keyof typeof mocks.api;
  invoke: (auth: Actions) => Promise<void>;
  args: unknown[];
  descriptionKey: string;
}[] = [
  { method: 'signInWithPassword', invoke: (auth) => auth.signInWithPassword('unchanged-password'), args: ['person@example.org', 'unchanged-password'], descriptionKey: 'auth.common.tooManyIncorrectCredentials' },
  { method: 'signInWithGoogle', invoke: (auth) => auth.signInWithGoogle('unchanged-google-token'), args: ['unchanged-google-token'], descriptionKey: 'auth.actionFeedback.contactAdministrator' },
  { method: 'signInWithOAuth', invoke: (auth) => auth.signInWithOAuth('unchanged-oauth-token'), args: ['unchanged-oauth-token'], descriptionKey: 'auth.actionFeedback.contactAdministrator' },
  { method: 'signInWithOtp', invoke: (auth) => auth.signInWithOtp('123456'), args: ['person@example.org', '123456'], descriptionKey: 'auth.common.tooManyIncorrectCredentials' },
  { method: 'signInWithMicrosoft', invoke: (auth) => auth.signInWithMicrosoft({ accessToken: 'access', idToken: 'identity' }, 'azureAd'), args: [{ accessToken: 'access', idToken: 'identity' }, 'azureAd'], descriptionKey: 'auth.actionFeedback.contactAdministrator' },
];
const blocked = { response: { status: 403, data: {} } };

async function translations(language = 'en-US') {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: language, fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(locales).map(([locale, catalogue]) => [locale, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

function renderActions(i18n: Awaited<ReturnType<typeof translations>>) {
  return renderHook(() => useAuthActions({ email: 'person@example.org', redirectTo: '/chat?unchanged=1' }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    ),
  });
}

function renderStoredToast(i18n: Awaited<ReturnType<typeof translations>>) {
  const storedToast = useToastStore.getState().toasts[0];
  expect(storedToast).toBeDefined();
  return render(
    <I18nextProvider i18n={i18n}>
      <Toast toast={storedToast!} onDismiss={() => undefined} />
    </I18nextProvider>,
  );
}

describe.each(cases)('$method fallback localization', ({ method, invoke, args, descriptionKey }) => {
  it('updates the already stored toast when the language changes', async () => {
    const i18n = await translations();
    mocks.api[method].mockRejectedValue(blocked);
    const { result } = renderActions(i18n);

    await act(async () => { await invoke(result.current); });

    const storedToast = useToastStore.getState().toasts[0];
    expect(storedToast?.titleText).toEqual(localizedText('auth.common.accountDisabled'));
    expect(storedToast?.descriptionText).toEqual(localizedText(descriptionKey));
    expect(storedToast?.duration).toBeNull();
    expect(storedToast?.showCloseButton).toBe(true);
    renderStoredToast(i18n);
    expect(screen.getByText(i18n.t('auth.common.accountDisabled'))).toBeTruthy();
    expect(screen.getByText(i18n.t(descriptionKey))).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(screen.getByText(i18n.t('auth.common.accountDisabled'))).toBeTruthy();
    expect(screen.getByText(i18n.t(descriptionKey))).toBeTruthy();
    expect(mocks.api[method]).toHaveBeenCalledWith(...args);
    expect(mocks.api[method]).toHaveBeenCalledTimes(1);
    expect(mocks.setTokens).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('preserves authentication payloads, token handling and redirect on success', async () => {
    const i18n = await translations('de-DE');
    const user = { id: 'unchanged-user-id', fullName: 'User-supplied name' };
    mocks.api[method].mockResolvedValue({ accessToken: 'access-result', refreshToken: 'refresh-result', user });
    const { result } = renderActions(i18n);

    await act(async () => { await invoke(result.current); });

    expect(mocks.api[method]).toHaveBeenCalledWith(...args);
    expect(mocks.api[method]).toHaveBeenCalledTimes(1);
    expect(mocks.setTokens).toHaveBeenCalledWith('access-result', 'refresh-result');
    expect(mocks.setUser).toHaveBeenCalledWith(user);
    expect(mocks.push).toHaveBeenCalledWith('/chat?unchanged=1');
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('blocked-until auth toast localization', () => {
  it('formats the stored timestamp using the current locale after a language change', async () => {
    const i18n = await translations();
    const timestamp = Date.parse('2030-03-15T13:05:00.000Z');
    mocks.api.signInWithPassword.mockRejectedValue({
      response: { status: 403, data: { error: { message: '[blockedUntil:2030-03-15T13:05:00.000Z]' } } },
    });
    const { result } = renderActions(i18n);

    await act(async () => { await result.current.signInWithPassword('unchanged-password'); });

    const storedToast = useToastStore.getState().toasts[0];
    expect(storedToast?.descriptionText).toEqual(localizedText('auth.actionFeedback.blockedUntil', {
      date: timestamp,
      formatParams: { date: { dateStyle: 'medium', timeStyle: 'short' } },
    }));
    renderStoredToast(i18n);
    const dateOptions: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
    const englishDate = new Intl.DateTimeFormat('en-US', dateOptions).format(timestamp);
    const englishTemplate = i18n.getResource('en-US', 'translation', 'auth.actionFeedback.blockedUntil') as string;
    const englishDescription = englishTemplate.replace('{{date, datetime}}', englishDate);
    expect(screen.getByText(englishDescription)).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    const germanDate = new Intl.DateTimeFormat('de-DE', dateOptions).format(timestamp);
    const germanTemplate = i18n.getResource('de-DE', 'translation', 'auth.actionFeedback.blockedUntil') as string;
    const germanDescription = germanTemplate.replace('{{date, datetime}}', germanDate);
    expect(germanDate).not.toBe(englishDate);
    expect(screen.getByText(germanDescription)).toBeTruthy();
    expect(mocks.api.signInWithPassword).toHaveBeenCalledWith('person@example.org', 'unchanged-password');
    expect(mocks.api.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it('preserves a backend-provided message verbatim', async () => {
    const i18n = await translations();
    mocks.api.signInWithPassword.mockRejectedValue({
      response: { status: 403, data: { error: { message: 'Server-provided explanation' } } },
    });
    const { result } = renderActions(i18n);

    await act(async () => { await result.current.signInWithPassword('unchanged-password'); });

    const storedToast = useToastStore.getState().toasts[0];
    expect(storedToast?.title).toBe('Server-provided explanation');
    expect(storedToast?.titleText).toBeUndefined();
    expect(storedToast?.descriptionText).toBeUndefined();
    renderStoredToast(i18n);
    expect(screen.getByText('Server-provided explanation')).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });

    expect(screen.getByText('Server-provided explanation')).toBeTruthy();
    expect(mocks.api.signInWithPassword).toHaveBeenCalledTimes(1);
  });
});
