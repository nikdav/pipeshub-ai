'use client';

import { ErrorType, isProcessedError } from '@/lib/api/api-error';
import { localizedText } from '@/lib/i18n/localized-text';
import type { LocalizedTextValue } from '@/lib/i18n/localized-text';

export function extractErrorCode(value: unknown, depth = 0): string | undefined {
  if (depth > 6 || value == null || typeof value !== 'object') return undefined;
  const rec = value as Record<string, unknown>;
  if (typeof rec.error_code === 'string' && rec.error_code.trim()) {
    return rec.error_code.trim();
  }
  for (const key of ['details', 'error']) {
    const nested = extractErrorCode(rec[key], depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

export function resolveModelConfigSaveError(err: unknown): LocalizedTextValue {
  if (isProcessedError(err)) {
    const fromDetails = extractErrorCode(err.details);
    const fromAxiosBody = extractErrorCode(
      (err.originalError as { response?: { data?: unknown } } | undefined)?.response?.data
    );
    const code = fromDetails ?? fromAxiosBody;
    if (code === 'outbound_connectivity') {
      return localizedText('workspace.aiModels.configSaveOutboundError');
    }
    if (code === 'health_check_timeout' || err.type === ErrorType.TIMEOUT_ERROR) {
      return localizedText('workspace.aiModels.configSaveTimeoutError');
    }
    if (err.messageText) {
      return err.messageText;
    }
    if (err.message.trim()) {
      return err.message.trim();
    }
  }

  return localizedText('workspace.aiModels.configSaveErrorFallback');
}
