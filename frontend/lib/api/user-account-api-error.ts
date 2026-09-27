import type { AxiosError } from 'axios';
import i18n from '@/lib/i18n/config';
import {
  localizedText,
  resolveLocalizedText,
  type LocalizedTextValue,
} from '@/lib/i18n/localized-text';

/** Error body returned by userAccount APIs (e.g. POST /userAccount/authenticate). */
export interface UserAccountApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

/** Message from API JSON body only (no axios / generic Error fallback). Cooldown marker stripped. */
export function getUserAccountApiResponseMessage(err: unknown): string | undefined {
  const ax = err as AxiosError<UserAccountApiErrorBody>;
  const data = ax?.response?.data;
  const nested =
    typeof data?.error?.message === 'string' ? data.error.message.trim() : undefined;
  const flat = typeof data?.message === 'string' ? data.message.trim() : undefined;
  const raw = nested ?? flat;
  if (!raw) return undefined;
  return raw.replace(/\s*\[blockedUntil:[^\]]+\]/g, '').trim();
}

/**
 * Reads the user-facing message from an axios error response or a thrown Error.
 */
export function getUserAccountApiErrorMessage(
  err: unknown,
  fallback: LocalizedTextValue = localizedText('auth.common.errorFallback'),
): string {
  const value = getUserAccountApiErrorText(err, fallback);
  return resolveLocalizedText(value, i18n.t.bind(i18n));
}

/** Keeps app fallback metadata available for an error screen rendered later. */
export function getUserAccountApiErrorText(
  err: unknown,
  fallback: LocalizedTextValue = localizedText('auth.common.errorFallback'),
): LocalizedTextValue {
  const fromBody = getUserAccountApiResponseMessage(err);
  if (fromBody) return fromBody;
  if (err instanceof Error && err.message) {
    return err.message.replace(/\s*\[blockedUntil:[^\]]+\]/g, '').trim();
  }
  return fallback;
}

/** ISO-8601 unblock time from embedded `[blockedUntil:...]` in the API error message. */
export function getUserAccountBlockedUntil(err: unknown): string | undefined {
  const ax = err as AxiosError<UserAccountApiErrorBody>;
  const data = ax?.response?.data;
  const nested =
    typeof data?.error?.message === 'string' ? data.error.message.trim() : undefined;
  const flat = typeof data?.message === 'string' ? data.message.trim() : undefined;
  for (const raw of [nested, flat]) {
    if (raw) {
      const m = raw.match(/\[blockedUntil:([^\]]+)\]/);
      const v = m?.[1]?.trim();
      if (v) return v;
    }
  }
  if (err instanceof Error && err.message) {
    const m = err.message.match(/\[blockedUntil:([^\]]+)\]/);
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return undefined;
}
