import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { useAuthActions } from '../use-auth-actions';

const mocks = vi.hoisted(() => ({
  api: {
    signInWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(), signInWithMicrosoft: vi.fn(),
  },
  error: vi.fn(), info: vi.fn(), success: vi.fn(),
  setTokens: vi.fn(), setUser: vi.fn(), push: vi.fn(),
}));
vi.mock('../../api', () => ({ AuthApi: mocks.api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/config', () => ({
  useAuthStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));
vi.mock('@/lib/store/toast-store', () => ({
  toast: { error: mocks.error, info: mocks.info, success: mocks.success },
}));
vi.mock('@/lib/auth/hydrate-user', () => ({ fetchAndSetCurrentUser: async () => true }));
vi.mock('@/lib/utils/api-base-url', () => ({ getApiBaseUrl: () => 'https://app.example.org' }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

type Actions = ReturnType<typeof useAuthActions>;
const cases: {
  method: keyof typeof mocks.api;
  invoke: (auth: Actions) => Promise<void>;
  args: unknown[];
  credentialsHint: boolean;
}[] = [
  { method: 'signInWithPassword', invoke: (auth) => auth.signInWithPassword('unchanged-password'), args: ['person@example.org', 'unchanged-password'], credentialsHint: true },
  { method: 'signInWithGoogle', invoke: (auth) => auth.signInWithGoogle('unchanged-google-token'), args: ['unchanged-google-token'], credentialsHint: false },
  { method: 'signInWithOAuth', invoke: (auth) => auth.signInWithOAuth('unchanged-oauth-token'), args: ['unchanged-oauth-token'], credentialsHint: false },
  { method: 'signInWithOtp', invoke: (auth) => auth.signInWithOtp('123456'), args: ['person@example.org', '123456'], credentialsHint: true },
  { method: 'signInWithMicrosoft', invoke: (auth) => auth.signInWithMicrosoft({ accessToken: 'access', idToken: 'identity' }, 'azureAd'), args: [{ accessToken: 'access', idToken: 'identity' }, 'azureAd'], credentialsHint: false },
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

describe.each(cases)('$method fallback localization', ({ method, invoke, args, credentialsHint }) => {
  it.each(Object.keys(locales))('uses existing translated account-disabled feedback in %s', async (language) => {
    const i18n = await translations(language);
    expect(typeof i18n.getResource(language, 'translation', 'auth.common.accountDisabled')).toBe('string');
    expect(typeof i18n.getResource(language, 'translation', 'auth.common.tooManyIncorrectCredentials')).toBe('string');
    mocks.api[method].mockRejectedValue(blocked);
    const { result } = renderActions(i18n);
    await act(async () => { await invoke(result.current); });
    expect(mocks.error).toHaveBeenCalledWith(i18n.t('auth.common.accountDisabled'), {
      description: credentialsHint
        ? i18n.t('auth.common.tooManyIncorrectCredentials')
        : 'Please contact your administrator.',
      duration: null, showCloseButton: true,
    });
    expect(mocks.api[method]).toHaveBeenCalledWith(...args);
    expect(mocks.api[method]).toHaveBeenCalledTimes(1);
    expect(mocks.setTokens).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('uses the latest language when an already pending request fails', async () => {
    const i18n = await translations();
    let reject!: (error: unknown) => void;
    mocks.api[method].mockImplementation(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }));
    const { result } = renderActions(i18n);
    let request!: Promise<void>;
    act(() => { request = invoke(result.current); });
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    await act(async () => { reject(blocked); await request; });
    expect(mocks.error.mock.calls[0][0]).toBe(i18n.t('auth.common.accountDisabled'));
    expect(mocks.api[method]).toHaveBeenCalledTimes(1);
  });

  it('preserves the server message and the existing blocking-toast options', async () => {
    const i18n = await translations('de-DE');
    mocks.api[method].mockRejectedValue({ response: { status: 403, data: { error: { message: 'Server-provided explanation' } } } });
    const { result } = renderActions(i18n);
    await act(async () => { await invoke(result.current); });
    expect(mocks.error).toHaveBeenCalledWith('Server-provided explanation', {
      description: undefined, duration: null, showCloseButton: true,
    });
  });

  it('preserves authentication payloads, token handling and redirect on success', async () => {
    const i18n = await translations('de-DE');
    const user = { id: 'unchanged-user-id', fullName: 'User-supplied name' };
    mocks.api[method].mockResolvedValue({ accessToken: 'access-result', refreshToken: 'refresh-result', user });
    const { result } = renderActions(i18n);
    await act(async () => { await invoke(result.current); });
    expect(mocks.api[method]).toHaveBeenCalledWith(...args);
    expect(mocks.setTokens).toHaveBeenCalledWith('access-result', 'refresh-result');
    expect(mocks.setUser).toHaveBeenCalledWith(user);
    expect(mocks.push).toHaveBeenCalledWith('/chat?unchanged=1');
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
