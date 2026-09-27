'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Flex } from '@radix-ui/themes';
import { useAuthStore } from '@/config';
import { toast } from '@/lib/store/toast-store';
import { GuestGuard } from '@/app/components/ui/guest-guard';
import { LoadingScreen } from '@/app/components/ui/auth-guard';
import { useAuthWideLayout } from '@/lib/hooks/use-breakpoint';
import AuthHero from '../components/auth-hero';
import FormPanel from '../components/form-panel';
import { SingleProvider, MultipleProviders } from '../forms';
import { AuthApi, type AuthMethod } from '../api';
import { getOrgExists } from '@/lib/api/org-exists-public';
import { localizedText, type LocalizedTextValue } from '@/lib/i18n/localized-text';

// --- Auth step state machine --------------------------------------------------

type AuthStep =
  | { type: 'loading' }
  | {
    type: 'single';
    method: AuthMethod;
    authProviders: Record<string, Record<string, string>>;
  }
  | {
    type: 'multiple';
    allowedMethods: AuthMethod[];
    authProviders: Record<string, Record<string, string>>;
  };

/** Backend SAML error codes → short user-facing descriptions. */
const SAML_ERROR_DESCRIPTIONS: Record<string, string> = {
  jit_Disabled: 'jitProvisioningDisabled',
  jit_disabled: 'jitProvisioningDisabled',
  Saml_sso_disabled: 'samlSsoDisabled',
  saml_sso_disabled: 'samlSsoDisabled',
  auth_failed: 'samlAuthenticationFailed',
  unknown: 'unexpectedSamlFailure',
};

function getSamlErrorDescription(code: string): LocalizedTextValue {
  const key = SAML_ERROR_DESCRIPTIONS[code];
  return key ? localizedText(`auth.login.samlErrorDescriptions.${key}`) : code;
}

export default function LoginPage() {
  const router = useRouter();
  const splitLayout = useAuthWideLayout();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [step, setStep] = useState<AuthStep>({ type: 'loading' });

  // Prevents the initAuth call from running twice in React Strict Mode
  // (where mount effects are intentionally run twice in development).
  const initAuthCalledRef = useRef(false);
  const samlErrorHandledRef = useRef(false);
  const emailVerifyHandledRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (emailVerifyHandledRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const emailVerify = params.get('email_verify');
    if (emailVerify === 'success' || emailVerify === 'error') {
      emailVerifyHandledRef.current = true;
      if (emailVerify === 'success') {
        toast.success(localizedText('auth.login.emailVerifiedTitle'), {
          description: localizedText('auth.login.emailVerifiedDescription'),
        });
      } else {
        const detail = params.get('email_verify_msg');
        const messageKey = params.get('email_verify_key');
        const emailVerifyFallback = messageKey === 'auth.emailVerification.missingToken' ||
          messageKey === 'auth.emailVerification.failed'
          ? messageKey
          : 'auth.login.emailVerifyFailedDescription';
        toast.error(localizedText('auth.login.emailVerifyFailedTitle'), {
          description: detail?.trim() || localizedText(emailVerifyFallback),
        });
      }
      router.replace('/login');
      return;
    }
  }, [isHydrated, router]);

  useEffect(() => {
    if (!isHydrated) return;
    if (samlErrorHandledRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const samlErrorCode = params.get('saml_error');
    if (samlErrorCode) {
      samlErrorHandledRef.current = true;
      toast.error(localizedText('auth.login.samlErrorTitle'), {
        description: getSamlErrorDescription(samlErrorCode),
      });
      router.replace('/login');
      return;
    }

    if (params.get('error') === 'saml_sso') {
      samlErrorHandledRef.current = true;
      toast.error(localizedText('auth.login.samlSignInFailedTitle'), {
        description: localizedText('auth.login.samlSignInFailedDescription'),
      });
      router.replace('/login');
    }
  }, [isHydrated, router]);

  useEffect(() => {
    if (!isHydrated) return;
    if (initAuthCalledRef.current) return;
    initAuthCalledRef.current = true;

    let cancelled = false;

    void getOrgExists()
      .then(({ exists }) => {
        if (!exists) {
          router.replace('/sign-up');
          return;
        }
        // if (cancelled) return;
        return AuthApi.initAuth();
      })
      .then((response) => {
        // if (cancelled || response === undefined) return;
        const methods = response.allowedMethods ?? [];
        const providers = response.authProviders ?? {};
        if (methods.length <= 1) {
          setStep({
            type: 'single',
            method: methods[0] ?? 'password',
            authProviders: providers,
          });
        } else {
          setStep({
            type: 'multiple',
            allowedMethods: methods,
            authProviders: providers,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStep({
          type: 'single',
          method: 'password',
          authProviders: {},
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, router]);

  function renderForm() {
    switch (step.type) {
      case 'loading':
        // Avoid empty FormPanel (especially with narrow layout / AuthHero hidden === null).
        return <LoadingScreen />;

      case 'single':
        return (
          <SingleProvider
            method={step.method}
            authProviders={step.authProviders}
          />
        );

      case 'multiple':
        return (
          <MultipleProviders
            allowedMethods={step.allowedMethods}
            authProviders={step.authProviders}
          />
        );
    }
  }

  return (
    <GuestGuard>
      <Flex
        direction={splitLayout ? 'row' : 'column'}
        style={{
          minHeight: '100dvh',
          overflow: splitLayout ? 'hidden' : undefined,
        }}
      >
        <AuthHero splitLayout={splitLayout} />
        <FormPanel splitLayout={splitLayout}>{renderForm()}</FormPanel>
      </Flex>
    </GuestGuard>
  );
}
