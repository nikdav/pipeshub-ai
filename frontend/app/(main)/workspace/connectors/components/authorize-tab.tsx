'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Text, Separator, Callout } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { LoadingButton } from '@/app/components/ui/loading-button';
import { AuthCard } from './auth-card';
import { useConnectorsStore } from '../store';
import { isConnectorInstanceAuthenticatedForUi } from '../utils/auth-helpers';
import type { AuthCardState } from '../types';

/** Same shell as `SyncSettingsSection` / Authenticate olive cards. */
const sectionCardStyle = {
  padding: 16,
  backgroundColor: 'var(--olive-2)',
  borderRadius: 'var(--radius-2)',
  border: '1px solid var(--olive-3)',
  width: '100%' as const,
  boxSizing: 'border-box' as const,
};

export type AuthorizeTabProps = {
  startOAuthPopup: () => void | Promise<void>;
  isAuthenticating: boolean;
};

/**
 * Browser OAuth step after the instance exists (connector id required).
 * Credentials and OAuth app live on the Authenticate tab; this tab only runs consent.
 *
 * `startOAuthPopup` / `isAuthenticating` are owned by {@link ConnectorPanel} so the OAuth
 * `postMessage` listener stays mounted while the panel is open (Radix Tabs may unmount this tab).
 */
export function AuthorizeTab({ startOAuthPopup, isAuthenticating }: AuthorizeTabProps) {
  const { t } = useTranslation();
  const panelConnector = useConnectorsStore((s) => s.panelConnector);
  const panelConnectorId = useConnectorsStore((s) => s.panelConnectorId);
  const connectorConfig = useConnectorsStore((s) => s.connectorConfig);
  const authState = useConnectorsStore((s) => s.authState);

  if (!panelConnector || !panelConnectorId) return null;

  const cardState: AuthCardState =
    authState === 'authenticating' ? 'empty' : (authState as AuthCardState);

  const authed = isConnectorInstanceAuthenticatedForUi(
    panelConnectorId,
    panelConnector,
    connectorConfig
  );
  const reauthFailed = authed && authState === 'failed';
  /**
   * True while the popup + verification flow is active. Using only `isAuthenticating` (not
   * `authState === 'authenticating'`) mirrors the toolset pattern: the hook explicitly resets
   * `authState` to `'empty'` on failure, so relying on `authState` here would leave the button
   * stuck in loading if the hook reset `isAuthenticating` before `authState` caught up.
   */
  const consentOauthBusy = isAuthenticating;
  const reauthOauthBusy = isAuthenticating;

  return (
    <Flex direction="column" gap="6" style={{ padding: '4px 0', width: '100%', minWidth: 0 }}>
      {!authed ? (
        <Flex direction="column" gap="4" style={sectionCardStyle}>
          <Flex direction="column" gap="1">
            <Text size="3" weight="medium" style={{ color: 'var(--gray-12)' }}>
              {t('workspace.connectors.authorizeTab.signInHeading')}
            </Text>
            <Text size="1" style={{ color: 'var(--gray-10)', lineHeight: 1.55 }}>
              {t('workspace.connectors.authorizeTab.signInDescription')}
            </Text>
          </Flex>

          <AuthCard
            embedded
            state={cardState}
            connectorName={panelConnector.name}
            onAuthenticate={() => void startOAuthPopup()}
            onRetry={() => void startOAuthPopup()}
            loading={consentOauthBusy}
          />
        </Flex>
      ) : (
        <Flex direction="column" gap="4" style={sectionCardStyle}>
          <Flex direction="column" gap="1">
            <Text size="3" weight="medium" style={{ color: 'var(--gray-12)' }}>
              {t('workspace.connectors.authorizeTab.authorizationStatus')}
            </Text>
            <Text size="1" style={{ color: 'var(--gray-10)', lineHeight: 1.55 }}>
              {t('workspace.connectors.authorizeTab.authorizationStatusDescription')}
            </Text>
          </Flex>

          <Callout.Root color="green" variant="surface" size="1">
            <Callout.Icon>
              <MaterialIcon name="check_circle" size={16} color="var(--green-11)" />
            </Callout.Icon>
            <Callout.Text size="2" weight="medium" style={{ color: 'var(--green-12)' }}>
              {t('workspace.connectors.authorizeTab.connected')}
            </Callout.Text>
          </Callout.Root>

          {reauthFailed ? (
            <Callout.Root color="red" variant="surface" size="1">
              <Callout.Icon>
                <MaterialIcon name="error_outline" size={16} color="var(--red-11)" />
              </Callout.Icon>
              <Callout.Text size="2" style={{ color: 'var(--red-11)', lineHeight: 1.5 }}>
                {t('workspace.connectors.authorizeTab.signInFailed')}
              </Callout.Text>
            </Callout.Root>
          ) : null}

          <Separator size="4" style={{ width: '100%', maxWidth: '100%' }} />

          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
              {t('workspace.connectors.authorizeTab.refreshAccess')}
            </Text>
            <Text size="1" style={{ color: 'var(--gray-10)', lineHeight: 1.55 }}>
              {t('workspace.connectors.authorizeTab.refreshAccessDescription')}
            </Text>
            <LoadingButton
              type="button"
              variant="outline"
              color="gray"
              size="2"
              loading={reauthOauthBusy}
              loadingLabel={t('workspace.connectors.authorizeTab.authenticating')}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onClick={() => void startOAuthPopup()}
            >
              <MaterialIcon name="vpn_key" size={16} color="var(--gray-11)" />
              {t('workspace.connectors.authorizeTab.reauthenticate')}
            </LoadingButton>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
