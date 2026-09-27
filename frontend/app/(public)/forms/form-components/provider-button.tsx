'use client';

import React from 'react';
import Image from 'next/image';
import { LoadingButton } from '@/app/components/ui/loading-button';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthProviderType = 'sso' | 'google' | 'microsoft' | 'oauth' | 'github';

const PROVIDER_CONFIG: Record<
  AuthProviderType,
  { labelKey: string; icon: React.ReactNode }
> = {
  /** SSO has no logo — fallback label when `samlProviderName` is not provided. */
  sso: {
    labelKey: 'auth.providers.signInWithSso',
    icon: null,
  },
  google: {
    labelKey: 'auth.providers.continueWithGoogle',
    icon: (
      <Image
        src="/login-page-assets/providers/google-fill.svg"
        alt="Google"
        width={18}
        height={18}
      />
    ),
  },
  microsoft: {
    labelKey: 'auth.providers.continueWithMicrosoft',
    icon: (
      <Image
        src="/login-page-assets/providers/microsoft.svg"
        alt="Microsoft"
        width={18}
        height={18}
      />
    ),
  },
  oauth: {
    labelKey: 'auth.providers.continueWithOAuth',
    icon: (
      <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
        login
      </span>
    ),
  },
  github: {
    labelKey: 'auth.providers.continueWithGitHub',
    icon: (
      <Image
        src="/icons/auth-config/github.svg"
        alt="GitHub"
        width={18}
        height={18}
      />
    ),
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProviderButtonProps {
  provider: AuthProviderType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Render as accent-filled primary button instead of outline. */
  primary?: boolean;
  /**
   * When `provider` is `sso`, IdP display name from initAuth (e.g. `authProviders.saml.samlPlatform` — "OKTA").
   * Renders as "Sign in with {name}".
   */
  samlProviderName?: string;
  /**
   * When `provider` is `oauth`, the display name from initAuth `authProviders.oauth.providerName`.
   * Renders as "Continue with {name}".
   */
  oauthProviderName?: string;
}

/**
 * Reads SAML IdP label from initAuth `authProviders.saml` (`samlPlatform`) or legacy `authProviders.samlSso`.
 */
export function getSamlProviderNameFromAuthProviders(
  authProviders?: Record<string, unknown>,
): string | undefined {
  const saml = authProviders?.saml ?? authProviders?.samlSso;
  if (!saml || typeof saml !== 'object') return undefined;
  const o = saml as Record<string, unknown>;
  const raw = o.samlPlatform ?? o.providerName ?? o.name;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t || undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ProviderButton — a single configurable button for SSO / Google / Microsoft / OAuth.
 *
 * SSO renders with no icon; label uses `samlProviderName` when provided ("Sign in with OKTA").
 * OAuth uses `oauthProviderName` ("Continue with {name}").
 * Google / Microsoft show their respective logos.
 * Default style is outline; set `primary` for accent-filled.
 */
export default function ProviderButton({
  provider,
  onClick,
  disabled = false,
  loading = false,
  primary = false,
  samlProviderName,
  oauthProviderName,
}: ProviderButtonProps) {
  const { t } = useTranslation();
  const { icon, labelKey } = PROVIDER_CONFIG[provider];
  let label = t(labelKey);
  if (provider === 'sso' && samlProviderName?.trim()) {
    label = t('auth.providers.continueWithProvider', { provider: samlProviderName.trim() });
  } else if (provider === 'oauth' && oauthProviderName?.trim()) {
    label = t('auth.providers.continueWithProvider', { provider: oauthProviderName.trim() });
  }
  return (
    <LoadingButton
      type="button"
      size="3"
      variant={primary ? 'solid' : 'outline'}
      disabled={disabled}
      loading={loading}
      loadingLabel={t('auth.providers.connecting')}
      style={{
        width: '100%',
        fontWeight: 500,
        ...(primary
          ? { backgroundColor: 'var(--accent-9)', color: 'white' }
          : { color: 'var(--gray-12)', borderColor: 'var(--gray-a6)' }),
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </LoadingButton>
  );
}
