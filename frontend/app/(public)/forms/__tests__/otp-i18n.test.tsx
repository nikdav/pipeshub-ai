import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import OtpSignInFlow, { type OtpSignInFlowProps } from '../otp-sign-in-flow';
import OtpField from '../form-components/otp-field';

// Render the real fields without initializing unrelated OAuth providers in the barrel.
vi.mock('../form-components', async () => {
  const { default: EmailField } = await import('../form-components/email-field');
  const { default: Field, OTP_LENGTH } = await import('../form-components/otp-field');
  return { EmailField, OtpField: Field, OTP_LENGTH };
});

afterEach(() => { cleanup(); });

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(locales).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

async function renderFlow(overrides: Partial<OtpSignInFlowProps> = {}) {
  const i18n = await translations();
  const props: OtpSignInFlowProps = {
    email: 'person@example.org',
    onEmailChange: vi.fn(),
    sendLoginOtp: vi.fn(async () => true),
    signInWithOtp: vi.fn(),
    otpSendLoading: false,
    otpVerifyLoading: false,
    error: null,
    clearError: vi.fn(),
    ...overrides,
  };
  const view = render(
    <I18nextProvider i18n={i18n}><Theme><OtpSignInFlow {...props} /></Theme></I18nextProvider>,
  );
  return { ...view, i18n, props };
}

describe('OTP localization', () => {
  it.each(Object.keys(locales))('has every reused key in %s without fallback', async (language) => {
    const i18n = await translations();
    for (const key of [
      'auth.common.showPassword', 'auth.common.hidePassword',
      'auth.common.emailRequired', 'auth.common.emailInvalid', 'auth.common.otpInvalidLength',
    ]) {
      expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
    }
  });

  it('retranslates the visibility action without changing the OTP or its visibility', async () => {
    const i18n = await translations();
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <OtpField value="123456" onChange={onChange} />
      </Theme></I18nextProvider>,
    );
    const input = screen.getByLabelText('OTP') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: i18n.t('auth.common.showPassword') }));
    expect(input.type).toBe('text');
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('button', { name: i18n.t('auth.common.hidePassword') })).toBeTruthy();
    expect(input.value).toBe('123456');
    expect(input.type).toBe('text');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('auth.common.hidePassword') }));
    expect(input.type).toBe('password');
  });

  it.each([
    ['', 'auth.common.emailRequired'],
    ['not-an-email', 'auth.common.emailInvalid'],
  ])('retranslates an existing email error for %j', async (email, key) => {
    const { container, i18n, props } = await renderFlow({ email });
    fireEvent.submit(container.querySelector('form')!);
    const english = i18n.t(key);
    expect(screen.getByText(english)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(i18n.t(key))).toBeTruthy();
    expect(screen.queryByText(english)).toBeNull();
    expect(props.signInWithOtp).not.toHaveBeenCalled();
    expect(props.sendLoginOtp).not.toHaveBeenCalled();
  });

  it('retranslates an existing length error and preserves numeric input validation', async () => {
    const { container, i18n, props } = await renderFlow();
    const input = screen.getByLabelText('OTP') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1x23' } });
    expect(input.value).toBe('123');
    fireEvent.submit(container.querySelector('form')!);
    const english = i18n.t('auth.common.otpInvalidLength');
    expect(screen.getByText(english)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(i18n.t('auth.common.otpInvalidLength'))).toBeTruthy();
    expect(screen.queryByText(english)).toBeNull();
    expect(input.value).toBe('123');
    expect(props.signInWithOtp).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(props.signInWithOtp).toHaveBeenCalledWith('123456');
  });

  it('leaves caller-provided errors unchanged across a language switch', async () => {
    const { i18n } = await renderFlow({ error: { type: 'generic', message: 'Server-provided detail' } });
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Server-provided detail')).toBeTruthy();
  });
});
