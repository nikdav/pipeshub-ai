import type { ConnectorAuthConfig, AuthSchemaField } from '../../types';

type TranslateText = (key: string, options?: Record<string, unknown>) => string;

/**
 * Resolve auth fields from schema based on selected auth type.
 * Handles both single-schema and multi-schema formats.
 */
export function resolveAuthFields(
  authConfig: ConnectorAuthConfig | undefined | null,
  selectedAuthType: string
): AuthSchemaField[] {
  if (!authConfig) return [];

  // Multi-schema format (keyed by auth type)
  if (authConfig.schemas && selectedAuthType && authConfig.schemas[selectedAuthType]) {
    return authConfig.schemas[selectedAuthType].fields ?? [];
  }

  // Single schema format
  if (authConfig.schema?.fields) {
    return authConfig.schema.fields;
  }

  return [];
}

/**
 * Format auth type enum to display name.
 */
export function formatAuthTypeName(authType: string, t: TranslateText): string {
  const map: Record<string, string> = {
    OAUTH: 'oauth',
    OAUTH_ADMIN_CONSENT: 'oauthAdminConsent',
    OAUTH_CERTIFICATE: 'oauthCertificate',
    API_TOKEN: 'apiToken',
    USERNAME_PASSWORD: 'usernamePassword',
    BASIC_AUTH: 'basicAuth',
    BEARER_TOKEN: 'bearerToken',
    CUSTOM: 'custom',
    NONE: 'none',
  };
  const key = map[authType];
  return key ? t(`workspace.connectors.authTab.authTypes.${key}`) : authType;
}
