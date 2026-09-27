import { toast, useToastStore } from '@/lib/store/toast-store';
import { ErrorType, getUserFacingErrorText, ProcessedError } from './api-error';
import { localizedText, type LocalizedText } from '@/lib/i18n/localized-text';

interface ErrorToastConfig {
  title: LocalizedText;
  description: LocalizedText;
}

const activeErrorToasts = new Map<ErrorType, string>();

const BUSY_STATUSES = new Set([429, 503, 504]);

const ERROR_TOAST_MAP: Record<ErrorType, ErrorToastConfig | null> = {
  [ErrorType.AUTHENTICATION_ERROR]: null, // Handled by redirect
  [ErrorType.REQUEST_CANCELLED]: null, // Abort/superseded request — not user-actionable
  [ErrorType.AUTHORIZATION_ERROR]: {
    title: localizedText('common.errors.toast.authorizationTitle'),
    description: localizedText('common.errors.toast.authorizationDescription'),
  },
  [ErrorType.VALIDATION_ERROR]: {
    title: localizedText('common.errors.toast.validationTitle'),
    description: localizedText('common.errors.toast.validationDescription'),
  },
  [ErrorType.NOT_FOUND]: {
    title: localizedText('common.errors.toast.notFoundTitle'),
    description: localizedText('common.errors.toast.notFoundDescription'),
  },
  [ErrorType.CONFLICT]: {
    title: localizedText('common.errors.toast.conflictTitle'),
    description: localizedText('common.errors.toast.conflictDescription'),
  },
  [ErrorType.NETWORK_ERROR]: {
    title: localizedText('common.errors.toast.networkTitle'),
    description: localizedText('common.errors.toast.networkDescription'),
  },
  [ErrorType.SERVER_ERROR]: {
    title: localizedText('common.errors.toast.serverTitle'),
    description: localizedText('common.errors.toast.serverDescription'),
  },
  [ErrorType.TIMEOUT_ERROR]: {
    title: localizedText('common.errors.toast.timeoutTitle'),
    description: localizedText('common.errors.toast.timeoutDescription'),
  },
  [ErrorType.UNKNOWN_ERROR]: {
    title: localizedText('common.errors.toast.unknownTitle'),
    description: localizedText('common.errors.toast.unknownDescription'),
  },
};

export function showErrorToast(error: ProcessedError): void {
  const config = ERROR_TOAST_MAP[error.type];
  if (!config) return;

  // Deduplicate: skip if a toast for this error type is already showing
  const existingId = activeErrorToasts.get(error.type);
  if (existingId) {
    const stillExists = useToastStore.getState().toasts.some(
      (t) => t.id === existingId && !t.isExiting
    );
    if (stillExists) return;
    activeErrorToasts.delete(error.type);
  }

  // The server's words when they were written for a reader; otherwise the
  // sentence above, which always says what to do next.
  const base = getUserFacingErrorText(error, config.description);
  // Quoting the reference is how an admin finds this failure in the logs.
  const description = error.requestId
    ? localizedText('common.errors.toast.withReference', {
        message: base,
        requestId: error.requestId,
      })
    : base;
  // Busy or slow is worth a retry, not a "Server Error" scare.
  const title = BUSY_STATUSES.has(error.statusCode ?? 0)
    ? localizedText('common.errors.toast.busyTitle')
    : config.title;

  const id = toast.error(title, {
    description,
    duration: null,
    showCloseButton: true,
  });

  activeErrorToasts.set(error.type, id);
}
